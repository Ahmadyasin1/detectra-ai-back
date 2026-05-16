"""
Detectra AI v4.0 — Production API Server
=========================================
Standalone FastAPI server wrapping the v4 surveillance analyzer.

Endpoints:
  GET  /                        — Surveillance dashboard (HTML)
  POST /api/analyze             — Upload video → start analysis job
  GET  /api/jobs/{job_id}       — Job status + progress
  GET  /api/jobs/{job_id}/result — Full analysis results (JSON)
  GET  /api/jobs/{job_id}/report — HTML report (redirect)
  GET  /api/jobs/{job_id}/video  — Labeled video download
  DELETE /api/jobs/{job_id}     — Cancel / delete job
  GET  /api/jobs                — List all jobs
  POST /api/live/start          — Start live stream analysis
  DELETE /api/live/stop         — Stop live stream
  GET  /api/live/status         — Live stream status
  GET  /ws/{job_id}             — WebSocket: real-time job progress
  GET  /ws/live                 — WebSocket: live stream frames + alerts
  GET  /health                  — Health check

Run:
  pip install fastapi uvicorn[standard] python-multipart aiofiles
  python api_server.py
  # or:
  uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import asyncio
import io
import itertools
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import traceback
import uuid
from urllib import error as urllib_error
from urllib import request as urllib_request
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

# ── force UTF-8 on Windows ────────────────────────────────────────────────────
# Use reconfigure() rather than wrapping in a new TextIOWrapper.
# Wrapping creates a second owner of sys.stdout.buffer — when the old wrapper
# is GC'd it closes the buffer, causing "I/O operation on closed file" in
# background threads that call print().
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except AttributeError:
    pass
try:
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except AttributeError:
    pass

import aiofiles
import uvicorn
from fastapi import (Depends, FastAPI, File, Header,
                     HTTPException, UploadFile, WebSocket, WebSocketDisconnect)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from anyio import to_thread  # For running CPU-bound tasks without blocking

# ── Detectra core (same directory) ────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

# Load .env from the same directory as api_server.py (before reading os.getenv below)
try:
    from dotenv import load_dotenv
    load_dotenv(SCRIPT_DIR / ".env", override=False)
except ImportError:
    pass

_start_time = time.perf_counter()

# ─── Configuration ────────────────────────────────────────────────────────────
API_HOST        = os.getenv("API_HOST", "0.0.0.0")
# Heroku sets PORT; local Docker uses API_PORT
API_PORT        = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
WARMUP_MODELS   = os.getenv("WARMUP_MODELS", "0").strip().lower() in ("1", "true", "yes")
MAX_UPLOAD_MB   = int(os.getenv("MAX_UPLOAD_MB", "500"))
# Heroku has an ephemeral filesystem; use /tmp so uploads + jobs_db survive restarts on the same dyno.
_DATA_ROOT      = Path(os.getenv("DETECTRA_DATA_DIR", "/tmp/detectra" if os.getenv("DYNO") else str(SCRIPT_DIR)))
_DATA_ROOT.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR      = Path(os.getenv("UPLOAD_DIR", str(_DATA_ROOT / "uploads")))
OUTPUT_DIR_API  = Path(os.getenv("OUTPUT_DIR", str(_DATA_ROOT / "analysis_output")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR_API.mkdir(parents=True, exist_ok=True)

# Supabase JWT verification (optional — set in .env for production security)
# Find it at: Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# CORS — comma-separated origins, e.g. "https://app.example.com,https://www.example.com"
# Leave unset (or set to "*") to allow all origins (dev / docker-compose mode)
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: list[str] = ["*"] if _raw_origins.strip() == "*" else [
    o.strip() for o in _raw_origins.split(",") if o.strip()
]

ALLOWED_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".m4v"}
HF_TOKEN = os.getenv("HF_TOKEN", os.getenv("VITE_HF_TOKEN", ""))
HF_CHAT_MODEL = os.getenv("HF_CHAT_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
HF_TRANSLATE_MODEL = os.getenv("HF_TRANSLATE_MODEL", "facebook/nllb-200-distilled-600M")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "")).rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))
SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    os.getenv("VITE_SUPABASE_STORAGE_BUCKET", "videos"),
)

LANGUAGE_CODES = {
    "english": "en", "urdu": "ur", "arabic": "ar", "french": "fr", "german": "de",
    "spanish": "es", "chinese": "zh", "hindi": "hi", "turkish": "tr", "russian": "ru",
    "italian": "it", "portuguese": "pt", "japanese": "ja", "korean": "ko", "bengali": "bn",
}


def _normalize_lang_code(lang: str) -> str:
    raw = (lang or "").strip().lower()
    if not raw:
        return "en"
    if raw in LANGUAGE_CODES:
        return LANGUAGE_CODES[raw]
    if "-" in raw:
        return raw.split("-", 1)[0]
    return raw


def _supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _supabase_rest_request(method: str, path: str, body: Any | None = None, query: str = "", extra_headers: dict | None = None) -> str | None:
    if not _supabase_enabled():
        raise RuntimeError("Supabase service role is not configured")

    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if query:
        url = f"{url}?{query}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    if extra_headers:
        headers.update(extra_headers)

    payload = None
    if body is not None:
        payload = json.dumps(body, default=str).encode("utf-8")

    req = urllib_request.Request(url=url, data=payload, headers=headers, method=method)
    try:
        with urllib_request.urlopen(req, timeout=60) as resp:
            return resp.read().decode("utf-8")
    except urllib_error.HTTPError as exc:
        resp_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase REST {method} {url} failed: {exc.code} {exc.reason}: {resp_body[:1000]}")


def _sync_supabase_upsert_video_upload(job: "AnalysisJob") -> None:
    if not _supabase_enabled() or not job.user_id or job.user_id == "anonymous":
        return

    try:
        payload = {
            "user_id": job.user_id,
            "video_url": f"detectra-job://{job.job_id}",
            "title": job.video_name or "Untitled Analysis",
            "status": str(job.status.value if hasattr(job.status, 'value') else job.status),
            "analysis_results": job.result,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _supabase_rest_request(
            "POST",
            "video_uploads",
            body=payload,
            query="on_conflict=video_url",
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
    except Exception as exc:
        print(f"  [Supabase] Failed to sync video_uploads row for job {job.job_id}: {exc}")


def _download_url_to_path(url: str, dest_path: Path, headers: dict[str, str] | None = None) -> None:
    headers = headers or {}
    req = urllib_request.Request(url=url, headers=headers, method="GET")
    try:
        with urllib_request.urlopen(req, timeout=120) as resp:
            with open(dest_path, "wb") as out_file:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    out_file.write(chunk)
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(502, f"Video download failed: {detail[:300]}")
    except Exception as exc:
        raise HTTPException(502, f"Video download failed: {exc}")


def _post_hf_text_generation(model_id: str, prompt: str, max_new_tokens: int = 256) -> str:
    if not HF_TOKEN:
        raise HTTPException(503, "HF_TOKEN is not configured for AI generation/translation")
    url = f"https://api-inference.huggingface.co/models/{model_id}"
    payload = json.dumps(
        {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_new_tokens,
                "temperature": 0.2,
                "top_p": 0.9,
                "do_sample": True,
                "return_full_text": False,
            },
            "options": {"wait_for_model": True, "use_cache": False},
        }
    ).encode("utf-8")
    req = urllib_request.Request(
        url=url,
        data=payload,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(body)
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(502, f"HuggingFace API error: {detail[:300]}")
    except Exception as exc:
        raise HTTPException(502, f"HuggingFace request failed: {exc}")

    if isinstance(data, list) and data:
        txt = data[0].get("generated_text", "")
        return str(txt).strip()
    if isinstance(data, dict):
        txt = data.get("generated_text") or data.get("summary_text") or data.get("translation_text")
        if txt:
            return str(txt).strip()
        if data.get("error"):
            raise HTTPException(502, f"HuggingFace error: {data['error']}")
    raise HTTPException(502, "Unexpected HuggingFace response format")


def _post_gemini_text_generation(model_id: str, prompt: str, max_new_tokens: int = 256) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY is not configured for RAG chatbot generation")

    url = f"https://generativelanguage.googleapis.com/v1beta2/models/{model_id}:generate?key={GEMINI_API_KEY}"
    payload = json.dumps({
        "prompt": {"text": prompt},
        "temperature": 0.2,
        "maxOutputTokens": max_new_tokens,
        "topP": 0.9,
        "topK": 40,
    }).encode("utf-8")

    req = urllib_request.Request(
        url=url,
        data=payload,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(body)
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(502, f"Gemini API error: {detail[:300]}")
    except Exception as exc:
        raise HTTPException(502, f"Gemini request failed: {exc}")

    if isinstance(data, dict):
        if "candidates" in data and isinstance(data["candidates"], list) and data["candidates"]:
            first = data["candidates"][0]
            output = first.get("output")
            if output:
                return str(output).strip()
            content = first.get("content")
            if isinstance(content, list):
                text = "".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
                if text:
                    return text.strip()
        if data.get("error"):
            raise HTTPException(502, f"Gemini error: {data['error']}")
    raise HTTPException(502, "Unexpected Gemini response format")


def _generate_rag_answer(model_id: str, prompt: str, max_new_tokens: int = 256) -> str:
    if GEMINI_API_KEY and model_id.startswith("gemini"):
        return _post_gemini_text_generation(model_id, prompt, max_new_tokens)
    return _post_hf_text_generation(model_id, prompt, max_new_tokens)


def _distinct_person_count(d: dict[str, Any]) -> int:
    """Prefer graph-based distinct_individuals; fall back to raw ByteTrack ID count."""
    n = d.get("distinct_individuals")
    if isinstance(n, int) and n >= 0:
        return n
    return len(d.get("unique_track_ids") or [])


def _build_rag_context(result: dict[str, Any], rag_payload: dict[str, Any]) -> str:
    risk = result.get("risk_level", "UNKNOWN")
    persons = _distinct_person_count(result)
    events = result.get("surveillance_events", [])
    top_objects = result.get("top_objects", [])
    transcript = result.get("full_transcript", "")
    top_obj_text = ", ".join(f"{o.get('label')}({o.get('count')})" for o in top_objects[:10]) or "None"
    event_lines = []
    for e in events[:25]:
        event_lines.append(
            f"- t={float(e.get('timestamp_s', 0)):.1f}s | {e.get('severity','low')} | "
            f"{e.get('event_type','event')}: {e.get('description','')}"
        )
    rag_narrative = rag_payload.get("narrative", "")
    return (
        "Detectra analysis context:\n"
        f"Risk level: {risk}\n"
        f"Distinct individuals (estimated): {persons}\n"
        f"Top objects: {top_obj_text}\n"
        f"Surveillance events ({len(events)}):\n" + ("\n".join(event_lines) if event_lines else "- none") + "\n"
        f"Narrative: {rag_narrative}\n"
        f"Transcript excerpt: {str(transcript)[:1800]}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# Auth dependency — Supabase JWT verification
# ══════════════════════════════════════════════════════════════════════════════

def _verify_supabase_jwt(token: str) -> dict:
    """
    Verify a Supabase access token and return the payload.
    Supabase uses HS256 with audience='authenticated'.
    Falls back to PyJWT if python-jose is not installed.
    """
    try:
        import jwt as _jwt
        payload = _jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(authorization: str | None = Header(default=None)) -> dict | None:
    """
    FastAPI dependency.
    - If SUPABASE_JWT_SECRET is configured: verifies the Bearer token and returns
      the JWT payload (contains sub=user_uuid, email, etc.)
    - If SUPABASE_JWT_SECRET is not set (dev mode): returns a mock user so the
      server works without auth configuration during local development.
    - If auth is required but missing/invalid: raises HTTP 401.
    """
    if not SUPABASE_JWT_SECRET:
        # Dev mode: unauthenticated — all requests are treated as "anonymous"
        return {"sub": "anonymous", "email": "dev@localhost", "dev_mode": True}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header required: 'Bearer <supabase_access_token>'",
        )
    token = authorization.split(" ", 1)[1]
    return _verify_supabase_jwt(token)


def get_optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    """Same as get_current_user but never raises — returns None when unauthenticated."""
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Job state machine
# ══════════════════════════════════════════════════════════════════════════════

class JobStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"
    CANCELLED = "cancelled"


@dataclass
class AnalysisJob:
    job_id:       str
    video_name:   str
    video_path:   str
    user_id:      str           = "anonymous"   # Supabase user UUID or "anonymous"
    status:       JobStatus     = JobStatus.PENDING
    progress:     float         = 0.0      # 0–100
    stage:        str           = "queued"
    created_at:   str           = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at:   str | None    = None
    completed_at: str | None    = None
    error:        str | None    = None
    result:       dict | None   = None     # full analysis result dict
    report_path:  str | None    = None
    labeled_path: str | None    = None
    processing_s: float         = 0.0

    def to_status_dict(self) -> dict:
        return {
            "job_id":       self.job_id,
            "video_name":   self.video_name,
            "user_id":      self.user_id,
            "status":       self.status,
            "progress":     round(self.progress, 1),
            "stage":        self.stage,
            "created_at":   self.created_at,
            "started_at":   self.started_at,
            "completed_at": self.completed_at,
            "error":        self.error,
            "processing_s": round(self.processing_s, 1),
            "has_result":   self.result is not None,
            "has_report":   self.report_path is not None,
            "has_video":    self.labeled_path is not None,
        }


# ── Job persistence ───────────────────────────────────────────────────────────
JOBS_DB = Path(os.getenv("JOBS_DB_PATH", str(_DATA_ROOT / "jobs_db.json")))

def _save_jobs():
    """Serialize the in-memory job store to a JSON file."""
    try:
        data = {}
        for jid, job in _jobs.items():
            data[jid] = {
                "job_id":       job.job_id,
                "video_name":   job.video_name,
                "video_path":   str(job.video_path),
                "user_id":      job.user_id,
                "status":       str(job.status.value if hasattr(job.status, 'value') else job.status),
                "progress":     float(job.progress),
                "stage":        job.stage,
                "created_at":   job.created_at,
                "started_at":   job.started_at,
                "completed_at": job.completed_at,
                "error":        job.error,
                "result":       job.result,
                "report_path":  job.report_path,
                "labeled_path": job.labeled_path,
                "processing_s": float(job.processing_s),
            }
        with open(JOBS_DB, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"  [DB] Error saving jobs: {e}")

def _load_jobs():
    """Load jobs from JSON file on disk."""
    global _jobs
    if not JOBS_DB.exists():
        return
    try:
        with open(JOBS_DB, "r", encoding="utf-8") as f:
            data = json.load(f)
        for jid, d in data.items():
            try:
                # Convert type-sensitive fields back to correct Python types
                if "status" in d:
                    d["status"] = JobStatus(d["status"])
                if "progress" in d:
                    d["progress"] = float(d["progress"])
                if "processing_s" in d:
                    d["processing_s"] = float(d["processing_s"])
                
                _jobs[jid] = AnalysisJob(**d)
            except Exception as e:
                print(f"  [DB] Skip job '{jid}': {e}")
                continue
        print(f"  [DB] Loaded {len(_jobs)} jobs from {JOBS_DB.name}")
    except Exception as e:
        print(f"  [DB] Error loading jobs: {e}")

# ── In-memory job store ───────────────────────────────────────────────────────
_jobs:     dict[str, AnalysisJob] = {}
_ws_conns: dict[str, list[WebSocket]] = {}   # job_id → active WebSocket connections
_live_ws:  list[WebSocket] = []              # live-stream WebSocket connections

# ── Lazy-loaded analyzer singleton ────────────────────────────────────────────
_analyzer     = None
_analyzer_lock = threading.Lock()

_live_analyzer     = None
_live_thread: threading.Thread | None = None
_live_job_id: str | None = None


def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        with _analyzer_lock:
            if _analyzer is None:
                print("  [INIT] Loading AI Multi-Model Analyzer (Lazy)...")
                from analyze_videos import DetectraAnalyzer
                _analyzer = DetectraAnalyzer()
                # Trigger internal model loads
                _analyzer._load_seg()
                _analyzer._load_pose()
                _analyzer._load_whisper()
    return _analyzer


async def _preload_models():
    """Pre-load models in a background thread at startup."""
    try:
        print("  [INIT] Background model pre-loading started...")
        await to_thread.run_sync(_get_analyzer)
        print("  [INIT] Background model pre-loading COMPLETE ✓")
    except Exception as e:
        print(f"  [INIT] Background pre-loading FAILED: {e}")
        traceback.print_exc()


# ══════════════════════════════════════════════════════════════════════════════
# WebSocket broadcast helpers
# ══════════════════════════════════════════════════════════════════════════════

async def _broadcast(job_id: str, payload: dict):
    """Send JSON payload to all WebSocket clients watching this job."""
    conns = _ws_conns.get(job_id, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in conns:
            conns.remove(ws)


async def _broadcast_live(payload: dict):
    dead = []
    for ws in _live_ws:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _live_ws:
            _live_ws.remove(ws)


_loop: asyncio.AbstractEventLoop | None = None


def _sync_broadcast(job_id: str, payload: dict):
    """Thread-safe broadcast from worker thread."""
    try:
        if _loop is not None and _loop.is_running():
            asyncio.run_coroutine_threadsafe(_broadcast(job_id, payload), _loop)
    except Exception:
        pass


def _sync_broadcast_live(payload: dict):
    try:
        if _loop is not None and _loop.is_running():
            asyncio.run_coroutine_threadsafe(_broadcast_live(payload), _loop)
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# Background analysis worker
# ══════════════════════════════════════════════════════════════════════════════

def _serialize_analysis(result, video_name: str | None = None) -> dict:
    """Convert VideoAnalysis dataclass to JSON-serializable dict with computed intelligence fields."""
    import numpy as np

    def fix(obj):
        if isinstance(obj, np.ndarray): return obj.tolist()
        if isinstance(obj, set):        return sorted(list(obj))
        if isinstance(obj, Path):       return str(obj)
        if hasattr(obj, "__dataclass_fields__"):
            return {k: fix(getattr(obj, k)) for k in obj.__dataclass_fields__}
        if isinstance(obj, list):  return [fix(i) for i in obj]
        if isinstance(obj, dict):  return {k: fix(v) for k, v in obj.items()}
        return obj

    d = fix(result)

    # Lightweight per-frame telemetry for dashboards (before stripping frame_results)
    frs = d.get("frame_results") or []
    if frs:
        n_frames = len(frs)
        max_pts = 500
        stride = max(1, (n_frames + max_pts - 1) // max_pts)
        d["frame_analytics"] = [
            {
                "t": round(float(fr.get("timestamp_s", 0)), 3),
                "person_count": int(fr.get("person_count", 0)),
                "action": str(fr.get("dominant_action") or "")[:96],
                "motion": round(float(fr.get("flow_magnitude", 0)), 4),
            }
            for fr in frs[::stride]
        ][:max_pts]
    else:
        d["frame_analytics"] = []

    # Remove heavy / internal fields — keep response clean and portable
    d.pop("frame_results", None)
    d.pop("logo_detections", None)
    d.pop("labeled_video_path", None)   # local FS path — clients use /api/jobs/{id}/video
    d.pop("report_path", None)          # local FS path — clients use /api/jobs/{id}/report
    d.pop("video_path", None)           # internal upload path — not useful to clients

    # ── Computed: video identity ───────────────────────────────────────────────
    raw_name = video_name or "video"
    # Strip extension for clean display name (e.g. "myvideo.mp4" → "myvideo")
    d["video_name"] = Path(raw_name).stem if raw_name else "video"

    # ── Computed: risk level + score ──────────────────────────────────────────
    events = d.get("surveillance_events", [])
    sevs   = {e.get("severity", "low") for e in events}
    if "critical" in sevs:
        d["risk_level"] = "CRITICAL"
    elif "high" in sevs:
        d["risk_level"] = "HIGH"
    elif "medium" in sevs:
        d["risk_level"] = "MEDIUM"
    else:
        d["risk_level"] = "LOW"

    _sev_w = {"critical": 1.0, "high": 0.70, "medium": 0.35, "low": 0.10}
    if events:
        total_w = sum(
            _sev_w.get(e.get("severity", "low"), 0.10) * e.get("confidence", 0.5)
            for e in events
        )
        d["risk_score"] = round(min(1.0, total_w / max(len(events), 1)), 4)
    else:
        d["risk_score"] = 0.0

    # ── Computed: per-second anomaly timeline for sparkline/chart ─────────────
    dur     = d.get("duration_s", 0.0)
    n_bins  = max(int(dur) + 1, 1)
    _tl     = [0.0] * n_bins
    for ins in d.get("fusion_insights", []):
        t = int(ins.get("window_start_s", 0))
        if 0 <= t < n_bins:
            _tl[t] = max(_tl[t], ins.get("anomaly_score", 0.0))
    d["anomaly_timeline"] = [round(v, 4) for v in _tl]

    # ── Computed: severity counts for quick stats ──────────────────────────────
    d["severity_counts"] = {
        "critical": sum(1 for e in events if e.get("severity") == "critical"),
        "high":     sum(1 for e in events if e.get("severity") == "high"),
        "medium":   sum(1 for e in events if e.get("severity") == "medium"),
        "low":      sum(1 for e in events if e.get("severity") == "low"),
    }

    # ── Computed: top objects list (sorted by frequency) ──────────────────────
    cf = d.get("class_frequencies", {})
    _sorted_cf: list[tuple[str, int]] = sorted(
        ((str(k), int(v)) for k, v in cf.items()), key=lambda t: t[1], reverse=True
    )
    d["top_objects"] = [{"label": k, "count": v} for k, v in itertools.islice(_sorted_cf, 15)]

    # ── Computed: narrative summary if empty ──────────────────────────────────
    if not d.get("summary"):
        n_persons = _distinct_person_count(d)
        n_events  = len(events)
        risk      = d["risk_level"]
        mins, secs = int(dur // 60), int(dur % 60)
        dur_str   = f"{mins}m {secs}s" if mins else f"{secs}s"
        top_obj   = ", ".join(x["label"] for x in d["top_objects"][:3]) or "no objects"
        langs     = ", ".join(
            l.get("name") or l.get("code", "unknown")
            for l in d.get("detected_languages", [])
        ) or "none detected"
        crit_n    = d["severity_counts"]["critical"]
        crit_s    = f" including {crit_n} critical alert(s)" if crit_n else ""
        d["summary"] = (
            f"Analysis of {dur_str} footage detected {n_persons} unique individual(s) "
            f"with {n_events} surveillance event(s){crit_s}. "
            f"Primary objects: {top_obj}. Language(s) detected: {langs}. "
            f"Overall security risk: {risk}."
        )

    return d


def _run_analysis_worker(job_id: str):
    """Background thread: runs full v4 analysis and updates job state."""
    job = _jobs[job_id]
    job.status     = JobStatus.RUNNING
    job.started_at = datetime.now(timezone.utc).isoformat()
    _save_jobs()
    t0 = time.perf_counter()

    def progress(pct: float, stage: str):
        job.progress = pct
        job.stage    = stage
        job.processing_s = time.perf_counter() - t0
        _sync_broadcast(job_id, {
            "type": "progress", "job_id": job_id,
            "progress": round(pct, 1), "stage": stage,
            "processing_s": round(job.processing_s, 1),
        })

    try:
        progress(2.0, "loading_models")
        analyzer = _get_analyzer()

        def patched_analyze(video_path):
            from pathlib import Path as P
            from analyze_videos import (
                VideoAnalysis,
                USE_DENOISE,
                align_audio_events_with_speech,
                classify_audio,
            )
            import cv2

            progress(9.0, "reading_video")
            cap = cv2.VideoCapture(str(video_path))
            src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            nf = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            dur = max(nf / src_fps, 0.1)   # guard against 0-frame videos
            cap.release()

            analysis = VideoAnalysis(video_path=P(video_path), duration_s=dur,
                                     width=W, height=H, fps=src_fps, total_frames=nf)

            # Run perception with incremental progress broadcast (10→58%)
            # so the WS client sees live updates during long videos.
            progress(10.0, "perception")
            _perc_done = threading.Event()
            def _perc_ticker():
                p: float = 10.0
                while not _perc_done.is_set():
                    _perc_done.wait(timeout=3.0)
                    if not _perc_done.is_set() and p < 57.0:
                        p = min(p + 4.0, 57.0)
                        progress(p, "perception")
            _ticker = threading.Thread(target=_perc_ticker, daemon=True)
            _ticker.start()
            try:
                analysis.frame_results, analysis.unique_track_ids, analysis.logo_detections = \
                    analyzer._run_perception(P(video_path), analysis)
            finally:
                _perc_done.set()

            progress(60.0, "speech_audio")
            audio_path = analyzer._extract_audio(P(video_path))
            if audio_path:
                if USE_DENOISE:
                    audio_path = analyzer._denoise_audio(audio_path)
                analysis.speech_segments    = analyzer._run_whisper(audio_path, dur)
                # _run_whisper stores per-language summary in _last_detected_languages —
                # must copy it here or _compute_stats loses all language detection data.
                analysis.detected_languages = analyzer._last_detected_languages
                analysis.audio_events       = classify_audio(str(audio_path), dur)
                analysis.audio_events       = align_audio_events_with_speech(
                    analysis.audio_events, analysis.speech_segments
                )
                audio_path.unlink(missing_ok=True)
                (OUTPUT_DIR_API / f"_tmp_{P(video_path).stem}.wav").unlink(missing_ok=True)

            progress(75.0, "fusion")
            analysis.fusion_insights = analyzer._fusion.fuse(
                analysis.frame_results, analysis.audio_events,
                analysis.speech_segments, dur)

            progress(82.0, "surveillance")
            analysis.surveillance_events = analyzer._surv.analyze(
                analysis.frame_results, analysis.audio_events)

            # Must match CLI `DetectraAnalyzer.analyze()`: EMA smoothing, cross-modal
            # dedup, speech pruning, and severity alignment — without this, API results
            # diverge from standalone `python analyze_videos.py` runs.
            progress(84.0, "postprocessing")
            analyzer._validator.validate(analysis)

            progress(88.0, "writing_output")
            analyzer._compute_stats(analysis)
            analysis.labeled_video_path = analyzer._write_labeled_video(P(video_path), analysis)
            analysis.report_path        = analyzer._write_html_report(analysis)
            analyzer._write_rag_json(analysis)
            analysis.processing_time_s  = time.perf_counter() - t0
            return analysis

        progress(8.0, "starting_analysis")
        result = patched_analyze(job.video_path)

        job.result       = _serialize_analysis(result, video_name=job.video_name)
        job.report_path  = str(result.report_path) if result.report_path else None
        job.labeled_path = str(result.labeled_video_path) if result.labeled_video_path else None
        job.processing_s = time.perf_counter() - t0
        job.status       = JobStatus.COMPLETED
        job.completed_at = datetime.now(timezone.utc).isoformat()
        job.progress     = 100.0
        job.stage        = "completed"
        _save_jobs()
        _sync_supabase_upsert_video_upload(job)

        # Build summary for WebSocket notification
        surv_n = len(result.surveillance_events)
        risk   = job.result.get("fusion_insights", [{}])
        _sync_broadcast(job_id, {
            "type": "completed", "job_id": job_id,
            "processing_s": round(job.processing_s, 1),
            "persons": result.distinct_individuals,
            "surveillance_events": surv_n,
            "report_url": f"/api/jobs/{job_id}/report",
            "video_url":  f"/api/jobs/{job_id}/video",
        })

    except Exception as exc:
        job.status       = JobStatus.FAILED
        job.error        = str(exc)
        job.completed_at = datetime.now(timezone.utc).isoformat()
        job.processing_s = time.perf_counter() - t0
        job.stage        = "failed"
        _save_jobs()
        _sync_supabase_upsert_video_upload(job)
        _sync_broadcast(job_id, {
            "type": "error", "job_id": job_id, "error": str(exc)
        })
        traceback.print_exc()


# ══════════════════════════════════════════════════════════════════════════════
# FastAPI application
# ══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _loop
    _loop = asyncio.get_running_loop()
    _load_jobs()
    print(f"  [DB] Jobs loaded: {len(_jobs)} from {JOBS_DB}")
    print(f"  [DB] Upload dir: {UPLOAD_DIR} | Supabase backend: {_supabase_enabled()}")
    if WARMUP_MODELS:
        _loop.create_task(_preload_models())
    else:
        print("  [INIT] WARMUP_MODELS=0 — models load on first analysis request")
    yield


app = FastAPI(
    title="Detectra AI",
    version="4.0.0",
    description="Advanced Multimodal Surveillance Video Intelligence Platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],  # credentials only when origins are restricted
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve labeled videos and HTML reports as static files
if OUTPUT_DIR_API.exists():
    app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR_API)), name="outputs")


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    active_jobs = [j for j in _jobs.values() if j.status == JobStatus.RUNNING]
    return {
        "status": "online",
        "version": "4.1.0-professional",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models_loaded": _analyzer is not None,
        "active_jobs": len(active_jobs),
        "total_jobs": len(_jobs),
        "jobs_db": str(JOBS_DB),
        "upload_dir": str(UPLOAD_DIR),
        "supabase_configured": _supabase_enabled(),
        "on_heroku": bool(os.getenv("DYNO")),
    }


# ── Upload + Analyze ───────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def start_analysis(
    file: UploadFile = File(...),
    current_user: dict | None = Depends(get_optional_user),
):
    """Upload a video file and start analysis. Returns job_id immediately."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported format '{ext}'. Allowed: {ALLOWED_EXTS}")

    job_id    = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{job_id}{ext}"
    user_id   = (current_user or {}).get("sub", "anonymous")

    # Stream upload to disk in 4MB chunks — avoids loading the entire file into RAM.
    # Track written bytes BEFORE opening so we can safely delete the partial file
    # outside the context manager if the size limit is exceeded (Windows can't delete
    # an open file, and calling f.close() inside async-with causes a double-close).
    CHUNK   = 4 * 1024 * 1024
    MAX_B   = MAX_UPLOAD_MB * 1024 * 1024
    written = 0
    size_exceeded = False
    async with aiofiles.open(save_path, "wb") as f:
        while True:
            chunk = await file.read(CHUNK)
            if not chunk:
                break
            await f.write(chunk)
            written += len(chunk)
            if written > MAX_B:
                size_exceeded = True
                break
    # Context manager is now closed — safe to delete on Windows
    if size_exceeded:
        save_path.unlink(missing_ok=True)
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_MB} MB limit")
    mb = written / (1024 * 1024)

    job = AnalysisJob(
        job_id=job_id,
        video_name=file.filename or save_path.name,
        video_path=str(save_path),
        user_id=user_id,
    )
    _jobs[job_id] = job
    _save_jobs()
    _ws_conns[job_id] = []

    # Sync the initial job record to Supabase if available.
    try:
        _sync_supabase_upsert_video_upload(job)
    except Exception as exc:
        print(f"  [Supabase] Initial job sync failed: {exc}")

    # Start analysis in background thread
    thread = threading.Thread(target=_run_analysis_worker, args=(job_id,), daemon=True)
    thread.start()

    return JSONResponse({
        "job_id":      job_id,
        "status":      JobStatus.PENDING,
        "video_name":  job.video_name,
        "user_id":     user_id,
        "size_mb":     round(mb, 2),
        "ws_url":      f"/ws/{job_id}",
        "status_url":  f"/api/jobs/{job_id}",
        "result_url":  f"/api/jobs/{job_id}/result",
    }, status_code=202)


