from fastapi import APIRouter
from database import SessionLocal
from models import Violation, Camera, Offender, Evidence
from sqlalchemy import func
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/dashboard")
async def get_command_center():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_today = db.query(Violation).filter(Violation.timestamp >= today_start).count()
        total_all = db.query(Violation).count()
        active_alerts = db.query(Violation).filter(Violation.severity.in_(["high", "critical"])).count()
        cameras_online = db.query(Camera).filter(Camera.status == "online").count()
        evidence_count = db.query(Evidence).count()
        pending = db.query(Violation).filter(Violation.severity == "medium").count()

        recent = db.query(Violation).order_by(Violation.timestamp.desc()).limit(8).all()
        feed = [{
            "id": v.id,
            "type": str(v.type).replace("_", " ").title(),
            "plate": v.plate,
            "severity": v.severity,
            "confidence": v.confidence,
            "time": v.timestamp.strftime("%H:%M:%S") if v.timestamp else "",
            "location": db.query(Camera).filter(Camera.id == v.camera_id).first().location if v.camera_id else "Unknown",
        } for v in recent]

        by_type = db.query(Violation.type, func.count(Violation.id)).group_by(Violation.type).all()
        violation_types = [{"name": str(t).replace("_", " ").title(), "value": c} for t, c in by_type]

        trend = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            count = db.query(Violation).filter(
                Violation.timestamp >= day,
                Violation.timestamp < day + timedelta(days=1),
            ).count()
            trend.append({"time": day.strftime("%a"), "violations": count})

        junctions = []
        for cam in db.query(Camera).all():
            vcount = db.query(Violation).filter(Violation.camera_id == cam.id).count()
            safety = max(0, min(100, 100 - vcount * 3))
            junctions.append({
                "name": cam.location,
                "violations": vcount,
                "safety_score": safety,
                "risk": "critical" if safety < 30 else "high" if safety < 50 else "medium",
            })
        junctions.sort(key=lambda j: j["violations"], reverse=True)

        repeat = db.query(Violation.plate, func.count(Violation.id)).group_by(Violation.plate).order_by(
            func.count(Violation.id).desc()
        ).limit(5).all()

        return {
            "stats": {
                "totalToday": total_today or total_all // 7,
                "activeAlerts": active_alerts,
                "camerasOnline": cameras_online,
                "evidenceGenerated": evidence_count,
                "pendingReview": pending,
                "riskScore": min(100, active_alerts * 8 + 20),
            },
            "live_feed": feed,
            "violation_types": violation_types,
            "trend": trend,
            "junctions": junctions[:6],
            "repeat_offenders": [{"plate": p, "violations": c} for p, c in repeat],
        }
    finally:
        db.close()
