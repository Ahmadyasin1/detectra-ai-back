# Detectra AI — Multimodal Video Intelligence Platform

> **FYP Group F25AI009 · University of Central Punjab · BSAI 2025-2026**  
> Advisor: Mr. Usman Aamer  
> Team: Abdul Rehman · Eman Sarfraz · Ahmad Yasin

---

## Overview — v4.1 Professional Edition

Detectra AI is a **100% API-free**, self-hosted multimodal video intelligence platform. The v4.1 Professional Edition introduces significant architecture upgrades:

- ⚡ **Async API Architecture**: Fully non-blocking FastAPI endpoints ensure the UI remains responsive during heavy model inference.
- ❄️ **Background Pre-loading**: AI models (YOLO, Whisper, etc.) are optimized with background loading to eliminate the "first-request hang."
- 💎 **Premium Dashboard**: A high-fidelity, glassmorphism-based surveillance HUD with real-time WebSocket alerts and interactive analytics.
- 🎥 **Unified Ingestion**: seamlessly switch between video file uploads and high-performance RTSP/webcam live streams.
- 🛡️ **Enhanced Surveillance**: Advanced anomaly detection (12 event types) with severity-based HUD alerts and temporal deduplication.

```
Video File / RTSP / Webcam
    │
    ├─► [YOLOv8s-seg + ByteTrack]  Object detection, segmentation, persistent tracking
    ├─► [YOLOv8n-pose]             17-keypoint pose → biomechanical actions (ActionBuffer)
    ├─► [EasyOCR]                  Logo/text recognition
    ├─► [Whisper base]             Speech-to-text (99 languages, word timestamps)
    ├─► [Librosa]                  Audio classification: silence/speech/music/scream/gunshot
    │
    ├─► CrossModalTransformer Fusion (8-head attention, d_model=256)
    │       → Scene label + anomaly score + V-A correlation per second
    │
    └─► SurveillanceDetector (12 anomaly types with temporal dedup)
            → loitering / stampede / weapon_proximity / gunshot / scream / fight / fall ...
            │
            └─► Interactive Timeline + Surveillance Alerts + PDF / CSV Report
```

### Quick Start (CPU, No Docker)
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.api.txt
python api_server.py                          # opens dashboard at http://localhost:8000
python analyze_videos.py video.mp4            # CLI analysis
python analyze_videos.py --live 0             # webcam live stream
python analyze_videos.py --live rtsp://...    # RTSP IP camera
```

---

## Project Structure

```
detectra-ai/
├── backend/                    # FastAPI + Celery + PostgreSQL
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (auth, videos, analysis, results, reports)
│   │   ├── core/               # Security (JWT/bcrypt), logging, exceptions
│   │   ├── db/                 # SQLAlchemy models + Alembic migrations
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── pipeline/       # All 7 AI services + orchestrator
│   │   │   ├── report_generator.py   # PDF + CSV export
│   │   │   └── storage.py
│   │   └── workers/            # Celery app
│   ├── models/                 # Trained model weights (*.pt, *.onnx)
│   ├── tests/                  # pytest test suite
│   └── requirements.txt
│
├── frontend/                   # Next.js 14 + TypeScript + Tailwind
│   ├── app/                    # App Router pages
│   ├── components/             # VideoUploader, ProgressTracker, TimelineViewer, etc.
│   └── lib/                    # API client, auth helpers, shared types
│
├── notebooks/                  # Colab/Kaggle training notebooks
│   ├── 01_logo_recognition_training.ipynb   (Colab T4, ~2h)
│   ├── 02_motion_recognition_training.ipynb (Kaggle P100, ~6h)
│   ├── 03_fusion_engine_training.ipynb      (Colab T4, ~4h)
│   └── 04_model_export_quantization.ipynb
│
└── docker-compose.yml
```

---

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/UCP-FYP-F25AI009/detectra-ai.git
cd detectra-ai
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY at minimum
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:8000/api/docs  
- **Health check:** http://localhost:8000/health  

### 3. Run Database Migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Create Admin Account

Register via the UI at http://localhost:3000/register or via API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@detectra.ai","password":"admin123!","full_name":"Admin"}'
```

