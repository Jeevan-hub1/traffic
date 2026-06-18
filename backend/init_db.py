from database import engine, SessionLocal
from models import Base, Camera, Offender, Violation
import datetime
import random

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Camera).count() == 0:
        cams = [
            Camera(id="CAM-01", location="Metro Junction", lat=17.385, lng=78.487),
            Camera(id="CAM-02", location="Market Road", lat=17.387, lng=78.490),
            Camera(id="CAM-03", location="Tech Park Exit", lat=17.391, lng=78.495),
            Camera(id="CAM-04", location="Outer Ring Road", lat=17.400, lng=78.500),
            Camera(id="CAM-05", location="City Center Signal", lat=17.389, lng=78.492),
            Camera(id="CAM-06", location="Highway Entry", lat=17.395, lng=78.498),
            Camera(id="CAM-07", location="School Zone", lat=17.382, lng=78.485),
            Camera(id="CAM-08", location="Hospital Gate", lat=17.388, lng=78.493),
        ]
        db.add_all(cams)
        db.commit()

    if db.query(Offender).count() == 0:
        offenders = [
            Offender(plate="KA05EF9012", vehicle_type="Motorcycle", color="Black", threat_score=85, warrants_pending=False),
            Offender(plate="TN22CD5678", vehicle_type="Car", color="White", threat_score=94, warrants_pending=True),
            Offender(plate="MH12AB9012", vehicle_type="Truck", color="Red", threat_score=60, warrants_pending=False),
            Offender(plate="DL01XY3456", vehicle_type="Motorcycle", color="Blue", threat_score=72, warrants_pending=False),
            Offender(plate="KA03JK7890", vehicle_type="Car", color="Silver", threat_score=88, warrants_pending=True),
            Offender(plate="MH14GH2345", vehicle_type="Motorcycle", color="Red", threat_score=91, warrants_pending=True),
            Offender(plate="TN07KL6789", vehicle_type="SUV", color="Black", threat_score=65, warrants_pending=False),
            Offender(plate="KA02MN3456", vehicle_type="Car", color="White", threat_score=78, warrants_pending=False),
            Offender(plate="MH11PQ9012", vehicle_type="Truck", color="Yellow", threat_score=55, warrants_pending=False),
            Offender(plate="DL05RS4567", vehicle_type="Motorcycle", color="Green", threat_score=82, warrants_pending=False),
        ]
        db.add_all(offenders)
        db.commit()

    if db.query(Violation).count() == 0:
        plates = ["KA05EF9012", "TN22CD5678", "MH12AB9012", "DL01XY3456", "KA03JK7890", 
                  "MH14GH2345", "TN07KL6789", "KA02MN3456", "MH11PQ9012", "DL05RS4567"]
        cameras = ["CAM-01", "CAM-02", "CAM-03", "CAM-04", "CAM-05", "CAM-06", "CAM-07", "CAM-08"]
        violation_types = ["triple_riding", "helmet_violation", "helmet_non_compliance", 
                           "red_light_violation", "stop_line_violation", "seatbelt_non_compliance",
                           "wrong_side_driving", "illegal_parking", "plate_occlusion"]
        
        for _ in range(150):
            db.add(Violation(
                id=f"VIO-{random.randint(1000, 9999)}",
                camera_id=random.choice(cameras),
                plate=random.choice(plates),
                type=random.choice(violation_types),
                severity=random.choice(["low", "medium", "high", "critical"]),
                confidence=round(random.uniform(75.0, 99.9), 1),
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(0, 720))
            ))
        db.commit()

    db.close()
    print("Database initialized and seeded.")

if __name__ == "__main__":
    init_db()
