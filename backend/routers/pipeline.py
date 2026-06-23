from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import time
import tempfile
import os

from .module1_quality import analyze_image, adaptive_enhance, encode_image
from .module2_detection import model as yolo_model, _parse_detections, _annotate_scene
from .module3_violation import VerificationRequest, Candidate, StructuredSceneItem, verify_violations
from .module4_lpr import _ocr_frame, fuse_plates, validate_plate, compute_trust_score, _vahan_lookup
from .module5_evidence import EvidenceRequest, generate_evidence
from ..services.scene_engine import process_scene
from ..services.video_processor import VideoProcessor, ViolationAggregator, FrameBufferManager

router = APIRouter()
video_processor = VideoProcessor(max_fps=30)


def _ensure_json_safe(obj):
    """Recursively convert numpy types and other non-JSON-native types to Python builtins."""
    import numpy as _np

    if obj is None:
        return None
    # Preserve native Python primitive types
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (_np.integer,)):
        return int(obj)
    if isinstance(obj, (_np.floating,)):
        return float(obj)
    if isinstance(obj, (_np.ndarray,)):
        return obj.tolist()
    if isinstance(obj, bytes):
        try:
            return obj.decode("utf-8")
        except Exception:
            return obj
    if isinstance(obj, dict):
        return {str(k): _ensure_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_ensure_json_safe(v) for v in obj]
    if isinstance(obj, tuple):
        return [_ensure_json_safe(v) for v in obj]
    # Objects with __dict__ (dataclasses, simple classes)
    if hasattr(obj, "__dict__"):
        try:
            return {str(k): _ensure_json_safe(v) for k, v in vars(obj).items()}
        except Exception:
            pass
    # Fallback for iterable types (excluding strings)
    try:
        if hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes, dict)):
            try:
                return [_ensure_json_safe(v) for v in list(obj)]
            except Exception:
                pass
    except Exception:
        pass
    # handle numpy scalar types via .item()
    if hasattr(obj, 'item'):
        try:
            return obj.item()
        except Exception:
            pass
    # Final fallback to string
    try:
        return str(obj)
    except Exception:
        return None


def _safe_int(val, default=0):
    """Convert val to int, accepting strings and floats gracefully."""
    try:
        return int(val)
    except Exception:
        try:
            return int(float(val))
        except Exception:
            return default


def _decode_image(contents: bytes) -> np.ndarray:
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
    return img