---

## Development Setup (No Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate

# Install CPU-only PyTorch first (much smaller)
pip install torch==2.4.1+cpu torchvision==0.19.1+cpu torchaudio==2.4.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env  # edit as needed

# Start PostgreSQL + Redis (via Docker)
docker compose up postgres redis -d

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker (in a separate terminal)
celery -A app.workers.celery_app worker --loglevel=info --queues=analysis
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# Open http://localhost:3000
```

---

## Training the Custom Models (GPU Required)

All training runs on **free GPU** via Colab or Kaggle. No local GPU needed.

### Model 1: Logo Recognition

| Detail | Value |
|--------|-------|
| Notebook | `notebooks/01_logo_recognition_training.ipynb` |
| Platform | Google Colab T4 |
| Base Model | `google/vit-base-patch16-224` |
| Dataset | OpenLogos-32 + FlickrLogos-47 |
| Classes | 32 brand logos |
| Training Time | ~2 hours |
| Output | `logo_vit_quantized.onnx` |

```bash
# After training, copy to:
cp <downloaded_file> backend/models/logo_vit_quantized.onnx
```

### Model 2: Action Recognition

| Detail | Value |
|--------|-------|
| Notebook | `notebooks/02_motion_recognition_training.ipynb` |
| Platform | Kaggle (P100 GPU, 30h/week free) |
| Base Model | `MCG-NJU/videomae-base` |
| Dataset | UCF-101 (101 classes, 13K videos) |
| Training Time | ~6 hours |
| Output | `motion_videomae_quantized.onnx` |

### Model 3: Multimodal Fusion Engine

| Detail | Value |
|--------|-------|
| Notebook | `notebooks/03_fusion_engine_training.ipynb` |
| Platform | Google Colab T4 |
| Architecture | CrossModalTransformer (custom) |
| d_model | 256, 8 heads, 2 cross-attn layers |
| Training Time | ~4 hours |
| Output | `fusion_transformer.pt` |

**Without trained models:** The system still works using rule-based fusion fallback and pretrained models (YOLOv8, Whisper, YAMNet).

---

## API Reference

Full interactive docs at `/api/docs` (Swagger) or `/api/redoc`.

### Standalone API (api_server.py)

```
POST   /api/analyze               Upload video → returns job_id (202)
GET    /api/jobs/{id}             Job status + progress percentage
GET    /api/jobs/{id}/result      Full JSON analysis results
GET    /api/jobs/{id}/report      HTML report (FileResponse)
GET    /api/jobs/{id}/video       Labeled MP4 output (FileResponse)
POST   /api/live/start?source=0   Start webcam live stream
POST   /api/live/start?source=rtsp://...  Start RTSP live stream
DELETE /api/live/stop             Stop live stream
GET    /health                    Health check
WS     /ws/{job_id}               Real-time progress events
WS     /ws/live                   Live frame stream (base64 JPEG) + alerts
```

### Full Backend API (backend/)

```
POST   /api/v1/auth/register      Register new user
POST   /api/v1/auth/login         Login (returns JWT tokens)
POST   /api/v1/auth/refresh       Refresh access token
GET    /api/v1/auth/me            Get current user

POST   /api/v1/videos/upload      Upload video (multipart/form-data)
GET    /api/v1/videos/            List user's videos (paginated)
GET    /api/v1/videos/{id}        Get video details + thumbnail
DELETE /api/v1/videos/{id}        Delete video

POST   /api/v1/analysis/{vid}/start   Start analysis pipeline
GET    /api/v1/analysis/{job}/status  Get job status
GET    /api/v1/analysis/{job}/progress   SSE stream (real-time progress)
DELETE /api/v1/analysis/{job}/cancel  Cancel running job

GET    /api/v1/results/job/{job}              Full results (all 7 modalities)
GET    /api/v1/results/job/{job}/anomalies    ?min_severity=high
GET    /api/v1/results/job/{job}/alerts       HIGH + CRITICAL alerts only
GET    /api/v1/results/job/{job}/timeline     ?start_s=0&end_s=60&modalities=object,anomaly
GET    /api/v1/results/job/{job}/modality/{m} Results by modality + confidence filter

