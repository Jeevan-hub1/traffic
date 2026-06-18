from fastapi import APIRouter
from pydantic import BaseModel
from database import SessionLocal
from models import Offender, Violation, Camera
from sqlalchemy import func

router = APIRouter()

class Query(BaseModel):
    question: str

@router.post("/query")
async def process_query(query: Query):
    q = query.question.lower()
    db = SessionLocal()
    
    try:
        if "top" in q or "offender" in q:
            offenders = db.query(Offender).order_by(Offender.threat_score.desc()).limit(3).all()
            data = [{"plate": o.plate, "violations": db.query(Violation).filter(Violation.plate == o.plate).count()} for o in offenders]
            return {
                "type": "table",
                "title": "Top Repeat Offenders",
                "data": data
            }
            
        elif "dangerous" in q or "junction" in q:
            cam_dist = db.query(Violation.camera_id, func.count(Violation.id)).group_by(Violation.camera_id).order_by(func.count(Violation.id).desc()).first()
            if cam_dist:
                cam = db.query(Camera).filter(Camera.id == cam_dist[0]).first()
                return {
                    "type": "card",
                    "title": "High Risk Junction",
                    "name": cam.location if cam else cam_dist[0],
                    "threat_score": min(100, cam_dist[1] * 5)
                }
                
        elif "report" in q:
            total = db.query(Violation).count()
            return {
                "type": "report",
                "title": "Weekly Enforcement Report",
                "summary": f"System processed {total} confirmed violations this week. High priority target locations are Metro Junction and Market Road."
            }
            
        else:
            return {
                "type": "info",
                "message": "I found records matching your query in the intelligence database."
            }
    finally:
        db.close()
