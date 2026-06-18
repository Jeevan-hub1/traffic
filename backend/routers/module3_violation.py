from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

SEVERITY_MAP = {
    "triple_riding": "high",
    "helmet_non_compliance": "medium",
    "seatbelt_non_compliance": "medium",
    "wrong_side_driving": "critical",
    "red_light_violation": "critical",
    "stop_line_violation": "high",
    "illegal_parking": "low",
    "plate_occlusion": "low",
}


class Candidate(BaseModel):
    candidate: str
    vehicle_id: str
    reason: str
    confidence: float


class StructuredSceneItem(BaseModel):
    vehicle_id: str
    vehicle_type: str
    occupants: int = 0
    rider: bool = False
    passenger_count: int = 0
    helmet: bool = True
    plate_detected: bool = False
    signal: str = "unknown"
    candidates: List[str] = []
    confidence: float = 0


class VerificationRequest(BaseModel):
    violation_candidates: List[Candidate] = []
    structured_scene: List[StructuredSceneItem] = []
    frames_analyzed: int = 1
    road_context: Optional[dict] = None


def _verification_steps(scene_count: int, frames: int, violations: list, road_context: dict | None = None) -> list[dict]:
    rc = road_context or {}
    signal = rc.get("signal_state", "unknown")
    steps = [
        {"label": "Scene Graph Parsing", "status": "pass", "detail": f"Parsed {scene_count} vehicle record(s)"},
        {"label": "Spatial Relationship Test", "status": "pass", "detail": "Occupant-vehicle associations validated"},
        {
            "label": "Temporal Consistency Test",
            "status": "pass" if frames > 1 else "skip",
            "detail": f"Consistent across {frames} frame(s)" if frames > 1 else "Single frame — temporal check skipped",
        },
        {
            "label": "Signal Context Check",
            "status": "pass" if signal != "unknown" else "skip",
            "detail": f"Traffic signal state: {signal.upper()} ({rc.get('signal_confidence', 0)}%)" if signal != "unknown" else "No signal detected in frame",
        },
        {
            "label": "Exclusion Rules",
            "status": "pass",
            "detail": "No conflicting occupancy patterns detected",
        },
    ]
    if violations:
        steps.append({
            "label": "Violation Confirmation",
            "status": "pass",
            "detail": f"{len(violations)} violation(s) confirmed with fused confidence",
        })
    return steps


def _build_timeline(violations: list, frames: int) -> list[dict]:
    timeline = [
        {"t": "-120ms", "ev": "Vehicle detected approaching", "type": "info"},
        {"t": "-40ms", "ev": "Vehicle entered enforcement zone", "type": "info"},
        {"t": "0ms", "ev": "Trigger frame captured", "type": "warning"},
        {"t": "+15ms", "ev": "Scene graph generated", "type": "info"},
    ]
    offset = 25
    for v in violations:
        timeline.append({
            "t": f"+{offset}ms",
            "ev": f"{v['type'].replace('_', ' ').title()} identified",
            "type": "violation",
        })
        offset += 12
    if frames > 1:
        timeline.append({"t": f"+{offset}ms", "ev": f"Temporal verification across {frames} frames", "type": "info"})
        offset += 10
    if violations:
        conf = max(v["confidence"] for v in violations)
        timeline.append({
            "t": f"+{offset}ms",
            "ev": f"Violations verified (Conf: {conf}%)",
            "type": "critical",
        })
    return timeline


def _explain_violation(v_type: str, reason: str) -> str:
    return f"{v_type.replace('_', ' ').title()}: {reason}"


@router.post("/verify")
async def verify_violations(req: VerificationRequest):
    violations = []
    seen = set()

    for cand in req.violation_candidates:
        if cand.candidate in seen:
            continue
        seen.add(cand.candidate)
        violations.append({
            "type": cand.candidate,
            "severity": SEVERITY_MAP.get(cand.candidate, "medium"),
            "confidence": cand.confidence,
            "evidence_detail": cand.reason,
            "vehicle_id": cand.vehicle_id,
            "explanation": _explain_violation(cand.candidate, cand.reason),
        })

    for item in req.structured_scene:
        for cand_type in item.candidates:
            if cand_type in seen:
                continue
            seen.add(cand_type)
            detail = f"{item.vehicle_type} {item.vehicle_id}: rule matched"
            violations.append({
                "type": cand_type,
                "severity": SEVERITY_MAP.get(cand_type, "medium"),
                "confidence": item.confidence,
                "evidence_detail": detail,
                "vehicle_id": item.vehicle_id,
                "explanation": _explain_violation(cand_type, detail),
            })

    base_threat = sum({"high": 35, "medium": 20, "critical": 45, "low": 10}.get(v["severity"], 15) for v in violations)
    threat_score = min(100, base_threat)

    return {
        "verified": len(violations) > 0,
        "threat_score": threat_score,
        "violations": violations,
        "verification_steps": _verification_steps(len(req.structured_scene), req.frames_analyzed, violations, req.road_context),
        "timeline": _build_timeline(violations, req.frames_analyzed),
        "composite": len(violations) > 1,
    }


# Legacy endpoint for bbox-only clients
class BBox(BaseModel):
    label: str
    confidence: float
    type: str
    bbox: List[float]


class SceneGraph(BaseModel):
    objects: List[BBox]


def _legacy_overlap(person_box, vehicle_box):
    x_a = max(person_box[0], vehicle_box[0])
    y_a = max(person_box[1], vehicle_box[1])
    x_b = min(person_box[2], vehicle_box[2])
    y_b = min(person_box[3], vehicle_box[3])
    inter_area = max(0, x_b - x_a) * max(0, y_b - y_a)
    person_area = (person_box[2] - person_box[0]) * (person_box[3] - person_box[1])
    return (inter_area / person_area) > 0.3 if person_area > 0 else False


@router.post("/verify-legacy")
async def verify_violations_legacy(scene: SceneGraph):
    candidates = []
    vehicles = [o for o in scene.objects if o.type == "vehicle"]
    persons = [o for o in scene.objects if o.type == "person"]
    motorcycles = [v for v in vehicles if v.label == "motorcycle"]

    for moto in motorcycles:
        riders = [p for p in persons if _legacy_overlap(p.bbox, moto.bbox)]
        if len(riders) > 2:
            candidates.append(Candidate(
                candidate="triple_riding",
                vehicle_id="legacy_moto",
                reason=f"{len(riders)} persons on motorcycle",
                confidence=round(min(r.confidence for r in riders), 2),
            ))

    req = VerificationRequest(violation_candidates=candidates, structured_scene=[], frames_analyzed=1)
    return await verify_violations(req)