GET    /api/v1/reports/job/{job}/pdf    Download PDF report (WeasyPrint)
GET    /api/v1/reports/job/{job}/csv    Download CSV export (pandas)
```

---

## Architecture

### Backend

```
FastAPI (ASGI)
    │
    ├── PostgreSQL (SQLAlchemy ORM)
    │   ├── users
    │   ├── videos
    │   ├── analysis_jobs
    │   └── results (JSONB per modality)
    │
    ├── Redis
    │   ├── Celery task broker
    │   └── Result backend + progress cache
    │
    └── Celery Worker
        └── run_analysis_pipeline task
            ├── VideoPreprocessor (OpenCV + FFmpeg)
            ├── ObjectDetectorService (YOLOv8n)
            ├── LogoRecognizerService (ONNX ViT)
            ├── MotionRecognizerService (ONNX VideoMAE)
            ├── SpeechRecognizerService (Whisper)
            ├── AudioClassifierService (YAMNet)
            └── MultimodalFusionEngine (CrossModalTransformer)
```

### Fusion Engine

```
Visual Stream              Audio Stream
 [Objects+Logos+Actions]   [Speech+Audio Events]
        │                         │
   Linear(→256)             Linear(→256)
        │                         │
   + Temporal PE            + Temporal PE
        │                         │
        └────── Cross-Attention ───┘
                   (8 heads)
                       │
              Temporal Self-Attention
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
       Scene Label           Anomaly Score
       (11 classes)          (0.0 → 1.0)
```

---

## CPU Inference Performance

All models are INT8 quantized for CPU deployment:

| Module | Model | Est. CPU Time (1-min video) |
|--------|-------|-----------------------------|
| Object Detection | YOLOv8n | ~30s |
| Logo Recognition | ViT INT8 ONNX | ~20s |
| Action Recognition | VideoMAE INT8 ONNX | ~4min |
| Speech-to-Text | Whisper base | ~45s |
| Audio Events | YAMNet | ~10s |
| Fusion Engine | CrossModalTransformer | ~2s |
| **Total** | | **~7-8 minutes** |

---

## Running Tests

```bash
cd backend

# Unit + API tests (no GPU needed, uses SQLite in-memory)
pytest tests/ -v

# With coverage report
pytest tests/ -v --cov=app --cov-report=html
```

---

## Grading Criteria Coverage

| Module | Weight | Status |
|--------|--------|--------|
| Object detection + logo recognition | 20% | ✅ YOLOv8n + custom ViT |
| Motion / action recognition | 15% | ✅ VideoMAE UCF-101 |
| Audio analysis (speech + env) | 15% | ✅ Whisper + YAMNet |
| **Multimodal fusion engine** | **25%** | ✅ CrossModalTransformer |
| Interactive web dashboard | 15% | ✅ Next.js timeline + charts |
| Integration + testing + docs | 10% | ✅ Docker + CI + pytest |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.115, Python 3.11 |
| Task Queue | Celery 5.4 + Redis 7 |
| Database | PostgreSQL 15 + SQLAlchemy 2.0 |
| Object Detection | YOLOv8s-seg + ByteTrack (persistent tracking) |
| Pose / Actions | YOLOv8n-pose + ActionBuffer temporal smoothing |
| Logo / OCR | EasyOCR |
| Speech-to-Text | OpenAI Whisper base (99 languages) |
| Audio Events | Librosa (7 types incl. gunshot/scream) |
| Fusion Engine | Custom PyTorch CrossModalTransformer (8-head) |
| Anomaly Detection | Rule-based SurveillanceDetector (12 types) |
| Preprocessing | CLAHE low-light enhancement |
| Standalone API | FastAPI + Uvicorn + WebSockets |
| Full Backend | FastAPI + Celery + Redis + PostgreSQL |
| Report Export | WeasyPrint (PDF) + pandas (CSV) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Auth | JWT (python-jose) + bcrypt |
| Containerization | Docker + docker-compose + Nginx |
| CI/CD | GitHub Actions |

---

## License

Academic project — University of Central Punjab, FYP Group F25AI009, 2025-2026.
