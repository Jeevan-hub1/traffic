"""
Enhanced Video Processing Service for SafeVision AI
Handles frame extraction, processing, tracking, and aggregation across entire videos
"""

import cv2
import numpy as np
import tempfile
import os
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Process videos frame-by-frame with temporal tracking and aggregation"""
    
    def __init__(self, max_fps: int = 30):
        """
        Initialize video processor
        
        Args:
            max_fps: Maximum frames to extract per second (for memory efficiency)
        """
        self.max_fps = max_fps
    
    def extract_frames_optimized(self, video_bytes: bytes, target_fps: int = None) -> Tuple[List[np.ndarray], float]:
        """
        Extract frames from video with intelligent frame skipping
        
        Args:
            video_bytes: Raw video file bytes
            target_fps: Target FPS (defaults to video's native fps)
            
        Returns:
            Tuple of (frames list, original fps)
        """
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            path = tmp.name
        
        frames = []
        original_fps = None
        
        try:
            cap = cv2.VideoCapture(path)
            original_fps = cap.get(cv2.CAP_PROP_FPS) or 30
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
            
            # Calculate frame step based on target FPS
            if target_fps and original_fps:
                frame_step = max(1, int(original_fps / target_fps))
            else:
                frame_step = 1
            
            frame_idx = 0
            while True:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret or frame is None:
                    break
                
                frames.append(frame)
                frame_idx += frame_step
            
            cap.release()
            
            logger.info(f"Extracted {len(frames)} frames from {total_frames} total frames (step={frame_step})")
            return frames, original_fps
            
        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            raise
        finally:
            try:
                os.unlink(path)
            except:
                pass
    
    def create_output_video(
        self,
        output_path: str,
        frames: List[np.ndarray],
        original_fps: float,
        codec: str = "mp4v"
    ) -> bool:
        """
        Create annotated video from processed frames
        
        Args:
            output_path: Path to save video
            frames: List of annotated frames
            original_fps: Original video FPS
            codec: Video codec (mp4v, XVID, MJPG, etc)
            
        Returns:
            Success status
        """
        if not frames:
            logger.error("No frames to write")
            return False
        
        try:
            height, width = frames[0].shape[:2]
            
            # Try codecs in order of preference
            codecs_to_try = [codec, "mp4v", "XVID", "MJPG", "DIVX"]
            
            for attempt_codec in codecs_to_try:
                try:
                    fourcc = cv2.VideoWriter_fourcc(*attempt_codec)
                    out = cv2.VideoWriter(output_path, fourcc, original_fps, (width, height))
                    
                    if not out.isOpened():
                        logger.warning(f"Codec {attempt_codec} failed to open, trying next...")
                        continue
                    
                    for frame_idx, frame in enumerate(frames):
                        if frame.shape[:2] != (height, width):
                            frame = cv2.resize(frame, (width, height))
                        out.write(frame)
                    
                    out.release()
                    logger.info(f"Video saved with codec {attempt_codec}: {output_path} ({len(frames)} frames @ {original_fps}fps)")
                    return True
                    
                except Exception as e:
                    logger.warning(f"Codec {attempt_codec} failed: {e}")
                    continue
            
            logger.error("All codec attempts failed")
            return False
            
        except Exception as e:
            logger.error(f"Error creating output video: {e}")
            return False


class ViolationAggregator:
    """Aggregate violations across multiple frames"""
    
    def __init__(self):
        self.violations_by_track_id = {}  # track_id -> list of violations
        self.track_info = {}  # track_id -> vehicle info
    
    def add_frame_violations(
        self,
        frame_idx: int,
        violations: List[Dict],
        scene_data: Dict
    ):
        """Add violations detected in a frame"""
        for violation in violations:
            track_id = violation.get("track_id")
            if track_id not in self.violations_by_track_id:
                self.violations_by_track_id[track_id] = []
            
            self.violations_by_track_id[track_id].append({
                "frame": frame_idx,
                "type": violation.get("type"),
                "confidence": violation.get("confidence", 0),
                "details": violation.get("details", {})
            })
        
        # Store vehicle info
        for vehicle in scene_data.get("scene", {}).get("vehicles", []):
            track_id = vehicle.get("track_id")
            if track_id:
                self.track_info[track_id] = {
                    "label": vehicle.get("label"),
                    "plate": vehicle.get("plate", {}).get("number"),
                    "first_seen": min(self.track_info.get(track_id, {}).get("first_seen", frame_idx), frame_idx),
                    "last_seen": frame_idx,
                }
    
    def get_summary(self) -> Dict:
        """Get aggregated violation summary with JSON-safe native Python types"""
        # basic counts
        total_vehicles = int(len(self.track_info))
        total_violations = int(sum(int(len(v)) for v in self.violations_by_track_id.values()))

        summary = {
            "total_vehicles_tracked": total_vehicles,
            "total_violations": total_violations,
            "violations_by_type": {},
            "repeat_offenders": [],  # vehicles with multiple violations
            "high_confidence_violations": [],
            "tracks": {}
        }

        # Aggregate by violation type
        violation_counts = {}
        for track_id, violations in self.violations_by_track_id.items():
            for v in violations:
                v_type = v.get("type")
                violation_counts[v_type] = violation_counts.get(v_type, 0) + 1

                # normalize confidence/frame to native types
                conf = v.get("confidence", 0)
                try:
                    conf = float(conf)
                except Exception:
                    conf = float(conf) if hasattr(conf, 'item') else 0.0
                frame_idx = v.get("frame")
                try:
                    frame_idx = int(frame_idx)
                except Exception:
                    frame_idx = int(frame_idx) if hasattr(frame_idx, 'item') else 0

                if conf >= 80:
                    summary["high_confidence_violations"].append({
                        "track_id": str(track_id),
                        "type": v_type,
                        "frame": frame_idx,
                        "confidence": conf
                    })

        # Ensure violation_counts values are ints
        summary["violations_by_type"] = {str(k): int(v) for k, v in violation_counts.items()}

        # Find repeat offenders (vehicles with multiple violations)
        for track_id, violations in self.violations_by_track_id.items():
            if len(violations) > 1:
                summary["repeat_offenders"].append({
                    "track_id": str(track_id),
                    "vehicle_info": {k: (int(v) if isinstance(v, (np.integer,)) else v) for k, v in self.track_info.get(track_id, {}).items()},
                    "violation_count": int(len(violations)),
                    "violations": [
                        {
                            "frame": int(v.get("frame", 0)) if not isinstance(v.get("frame", 0), list) else v.get("frame", 0),
                            "type": v.get("type"),
                            "confidence": float(v.get("confidence", 0))
                        }
                        for v in violations
                    ]
                })

        # Store track info with native types
        for track_id, info in self.track_info.items():
            first_seen = info.get("first_seen", 0)
            last_seen = info.get("last_seen", 0)
            try:
                first_seen = int(first_seen)
            except Exception:
                first_seen = int(first_seen) if hasattr(first_seen, 'item') else 0
            try:
                last_seen = int(last_seen)
            except Exception:
                last_seen = int(last_seen) if hasattr(last_seen, 'item') else 0

            summary["tracks"][str(track_id)] = {
                "label": info.get("label"),
                "plate": info.get("plate"),
                "violations": int(len(self.violations_by_track_id.get(track_id, []))),
                "frames_active": int(last_seen - first_seen + 1)
            }

        return summary


class FrameBufferManager:
    """Manage frame buffering for efficient processing"""
    
    def __init__(self, buffer_size: int = 30):
        """
        Initialize frame buffer
        
        Args:
            buffer_size: Number of frames to keep in memory at once
        """
        self.buffer_size = buffer_size
        self.frames = []
        self.processing_results = []
    
    def add_frame(self, frame: np.ndarray, frame_idx: int):
        """Add frame to buffer"""
        self.frames.append({"frame": frame, "idx": frame_idx})
        if len(self.frames) > self.buffer_size:
            self.frames.pop(0)
    
    def get_buffered_frames(self) -> List[Tuple[int, np.ndarray]]:
        """Get all buffered frames"""
        return [(f["idx"], f["frame"]) for f in self.frames]
    
    def clear(self):
        """Clear buffer"""
        self.frames = []