async def _download_from_supabase_storage(bucket: str, storage_path: str, dest_path: Path) -> None:
    if not _supabase_enabled():
        raise HTTPException(503, "Supabase is not configured on the backend (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")

    bucket = bucket.strip().lstrip("/")
    storage_path = storage_path.strip().lstrip("/")
    if not bucket:
        raise HTTPException(400, "Bucket name is required for Supabase storage download")
    if not storage_path:
        raise HTTPException(400, "storage_path is required for Supabase storage download")

    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        # Supabase Storage requires the project apikey alongside the bearer token.
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }
    try:
        _download_url_to_path(url, dest_path, headers)
    except HTTPException as exc:
        # Re-raise with a clearer, actionable message
        detail = (exc.detail or "").lower()
        if "bucket not found" in detail:
            raise HTTPException(
                404,
                f"Storage bucket '{bucket}' does not exist in this Supabase project. "
                f"Create it in Supabase Dashboard → Storage, or update SUPABASE_STORAGE_BUCKET.",
            ) from exc
        if "object not found" in detail or "not found" in detail:
            raise HTTPException(
                404,
                f"File '{storage_path}' not found in bucket '{bucket}'. "
                f"Did the upload from the frontend succeed?",
            ) from exc
        raise


@app.post("/api/analyze/url")
async def start_analysis_from_url(
    payload: dict[str, Any],
    current_user: dict | None = Depends(get_optional_user),
):
    """Start analysis from an external or Supabase bucket URL."""
    video_name = payload.get("video_name") or "upload.mp4"
    public_url = payload.get("public_url")
    storage_path = payload.get("storage_path")
    bucket = payload.get("bucket") or SUPABASE_STORAGE_BUCKET

    if not public_url and not storage_path:
        raise HTTPException(400, "public_url or storage_path is required")

    ext = Path(video_name).suffix.lower() or ".mp4"
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported format '{ext}'. Allowed: {ALLOWED_EXTS}")

    job_id = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{job_id}{ext}"
    user_id = (current_user or {}).get("sub", "anonymous")

    try:
        if storage_path:
            await _download_from_supabase_storage(bucket, storage_path, save_path)
        else:
            _download_url_to_path(public_url, save_path)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"Video download failed: {exc}")

    job = AnalysisJob(
        job_id=job_id,
        video_name=video_name,
        video_path=str(save_path),
        user_id=user_id,
    )
    _jobs[job_id] = job
    _save_jobs()
    _ws_conns[job_id] = []

    try:
        _sync_supabase_upsert_video_upload(job)
    except Exception as exc:
        print(f"  [Supabase] Initial job sync failed: {exc}")

    thread = threading.Thread(target=_run_analysis_worker, args=(job_id,), daemon=True)
    thread.start()

    return JSONResponse({
        "job_id":      job_id,
        "status":      JobStatus.PENDING,
        "video_name":  job.video_name,
        "user_id":     user_id,
        "size_mb":     0,
        "ws_url":      f"/ws/{job_id}",
        "status_url":  f"/api/jobs/{job_id}",
        "result_url":  f"/api/jobs/{job_id}/result",
    }, status_code=202)


