from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import cv2
import numpy as np
import base64
from ultralytics import YOLO

from ..services.tracker import SimpleTracker
from ..services.scene_engine import process_scene, VEHICLE_LABELS, PERSON_LABEL, TRAFFIC_LIGHT_LABEL, to_python_type
from ..services.traffic_signal import analyze_traffic_signals, annotate_signals

router = APIRouter()

model = YOLO("yolo11n.pt")
_tracker = SimpleTracker()


def _decode_image(contents: bytes) -> np.ndarray:
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
    return img


def _encode_image(image: np.ndarray) -> str:
    _, buffer = cv2.imencode(".jpg", image)
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"


def _parse_detections(results, frame_idx: int = 0) -> tuple[list[dict], list[dict]]:
    raw = []
    yolo_lights = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = model.names[cls_id]
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bbox = [x1, y1, x2, y2]

        if label in VEHICLE_LABELS:
            raw.append({"label": label, "confidence": round(conf * 100, 2), "type": "vehicle", "bbox": bbox})
        elif label == PERSON_LABEL:
            raw.append({"label": label, "confidence": round(conf * 100, 2), "type": "person", "bbox": bbox})
        elif label == TRAFFIC_LIGHT_LABEL:
            yolo_lights.append({"bbox": bbox, "confidence": round(conf * 100, 2), "label": label})

    return _tracker.update(raw, frame_idx), yolo_lights


def _annotate_scene(image: np.ndarray, scene_data: dict) -> np.ndarray:
    annotated = image.copy()
    colors = {"vehicle": (79, 70, 229), "person": (5, 150, 105), "plate": (124, 58, 237)}

    annotated = annotate_signals(annotated, scene_data.get("traffic_signals", {}))

    for vehicle in scene_data["scene"]["vehicles"]:
        x1, y1, x2, y2 = [int(v) for v in vehicle["bbox"]]
        cv2.rectangle(annotated, (x1, y1), (x2, y2), colors["vehicle"], 2)
        cv2.putText(annotated, f"{vehicle['track_id']} {vehicle['label']}", (x1, max(y1 - 8, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors["vehicle"], 1)
        plate = vehicle.get("plate")
        if plate and plate.get("detected"):
            px1, py1, px2, py2 = [int(v) for v in plate["bbox"]]
            cv2.rectangle(annotated, (px1, py1), (px2, py2), colors["plate"], 2)
        for occ in vehicle.get("occupants", []):
            ox1, oy1, ox2, oy2 = [int(v) for v in occ["bbox"]]
            cv2.rectangle(annotated, (ox1, oy1), (ox2, oy2), colors["person"], 2)
            if occ.get("helmet", {}).get("status") == "missing":
                cv2.putText(annotated, "NO HELMET", (ox1, oy2 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 220), 1)

    rc = scene_data["scene"].get("road_context", {})
    state = rc.get("signal_state", "unknown").upper()
    cv2.putText(annotated, f"SIGNAL: {state}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (79, 70, 229), 2)

    return annotated


@router.post("/signal")
async def detect_signal(file: UploadFile = File(...)):
    """Standalone traffic signal state detection (red / yellow / green)."""
    try:
        img = _decode_image(await file.read())
        results = model(img)[0]
        yolo_lights = []
        for box in results.boxes:
            if model.names[int(box.cls[0])] == TRAFFIC_LIGHT_LABEL:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                yolo_lights.append({"bbox": [x1, y1, x2, y2], "confidence": round(float(box.conf[0]) * 100, 2)})

        signal_data = analyze_traffic_signals(img, yolo_lights or None)
        annotated = annotate_signals(img, signal_data)
        return {
            **signal_data,
            "annotated_image": _encode_image(annotated),
            "method": "YOLOv11 traffic light + HSV bulb classification",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    try:
        img = _decode_image(await file.read())
        results = model(img)[0]
        tracked, yolo_lights = _parse_detections(results, 0)
        scene_data = process_scene(img, tracked, yolo_lights)
        annotated = _annotate_scene(img, scene_data)

        return to_python_type({
            "objects": tracked,
            "scene": scene_data["scene"],
            "scene_graph": scene_data["scene_graph"],
            "structured_scene": scene_data["structured_scene"],
            "violation_candidates": scene_data["violation_candidates"],
            "explanation": scene_data["explanation"],
            "summary": scene_data["summary"],
            "traffic_signals": scene_data["traffic_signals"],
            "annotated_image": _encode_image(annotated),
            "model": "YOLOv11n + signal classifier + ByteTrack-style tracker",
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/detect-frames")
async def detect_frames(files: List[UploadFile] = File(...)):
    try:
        if not files:
            raise ValueError("At least one frame required")

        global _tracker
        _tracker = SimpleTracker()
        all_objects = []
        frame_signals = []
        last_img = None
        last_scene = None

        for idx, upload in enumerate(files[:8]):
            img = _decode_image(await upload.read())
            last_img = img
            results = model(img)[0]
            tracked, yolo_lights = _parse_detections(results, idx)
            all_objects.extend(tracked)
            last_scene = process_scene(img, tracked, yolo_lights)
            frame_signals.append({
                "frame": idx + 1,
                "state": last_scene["traffic_signals"]["signal_state"],
                "confidence": last_scene["traffic_signals"]["signal_confidence"],
            })

        annotated = _annotate_scene(last_img, last_scene) if last_img and last_scene else None
        return {
            "frames_processed": len(files[:8]),
            "objects": all_objects,
            "frame_signals": frame_signals,
            "scene": last_scene["scene"] if last_scene else {},
            "scene_graph": last_scene["scene_graph"] if last_scene else {"nodes": [], "edges": []},
            "structured_scene": last_scene["structured_scene"] if last_scene else [],
            "violation_candidates": last_scene["violation_candidates"] if last_scene else [],
            "traffic_signals": last_scene["traffic_signals"] if last_scene else {},
            "explanation": last_scene["explanation"] if last_scene else [],
            "summary": last_scene["summary"] if last_scene else {},
            "annotated_image": _encode_image(annotated) if annotated is not None else None,
            "temporal_tracking": True,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
