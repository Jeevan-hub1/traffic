from fastapi import APIRouter, File, UploadFile, HTTPException
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

router = APIRouter()


def _decode_image(contents: bytes) -> np.ndarray:
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
    return img


def _extract_video_frames(contents: bytes, max_frames: int = 8) -> list[np.ndarray]:
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
            frames.append(frame)
            idx += step
        cap.release()
    finally:
        os.unlink(path)
    return frames


async def _run_pipeline_on_image(img: np.ndarray) -> dict:
    t0 = time.perf_counter()

    before = analyze_image(img)
    enhanced_img, applied, _ = adaptive_enhance(img, before)
    after = analyze_image(enhanced_img)
    t1 = time.perf_counter()

    results = yolo_model(enhanced_img)[0]
    tracked, yolo_lights = _parse_detections(results, 0)
    scene_data = process_scene(enhanced_img, tracked, yolo_lights)
    annotated_det = _annotate_scene(enhanced_img, scene_data)
    t2 = time.perf_counter()

    verify_req = VerificationRequest(
        violation_candidates=[Candidate(**c) for c in scene_data["violation_candidates"]],
        structured_scene=[StructuredSceneItem(**s) for s in scene_data["structured_scene"]],
        frames_analyzed=1,
        road_context=scene_data["scene"]["road_context"],
    )
    verification = await verify_violations(verify_req)
    t3 = time.perf_counter()

    lpr_frame = _ocr_frame(enhanced_img, 1)
    fusion = fuse_plates([lpr_frame] if lpr_frame.get("plate") else [])
    validated = validate_plate(fusion["fused_plate"]) if fusion.get("fused_plate") else False
    trust = compute_trust_score(
        fusion.get("confidence", 0),
        lpr_frame["quality"]["visibility"],
        fusion.get("agreement", 0),
        validated,
    ) if fusion.get("fused_plate") else 0
    lpr = {
        "verified": bool(fusion.get("fused_plate")),
        "fused_plate": fusion.get("fused_plate"),
        "trust_score": trust,
        "ocr_confidence": fusion.get("confidence", 0),
        "frame_agreement": fusion.get("agreement", 0),
        "frames": [lpr_frame],
        "vahan": _vahan_lookup(fusion["fused_plate"]) if fusion.get("fused_plate") else None,
    }
    t4 = time.perf_counter()

    evidence = None
    if verification["verified"]:
        evidence_req = EvidenceRequest(
            plate=lpr.get("fused_plate") or "UNKNOWN",
            image_base64=encode_image(annotated_det),
            violations=verification["violations"],
            metadata={
                "threat_score": verification["threat_score"],
                "trust_score": trust,
                "signal_state": scene_data["scene"]["road_context"].get("signal_state"),
                "confidence": max(v["confidence"] for v in verification["violations"]),
            },
            timeline=verification["timeline"],
        )
        evidence = await generate_evidence(evidence_req)
    t5 = time.perf_counter()

    signal_state = scene_data["summary"].get("signal_state", "unknown")
    timeline = [
        {"time": "T+0ms", "event": "Image received"},
        {"time": f"T+{int((t1-t0)*1000)}ms", "event": f"Quality {before['overall_score']} → {after['overall_score']}"},
        {"time": f"T+{int((t2-t0)*1000)}ms", "event": f"Signal: {signal_state.upper()} | {scene_data['summary']['vehicles_detected']} vehicles detected"},
        {"time": f"T+{int((t3-t0)*1000)}ms", "event": f"{len(verification['violations'])} violation(s) verified" if verification["verified"] else "No violations verified"},
    ]
    if lpr["verified"]:
        timeline.append({"time": f"T+{int((t4-t0)*1000)}ms", "event": f"Plate {lpr['fused_plate']} (trust {trust}%)"})
    if evidence:
        timeline.append({"time": f"T+{int((t5-t0)*1000)}ms", "event": f"Evidence sealed — {evidence['case_id']}"})

    return {
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
            "quality_score_before": before["overall_score"],
            "quality_score_after": after["overall_score"],
            "improvement": after["overall_score"] - before["overall_score"],
            "enhancements_applied": applied,
        },
        "module2_detection": {
            "objects": tracked,
            "scene": scene_data["scene"],
            "scene_graph": scene_data["scene_graph"],
            "structured_scene": scene_data["structured_scene"],
            "violation_candidates": scene_data["violation_candidates"],
            "explanation": scene_data["explanation"],
            "summary": scene_data["summary"],
            "traffic_signals": scene_data["traffic_signals"],
            "annotated_image": encode_image(annotated_det),
        },
        "module3_violation": verification,
        "module4_lpr": lpr,
        "module5_evidence": evidence,
        "timeline": timeline,
        "enhanced_image": encode_image(enhanced_img),
    }


@router.post("/process")
async def process_pipeline(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        content_type = file.content_type or ""
        filename = (file.filename or "").lower()
        
        # Check if it's a video file
        video_extensions = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"]
        is_video = "video" in content_type or any(filename.endswith(ext) for ext in video_extensions)
        
        if is_video:
            try:
                frames = _extract_video_frames(contents)
                if not frames:
                    raise ValueError("Could not extract frames from video")
                results = []
                for frame in frames[:6]:
                    results.append(await _run_pipeline_on_image(frame))
                return {
                    "pipeline_status": "complete",
                    "video_mode": True,
                    "frames_processed": len(results),
                    "frame_results": results,
                    **results[-1],
                }
            except Exception as video_error:
                raise ValueError(f"Video processing failed: {str(video_error)}")
        
        # Try to decode as image
        try:
            img = _decode_image(contents)
            return await _run_pipeline_on_image(img)
        except ValueError as img_error:
            raise ValueError(f"Invalid image or video file. Please upload a valid image (jpg, png) or video (mp4, avi, mov). Error: {str(img_error)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {str(e)}")
