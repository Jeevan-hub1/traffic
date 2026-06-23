# 🚦 Quick Start: Video AI Pipeline

## What You Now Have

Your SafeVision AI platform now processes **entire traffic videos** through all 8 analysis modules:

```
🎬 Video Upload → Frame Extraction → 8 Modules Applied → Annotated Output
```

## One-Minute Setup

### 1. Start Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python init_db.py
uvicorn main:app --reload --port 8000
```

### 2. Upload a Traffic Video
```bash
# Terminal
curl -X POST "http://localhost:8000/api/pipeline/process" \
  -F "file=@your_traffic_video.mp4"
```

### 3. Get Results
Response includes:
- ✅ All vehicles detected and tracked
- ✅ All violations found (red light, speeding, etc.)
- ✅ License plates recognized
- ✅ Repeat offenders identified
- ✅ Annotated video with boxes and labels
- ✅ Per-frame analysis with timestamps

## API Endpoints

| Purpose | Endpoint |
|---------|----------|
| **Process video/image** | `POST /api/pipeline/process` |
| **Video-only** | `POST /api/pipeline/process-video-detailed` |
| **API Documentation** | `GET http://localhost:8000/docs` |

## Sample Response (What You Get)

```json
{
  "total_frames": 450,
  "processing_time_sec": 120,
  
  "module1_quality": {
    "average_score_before": 65,
    "average_score_after": 82
  },
  
  "module3_violation": {
    "total_violations_detected": 15,
    "violations_by_type": {
      "red_light": 8,
      "speeding": 5,
      "wrong_lane": 2
    }
  },
  
  "module4_lpr": {
    "total_plates_detected": 12,
    "plates_found": [
      {
        "plate": "MH02AB1234",
        "confidence": 94,
        "trust_score": 91
      }
    ]
  },
  
  "module6_analytics": {
    "total_vehicles_tracked": 28,
    "repeat_offenders": [
      {
        "track_id": "vehicle_5",
        "plate": "MH02AB1234",
        "violation_count": 3
      }
    ]
  },
  
  "annotated_video": "data:video/mp4;base64,...",
  "annotated_video_available": true
}
```

## Frontend Usage (React)

```javascript
const uploadTrafficVideo = async (videoFile) => {
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const response = await fetch('/api/pipeline/process', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  // Display results
  console.log(`📊 Vehicles: ${result.module6_analytics.total_vehicles_tracked}`);
  console.log(`⚠️  Violations: ${result.module3_violation.total_violations_detected}`);
  console.log(`📷 Plates: ${result.module4_lpr.total_plates_detected}`);
  
  // Play annotated video
  videoElement.src = `data:video/mp4;base64,${result.annotated_video}`;
};
```

## Video Processing Specs

| Feature | Details |
|---------|---------|
| **Frame Rate** | ~15 FPS (adaptive, memory efficient) |
| **Supported Formats** | MP4, AVI, MOV, MKV, WebM, FLV, WMV |
| **Processing Time** | ~2-5 min per 30-sec video |
| **Output** | Annotated MP4 (base64 encoded) |
| **All Frames Analyzed** | ✅ Yes (not sampling) |
| **Multi-frame Tracking** | ✅ Yes (maintains vehicle continuity) |

## Key Capabilities

✅ **Frame-by-frame analysis** through all 8 modules  
✅ **Vehicle tracking** across entire video  
✅ **Violation aggregation** by vehicle and type  
✅ **License plate detection** with trust scoring  
✅ **Repeat offender detection** (vehicles with multiple violations)  
✅ **Auto-annotated video** with boxes, IDs, signal state  
✅ **Comprehensive JSON report** for all results  
✅ **Timestamp tracking** for all events  

## Testing

```bash
python test_video_pipeline.py path/to/traffic_video.mp4
```

Shows:
- Quality improvement scores
- Vehicles detected per frame
- Total violations by type
- License plates found
- Repeat offenders
- Processing time

## Documentation

📖 **Read these for details:**

1. **[VIDEO_PIPELINE_GUIDE.md](./VIDEO_PIPELINE_GUIDE.md)**
   - Complete feature documentation
   - Architecture overview
   - Performance notes
   - Troubleshooting

2. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
   - What was added
   - How it works
   - File structure
   - API response examples

3. **[README.md](./README.md)**
   - Updated with video pipeline info
   - All endpoints listed
   - Tech stack

## What Happens When You Upload a Video

```
1. Video received
   ↓
2. Extract all frames (optimized FPS: ~15 fps)
   ↓
3. FOR EACH FRAME:
   ├─ Enhance image quality (Module 1)
   ├─ Detect objects & track (Module 2)
   ├─ Verify violations (Module 3)
   ├─ Recognize plates (Module 4)
   ├─ Generate evidence (Module 5)
   ├─ Record metadata
   └─ Annotate frame
   ↓
4. Aggregate violations across video
   ├─ Group by vehicle
   ├─ Identify repeat offenders
   └─ Build timeline
   ↓
5. Create annotated video output
   ├─ Write frames with boxes
   ├─ Add signal state
   └─ Encode as MP4
   ↓
6. Return comprehensive JSON report
   └─ All 8 modules' results
```

## Example: Red Light Violation Detection

```
Frame 45 (1.5 sec into video):
  - Vehicle detected: Car (track_id: vehicle_3)
  - Traffic signal: RED
  - License plate: MH02AB1234
  → Violation detected: Red light running ⚠️
  → Confidence: 92%
  → Added to vehicle_3's violation history

Frame 47 (1.57 sec):
  - Same vehicle continues through intersection
  → Violation confirmed: Still crossing on red

Final Report:
  - Vehicle (MH02AB1234) has 1 red-light violation
  - Time range: Frames 45-47 (1.5-1.57 sec)
  - Confidence: 92%
  → Evidence generated with annotated frame
```

## Support

- **Backend Issues**: Check server logs
- **Video Upload**: Ensure video is in supported format
- **Processing Slow**: Normal for large videos; try shorter clips
- **Memory Error**: Reduce video resolution or break into chunks
- **API Docs**: Visit `http://localhost:8000/docs`

---

## Ready to Go! 🚀

Your video AI pipeline is ready. Upload a traffic video and it will be analyzed through all 8 modules automatically.

**Questions?** Check the docs or test with the sample script.

```bash
python test_video_pipeline.py sample_video.mp4
```

Happy analyzing! 📹✨