def _extract_video_frames(contents: bytes, max_frames: int = 8) -> list[np.ndarray]:
    """Legacy frame extraction for compatibility"""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(contents)
        path = tmp.name
    frames = []
    try:
        cap = cv2.VideoCapture(path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        step = max(1, total // max_frames)
        idx = 0
        while len(frames) < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                break
            if frame is not None:
                frames.append(frame)
            idx += step
        cap.release()
    finally:
        os.unlink(path)
    return frames


def _extract_first_frame(contents: bytes) -> tuple[np.ndarray, float]:
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(contents)
        path = tmp.name
    try:
        cap = cv2.VideoCapture(path)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30)
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            raise ValueError("No frames extracted from video")
        return frame, fps
    finally:
        os.unlink(path)


def _resize_image(img: np.ndarray, max_dim: int = 640) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


async def _run_pipeline_on_video(video_bytes: bytes, filename: str) -> dict:
    """
    Enhanced video processing pipeline - processes ALL frames through all 8 modules
    
    Returns comprehensive video analysis with:
    - Per-frame detection, violations, LPR
    - Aggregated statistics and repeat offenders
    - Annotated video output
    - Timeline of events
    """
    import logging
    logger = logging.getLogger(__name__)
    t_total_start = time.perf_counter()
    
    try:
        # Extract all frames from video (5 FPS for faster processing: 3-6x speedup)
        logger.info(f"Starting video pipeline for: {filename}")
        frames, original_fps = video_processor.extract_frames_optimized(video_bytes, target_fps=5)
        logger.info(f"Extracted {len(frames)} frames at {original_fps} FPS")
        
        if not frames:
            raise ValueError("No frames extracted from video")
        
        # Initialize aggregators
        aggregator = ViolationAggregator()
        buffer_manager = FrameBufferManager(buffer_size=30)
        
        # Process each frame through the pipeline
        frame_results = []
        annotated_frames = []
        lpr_results = []
        quality_scores = []
        all_violations = []
        
        for frame_idx, frame in enumerate(frames):
            t_frame_start = time.perf_counter()
            
            # MODULE 1: Quality Enhancement
            before = analyze_image(frame)
            enhanced_img, applied, _ = adaptive_enhance(frame, before)
            after = analyze_image(enhanced_img)
            quality_scores.append({
                "frame": int(frame_idx),
                "before": _safe_int(before.get("overall_score", 0)),
                "after": _safe_int(after.get("overall_score", 0))
            })
            
            # MODULE 2: Detection & Tracking
            results = yolo_model(enhanced_img)[0]
            tracked, yolo_lights = _parse_detections(results, frame_idx)
            scene_data = process_scene(enhanced_img, tracked, yolo_lights)
            # make scene_data JSON-safe immediately to avoid numpy types
            scene_data = _ensure_json_safe(scene_data)
            annotated_det = _annotate_scene(enhanced_img, scene_data)
            annotated_frames.append(annotated_det)
            
            # MODULE 3: Violation Verification
            try:
                verify_req = VerificationRequest(
                    violation_candidates=[Candidate(**c) for c in scene_data.get("violation_candidates", [])],
                    structured_scene=[StructuredSceneItem(**s) for s in scene_data.get("structured_scene", [])],
                    frames_analyzed=len(frames),
                    road_context=scene_data.get("scene", {}).get("road_context", {}),
                )
                verification = await verify_violations(verify_req)
                verification = _ensure_json_safe(verification)
                
                # Track violations for aggregation
                if verification.get("violations"):
                    for violation in verification.get("violations", []):
                        all_violations.append({
                            "frame": int(frame_idx),
                            "type": violation.get("type"),
                            "confidence": float(violation.get("confidence", 0)),
                            "details": _ensure_json_safe(violation.get("details", {}))
                        })
                    # add_frame_violations expects original violation dicts; safe to pass JSON-safe ones
                    aggregator.add_frame_violations(int(frame_idx), verification.get("violations", []), scene_data)
            except Exception as e:
                verification = {"verified": False, "violations": [], "threat_score": 0, "timeline": []}
            
            # MODULE 4: License Plate Recognition
            lpr_frame = _ocr_frame(enhanced_img, 1)
            lpr_frame = _ensure_json_safe(lpr_frame)
            if lpr_frame.get("plate"):
                fusion = fuse_plates([lpr_frame])
                fusion = _ensure_json_safe(fusion)
                validated = validate_plate(fusion.get("fused_plate")) if fusion.get("fused_plate") else False
                
                # For video mode, adjust trust score calculation for single-frame detections
                # When agreement is low (single frame), rely more on OCR confidence and visibility
                agreement = fusion.get("agreement", 0)
                if agreement < 50:
                    # Single-frame detection: use OCR confidence and visibility as primary factors
                    ocr_conf = fusion.get("confidence", 0)
                    visibility = lpr_frame.get("quality", {}).get("visibility", 0)
                    # Weighted score: 60% OCR confidence, 30% visibility, 10% validation
                    trust = (ocr_conf * 0.6) + (visibility * 0.3) + (100 if validated else 30) * 0.1
                    trust = max(0, min(100, round(trust, 1)))
                else:
                    # Multi-frame detection: use standard trust score calculation
                    trust = compute_trust_score(
                        fusion.get("confidence", 0),
                        lpr_frame.get("quality", {}).get("visibility", 0),
                        agreement,
                        validated,
                    )
                
                # Only store valid plates
                if fusion.get("fused_plate") and validated:
                    lpr_result = {
                        "frame": int(frame_idx),
                        "plate": fusion.get("fused_plate"),
                        "confidence": max(0, min(100, float(fusion.get("confidence", 0)))),
                        "trust_score": max(0, min(100, float(trust))),
                        "vahan": _vahan_lookup(fusion.get("fused_plate")) if fusion.get("fused_plate") else None,
                    }
                    lpr_results.append(lpr_result)
            
            # Store frame result
            frame_results.append({
                "frame_idx": int(frame_idx),
                "timestamp_sec": float(frame_idx) / float(original_fps) if original_fps else float(frame_idx),
                "vehicles_detected": _safe_int(scene_data.get("summary", {}).get("vehicles_detected", 0)),
                "signal_state": scene_data.get("summary", {}).get("signal_state", "unknown"),
                "violations_detected": int(len(verification.get("violations", []))) if isinstance(verification, dict) else 0,
                "plate_detected": bool(lpr_frame.get("plate")),
            })
            
            # Log progress
            if (frame_idx + 1) % 10 == 0:
                logger.info(f"Processed {frame_idx + 1}/{len(frames)} frames")
        
        t_total_end = time.perf_counter()
        
        # MODULE 6: Aggregate Analytics
        aggregated_summary = aggregator.get_summary()
        
        # Filter LPR results - only keep high-confidence valid plates
        validated_lpr_results = [
            lpr for lpr in lpr_results 
            if lpr.get("plate") and lpr.get("trust_score", 0) >= 50  # At least 50% trust
        ]
        logger.info(f"Filtered LPR: {len(lpr_results)} total → {len(validated_lpr_results)} valid")
        
        # Create output annotated video
        output_video_path = tempfile.mktemp(suffix=".mp4")
        logger.info(f"Creating annotated video with {len(annotated_frames)} frames at {original_fps} FPS")
        video_success = video_processor.create_output_video(
            output_video_path,
            annotated_frames,
            original_fps
        )
        logger.info(f"Video creation {'successful' if video_success else 'failed'}")
        
        output_video_b64 = None
        if video_success and os.path.exists(output_video_path):
            try:
                file_size = os.path.getsize(output_video_path)
                logger.info(f"Encoding video to base64 ({file_size / 1024 / 1024:.2f} MB)")
                with open(output_video_path, "rb") as f:
                    import base64
                    output_video_b64 = base64.b64encode(f.read()).decode('utf-8')
                logger.info(f"Video encoded successfully ({len(output_video_b64) / 1024 / 1024:.2f} MB base64)")
            finally:
                try:
                    os.unlink(output_video_path)
                except:
                    pass
        else:
            logger.warning("Video file not created or does not exist")
        
        # Compile results
        result = {
            "pipeline_status": "complete",
            "video_mode": True,
            "total_frames": len(frames),
            "original_fps": original_fps,
            "processing_time_sec": t_total_end - t_total_start,
            
            # MODULE 1: Quality
            "module1_quality": {
                "average_score_before": float(sum(_safe_int(q.get("before",0)) for q in quality_scores) / len(quality_scores)) if quality_scores else 0,
                "average_score_after": float(sum(_safe_int(q.get("after",0)) for q in quality_scores) / len(quality_scores)) if quality_scores else 0,
                "frame_details": quality_scores[:10],  # First 10 frames
            },
            
            # MODULE 2: Detection Summary
            "module2_detection": {
                "total_frames_analyzed": len(frames),
                "frame_by_frame_summary": frame_results,
            },
            
            # MODULE 3: Aggregated Violations
            "module3_violation": {
                "total_violations_detected": len(all_violations),
                "violations_by_type": aggregated_summary["violations_by_type"],
                "high_confidence_violations": aggregated_summary["high_confidence_violations"],
                "all_violations": all_violations[:50],  # First 50 violations
            },
            
            # MODULE 4: LPR
            "module4_lpr": {
                "total_plates_detected": len(validated_lpr_results),
                "plates_found": validated_lpr_results,
            },
            
            # MODULE 5: Evidence (summary only for video)
            "module5_evidence": {
                "status": "Generated from violations",
                "violation_count": len(all_violations),
            },
            
            # MODULE 6: Analytics
            "module6_analytics": {
                "total_vehicles_tracked": aggregated_summary["total_vehicles_tracked"],
                "repeat_offenders": aggregated_summary["repeat_offenders"],
                "vehicles_by_track": aggregated_summary["tracks"],
            },
            
            # Annotated video output
            "annotated_video": output_video_b64,
            "annotated_video_available": bool(output_video_b64),
            
            # Sample frames
            "sample_annotated_frame": encode_image(annotated_frames[0]) if annotated_frames else None,
            "sample_frame_idx": 0,
        }
        
        # Validate JSON serializability and log detailed types if failure occurs
        try:
            import json, pprint
            json.dumps(_ensure_json_safe(result))
        except Exception as ser_ex:
            # Log top-level types for debugging
            try:
                import logging
                logging.getLogger(__name__).error("Serialization failed: %s", ser_ex)
                def _types(obj, depth=0):
                    if depth > 3:
                        return str(type(obj))
                    if isinstance(obj, dict):
                        return {k: _types(v, depth+1) for k, v in obj.items()}
                    if isinstance(obj, list):
                        return [_types(v, depth+1) for v in obj[:10]]
                    return str(type(obj))
                logging.getLogger(__name__).error("Result types: %s", _types(result))
            except Exception:
                pass
            # Re-raise to surface the error
            raise HTTPException(status_code=500, detail=f"Serialization error: {ser_ex}")

        return _ensure_json_safe(result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Video pipeline processing error: {str(e)}"
        )



async def _run_pipeline_on_image(img: np.ndarray, fast: bool = False) -> dict:
    """Process a single image through the 8-module pipeline and return a JSON-serializable dict."""
    t0 = time.perf_counter()

    img = _resize_image(img, max_dim=512)
    before = analyze_image(img)
    enhanced_img, applied, _ = adaptive_enhance(img, before)
    after = analyze_image(enhanced_img)
    t1 = time.perf_counter()

    results = yolo_model(enhanced_img, imgsz=512, conf=0.25)[0]
    tracked, yolo_lights = _parse_detections(results, 0)
    # ensure scene data is JSON-safe
    scene_data = process_scene(enhanced_img, tracked, yolo_lights)
    scene_data = _ensure_json_safe(scene_data)
    annotated_det = None if fast else _annotate_scene(enhanced_img, scene_data)
    t2 = time.perf_counter()

    verify_req = VerificationRequest(
        violation_candidates=[Candidate(**c) for c in scene_data.get("violation_candidates", [])],
        structured_scene=[StructuredSceneItem(**s) for s in scene_data.get("structured_scene", [])],
        frames_analyzed=1,
        road_context=scene_data.get("scene", {}).get("road_context", {}),
    )
    verification = await verify_violations(verify_req)
    verification = _ensure_json_safe(verification)
    t3 = time.perf_counter()

    lpr_frame = None
    fusion = {"fused_plate": None, "confidence": 0, "agreement": 0}
    trust = 0
    if not fast:
        lpr_frame = _ocr_frame(enhanced_img, 1)
        lpr_frame = _ensure_json_safe(lpr_frame)
        fusion = fuse_plates([lpr_frame] if lpr_frame.get("plate") else [])
        fusion = _ensure_json_safe(fusion)
        validated = validate_plate(fusion.get("fused_plate")) if fusion.get("fused_plate") else False
        trust = compute_trust_score(
            fusion.get("confidence", 0),
            lpr_frame.get("quality", {}).get("visibility", 0),
            fusion.get("agreement", 0),
            validated,
        ) if fusion.get("fused_plate") else 0

    lpr = {
        "verified": bool(fusion.get("fused_plate")),
        "fused_plate": fusion.get("fused_plate"),
        "trust_score": float(trust),
        "ocr_confidence": float(fusion.get("confidence", 0)),
        "frame_agreement": fusion.get("agreement", 0),
        "frames": [lpr_frame] if lpr_frame is not None else [],
        "vahan": _vahan_lookup(fusion.get("fused_plate")) if fusion.get("fused_plate") and not fast else None,
    }
    t4 = time.perf_counter()

    evidence = None
    if verification.get("verified") and not fast:
        evidence_req = EvidenceRequest(
            plate=lpr.get("fused_plate") or "UNKNOWN",
            image_base64=encode_image(annotated_det),
            violations=verification.get("violations", []),
            metadata={
                "threat_score": verification.get("threat_score", 0),
                "trust_score": trust,
                "signal_state": scene_data.get("scene", {}).get("road_context", {}).get("signal_state"),
                "confidence": max((v.get("confidence", 0) for v in verification.get("violations", [])), default=0),
            },
            timeline=verification.get("timeline", []),
        )
        evidence = await generate_evidence(evidence_req)
    t5 = time.perf_counter()

    signal_state = scene_data.get("summary", {}).get("signal_state", "unknown")
    timeline = [
        {"time": "T+0ms", "event": "Image received"},
        {"time": f"T+{int((t1-t0)*1000)}ms", "event": f"Quality {_safe_int(before.get('overall_score',0))} → {_safe_int(after.get('overall_score',0))}"},
        {"time": f"T+{int((t2-t0)*1000)}ms", "event": f"Signal: {signal_state.upper()} | {_safe_int(scene_data.get('summary', {}).get('vehicles_detected', 0))} vehicles detected"},
        {"time": f"T+{int((t3-t0)*1000)}ms", "event": f"{int(len(verification.get('violations', [])))} violation(s) verified" if verification.get('verified') else "No violations verified"},
    ]
    if lpr.get("verified"):
        timeline.append({"time": f"T+{int((t4-t0)*1000)}ms", "event": f"Plate {lpr.get('fused_plate')} (trust {trust}%)"})
    if evidence:
        timeline.append({"time": f"T+{int((t5-t0)*1000)}ms", "event": f"Evidence sealed — {evidence.get('case_id')}"})

    output = {
        "pipeline_status": "complete",
        "latency_ms": {
            "quality": int((t1 - t0) * 1000),
            "detection": int((t2 - t1) * 1000),
            "verification": int((t3 - t2) * 1000),
            "lpr": int((t4 - t3) * 1000),
            "evidence": int((t5 - t4) * 1000),
            "total": int((t5 - t0) * 1000),
        },
        "module1_quality": {
            "quality_score_before": _safe_int(before.get('overall_score',0)),
            "quality_score_after": _safe_int(after.get('overall_score',0)),
            "improvement": _safe_int(after.get('overall_score',0)) - _safe_int(before.get('overall_score',0)),
            "enhancements_applied": applied,
        },
        "module2_detection": {
            "objects": tracked,
            "scene": scene_data.get('scene'),
            "scene_graph": scene_data.get('scene_graph'),
            "structured_scene": scene_data.get('structured_scene'),
            "violation_candidates": scene_data.get('violation_candidates'),
            "explanation": scene_data.get('explanation'),
            "summary": scene_data.get('summary'),
            "traffic_signals": scene_data.get('traffic_signals'),
            "annotated_image": encode_image(annotated_det) if annotated_det is not None else None,
        },
        "module3_violation": verification,
        "module4_lpr": lpr,
        "module5_evidence": evidence,
        "timeline": timeline,
        "enhanced_image": encode_image(enhanced_img),
    }

    if fast:
        output["fast_mode"] = True
        output["module5_evidence"] = None
        output["timeline"].append({"time": f"T+{int((t5-t0)*1000)}ms", "event": "Fast preview mode: evidence generation skipped"})

    return _ensure_json_safe(output)


@router.post("/process")
async def process_pipeline(file: UploadFile = File(...), fast: bool = Query(False)):
    try:
        contents = await file.read()
        content_type = file.content_type or ""
        filename = (file.filename or "").lower()
        
        # Check if it's a video file
        video_extensions = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"]
        is_video = "video" in content_type or any(filename.endswith(ext) for ext in video_extensions)
        
        if is_video:
            if fast:
                return JSONResponse(content=_ensure_json_safe(await _run_pipeline_on_video_quick(contents, filename)))
            return JSONResponse(content=_ensure_json_safe(await _run_pipeline_on_video(contents, filename)))
        
        # Try to decode as image
        try:
            img = _decode_image(contents)
            return JSONResponse(content=_ensure_json_safe(await _run_pipeline_on_image(img, fast=fast)))
        except ValueError as img_error:
            raise ValueError(f"Invalid image or video file. Please upload a valid image (jpg, png) or video (mp4, avi, mov). Error: {str(img_error)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {str(e)}")


@router.post("/process-video-detailed")
async def process_video_detailed(file: UploadFile = File(...)):
    """
    Enhanced video processing with detailed frame-by-frame analysis
    Returns all 8 modules applied to video with aggregated insights
    """
    try:
       if not file.content_type or "video" not in file.content_type:
           raise HTTPException(status_code=400, detail="Please upload a video file")
        
       contents = await file.read()
       return JSONResponse(content=_ensure_json_safe(await _run_pipeline_on_video(contents, file.filename or "video.mp4")))
        
    except HTTPException:
       raise
    except Exception as e:
       raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")
