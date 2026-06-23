# Module Debugging Guide

## Fixed Issues

### 1. **License Plate Confidence Display** ❌ → ✅
- **Problem**: Showing 7062% instead of 70.62%
- **Cause**: Frontend was multiplying already-converted percentages by 100 again
- **Fix**: 
  - Detect if value is already 0-100 (> 1 means percentage, not decimal)
  - Cap all confidence/trust scores at 100%
  - Added validation: `Math.min(100, confidence).toFixed(0)}%`

### 2. **Invalid Plate Display** ❌ → ✅
- **Problem**: Showing "AIRPORT" as a license plate with > 100% confidence
- **Cause**: Backend returning unvalidated plate detections
- **Fix**:
  - Backend now only stores validated plates (regex check passed)
  - Added trust score filtering: only plates with ≥50% trust are returned
  - Filter: `lpr.get("trust_score", 0) >= 50`

### 3. **Module Data Not Updating Separately** ❌ → ✅
- **Problem**: Modules not showing distinct per-module analytics
- **Fix**:
  - Module 1: Quality score before/after with improvement percentage
  - Module 2: Frames analyzed, original FPS, frame statistics
  - Module 3: Violations by type breakdown, high confidence count
  - Module 4: Validated plates only, confidence/trust in 0-100 range
  - Module 6: Total vehicles tracked, repeat offenders count

### 4. **Backend Trust Score Calculation** ❌ → ✅
- **Problem**: Computing invalid scores
- **Fix**:
  - Ensure all inputs are 0-100 range
  - Cap output to 0-100: `max(0, min(100, trust_score))`
  - Changed decimal precision to 1 (not 2)

## Verification Steps

### Test 1: Check Confidence Values
```bash
# Look for confidence values in response
curl -X POST http://localhost:8000/api/pipeline/process \
  -F "file=@test_video.mp4" | jq '.module4_lpr.plates_found[0].confidence'
# Should return: 45.2 (example), NOT 4520
```

### Test 2: Check Only Valid Plates
```bash
curl -X POST http://localhost:8000/api/pipeline/process \
  -F "file=@test_video.mp4" | jq '.module4_lpr.plates_found'
# Should NOT contain: "AIRPORT", "TEST", etc.
# Should only contain: Valid Indian plate formats like "MH01AB1234"
```

### Test 3: Check Module Completeness
```bash
# Verify all modules have data
curl -X POST http://localhost:8000/api/pipeline/process \
  -F "file=@test_video.mp4" | jq 'keys' | grep module
# Should show: module1_quality, module2_detection, module3_violation, module4_lpr, module6_analytics
```

### Test 4: Verify Quality Improvement
```bash
curl -X POST http://localhost:8000/api/pipeline/process \
  -F "file=@test_video.mp4" | jq '.module1_quality.average_score_after - .module1_quality.average_score_before'
# Should return positive number (improvement) or zero
# Range: 0-100 (percentage points)
```

## Expected Output Format

```json
{
  "module1_quality": {
    "average_score_before": 28.6,
    "average_score_after": 64.1,
    "frame_details": [...]
  },
  "module2_detection": {
    "total_frames_analyzed": 49,
    "frame_by_frame_summary": [
      {
        "frame_idx": 0,
        "vehicles_detected": 0,
        "violations_detected": 0
      }
    ]
  },
  "module3_violation": {
    "total_violations_detected": 20,
    "violations_by_type": {
      "triple_riding": 20
    },
    "high_confidence_violations": []
  },
  "module4_lpr": {
    "total_plates_detected": 5,
    "plates_found": [
      {
        "plate": "MH01AB1234",
        "confidence": 85.5,
        "trust_score": 78.3
      }
    ]
  },
  "module6_analytics": {
    "total_vehicles_tracked": 15,
    "repeat_offenders": [...]
  }
}
```

## Common Issues & Solutions

### Issue: Still seeing > 100% values
**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Force refresh (Ctrl+F5)
3. Check browser console for JS errors

### Issue: "AIRPORT" or invalid plates still showing
**Solution**:
1. Backend cache issue - restart backend server
2. Check plate validation regex in `module4_lpr.py`
3. Verify trust score is ≥ 50 before returning

### Issue: Missing module data
**Solution**:
1. Check backend logs: `grep -i "error\|exception" <backend-output>.log`
2. Verify video is not corrupted
3. Check that all modules are imported correctly