# ── Job management ─────────────────────────────────────────────────────────────

def _require_job_access(job_id: str, current_user: dict | None) -> "AnalysisJob":
    """Return job if it exists and belongs to the current user; else raise 404/403."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    if SUPABASE_JWT_SECRET and current_user:
        user_id = (current_user or {}).get("sub", "anonymous")
        if user_id and user_id != "anonymous":
            if job.user_id != "anonymous" and job.user_id != user_id:
                raise HTTPException(403, "Access denied — this job belongs to another user")
    return job


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    """Return the current status of a job."""
    job = _require_job_access(job_id, current_user)
    return job.to_status_dict()


@app.get("/api/jobs/{job_id}/result")
async def get_job_result(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    """Return the full analysis result dictionary."""
    job = _require_job_access(job_id, current_user)
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(409, "Job not completed yet")
    return job.result


@app.get("/api/jobs/{job_id}/rag")
async def job_rag_json(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    """Download the RAG-ready JSON produced by _write_rag_json."""
    job = _require_job_access(job_id, current_user)
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(409, "Job not completed yet")
    # Look for the RAG JSON file in the output directory
    from analyze_videos import OUTPUT_DIR
    stem = Path(job.video_path).stem
    rag_path = OUTPUT_DIR / f"{stem}_rag.json"
    if not rag_path.exists():
        raise HTTPException(404, "RAG JSON not found — re-run analysis")
    return FileResponse(str(rag_path), media_type="application/json", filename=rag_path.name)


@app.get("/api/jobs/{job_id}/translate")
async def job_translate(
    job_id: str,
    target_lang: str = "en",
    current_user: dict | None = Depends(get_optional_user),
):
    """
    Translate the transcript into a requested language.
    Uses HuggingFace text generation if HF_TOKEN is configured.
    """
    job = _require_job_access(job_id, current_user)
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(409, "Job not completed yet")
    result = job.result or {}
    transcript = str(result.get("full_transcript", "")).strip()
    if not transcript:
        return {
            "job_id": job_id,
            "target_lang": _normalize_lang_code(target_lang),
            "translated_text": "",
            "message": "No transcript available to translate.",
        }

    normalized_target = _normalize_lang_code(target_lang)
    prompt = (
        f"Translate the following transcript to language code '{normalized_target}'. "
        "Preserve timestamps and keep meaning precise for surveillance context.\n\n"
        f"{transcript}"
    )
    translated = _post_hf_text_generation(HF_TRANSLATE_MODEL, prompt, max_new_tokens=700)
    return {
        "job_id": job_id,
        "target_lang": normalized_target,
        "translated_text": translated,
    }


@app.post("/api/jobs/{job_id}/ask")
async def job_ask(
    job_id: str,
    payload: dict[str, Any],
    current_user: dict | None = Depends(get_optional_user),
):
    """
    RAG-style Q&A endpoint for analyzer dashboard.
    Falls back to deterministic answers for common operational questions.
    """
    job = _require_job_access(job_id, current_user)
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(409, "Job not completed yet")
    question = str(payload.get("question", "")).strip()
    if not question:
        raise HTTPException(400, "Question is required")
    result = job.result or {}
    ql = question.lower()

    # Deterministic fast-path for operational questions.
    if "how many person" in ql or "how many people" in ql or "person count" in ql:
        return {
            "answer": (
                f"Estimated { _distinct_person_count(result) } distinct individual(s) "
                f"(ByteTrack may assign multiple ID segments per person). "
                f"Peak concurrent persons in any frame: {result.get('max_concurrent_persons', 0)}."
            )
        }
    if "theft" in ql or "steal" in ql or "robbery" in ql:
        theft_events = [
            e for e in (result.get("surveillance_events") or [])
            if any(k in str(e.get("event_type", "")).lower() for k in ("theft", "steal", "robbery"))
        ]
        if theft_events:
            return {"answer": f"Potential theft-related events detected: {len(theft_events)}."}
        return {"answer": "No explicit theft/robbery event was detected by current surveillance rules."}

    # Build RAG context from saved JSON + current result.
    from analyze_videos import OUTPUT_DIR
    stem = Path(job.video_path).stem
    rag_path = OUTPUT_DIR / f"{stem}_rag.json"
    rag_payload: dict[str, Any] = {}
    if rag_path.exists():
        try:
            rag_payload = json.loads(rag_path.read_text(encoding="utf-8"))
        except Exception:
            rag_payload = {}
    context = _build_rag_context(result, rag_payload)
    prompt = (
        "You are Detectra AI assistant. Answer based ONLY on the provided analysis context. "
        "Be concise, factual, and professional. If uncertain, state it clearly.\n\n"
        f"{context}\n\nQuestion: {question}\nAnswer:"
    )
    answer = _generate_rag_answer(GEMINI_MODEL if GEMINI_API_KEY else HF_CHAT_MODEL, prompt, max_new_tokens=300)
    return {"answer": answer}


@app.get("/api/jobs/{job_id}/report")
async def job_report(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    job = _require_job_access(job_id, current_user)
    if not job.report_path:
        raise HTTPException(404, "Report not available")
    p = Path(job.report_path)
    if not p.exists():
        raise HTTPException(404, "Report file missing")
    return FileResponse(str(p), media_type="text/html", filename=p.name)


@app.get("/api/jobs/{job_id}/video")
async def job_video(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    job = _require_job_access(job_id, current_user)
    if not job.labeled_path:
        raise HTTPException(404, "Labeled video not available")
    p = Path(job.labeled_path)
    if not p.exists():
        raise HTTPException(404, "Video file missing")
    return FileResponse(str(p), media_type="video/mp4", filename=p.name)


@app.get("/api/jobs")
async def list_jobs(current_user: dict | None = Depends(get_optional_user)):
    """List all jobs. If authorized, filter by user; otherwise return all (for demo)."""
    uid = (current_user or {}).get("sub")
    if uid:
        user_jobs = [j.to_status_dict() for j in _jobs.values() if j.user_id == uid or j.user_id == "anonymous"]
    else:
        user_jobs = [j.to_status_dict() for j in _jobs.values()]
    return sorted(user_jobs, key=lambda x: x["created_at"], reverse=True)


@app.get("/api/stats")
async def get_stats(current_user: dict | None = Depends(get_optional_user)):
    """Return analytical metrics for the dashboard."""
    uid = (current_user or {}).get("sub")
    if uid:
        my_jobs = [j for j in _jobs.values() if j.user_id == uid or j.user_id == "anonymous"]
    else:
        my_jobs = list(_jobs.values())
    
    total = len(my_jobs)
    done = sum(1 for j in my_jobs if j.status == JobStatus.COMPLETED)
    active = sum(1 for j in my_jobs if j.status in (JobStatus.PENDING, JobStatus.RUNNING))
    failed = sum(1 for j in my_jobs if j.status == JobStatus.FAILED)
    
    # Aggregate some risk metrics
    critical = sum(1 for j in my_jobs if j.result and (j.result or {}).get("risk_level") == "CRITICAL")
    
    return {
        "total": total,
        "completed": done,
        "active": active,
        "failed": failed,
        "critical_alerts": critical,
        "uptime_s": time.perf_counter() - _start_time
    }


@app.get("/api/my-jobs")
async def list_my_jobs(current_user: dict | None = Depends(get_optional_user)):
    return await list_jobs(current_user)


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict | None = Depends(get_optional_user)):
    job = _require_job_access(job_id, current_user)
    # Remove source upload
    try:
        Path(job.video_path).unlink(missing_ok=True)
    except Exception:
        pass
    # Remove output files (labeled video, HTML report)
    for attr in ("labeled_path", "report_path"):
        p_str = getattr(job, attr, None)
        if p_str:
            try:
                Path(p_str).unlink(missing_ok=True)
            except Exception:
                pass
    # Remove RAG JSON (named after video stem, lives in analysis_output/)
    try:
        stem = Path(job.video_path).stem
        (OUTPUT_DIR_API / f"{stem}_rag.json").unlink(missing_ok=True)
    except Exception:
        pass
    del _jobs[job_id]
    _save_jobs()
    # Close any active WebSocket connections watching this job
    for ws in _ws_conns.pop(job_id, []):
        try:
            await ws.close(1001, "Job deleted")
        except Exception:
            pass
    return {"deleted": job_id}


# ── Live stream control ────────────────────────────────────────────────────────

@app.post("/api/live/start")
async def live_start(source: str = "0", max_secs: float | None = None):
    global _live_analyzer, _live_thread, _live_job_id
    if _live_thread and _live_thread.is_alive():
        raise HTTPException(409, "Live stream already running. Stop it first.")

    job_id = f"live_{str(uuid.uuid4())[:6]}"
    _live_job_id = job_id

    def _live_callback(frame_bgr, frame_result, surv_events):
        import base64, cv2 as _cv2, numpy as _np
        # Encode frame as JPEG for WebSocket streaming
        _, buf = _cv2.imencode(".jpg", frame_bgr, [_cv2.IMWRITE_JPEG_QUALITY, 65])
        b64 = base64.b64encode(buf).decode()
        crit = [{"type": e.event_type, "severity": e.severity, "desc": e.description}
                for e in surv_events if e.severity in ("critical", "high")]
        _sync_broadcast_live({
            "type":      "frame",
            "job_id":    job_id,
            "ts":        round(getattr(frame_result, "timestamp_s", 0), 2),
            "persons":   getattr(frame_result, "person_count", 0),
            "action":    getattr(frame_result, "dominant_action", ""),
            "flags":     getattr(frame_result, "surveillance_flags", []),
            "alerts":    crit,
            "frame_b64": b64,
        })

    def _live_worker():
        from analyze_videos import LiveStreamAnalyzer
        live = LiveStreamAnalyzer()
        _live_analyzer = live
        src = int(source) if source.isdigit() else source
        live.run(src, frame_callback=_live_callback, show_window=False,
                 max_seconds=max_secs)
        _sync_broadcast_live({"type": "live_stopped", "job_id": job_id})

    _live_thread = threading.Thread(target=_live_worker, daemon=True)
    _live_thread.start()
    return {"status": "started", "job_id": job_id, "source": source,
            "ws_url": "/ws/live"}


@app.delete("/api/live/stop")
async def live_stop():
    global _live_analyzer
    if _live_analyzer:
        _live_analyzer.stop()
        _live_analyzer = None
        return {"status": "stopping"}
    return {"status": "already_stopped", "detail": "No active live stream found"}


@app.get("/api/live/status")
async def live_status():
    running = bool(_live_thread and _live_thread.is_alive())
    return {"running": running, "job_id": _live_job_id if running else None,
            "viewers": len(_live_ws)}


# ── WebSocket: job progress ────────────────────────────────────────────────────

@app.websocket("/ws/{job_id}")
async def ws_job(websocket: WebSocket, job_id: str):
    await websocket.accept()
    job = _jobs.get(job_id)
    if not job:
        await websocket.send_json({"type": "error", "error": f"Job '{job_id}' not found"})
        await websocket.close()
        return

    if job_id not in _ws_conns:
        _ws_conns[job_id] = []
    _ws_conns[job_id].append(websocket)

    # Send current state immediately
    await websocket.send_json({"type": "state", **job.to_status_dict()})

    try:
        while True:
            # Keep alive — client can send ping
            data = await asyncio.wait_for(websocket.receive_text(), timeout=120)
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception:
        pass
    finally:
        conns = _ws_conns.get(job_id, [])
        if websocket in conns:
            conns.remove(websocket)


# ── WebSocket: live stream feed ────────────────────────────────────────────────

@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    _live_ws.append(websocket)
    running = bool(_live_thread and _live_thread.is_alive())
    await websocket.send_json({"type": "connected", "live_running": running})
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_text(), timeout=60)
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        if websocket in _live_ws:
            _live_ws.remove(websocket)


# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def dashboard():
    """Serve the real-time surveillance dashboard."""
    dashboard_path = SCRIPT_DIR / "dashboard.html"
    if dashboard_path.exists():
        return HTMLResponse(dashboard_path.read_text(encoding="utf-8"))
    return HTMLResponse(_inline_dashboard())


def _inline_dashboard() -> str:
    """Minimal inline dashboard if dashboard.html is missing."""
    return """<!DOCTYPE html><html><head><title>Detectra AI v4</title>
