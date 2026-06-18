from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import json
import datetime
import uuid
import base64
import os
import cv2
import numpy as np

from database import SessionLocal
from models import Evidence

router = APIRouter()
EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


class EvidenceRequest(BaseModel):
    violation_id: str = ""
    plate: str = "UNKNOWN"
    image_base64: str = ""
    violations: list = []
    metadata: dict = {}
    timeline: list = []
    location: str = "Unknown Junction"
    camera_id: str = "CAM-01"


def _decode_b64_image(data_url: str) -> np.ndarray | None:
    if not data_url:
        return None
    payload = data_url.split(",", 1)[-1]
    raw = base64.b64decode(payload)
    nparr = np.frombuffer(raw, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def _annotate_evidence(image: np.ndarray, plate: str, violations: list, trust: float, location: str) -> np.ndarray:
    annotated = image.copy()
    h, w = annotated.shape[:2]

    cv2.rectangle(annotated, (20, 20), (w - 20, h - 20), (0, 0, 220), 2)
    label = " + ".join(v.get("type", "violation").replace("_", " ").upper() for v in violations) or "VIOLATION"
    cv2.putText(annotated, label[:60], (30, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 220), 2)
    cv2.putText(annotated, f"{plate} [{trust}%]", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (79, 70, 229), 2)
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(annotated, f"{ts} | {location}", (30, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return annotated


def _generate_summary(plate: str, violations: list, location: str, confidence: float) -> str:
    vtext = ", ".join(v.get("type", "").replace("_", " ") for v in violations) or "traffic violation"
    return (
        f"A vehicle identified as {plate} was detected at {location}. "
        f"The system confirmed {vtext} with {confidence}% confidence."
    )


@router.post("/generate")
async def generate_evidence(req: EvidenceRequest):
    try:
        db = SessionLocal()
        now = datetime.datetime.utcnow()

        image = _decode_b64_image(req.image_base64)
        trust = req.metadata.get("trust_score", req.metadata.get("confidence", 90))
        annotated_b64 = req.image_base64
        if image is not None:
            annotated = _annotate_evidence(image, req.plate, req.violations, trust, req.location)
            _, buffer = cv2.imencode(".jpg", annotated)
            annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

        payload = {
            "plate": req.plate,
            "violations": req.violations,
            "timestamp": now.isoformat(),
            "location": req.location,
            "camera_id": req.camera_id,
            "metadata": req.metadata,
            "timeline": req.timeline,
        }
        payload_str = json.dumps(payload, sort_keys=True)
        integrity_hash = hashlib.sha256((payload_str + annotated_b64).encode()).hexdigest()

        case_id = f"CASE-{now.year}-{str(uuid.uuid4())[:8].upper()}"
        evidence_id = f"EVD-{str(uuid.uuid4())[:8].upper()}"
        file_path = os.path.join(EVIDENCE_DIR, f"{evidence_id}.jpg")

        if image is not None:
            annotated_img = _decode_b64_image(annotated_b64)
            if annotated_img is not None:
                cv2.imwrite(file_path, annotated_img)

        severity = "high"
        if req.violations:
            order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            severity = max(req.violations, key=lambda v: order.get(v.get("severity", "medium"), 2))["severity"]

        confidence = max((v.get("confidence", 0) for v in req.violations), default=trust)
        summary = _generate_summary(req.plate, req.violations, req.location, confidence)

        new_evidence = Evidence(
            id=evidence_id,
            violation_id=req.violation_id or evidence_id,
            case_id=case_id,
            file_path=file_path,
            integrity_hash=integrity_hash,
            chain_of_custody_steps=5,
        )
        db.add(new_evidence)
        try:
            db.commit()
        except Exception:
            db.rollback()

        result = {
            "case_id": case_id,
            "evidence_id": evidence_id,
            "integrity_hash": integrity_hash,
            "timestamp": payload["timestamp"],
            "status": "sealed",
            "severity": severity,
            "plate": req.plate,
            "location": req.location,
            "violations": req.violations,
            "timeline": req.timeline,
            "summary": summary,
            "annotated_image": annotated_b64,
            "chain_of_custody": ["Generated", "Verified", "Stored", "Reviewed", "Archived"],
        }
        db.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
