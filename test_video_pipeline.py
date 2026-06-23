#!/usr/bin/env python3
"""
Test script for Video AI Pipeline
Run after starting the backend server
"""

import requests
import json
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"


def test_video_pipeline(video_path: str):
    """Test video processing pipeline"""
    
    if not Path(video_path).exists():
        print(f"❌ Video file not found: {video_path}")
        print("\nTo test, provide a traffic video file:")
        print("  python test_video_pipeline.py path/to/your/video.mp4")
        return False
    
    print(f"📹 Testing video pipeline with: {video_path}")
    print("-" * 60)
    
    with open(video_path, "rb") as f:
        files = {"file": ("video.mp4", f, "video/mp4")}
        
        try:
            print("🔄 Sending video to pipeline...")
            response = requests.post(f"{BASE_URL}/api/pipeline/process", files=files, timeout=600)
            
            if response.status_code != 200:
                print(f"❌ Error: {response.status_code}")
                print(response.text)
                return False
            
            result = response.json()
            
            print("\n✅ Video Processing Complete!\n")
            
            # Module 1: Quality
            if "module1_quality" in result:
                m1 = result["module1_quality"]
                print(f"📊 Module 1 - Quality Enhancement:")
                print(f"   Before: {m1['average_score_before']:.1f}")
                print(f"   After:  {m1['average_score_after']:.1f}")
                improvement = m1['average_score_after'] - m1['average_score_before']
                print(f"   Improvement: +{improvement:.1f}%\n")
            
            # Module 2: Detection
            if "module2_detection" in result:
                m2 = result["module2_detection"]
                print(f"🚗 Module 2 - Detection & Tracking:")
                print(f"   Frames analyzed: {m2['total_frames_analyzed']}")
                if m2.get("frame_by_frame_summary"):
                    first_frame = m2["frame_by_frame_summary"][0]
                    print(f"   Sample (Frame 0): {first_frame['vehicles_detected']} vehicles, Signal: {first_frame['signal_state'].upper()}\n")
            
            # Module 3: Violations
            if "module3_violation" in result:
                m3 = result["module3_violation"]
                print(f"⚠️  Module 3 - Violation Detection:")
                print(f"   Total violations: {m3['total_violations_detected']}")
                if m3.get("violations_by_type"):
                    for vtype, count in m3["violations_by_type"].items():
                        print(f"   - {vtype}: {count}")
                print()
            
            # Module 4: LPR
            if "module4_lpr" in result:
                m4 = result["module4_lpr"]
                print(f"🔍 Module 4 - License Plate Recognition:")
                print(f"   Plates detected: {m4['total_plates_detected']}")
                if m4.get("plates_found"):
                    for plate in m4["plates_found"][:3]:
                        print(f"   - Frame {plate['frame']}: {plate['plate']} (Trust: {plate['trust_score']}%)")
                print()
            
            # Module 6: Analytics
            if "module6_analytics" in result:
                m6 = result["module6_analytics"]
                print(f"📈 Module 6 - Analytics:")
                print(f"   Vehicles tracked: {m6['total_vehicles_tracked']}")
                print(f"   Repeat offenders: {len(m6.get('repeat_offenders', []))}")
                if m6.get("repeat_offenders"):
                    for offender in m6["repeat_offenders"][:2]:
                        print(f"   - Track {offender['track_id']}: {offender['violation_count']} violations")
                print()
            
            # Summary
            print(f"⏱️  Processing Time: {result['processing_time_sec']:.1f} seconds")
            print(f"📹 Annotated video generated: {result['annotated_video_available']}")
            print(f"🎬 Total frames: {result['total_frames']}")
            print(f"📊 FPS: {result['original_fps']:.1f}")
            
            return True
            
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to backend at {BASE_URL}")
            print("   Make sure backend is running: python -m uvicorn backend.main:app --reload")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False


def check_api_health():
    """Check if API is running"""
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        return response.status_code == 200
    except:
        return False


if __name__ == "__main__":
    print("🚦 SafeVision AI - Video Pipeline Test\n")
    
    if not check_api_health():
        print("❌ Backend API is not running!")
        print("\nStart the backend with:")
        print("  cd backend")
        print("  python -m uvicorn main:app --reload --port 8000")
        sys.exit(1)
    
    print("✅ Backend API is running\n")
    
    if len(sys.argv) > 1:
        video_file = sys.argv[1]
        success = test_video_pipeline(video_file)
        sys.exit(0 if success else 1)
    else:
        print("Usage: python test_video_pipeline.py <path_to_video.mp4>")
        print("\nExample:")
        print("  python test_video_pipeline.py ~/videos/traffic_sample.mp4")
