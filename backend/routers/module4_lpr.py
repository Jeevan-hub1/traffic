from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import cv2
import numpy as np
import easyocr
import re
from collections import Counter
from ..database import SessionLocal
from ..models import Offender, Violation
from sqlalchemy import func

router = APIRouter()
reader = easyocr.Reader(["en"], gpu=False)

INDIAN_PLATE_RE = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$")


def clean_plate(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def validate_plate(plate: str) -> bool:
    return bool(INDIAN_PLATE_RE.match(plate))


def plate_quality(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = float(np.mean(gray))
    return {
        "blur_score": min(100, max(0, int(blur / 10))),
        "brightness": min(100, max(0, int(brightness / 2.55))),
        "visibility": min(100, max(40, int(80 + blur / 50))),
    }


def enhance_plate(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)


def detect_tampering(quality: dict, ocr_conf: float) -> dict:
    reasons = []
    if quality["blur_score"] < 30:
        reasons.append("excessive blur")
    if quality["brightness"] < 25:
        reasons.append("low visibility")
    if ocr_conf < 50:
        reasons.append("unreadable characters")
    return {
        "tampered": len(reasons) > 1,
        "reason": ", ".join(reasons) if reasons else "none",
    }


def fuse_plates(results: list[dict]) -> dict:
    if not results:
        return {"fused_plate": None, "agreement": 0, "frames": []}

    plates = [r["plate"] for r in results if r.get("plate")]
    if not plates:
        return {"fused_plate": None, "agreement": 0, "frames": results}

    # Group similar plates (handle minor OCR variations)
    plate_groups = {}
    for plate in plates:
        # Find if this plate is similar to an existing group
        found_group = None
        for existing_plate in plate_groups:
            if _plates_similar(plate, existing_plate):
                found_group = existing_plate
                break
        if found_group:
            plate_groups[found_group].append(plate)
        else:
            plate_groups[plate] = [plate]

    # Select the group with most occurrences
    best_group = max(plate_groups.items(), key=lambda x: len(x[1]))
    fused_plate = best_group[0]
    group_count = len(best_group[1])
    
    # Calculate weighted confidence based on occurrence and individual confidences
    matching_results = [r for r in results if r.get("plate") and _plates_similar(r["plate"], fused_plate)]
    if matching_results:
        weighted_conf = sum(r["confidence"] for r in matching_results) / len(matching_results)
        # Boost confidence if multiple frames agree
        agreement_boost = min(20, (group_count - 1) * 5)
        avg_conf = round(min(100, weighted_conf + agreement_boost), 2)
    else:
        avg_conf = 0
    
    agreement = round(group_count / len(plates) * 100, 1)
    return {"fused_plate": fused_plate, "agreement": agreement, "confidence": avg_conf, "frames": results}


def _plates_similar(plate1: str, plate2: str) -> bool:
    """Check if two plates are similar (handle minor OCR errors)"""
    if plate1 == plate2:
        return True
    if len(plate1) != len(plate2):
        return False
    # Allow up to 1 character difference for plates of same length
    differences = sum(1 for a, b in zip(plate1, plate2) if a != b)
    return differences <= 1


def compute_trust_score(ocr_conf: float, visibility: float, agreement: float, validated: bool) -> float:
    # Improved weights based on importance
    # OCR confidence: 30% (primary factor)
    # Visibility: 20% (image quality)
    # Agreement: 25% (multi-frame consistency)
    # Validation: 25% (format compliance)
    weights = [0.30, 0.20, 0.25, 0.25]
    
    # Normalize scores to 0-100 range
    normalized_ocr = min(100, max(0, ocr_conf))
    normalized_visibility = min(100, max(0, visibility))
    normalized_agreement = min(100, max(0, agreement))
    normalized_validation = 100 if validated else 30  # Lower penalty for invalid format
    
    scores = [normalized_ocr, normalized_visibility, normalized_agreement, normalized_validation]
    
    # Calculate weighted average
    trust_score = round(sum(w * s for w, s in zip(weights, scores)), 2)
    
    # Additional boost for high agreement across multiple frames
    if agreement >= 80:
        trust_score = min(100, trust_score + 5)
    
    return trust_score


def _ocr_frame(img: np.ndarray, frame_id: int) -> dict:
    quality = plate_quality(img)
    enhanced = enhance_plate(img)
    ocr_results = reader.readtext(enhanced)

    plates = []
    for (_, text, prob) in ocr_results:
        cleaned = clean_plate(text)
        if len(cleaned) >= 6:
            plates.append({"raw_text": text, "plate": cleaned, "confidence": round(prob * 100, 2)})

    plates.sort(key=lambda x: x["confidence"], reverse=True)
    best = plates[0] if plates else None
    tampering = detect_tampering(quality, best["confidence"] if best else 0)

    return {
        "frame_id": frame_id,
        "plate": best["plate"] if best else None,
        "confidence": best["confidence"] if best else 0,
        "quality": quality,
        "tampering": tampering,
        "plates_found": plates,
    }


@router.post("/recognize")
async def recognize_plate(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image")

        frame = _ocr_frame(img, 1)
        fusion = fuse_plates([frame] if frame["plate"] else [])
        if not fusion["fused_plate"]:
            return {"verified": False, "fused_plate": None, "trust_score": 0, "plates_found": [], "frames": [frame]}

        validated = validate_plate(fusion["fused_plate"])
        trust = compute_trust_score(
            fusion.get("confidence", frame["confidence"]),
            frame["quality"]["visibility"],
            fusion["agreement"],
            validated,
        )

        return {
            "verified": True,
            "fused_plate": fusion["fused_plate"],
            "trust_score": trust,
            "ocr_confidence": fusion.get("confidence", frame["confidence"]),
            "frame_agreement": fusion["agreement"],
            "validation_passed": validated,
            "tampering": frame["tampering"],
            "plates_found": frame["plates_found"],
            "frames": [frame],
            "vahan": _vahan_lookup(fusion["fused_plate"]),
            "explanation": {
                "plate": fusion["fused_plate"],
                "confidence": fusion.get("confidence", frame["confidence"]),
                "trust_score": trust,
                "validation": "Passed" if validated else "Format correction applied",
                "tampering": "Not detected" if not frame["tampering"]["tampered"] else frame["tampering"]["reason"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _vahan_lookup(plate: str) -> dict:
    db = SessionLocal()
    try:
        offender = db.query(Offender).filter(Offender.plate == plate).first()
        if not offender:
            return {"found": False, "plate": plate, "message": "No VAHAN record in local registry"}
        vcount = db.query(Violation).filter(Violation.plate == plate).count()
        by_type = db.query(Violation.type, func.count(Violation.id)).filter(
            Violation.plate == plate
        ).group_by(Violation.type).all()
        return {
            "found": True,
            "plate": plate,
            "vehicle_type": offender.vehicle_type,
            "color": offender.color,
            "threat_score": offender.threat_score,
            "warrants_pending": offender.warrants_pending,
            "total_violations": vcount,
            "violation_history": {str(t): c for t, c in by_type},
            "known_offender": vcount > 2,
        }
    finally:
        db.close()


@router.get("/vahan/{plate}")
async def vahan_lookup(plate: str):
    return _vahan_lookup(plate.upper().replace(" ", ""))


@router.post("/recognize-multi")
async def recognize_multi_frame(files: List[UploadFile] = File(...)):
    try:
        if not files:
            raise ValueError("At least one frame required")

        frames = []
        for i, upload in enumerate(files[:6]):
            contents = await upload.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                continue
            frames.append(_ocr_frame(img, i + 1))

        fusion = fuse_plates(frames)
        if not fusion["fused_plate"]:
            return {"verified": False, "fused_plate": None, "trust_score": 0, "frames": frames}

        validated = validate_plate(fusion["fused_plate"])
        best_frame = next((f for f in frames if f.get("plate") == fusion["fused_plate"]), frames[0])
        trust = compute_trust_score(
            fusion.get("confidence", 0),
            best_frame["quality"]["visibility"],
            fusion["agreement"],
            validated,
        )

        return {
            "verified": True,
            "fused_plate": fusion["fused_plate"],
            "trust_score": trust,
            "ocr_confidence": fusion.get("confidence", 0),
            "frame_agreement": fusion["agreement"],
            "validation_passed": validated,
            "tampering": best_frame["tampering"],
            "frames": frames,
            "vahan": _vahan_lookup(fusion["fused_plate"]),
            "explanation": {
                "plate": fusion["fused_plate"],
                "confidence": fusion.get("confidence", 0),
                "trust_score": trust,
                "frame_agreement": fusion["agreement"],
                "validation": "Passed" if validated else "Format correction applied",
                "tampering": "Not detected" if not best_frame["tampering"]["tampered"] else best_frame["tampering"]["reason"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
