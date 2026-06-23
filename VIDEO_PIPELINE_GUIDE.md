# Video AI Pipeline Integration Guide

## Overview

The SafeVision AI platform now includes **full video processing capabilities**. When you upload a traffic video, it automatically processes ALL frames through all 8 modules to detect violations, track vehicles, recognize license plates, and generate annotated outputs.

## New Features

### 1. **Complete Video Processing Pipeline**
- Extracts and processes ALL frames (not just sampling)
- Maintains temporal continuity and vehicle tracking across frames
- Processes each frame through all 8 modules:
  - **Module 1**: Adaptive quality enhancement
  - **Module 2**: YOLO detection + multi-frame tracking
  - **Module 3**: Violation verification with scene context
  - **Module 4**: Multi-frame LPR (license plate recognition)
  - **Module 5**: Evidence generation
  - **Module 6**: Aggregated analytics & repeat offender detection
  - **Module 7**: Performance evaluation
  - **Module 8**: Violation forecasting

### 2. **Smart Frame Extraction**
- Adaptive FPS adjustment (processes at up to 15 FPS for efficiency)
- Automatic memory management with frame buffering
- Supports all common video formats: MP4, AVI, MOV, MKV, WebM, FLV, WMV

### 3. **Aggregated Violation Analytics**
- Tracks violations across entire video
- Identifies repeat offenders (vehicles with multiple violations)
- Temporal analysis (when violations occur)
- High-confidence violation filtering

### 4. **Annotated Video Output**
- Auto-generated video with:
  - Vehicle bounding boxes with track IDs
  - Traffic signal state display
  - License plate detections
  - Real-time event annotations

### 5. **Comprehensive Video Report**
Returns aggregated insights including:
- Total vehicles tracked
- Violation summary by type
- License plates detected (with trust scores)
- Per-frame breakdown
- Processing time metrics

## API Endpoints

### Standard Pipeline (Auto-detects Image/Video)
```
POST /api/pipeline/process
Content-Type: multipart/form-data
- file: [video.mp4 or image.jpg]
```

**Response:**
```json
{
  "pipeline_status": "complete",
  "video_mode": true,
  "total_frames": 450,
  "original_fps": 30,
  "processing_time_sec": 125.5,
  
  "module1_quality": {
    "average_score_before": 65.2,
    "average_score_after": 78.9,
    "frame_details": [...]
  },
  
  "module2_detection": {
    "total_frames_analyzed": 450,
    "frame_by_frame_summary": [
      {
        "frame_idx": 0,
        "timestamp_sec": 0.0,
        "vehicles_detected": 3,
        "signal_state": "red",
        "violations_detected": 1,
        "plate_detected": true
      },
      ...
    ]
  },
  
  "module3_violation": {
    "total_violations_detected": 12,
    "violations_by_type": {
      "red_light": 5,
      "speeding": 3,
      "wrong_lane": 4
    },
    "high_confidence_violations": [...],
    "all_violations": [...]
  },
  
  "module4_lpr": {
    "total_plates_detected": 8,
    "plates_found": [
      {
        "frame": 45,
        "plate": "MH02AB1234",
        "confidence": 92.5,
        "trust_score": 88
      }
    ]
  },
  
  "module6_analytics": {
    "total_vehicles_tracked": 23,
    "repeat_offenders": [
      {
        "track_id": "vehicle_5",
        "vehicle_info": { "label": "car", "plate": "MH02AB1234" },
        "violation_count": 3,
        "violations": [...]
      }
    ]
  },
  
  "annotated_video": "data:video/mp4;base64,AAAA...",
  "annotated_video_available": true,
  "sample_annotated_frame": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### Detailed Video Processing
```
POST /api/pipeline/process-video-detailed
Content-Type: multipart/form-data
- file: [video.mp4]
```

Returns the same detailed analytics as above.

## Usage Example (Frontend)

### React with Fetch API
```javascript
const uploadVideo = async (videoFile) => {
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const response = await fetch('/api/pipeline/process', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  // Access video results
  console.log(`Processed ${result.total_frames} frames`);
  console.log(`Found ${result.module3_violation.total_violations_detected} violations`);
  console.log(`Detected ${result.module4_lpr.total_plates_detected} plates`);
  
  // Display annotated video
  if (result.annotated_video) {
    videoPlayer.src = `data:video/mp4;base64,${result.annotated_video}`;
  }
  
  // Show repeat offenders
  result.module6_analytics.repeat_offenders.forEach(offender => {
    console.log(`Vehicle ${offender.track_id}: ${offender.violation_count} violations`);
  });
};
```

## Video Processing Architecture

```
Video Input
    ↓
[Frame Extraction] → Optimize FPS (15 FPS target)
    ↓
[Per-Frame Processing Loop]
    ├─→ Module 1: Quality Enhancement
    ├─→ Module 2: Detection & Tracking (maintains track_id across frames)
    ├─→ Module 3: Violation Verification
    ├─→ Module 4: License Plate Recognition
    └─→ Frame Annotation
    ↓
[Aggregation Phase]
    ├─→ ViolationAggregator (tracks violations by vehicle)
    ├─→ Repeat Offender Detection
    └─→ Timeline Construction
    ↓
[Output Generation]
    ├─→ Annotated Video Creation
    ├─→ Analytics Report
    └─→ JSON Response
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Max FPS | 15 fps (adaptive) |
| Typical Processing | 2-5 min per 30-sec video |
| Memory per Frame | ~10-15 MB (with buffering) |
| Output Video Size | ~5-15 MB per minute |
| Supported Formats | MP4, AVI, MOV, MKV, WebM, FLV, WMV |

## Implementation Details

### Key Components

1. **VideoProcessor** (`services/video_processor.py`)
   - `extract_frames_optimized()`: Intelligent frame extraction with FPS control
   - `create_output_video()`: Writes annotated frames back to MP4

2. **ViolationAggregator** (`services/video_processor.py`)
   - Aggregates violations by vehicle track ID
   - Detects repeat offenders
   - Maintains temporal information

3. **FrameBufferManager** (`services/video_processor.py`)
   - Manages memory-efficient frame buffering
   - Prevents out-of-memory errors on large videos

4. **Enhanced Pipeline** (`routers/pipeline.py`)
   - `_run_pipeline_on_video()`: Main video processing logic
   - Integrates all 8 modules with frame-level granularity
   - Generates comprehensive analytics

## Future Enhancements

- [ ] Real-time streaming video processing
- [ ] GPU acceleration for frame processing
- [ ] Cloud storage integration for large videos
- [ ] Batch video processing API
- [ ] Webhook callbacks for long-running videos
- [ ] Video compression for output
- [ ] Custom annotation overlays (e.g., heatmaps, flow analysis)

## Troubleshooting

### Video takes too long to process
- **Solution**: Videos with higher resolution are processed slower. Consider:
  - Pre-compress video to 720p
  - Reduce FPS target in `VideoProcessor(max_fps=10)`
  - Process shorter clips

### Out of memory errors
- **Solution**: Increase frame buffer management
  - Check `FrameBufferManager(buffer_size=15)` settings
  - Process video in chunks

### No annotated video output
- **Solution**: Check
  - Video codec support (should be mp4v or XVID)
  - Disk space for temporary files
  - Frame dimensions consistency

## Testing

```bash
# Test video pipeline locally
curl -X POST "http://localhost:8000/api/pipeline/process" \
  -F "file=@test_traffic_video.mp4"

# Monitor response
# Should see frame progress: "Processed 10/450 frames"
```

---

**Happy analyzing! 🚗📹✨**