<style>body{background:#0d1117;color:#e6edf3;font-family:system-ui;padding:40px}
h1{color:#00e5a0}button{background:#00e5a0;color:#0d1117;border:none;padding:10px 20px;cursor:pointer;border-radius:6px;font-weight:600}
input{background:#161b22;color:#e6edf3;border:1px solid #30363d;padding:8px;border-radius:6px;width:300px}</style></head>
<body><h1>Detectra AI v4.0</h1>
<p>Upload a video to start analysis or visit <a href="/api/docs" style="color:#60a5fa">/api/docs</a> for the full API.</p>
<input type="file" id="f" accept="video/*"><button onclick="upload()">Analyze</button>
<div id="out" style="margin-top:20px;white-space:pre;font-family:monospace;font-size:13px"></div>
<script>
async function upload(){
  const f=document.getElementById('f').files[0]; if(!f)return;
  const fd=new FormData(); fd.append('file',f);
  document.getElementById('out').textContent='Uploading '+f.name+'...';
  const r=await fetch('/api/analyze',{method:'POST',body:fd});
  const j=await r.json();
  document.getElementById('out').textContent=JSON.stringify(j,null,2);
  if(j.job_id){poll(j.job_id);}
}
async function poll(id){
  const r=await fetch('/api/jobs/'+id); const j=await r.json();
  document.getElementById('out').textContent=JSON.stringify(j,null,2);
  if(j.status==='completed'){
    document.getElementById('out').textContent+='\n\nReport: /api/jobs/'+id+'/report';
  } else if(j.status==='running'||j.status==='pending'){
    setTimeout(()=>poll(id),2000);
  }
}
</script></body></html>"""


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    _load_jobs()
    print("=" * 70)
    print("  Detectra AI v4.0 — Production API Server")
    print(f"  http://{API_HOST}:{API_PORT}")
    print(f"  Docs:   http://{API_HOST}:{API_PORT}/api/docs")
    print(f"  Health: http://{API_HOST}:{API_PORT}/health")
    print("=" * 70)

    uvicorn.run(
        "api_server:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,
        log_level="info",
        access_log=True,
        workers=1,        # single worker (AI models are not fork-safe)
    )
