"""Module 2 — Scene understanding, role classification, scene graph, violation candidates."""

from __future__ import annotations

import cv2
import numpy as np

from .traffic_signal import (
    analyze_traffic_signals,
    vehicle_crossed_stop_line,
    vehicle_in_junction,
)

VEHICLE_LABELS = {"car", "motorcycle", "bus", "truck", "bicycle"}
PERSON_LABEL = "person"
TRAFFIC_LIGHT_LABEL = "traffic light"


def to_python_type(value):
    """Convert NumPy types to Python native types for JSON serialization."""
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    elif isinstance(value, (np.floating, np.float64, np.float32)):
        return float(value)
    elif isinstance(value, np.bool_):
        return bool(value)
    elif isinstance(value, np.ndarray):
        return value.tolist()
    elif isinstance(value, dict):
        return {k: to_python_type(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [to_python_type(v) for v in value]
    return value


def overlap_ratio(inner: list[float], outer: list[float]) -> float:
    x_a = max(inner[0], outer[0])
    y_a = max(inner[1], outer[1])
    x_b = min(inner[2], outer[2])
    y_b = min(inner[3], outer[3])
    inter = max(0, x_b - x_a) * max(0, y_b - y_a)
    inner_area = (inner[2] - inner[0]) * (inner[3] - inner[1])
    return inter / inner_area if inner_area > 0 else 0.0


def center(box: list[float]) -> tuple[float, float]:
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def classify_role(person_bbox: list[float], vehicle: dict | None, img_w: int) -> str:
    if vehicle is None:
        return "pedestrian"
    label = vehicle["label"]
    vx1, vy1, vx2, vy2 = vehicle["bbox"]
    px, py = center(person_bbox)
    if label == "motorcycle":
        if vy1 <= py <= vy2 and vx1 <= px <= vx2:
            return "rider"
        if overlap_ratio(person_bbox, vehicle["bbox"]) > 0.2:
            return "passenger"
        return "pedestrian"
    if label in ("car", "bus", "truck"):
        driver_side_x = vx1 + (vx2 - vx1) * 0.25
        if overlap_ratio(person_bbox, vehicle["bbox"]) > 0.25:
            if px < driver_side_x:
                return "driver"
            return "passenger"
    return "pedestrian"


def detect_helmet_status(image: np.ndarray, person_bbox: list[float], role: str) -> dict:
    if role not in ("rider", "driver"):
        return {"detected": None, "status": "not_applicable", "confidence": 0}

    x1, y1, x2, y2 = [int(v) for v in person_bbox]
    h = y2 - y1
    head = image[max(0, y1): max(0, y1 + int(h * 0.35)), max(0, x1): max(0, x2)]
    if head.size == 0:
        return {"detected": False, "status": "missing", "confidence": 50}

    try:
        gray_head = cv2.cvtColor(head, cv2.COLOR_BGR2GRAY)
        
        edge_density = float(cv2.Laplacian(gray_head, cv2.CV_64F).var())
        bright_pixels = np.sum(gray_head > 100) / gray_head.size
        dark_pixels = np.sum(gray_head < 50) / gray_head.size
        
        head_region_has_structure = edge_density > 50 and bright_pixels > 0.05
        non_uniform = abs(bright_pixels - dark_pixels) > 0.05
        
        helmet_likely = head_region_has_structure and non_uniform
        confidence = int(min(95, max(55, 60 + edge_density / 50 + bright_pixels * 30)))
        
        return {
            "detected": bool(helmet_likely),
            "status": "present" if helmet_likely else "unknown",
            "confidence": confidence,
        }
    except Exception:
        return {"detected": False, "status": "unknown", "confidence": 40}


def detect_seatbelt_status(image: np.ndarray, person_bbox: list[float], role: str) -> dict:
    if role != "driver":
        return {"detected": None, "status": "not_applicable", "confidence": 0}

    x1, y1, x2, y2 = [int(v) for v in person_bbox]
    torso = image[max(0, y1 + int((y2 - y1) * 0.2)): y2, x1:x2]
    if torso.size == 0:
        return {"detected": False, "status": "unknown", "confidence": 40}

    try:
        gray = cv2.cvtColor(torso, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 30, 100)
        
        edge_count = float(np.sum(edges > 0))
        edge_ratio = edge_count / edges.size if edges.size > 0 else 0
        
        vertical_edges = cv2.Sobel(blur, cv2.CV_64F, 1, 0, ksize=3)
        vertical_ratio = float(np.sum(np.abs(vertical_edges) > 50)) / vertical_edges.size
        
        belt_detected = edge_ratio > 0.01 and vertical_ratio > 0.01
        confidence = int(min(90, max(50, 55 + edge_ratio * 1000 + vertical_ratio * 500)))
        
        return {
            "detected": bool(belt_detected),
            "status": "present" if belt_detected else "unknown",
            "confidence": confidence,
        }
    except Exception:
        return {"detected": False, "status": "unknown", "confidence": 40}


def find_plate_region(image: np.ndarray, vehicle_bbox: list[float]) -> dict | None:
    x1, y1, x2, y2 = [int(v) for v in vehicle_bbox]
    roi = image[y1:y2, x1:x2]
    if roi.size == 0:
        return None
    h, w = roi.shape[:2]
    plate_roi = roi[int(h * 0.55): h, int(w * 0.15): int(w * 0.85)]
    if plate_roi.size == 0:
        return None
    gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    return {
        "bbox": [x1 + w * 0.15, y1 + h * 0.55, x1 + w * 0.85, y1 + h * 0.95],
        "confidence": min(96, max(60, int(65 + blur_score / 30))),
        "detected": bool(blur_score > 50),
    }


def infer_road_context(image: np.ndarray, vehicles: list[dict], signal_data: dict | None = None) -> dict:
    h, w = image.shape[:2]
    lower = image[int(h * 0.7):, :]
    gray = cv2.cvtColor(lower, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    line_density = float(np.sum(edges > 0)) / edges.size

    stop_line_y = int(h * 0.72)
    stop_band = image[max(0, stop_line_y - 8): min(h, stop_line_y + 8), :]
    stop_edges = cv2.Canny(cv2.cvtColor(stop_band, cv2.COLOR_BGR2GRAY), 40, 120) if stop_band.size else edges
    stop_line_detected = bool(float(np.sum(stop_edges > 0)) / stop_edges.size > 0.03 if stop_edges.size else line_density > 0.02)

    stationary = sum(1 for v in vehicles if (v["bbox"][3] - v["bbox"][1]) > h * 0.15)
    sig = signal_data or {"signal_state": "unknown", "signal_confidence": 0, "signals": []}

    return {
        "stop_line_detected": stop_line_detected,
        "stop_line_y_ratio": 0.72,
        "lane_markings_detected": bool(line_density > 0.015),
        "signal_state": sig.get("signal_state", "unknown"),
        "signal_confidence": sig.get("signal_confidence", 0),
        "traffic_signals": sig.get("signals", []),
        "parking_zone_detected": bool(stationary > 0 and line_density < 0.01),
    }


def fuse_confidence(*scores: float) -> float:
    valid = [s for s in scores if s > 0]
    return round(sum(valid) / len(valid), 2) if valid else 0.0


def generate_violation_candidates(scene: dict, img_h: int = 720) -> list[dict]:
    candidates = []
    road = scene.get("road_context", {})
    signal_state = road.get("signal_state", "unknown")
    signal_conf = road.get("signal_confidence", 0)

    for vehicle in scene["vehicles"]:
        occupants = vehicle.get("occupants", [])
        riders = [o for o in occupants if o["role"] in ("rider", "driver")]

        if vehicle["label"] == "motorcycle" and len(occupants) > 2:
            candidates.append({
                "candidate": "triple_riding",
                "vehicle_id": vehicle["track_id"],
                "reason": f"Occupants: {len(occupants)} > Max: 2",
                "confidence": fuse_confidence(*[o["confidence"] for o in occupants]),
            })

        for rider in riders:
            helmet = rider.get("helmet", {})
            if helmet.get("status") == "missing":
                candidates.append({
                    "candidate": "helmet_non_compliance",
                    "vehicle_id": vehicle["track_id"],
                    "reason": "Rider without helmet detected",
                    "confidence": fuse_confidence(rider["confidence"], helmet.get("confidence", 0)),
                })

        for driver in [o for o in occupants if o["role"] == "driver"]:
            seatbelt = driver.get("seatbelt", {})
            if seatbelt.get("status") == "missing":
                candidates.append({
                    "candidate": "seatbelt_non_compliance",
                    "vehicle_id": vehicle["track_id"],
                    "reason": "Driver without seatbelt detected",
                    "confidence": fuse_confidence(driver["confidence"], seatbelt.get("confidence", 0)),
                })

        if vehicle.get("plate") and not vehicle["plate"].get("detected"):
            candidates.append({
                "candidate": "plate_occlusion",
                "vehicle_id": vehicle["track_id"],
                "reason": "License plate region not clearly visible",
                "confidence": 75,
            })

        bbox = vehicle["bbox"]
        if signal_state == "red" and signal_conf >= 60:
            if vehicle_in_junction(bbox, img_h):
                candidates.append({
                    "candidate": "red_light_violation",
                    "vehicle_id": vehicle["track_id"],
                    "reason": f"Signal RED ({signal_conf}%) + vehicle entered junction",
                    "confidence": fuse_confidence(signal_conf, vehicle["confidence"]),
                })
            elif road.get("stop_line_detected") and vehicle_crossed_stop_line(bbox, img_h):
                candidates.append({
                    "candidate": "stop_line_violation",
                    "vehicle_id": vehicle["track_id"],
                    "reason": f"Signal RED + vehicle crossed stop line",
                    "confidence": fuse_confidence(signal_conf, vehicle["confidence"]),
                })

        if road.get("parking_zone_detected") and vehicle["label"] in ("car", "truck", "bus"):
            vh = bbox[3] - bbox[1]
            if vh > img_h * 0.12:
                candidates.append({
                    "candidate": "illegal_parking",
                    "vehicle_id": vehicle["track_id"],
                    "reason": "Stationary vehicle in restricted zone",
                    "confidence": fuse_confidence(vehicle["confidence"], 70),
                })

    return candidates


def build_scene_graph(scene: dict, candidates: list[dict]) -> dict:
    nodes = []
    edges = []

    # Add road context as nodes
    road = scene.get("road_context", {})
    if road.get("stop_line_detected"):
        nodes.append({
            "id": "stop_line",
            "type": "road_feature",
            "label": "Stop Line",
            "confidence": road.get("signal_confidence", 0),
            "metadata": {"y_ratio": road.get("stop_line_y_ratio", 0.72)}
        })
    if road.get("lane_markings_detected"):
        nodes.append({
            "id": "lane_markings",
            "type": "road_feature",
            "label": "Lane Markings",
            "confidence": 80,
            "metadata": {"detected": True}
        })
    if road.get("parking_zone_detected"):
        nodes.append({
            "id": "parking_zone",
            "type": "road_feature",
            "label": "Parking Zone",
            "confidence": 75,
            "metadata": {"restricted": True}
        })

    # Add traffic signal nodes
    for sig in road.get("traffic_signals", []):
        sid = sig["id"]
        nodes.append({
            "id": sid,
            "type": "traffic_signal",
            "label": f"Signal: {sig['state'].upper()}",
            "confidence": sig["confidence"],
            "metadata": {"bbox": sig.get("bbox"), "state": sig.get("state")}
        })

    # Calculate spatial relationships between vehicles
    vehicle_positions = {}
    for vehicle in scene["vehicles"]:
        vid = vehicle["track_id"]
        bbox = vehicle["bbox"]
        vehicle_positions[vid] = {
            "center": center(bbox),
            "bbox": bbox,
            "label": vehicle["label"]
        }

    # Add vehicle nodes with enhanced metadata
    for vehicle in scene["vehicles"]:
        vid = vehicle["track_id"]
        bbox = vehicle["bbox"]
        v_center = center(bbox)
        
        # Determine position relative to other vehicles
        position_context = "unknown"
        for other_vid, other_data in vehicle_positions.items():
            if other_vid != vid:
                other_center = other_data["center"]
                dx = other_center[0] - v_center[0]
                dy = other_center[1] - v_center[1]
                if abs(dx) < 50 and dy < -50:
                    position_context = "behind"
                elif abs(dx) < 50 and dy > 50:
                    position_context = "ahead"
                elif dx < -50:
                    position_context = "left"
                elif dx > 50:
                    position_context = "right"
                break

        nodes.append({
            "id": vid,
            "type": "vehicle",
            "label": f"{vehicle['label'].title()} ({vid})",
            "confidence": vehicle["confidence"],
            "metadata": {
                "position": position_context,
                "bbox": bbox,
                "center": v_center,
                "occupants_count": len(vehicle.get("occupants", [])),
                "plate_detected": bool(vehicle.get("plate", {}).get("detected"))
            }
        })

        # Add spatial edges to nearby vehicles
        for other_vid, other_data in vehicle_positions.items():
            if other_vid != vid:
                distance = ((v_center[0] - other_data["center"][0])**2 + 
                           (v_center[1] - other_data["center"][1])**2)**0.5
                if distance < 200:  # Only connect nearby vehicles
                    edges.append({
                        "source": vid,
                        "target": other_vid,
                        "relation": "nearby",
                        "metadata": {"distance": round(distance, 1)}
                    })

        # Add occupant nodes
        for occ in vehicle.get("occupants", []):
            oid = occ["id"]
            nodes.append({
                "id": oid,
                "type": "person",
                "label": f"{occ['role'].title()} ({oid})",
                "confidence": occ["confidence"],
                "metadata": {
                    "role": occ["role"],
                    "helmet_status": occ.get("helmet", {}).get("status", "unknown"),
                    "seatbelt_status": occ.get("seatbelt", {}).get("status", "unknown")
                }
            })
            edges.append({
                "source": vid,
                "target": oid,
                "relation": occ["role"],
                "metadata": {"confidence": occ["confidence"]}
            })

            helmet = occ.get("helmet", {})
            if helmet.get("status") == "missing":
                hid = f"{oid}_helmet"
                nodes.append({
                    "id": hid,
                    "type": "equipment",
                    "label": "Helmet Missing",
                    "confidence": helmet.get("confidence", 0),
                    "metadata": {"severity": "high"}
                })
                edges.append({
                    "source": oid,
                    "target": hid,
                    "relation": "requires",
                    "metadata": {"missing": True}
                })

            seatbelt = occ.get("seatbelt", {})
            if seatbelt.get("status") == "missing":
                sid = f"{oid}_seatbelt"
                nodes.append({
                    "id": sid,
                    "type": "equipment",
                    "label": "Seatbelt Missing",
                    "confidence": seatbelt.get("confidence", 0),
                    "metadata": {"severity": "medium"}
                })
                edges.append({
                    "source": oid,
                    "target": sid,
                    "relation": "requires",
                    "metadata": {"missing": True}
                })

        plate = vehicle.get("plate")
        if plate and plate.get("detected"):
            pid = f"{vid}_plate"
            nodes.append({
                "id": pid,
                "type": "plate",
                "label": "License Plate",
                "confidence": plate["confidence"],
                "metadata": {"bbox": plate.get("bbox")}
            })
            edges.append({
                "source": vid,
                "target": pid,
                "relation": "has_plate",
                "metadata": {"confidence": plate["confidence"]}
            })

    # Add pedestrian nodes
    for person in scene.get("persons", []):
        pid = person["id"]
        nodes.append({
            "id": pid,
            "type": "person",
            "label": f"Pedestrian ({pid})",
            "confidence": person["confidence"],
            "metadata": {
                "role": "pedestrian",
                "bbox": person["bbox"]
            }
        })

    # Add violation candidate nodes with enhanced metadata
    for cand in candidates:
        cid = f"cand_{cand['candidate']}_{cand['vehicle_id']}"
        severity = "high" if cand["candidate"] in ["red_light_violation", "triple_riding"] else "medium"
        nodes.append({
            "id": cid,
            "type": "violation_candidate",
            "label": cand["candidate"].replace("_", " ").title(),
            "confidence": cand["confidence"],
            "metadata": {
                "severity": severity,
                "reason": cand["reason"],
                "vehicle_id": cand["vehicle_id"]
            }
        })
        edges.append({
            "source": cand["vehicle_id"],
            "target": cid,
            "relation": "candidate",
            "metadata": {"confidence": cand["confidence"]}
        })

    # Connect vehicles to road features
    for vehicle in scene["vehicles"]:
        vid = vehicle["track_id"]
        if road.get("stop_line_detected"):
            edges.append({
                "source": vid,
                "target": "stop_line",
                "relation": "near",
                "metadata": {"distance": "proximity"}
            })

    return {"nodes": nodes, "edges": edges}


def build_structured_scene(vehicles: list[dict], road_context: dict, candidates: list[dict]) -> list[dict]:
    records = []
    for vehicle in vehicles:
        occupants = vehicle.get("occupants", [])
        rider = any(o["role"] == "rider" for o in occupants)
        records.append({
            "vehicle_id": vehicle["track_id"],
            "vehicle_type": vehicle["label"],
            "occupants": len(occupants),
            "rider": rider,
            "passenger_count": sum(1 for o in occupants if o["role"] == "passenger"),
            "helmet": all(
                o.get("helmet", {}).get("status") != "missing"
                for o in occupants
                if o["role"] in ("rider", "driver")
            ) if occupants else True,
            "plate_detected": bool(vehicle.get("plate", {}).get("detected")),
            "signal": road_context.get("signal_state", "unknown"),
            "candidates": [c["candidate"] for c in candidates if c["vehicle_id"] == vehicle["track_id"]],
            "confidence": vehicle["confidence"],
        })
    return records


def build_explanation(scene: dict, candidates: list[dict]) -> list[str]:
    lines = [
        f"Detected {len(scene['vehicles'])} vehicle(s) and {len(scene['persons'])} person(s).",
        f"Traffic signal: {scene['road_context'].get('signal_state', 'unknown').upper()} "
        f"({scene['road_context'].get('signal_confidence', 0)}% confidence).",
        f"Road context: stop_line={scene['road_context']['stop_line_detected']}, lanes={scene['road_context']['lane_markings_detected']}.",
    ]
    for cand in candidates:
        lines.append(f"Possible {cand['candidate']}: {cand['reason']} (confidence {cand['confidence']}%).")
    if not candidates:
        lines.append("No violation candidates generated from current scene.")
    return lines


def process_scene(image: np.ndarray, tracked_objects: list[dict], yolo_lights: list[dict] | None = None) -> dict:
    h, w = image.shape[:2]
    vehicles = [o for o in tracked_objects if o.get("type") == "vehicle"]
    persons = [o for o in tracked_objects if o.get("type") == "person"]

    signal_data = analyze_traffic_signals(image, yolo_lights)

    vehicle_records = []
    for i, vehicle in enumerate(vehicles):
        associated = []
        for j, person in enumerate(persons):
            if overlap_ratio(person["bbox"], vehicle["bbox"]) > 0.2:
                role = classify_role(person["bbox"], vehicle, w)
                pid = person.get("track_id", f"Person_{j+1:03d}")
                helmet = detect_helmet_status(image, person["bbox"], role)
                seatbelt = detect_seatbelt_status(image, person["bbox"], role)
                associated.append({
                    "id": pid,
                    "role": role,
                    "confidence": person["confidence"],
                    "bbox": person["bbox"],
                    "helmet": helmet,
                    "seatbelt": seatbelt,
                })

        plate = find_plate_region(image, vehicle["bbox"])
        vehicle_records.append({
            **vehicle,
            "occupants": associated,
            "plate": plate,
        })

    unassigned = []
    for j, person in enumerate(persons):
        if not any(overlap_ratio(person["bbox"], v["bbox"]) > 0.2 for v in vehicles):
            pid = person.get("track_id", f"Person_{j+1:03d}")
            unassigned.append({
                "id": pid,
                "role": "pedestrian",
                "confidence": person["confidence"],
                "bbox": person["bbox"],
            })

    road_context = infer_road_context(image, vehicles, signal_data)
    scene = {
        "vehicles": vehicle_records,
        "persons": unassigned,
        "road_context": road_context,
    }
    candidates = generate_violation_candidates(scene, img_h=h)
    graph = build_scene_graph(scene, candidates)
    structured = build_structured_scene(vehicle_records, road_context, candidates)
    explanation = build_explanation(scene, candidates)

    return {
        "scene": scene,
        "scene_graph": graph,
        "structured_scene": structured,
        "violation_candidates": candidates,
        "explanation": explanation,
        "summary": {
            "vehicles_detected": len(vehicle_records),
            "persons_detected": len(persons),
            "candidates_count": len(candidates),
            "tracking_ids": [o.get("track_id") for o in tracked_objects if o.get("track_id")],
            "signal_state": road_context.get("signal_state", "unknown"),
            "signal_confidence": road_context.get("signal_confidence", 0),
        },
        "traffic_signals": signal_data,
    }
