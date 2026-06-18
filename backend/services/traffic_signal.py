"""Traffic signal detection and red / yellow / green state classification."""

from __future__ import annotations

import cv2
import numpy as np

SIGNAL_COLORS = {
    "red": {"lower1": (0, 100, 80), "upper1": (10, 255, 255), "lower2": (160, 100, 80), "upper2": (180, 255, 255)},
    "yellow": {"lower": (15, 100, 80), "upper": (35, 255, 255)},
    "green": {"lower": (40, 80, 60), "upper": (85, 255, 255)},
}


def _color_ratio(hsv: np.ndarray, color: str) -> float:
    if color == "red":
        m1 = cv2.inRange(hsv, np.array(SIGNAL_COLORS["red"]["lower1"]), np.array(SIGNAL_COLORS["red"]["upper1"]))
        m2 = cv2.inRange(hsv, np.array(SIGNAL_COLORS["red"]["lower2"]), np.array(SIGNAL_COLORS["red"]["upper2"]))
        mask = cv2.bitwise_or(m1, m2)
    else:
        cfg = SIGNAL_COLORS[color]
        mask = cv2.inRange(hsv, np.array(cfg["lower"]), np.array(cfg["upper"]))
    return float(np.sum(mask > 0)) / mask.size if mask.size else 0.0


def classify_signal_roi(roi: np.ndarray) -> dict:
    if roi is None or roi.size == 0:
        return {"state": "unknown", "confidence": 0, "bulbs": {}}

    h, w = roi.shape[:2]
    if h < 8 or w < 4:
        return {"state": "unknown", "confidence": 0, "bulbs": {}}

    vertical = h >= w
    zones = {}
    third = max(1, (h if vertical else w) // 3)
    colors = ["red", "yellow", "green"]

    for i, color in enumerate(colors):
        if vertical:
            y1, y2 = i * third, min((i + 1) * third, h)
            zone = roi[y1:y2, :]
        else:
            x1, x2 = i * third, min((i + 1) * third, w)
            zone = roi[:, x1:x2]
        if zone.size == 0:
            zones[color] = 0.0
            continue
        hsv = cv2.cvtColor(zone, cv2.COLOR_BGR2HSV)
        zones[color] = _color_ratio(hsv, color)

    best = max(zones, key=zones.get)
    best_ratio = zones[best]
    if best_ratio < 0.015:
        return {"state": "off", "confidence": 60, "bulbs": {k: round(v * 100, 1) for k, v in zones.items()}}

    second = sorted(zones.values(), reverse=True)[1] if len(zones) > 1 else 0
    confidence = min(98, max(65, int(70 + (best_ratio - second) * 400)))
    return {
        "state": best,
        "confidence": confidence,
        "bulbs": {k: round(v * 100, 1) for k, v in zones.items()},
    }


def scan_for_signal_regions(image: np.ndarray) -> list[dict]:
    h, w = image.shape[:2]
    upper = image[0: int(h * 0.45), :]
    gray = cv2.cvtColor(upper, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (9, 9), 2)
    circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, 1.2, 30, param1=80, param2=25, minRadius=6, maxRadius=40)

    regions = []
    if circles is not None:
        for cx, cy, r in np.round(circles[0]).astype(int):
            pad = int(r * 2.5)
            x1, y1 = max(0, cx - pad), max(0, cy - pad)
            x2, y2 = min(w, cx + pad), min(int(h * 0.45), cy + pad)
            if x2 > x1 and y2 > y1:
                regions.append({"bbox": [x1, y1, x2, y2], "source": "hough", "confidence": 72})

    return regions[:3]


def analyze_traffic_signals(image: np.ndarray, yolo_lights: list[dict] | None = None) -> dict:
    signals = []
    boxes = []

    if yolo_lights:
        for i, light in enumerate(yolo_lights):
            x1, y1, x2, y2 = [int(v) for v in light["bbox"]]
            roi = image[max(0, y1): max(0, y2), max(0, x1): max(0, x2)]
            classification = classify_signal_roi(roi)
            signals.append({
                "id": f"Signal_{i + 1:02d}",
                "bbox": light["bbox"],
                "state": classification["state"],
                "confidence": round(
                    (classification["confidence"] + light.get("confidence", 80)) / 2, 1
                ),
                "bulbs": classification["bulbs"],
                "source": "yolo",
            })
            boxes.append(light["bbox"])

    if not signals:
        for i, region in enumerate(scan_for_signal_regions(image)):
            x1, y1, x2, y2 = [int(v) for v in region["bbox"]]
            roi = image[y1:y2, x1:x2]
            classification = classify_signal_roi(roi)
            if classification["state"] not in ("unknown", "off"):
                signals.append({
                    "id": f"Signal_{i + 1:02d}",
                    "bbox": region["bbox"],
                    "state": classification["state"],
                    "confidence": classification["confidence"],
                    "bulbs": classification["bulbs"],
                    "source": "scan",
                })

    primary = "unknown"
    primary_conf = 0
    if signals:
        best = max(signals, key=lambda s: s["confidence"])
        primary = best["state"]
        primary_conf = best["confidence"]

    return {
        "signals": signals,
        "signal_state": primary,
        "signal_confidence": primary_conf,
        "signal_count": len(signals),
    }


def vehicle_crossed_stop_line(vehicle_bbox: list[float], img_h: int, stop_line_y_ratio: float = 0.72) -> bool:
    _, _, _, y2 = vehicle_bbox
    return y2 / img_h >= stop_line_y_ratio


def vehicle_in_junction(vehicle_bbox: list[float], img_h: int, junction_y_ratio: float = 0.68) -> bool:
    cy = (vehicle_bbox[1] + vehicle_bbox[3]) / 2
    return cy / img_h >= junction_y_ratio


def annotate_signals(image: np.ndarray, signal_data: dict) -> np.ndarray:
    out = image.copy()
    color_map = {"red": (0, 0, 220), "yellow": (0, 180, 220), "green": (0, 180, 0), "unknown": (128, 128, 128), "off": (80, 80, 80)}
    for sig in signal_data.get("signals", []):
        x1, y1, x2, y2 = [int(v) for v in sig["bbox"]]
        c = color_map.get(sig["state"], (128, 128, 128))
        cv2.rectangle(out, (x1, y1), (x2, y2), c, 2)
        cv2.putText(
            out,
            f"SIGNAL: {sig['state'].upper()} ({sig['confidence']}%)",
            (x1, max(y1 - 8, 14)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            c,
            2,
        )
    return out
