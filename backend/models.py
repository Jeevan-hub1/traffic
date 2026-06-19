from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(String, primary_key=True, index=True)
    location = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="online")

class Offender(Base):
    __tablename__ = "offenders"
    plate = Column(String, primary_key=True, index=True)
    vehicle_type = Column(String)
    color = Column(String)
    threat_score = Column(Integer, default=0)
    warrants_pending = Column(Boolean, default=False)

class Violation(Base):
    __tablename__ = "violations"
    id = Column(String, primary_key=True, index=True)  # VIO-xxxx
    camera_id = Column(String, ForeignKey("cameras.id"))
    plate = Column(String, ForeignKey("offenders.plate"))
    type = Column(String) # triple_riding, helmet_violation, etc.
    severity = Column(String) # low, medium, high, critical
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True, index=True)  # EVD-xxxx
    violation_id = Column(String, ForeignKey("violations.id"))
    case_id = Column(String)
    file_path = Column(String)
    integrity_hash = Column(String)
    chain_of_custody_steps = Column(Integer, default=1)
    generation_time = Column(DateTime, default=datetime.datetime.utcnow)
