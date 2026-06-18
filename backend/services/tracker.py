"""Lightweight IoU-based multi-object tracker (ByteTrack-style association)."""

from __future__ import annotations


def _iou(box_a: list[float], box_b: list[float]) -> float:
    x_a = max(box_a[0], box_b[0])
    y_a = max(box_a[1], box_b[1])
    x_b = min(box_a[2], box_b[2])
    y_b = min(box_a[3], box_b[3])
    inter = max(0, x_b - x_a) * max(0, y_b - y_a)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class SimpleTracker:
    def __init__(self, iou_threshold: float = 0.3):
        self.iou_threshold = iou_threshold
        self._tracks: dict[str, dict] = {}
        self._counters: dict[str, int] = {}

    def _next_id(self, label: str) -> str:
        prefix = {
            "motorcycle": "Bike",
            "car": "Car",
            "bus": "Bus",
            "truck": "Truck",
            "bicycle": "Cycle",
            "person": "Person",
        }.get(label, label.title())
        self._counters[prefix] = self._counters.get(prefix, 0) + 1
        return f"{prefix}_{self._counters[prefix]:03d}"

    def update(self, detections: list[dict], frame_idx: int = 0) -> list[dict]:
        assigned = set()
        results = []

        for det in detections:
            best_track = None
            best_iou = self.iou_threshold
            for track_id, track in self._tracks.items():
                if track["label"] != det["label"]:
                    continue
                score = _iou(det["bbox"], track["bbox"])
                if score > best_iou:
                    best_iou = score
                    best_track = track_id

            if best_track:
                self._tracks[best_track].update({
                    "bbox": det["bbox"],
                    "confidence": det["confidence"],
                    "last_frame": frame_idx,
                    "hits": self._tracks[best_track]["hits"] + 1,
                })
                track_id = best_track
            else:
                track_id = self._next_id(det["label"])
                self._tracks[track_id] = {
                    "track_id": track_id,
                    "label": det["label"],
                    "bbox": det["bbox"],
                    "confidence": det["confidence"],
                    "first_frame": frame_idx,
                    "last_frame": frame_idx,
                    "hits": 1,
                }

            assigned.add(track_id)
            results.append({**det, "track_id": track_id, "frame": frame_idx})

        return results
