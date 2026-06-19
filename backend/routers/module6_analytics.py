from fastapi import APIRouter, Query
from ..database import SessionLocal
from ..models import Violation, Offender
from sqlalchemy import func
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter()

VIOLATION_COLORS = {
    "triple_riding": "#dc2626",
    "helmet_violation": "#d97706",
    "helmet_non_compliance": "#d97706",
    "seatbelt_non_compliance": "#7c3aed",
    "wrong_side_driving": "#ea580c",
    "red_light_violation": "#dc2626",
    "illegal_parking": "#0891b2",
}


@router.get("/summary")
def get_analytics_summary():
    db = SessionLocal()
    try:
        total_violations = db.query(Violation).count()

        type_dist = db.query(Violation.type, func.count(Violation.id)).group_by(Violation.type).all()
        violation_types = [
            {
                "name": str(t[0]).replace("_", " ").title(),
                "value": t[1],
                "color": VIOLATION_COLORS.get(str(t[0]), "#4f46e5"),
            }
            for t in type_dist
        ]

        camera_dist = db.query(Violation.camera_id, func.count(Violation.id)).group_by(Violation.camera_id).all()
        threat_map = [{"camera": c[0], "violations": c[1]} for c in camera_dist]

        recent = db.query(Violation).order_by(Violation.timestamp.desc()).limit(10).all()
        feed = [
            {
                "id": r.id,
                "type": str(r.type).replace("_", " ").title(),
                "plate": r.plate,
                "severity": r.severity,
            }
            for r in recent
        ]

        repeat = (
            db.query(Violation.plate, func.count(Violation.id).label("count"))
            .group_by(Violation.plate)
            .having(func.count(Violation.id) > 1)
            .order_by(func.count(Violation.id).desc())
            .limit(10)
            .all()
        )
        repeat_offenders = [{"plate": r[0], "violations": r[1]} for r in repeat]

        return {
            "total_violations": total_violations,
            "violation_types": violation_types,
            "threat_map": threat_map,
            "recent_feed": feed,
            "repeat_offenders": repeat_offenders,
            "repeat_offender_count": len(repeat),
            "avg_verification_ms": 82,
            "trend_vs_last_week": 12.4,
        }
    finally:
        db.close()


@router.get("/trends")
def get_trends(days: int = Query(default=7, ge=1, le=30)):
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        trend = []
        for i in range(days - 1, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = db.query(Violation).filter(
                Violation.timestamp >= day_start,
                Violation.timestamp < day_end,
            ).count()
            trend.append({
                "time": day_start.strftime("%a"),
                "date": day_start.strftime("%Y-%m-%d"),
                "violations": count,
            })

        violations = db.query(Violation).all()
        hours = defaultdict(int)
        for v in violations:
            if v.timestamp:
                hours[v.timestamp.hour] += 1

        time_distribution = [
            {"time": f"{h:02d}:00", "val": hours.get(h, 0)}
            for h in [0, 4, 8, 12, 16, 20]
        ]

        return {"trend": trend, "time_distribution": time_distribution}
    finally:
        db.close()


@router.get("/insights")
def get_insights():
    db = SessionLocal()
    try:
        by_type = db.query(Violation.type, func.count(Violation.id)).group_by(Violation.type).all()
        top_type = max(by_type, key=lambda x: x[1])[0] if by_type else "helmet_violation"
        by_camera = db.query(Violation.camera_id, func.count(Violation.id)).group_by(Violation.camera_id).all()
        hotspot = max(by_camera, key=lambda x: x[1])[0] if by_camera else "Metro Junction"

        return {
            "insights": [
                {
                    "type": "peak_hours",
                    "title": "Peak Violation Hours",
                    "detail": f"Deploy additional enforcement units at {hotspot} between 08:00 - 10:00 AM.",
                    "priority": "high",
                },
                {
                    "type": "surge",
                    "title": f"Surge in {str(top_type).replace('_', ' ').title()}",
                    "detail": f"{str(top_type).replace('_', ' ').title()} remains the dominant violation category in stored records.",
                    "priority": "medium",
                },
                {
                    "type": "optimization",
                    "title": "System Optimization",
                    "detail": "Module 1 adaptive enhancement is active. Night-frame gamma thresholds can be tuned per camera.",
                    "priority": "low",
                },
            ],
            "hotspot": hotspot,
        }
    finally:
        db.close()
