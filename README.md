# SafeVision AI

Context-Aware Traffic Violation Intelligence, Evidence Generation & Smart Enforcement Platform.

## Architecture

```
Traffic Image/Video → M1 Quality → M2 Detection + Signal → M3 Violation Verify
  → M4 LPR + VAHAN → M5 Evidence → M6 Analytics → M7 Evaluation → M8 Predictions
```

## Features

- **Module 1**: Adaptive image enhancement (CLAHE, gamma, denoising, sharpening)
- **Module 2**: YOLOv11 detection, ByteTrack-style tracking, scene graphs, **traffic signal R/Y/G detection**
- **Module 3**: Hierarchical violation verification (helmet, triple riding, **red-light**, stop-line, parking)
- **Module 4**: Multi-frame OCR fusion, trust scoring, **VAHAN offender lookup**
- **Module 5**: Annotated evidence, SHA-256 integrity, legal documentation
- **Module 6**: Analytics, trends, repeat offenders, enforcement insights
- **Module 7**: Performance evaluation and scalability metrics
- **Module 8**: Predictive forecasting and deployment recommendations

## Quick Start

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → Landing → Command Center or Pipeline.

### Docker

```powershell
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/quality/analyze` | Image quality + adaptive enhancement |
| `POST /api/detection/detect` | Full scene understanding + scene graph |
| `POST /api/detection/signal` | **Traffic signal state (red/yellow/green)** |
| `POST /api/detection/detect-frames` | Multi-frame tracking + temporal signals |
| `POST /api/violation/verify` | Hierarchical violation verification |
| `POST /api/lpr/recognize-multi` | Multi-frame OCR fusion |
| `GET /api/lpr/vahan/{plate}` | VAHAN offender registry lookup |
| `POST /api/pipeline/process` | End-to-end pipeline (image or video) |
| `GET /api/command-center/dashboard` | Live ops dashboard data |
| `GET /api/analytics/summary` | Violation analytics |
| `GET /api/predictions/forecast` | 7-day violation forecast |

## Traffic Signal Detection

Uses YOLOv11 `traffic light` class + HSV bulb classification:

1. Detect traffic light bounding boxes
2. Split ROI into red / yellow / green zones
3. Classify active bulb by color pixel ratio
4. Feed signal state into red-light and stop-line violation rules

## Tech Stack

- **Backend**: FastAPI, OpenCV, YOLOv11 (Ultralytics), EasyOCR, SQLAlchemy, SQLite
- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, ReactFlow
- **ML**: YOLOv11n, heuristic helmet/seatbelt, HSV signal classifier

## Project Structure

```
TRAFIC/
├── backend/
│   ├── main.py
│   ├── services/          # scene_engine, traffic_signal, tracker
│   ├── routers/           # module1-8, pipeline, command_center
│   └── storage/evidence/  # generated evidence images
└── frontend/
    └── src/pages/         # All 8 module UIs + command center
```

## License

Educational / demonstration project for smart city traffic enforcement.
