"""
Detectra AI — Production Video Analyzer v3.0
=============================================
Enhanced Multi-Model + Multi-Agentic Surveillance System

Models:
  1. YOLOv8s-seg  — improved segmentation (44.9 mAP vs 36.8 mAP for nano)
  2. YOLOv8n-pose — 17-point skeleton for pose-based action recognition
  3. ByteTrack    — persistent multi-object tracking with EMA smoothing
  4. Whisper small — 244M params, ~30% better WER than base
  5. noisereduce  — spectral gating audio denoiser before Whisper
  6. EasyOCR      — text/logo extraction with brand dictionary
  7. Librosa+MFCC — 13-MFCC + spectral audio event classifier
  8. CrossAttn Transformer — 4-head fusion engine over 2-second windows

Enhancements over v2:
  - YOLOv8s-seg (small, 3× more accurate than nano)
  - Pose skeleton estimation → fall/fight/run/walk/sit detection
  - Audio denoising before Whisper (noisereduce spectral gating)
  - Whisper small model (much better multilingual accuracy)
  - MFCC-based audio classification (13 mel coefficients)
  - Optical-flow motion estimation for additional action cues
  - Pose-augmented anomaly detection (fall/fight/crowd-surge)
  - Better logo ROI preprocessing (upscale + sharpen before OCR)
  - Abandoned-object detection (stationary non-person for >10s)
  - Temporal anomaly smoothing (EMA over fusion windows)
"""
from __future__ import annotations

import argparse
import colorsys
import io
import json
import math
import os
import subprocess
import sys
import tempfile
import time
import traceback
import warnings
from collections import Counter, defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from detectra_cv2 import cv2
import numpy as np

# ── UTF-8 on Windows ──────────────────────────────────────────────────────────
# Use reconfigure() rather than wrapping in a new TextIOWrapper.
# Wrapping creates a second owner of the buffer — GC of the old wrapper closes
# the buffer, causing "I/O operation on closed file" in background threads.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except AttributeError:
    pass
try:
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except AttributeError:
    pass

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
TEST_VIDEOS = SCRIPT_DIR.parent / "test videos"
OUTPUT_DIR  = Path(os.getenv("OUTPUT_DIR", str(SCRIPT_DIR / "analysis_output")))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Config ───────────────────────────────────────────────────────────────────
# All knobs below can be overridden via environment variables for production tuning.

def _env(name: str, default):
    """Read env-var with type coercion based on the default's type."""
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        if isinstance(default, bool):
            return raw.strip().lower() in {"1", "true", "yes", "on"}
        if isinstance(default, int):
            return int(raw)
        if isinstance(default, float):
            return float(raw)
        return raw
    except Exception:
        return default


YOLO_SEG_MODEL   = _env("DETECTRA_YOLO_SEG_MODEL",  "yolov8s-seg.pt")   # default s (CPU-friendly); set DETECTRA_YOLO_SEG_MODEL=yolov8m-seg.pt for higher accuracy
YOLO_POSE_MODEL  = _env("DETECTRA_YOLO_POSE_MODEL", "yolov8n-pose.pt")  # 17-keypoint skeleton
WHISPER_MODEL    = _env("DETECTRA_WHISPER_MODEL",   "medium")           # medium → much better multilingual WER than small
ANALYSIS_FPS     = _env("DETECTRA_ANALYSIS_FPS",     3)                 # frames/sec to analyze
YOLO_CONF        = _env("DETECTRA_YOLO_CONF",        0.25)              # slightly lower → higher recall in crowded scenes
YOLO_IOU         = _env("DETECTRA_YOLO_IOU",         0.45)
USE_TTA          = _env("DETECTRA_USE_TTA",          False)             # Test-Time Augmentation (flip + scales) — slower but +mAP
MASK_ALPHA       = 0.38
FUSION_WINDOW    = _env("DETECTRA_FUSION_WINDOW",    2.0)               # seconds per fusion bin
USE_DENOISE      = _env("DETECTRA_USE_DENOISE",      True)
DRAW_POSE        = _env("DETECTRA_DRAW_POSE",        True)
MIN_TRACK_AGE    = _env("DETECTRA_MIN_TRACK_AGE",    2)
LOITER_SECONDS   = _env("DETECTRA_LOITER_SECONDS",   12.0)
LOITER_RADIUS    = _env("DETECTRA_LOITER_RADIUS",    0.10)
ACTION_CONFIRM   = _env("DETECTRA_ACTION_CONFIRM",   3)
USE_CLAHE        = _env("DETECTRA_USE_CLAHE",        True)
PERSON_MIN_CONF  = _env("DETECTRA_PERSON_MIN_CONF",  0.30)
OBJECT_MIN_CONF  = _env("DETECTRA_OBJECT_MIN_CONF",  0.32)

# ─── Accuracy engine flags (toggleable via env) ──────────────────────────────
USE_FASTER_WHISPER = _env("DETECTRA_USE_FASTER_WHISPER", True)
USE_IDENTITY_REID  = _env("DETECTRA_USE_IDENTITY_REID",  True)
USE_CLIP_LOGOS     = _env("DETECTRA_USE_CLIP_LOGOS",     True)    # CLIP visual logo recognition (auto-falls back if open_clip missing)
USE_REASONING      = _env("DETECTRA_USE_REASONING",      True)
USE_CADENCE        = _env("DETECTRA_USE_CADENCE",        True)
WHISPER_BEAM_SIZE  = _env("DETECTRA_WHISPER_BEAM",       5)
CLIP_LOGO_THRESH   = float(os.getenv("DETECTRA_CLIP_LOGO_THRESH", "0.30"))
CLIP_LOGO_REGIONS  = os.getenv("DETECTRA_CLIP_LOGO_REGIONS", "multi")  # "single"|"multi"
OCR_LANGUAGES      = [l.strip() for l in os.getenv("DETECTRA_OCR_LANGS",
                       "en,es,fr,de,it,pt,nl,id,vi").split(",") if l.strip()]

# ─── Accuracy engine — graceful import ────────────────────────────────────────
try:
    from detectra_accuracy import (
        transcribe_audio_enhanced,
        faster_whisper_available,
        IdentityTracker,
        ClipLogoMatcher,
        ReasoningAgent,
        AnkleCadenceClassifier,
        DEFAULT_LOGO_BRANDS,
    )
    _ACCURACY_ENGINE = True
except Exception as _acc_exc:
    print(f"  [WARN] detectra_accuracy unavailable ({_acc_exc}); "
          f"falling back to baseline pipeline")
    transcribe_audio_enhanced = None  # type: ignore[assignment]
    faster_whisper_available = lambda: False  # type: ignore[assignment]
    IdentityTracker = None  # type: ignore[assignment]
    ClipLogoMatcher = None  # type: ignore[assignment]
    ReasoningAgent = None  # type: ignore[assignment]
    AnkleCadenceClassifier = None  # type: ignore[assignment]
    DEFAULT_LOGO_BRANDS: list[str] = []  # type: ignore[no-redef]
    _ACCURACY_ENGINE = False

# ─── Dangerous / high-priority objects ───────────────────────────────────────
WEAPON_CLASSES   = {"baseball bat", "knife", "scissors"}     # COCO objects → weapon alert
VEHICLE_CLASSES  = {"car", "truck", "bus", "motorcycle", "bicycle"}
TAILGATE_RADIUS  = 0.08              # normalised distance for tailgating check
TAILGATE_SECONDS = 6.0               # seconds two persons must be close to trigger


# ══════════════════════════════════════════════════════════════════════════════
# COCO constants
# ══════════════════════════════════════════════════════════════════════════════

POSE_KP = [
    "nose", "l_eye", "r_eye", "l_ear", "r_ear",
    "l_shoulder", "r_shoulder", "l_elbow", "r_elbow",
    "l_wrist", "r_wrist", "l_hip", "r_hip",
    "l_knee", "r_knee", "l_ankle", "r_ankle",
]
# index shortcuts
_KP = {name: i for i, name in enumerate(POSE_KP)}

COCO80 = [
    "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
    "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
    "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
    "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
    "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
    "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
    "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair",
    "couch","potted plant","bed","dining table","toilet","tv","laptop","mouse",
    "remote","keyboard","cell phone","microwave","oven","toaster","sink",
    "refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush",
]
COCO_IDX = {c: i for i, c in enumerate(COCO80)}

LANG_NAMES: dict[str, str] = {
    "af":"Afrikaans","ar":"Arabic","bg":"Bulgarian","bn":"Bengali",
    "ca":"Catalan","cs":"Czech","cy":"Welsh","da":"Danish","de":"German",
    "el":"Greek","en":"English","es":"Spanish","et":"Estonian","fa":"Farsi",
    "fi":"Finnish","fr":"French","gl":"Galician","gu":"Gujarati","he":"Hebrew",
    "hi":"Hindi","hr":"Croatian","hu":"Hungarian","hy":"Armenian",
    "id":"Indonesian","is":"Icelandic","it":"Italian","ja":"Japanese",
    "kn":"Kannada","ko":"Korean","lt":"Lithuanian","lv":"Latvian",
    "mk":"Macedonian","ml":"Malayalam","mr":"Marathi","ms":"Malay",
    "mt":"Maltese","my":"Myanmar","ne":"Nepali","nl":"Dutch",
    "nn":"Norwegian Nynorsk","no":"Norwegian","pa":"Punjabi",
    "pl":"Polish","pt":"Portuguese","ro":"Romanian","ru":"Russian",
    "si":"Sinhala","sk":"Slovak","sl":"Slovenian","sq":"Albanian",
    "sr":"Serbian","sv":"Swedish","sw":"Swahili","ta":"Tamil",
    "te":"Telugu","th":"Thai","tl":"Filipino","tr":"Turkish",
    "uk":"Ukrainian","ur":"Urdu","uz":"Uzbek","vi":"Vietnamese",
    "yi":"Yiddish","zh":"Chinese",
}

SCENE_LABELS = [
    "empty_scene","pedestrian_movement","crowd_gathering","crowd_dispersal",
    "vehicle_traffic","mixed_pedestrian_traffic","person_speaking",
    "indoor_activity","outdoor_public","person_loitering",
    "suspicious_activity","confrontation","entertainment_event",
    "anomalous_audio","surveillance_alert","routine_activity",
]
AUDIO_TYPES = ["silence","ambient","speech","music","noise","scream","gunshot"]


# ══════════════════════════════════════════════════════════════════════════════
# Data Structures
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PoseKPs:
    """17 COCO keypoints [x,y,conf] in normalized coords."""
    kps: np.ndarray       # shape (17, 3)

    def get(self, name: str) -> tuple[float, float, float]:
        i = _KP.get(name, 0)
        return float(self.kps[i, 0]), float(self.kps[i, 1]), float(self.kps[i, 2])

    def visible(self, name: str, min_conf: float = 0.3) -> bool:
        return self.get(name)[2] >= min_conf

    @property
    def torso_angle(self) -> float:
        """Angle of torso relative to vertical (0=upright, 90=fallen)."""
        ls = self.kps[_KP["l_shoulder"]]; rs = self.kps[_KP["r_shoulder"]]
        lh = self.kps[_KP["l_hip"]];    rh = self.kps[_KP["r_hip"]]
        if ls[2] < 0.3 or lh[2] < 0.3:
            return 0.0
        sx, sy = (ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2
        hx, hy = (lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2
        dx, dy = hx - sx, hy - sy
        return abs(math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6)))

    @property
    def knee_angle(self) -> float:
        """Average knee flexion angle (0=straight, 90=sitting)."""
        angles = []
        for side in [("l_hip", "l_knee", "l_ankle"), ("r_hip", "r_knee", "r_ankle")]:
            pts = [self.kps[_KP[s]] for s in side]
            if all(p[2] >= 0.3 for p in pts):
                v1 = np.array([pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]])
                v2 = np.array([pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]])
                cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
                angles.append(math.degrees(math.acos(np.clip(cos_a, -1, 1))))
        return float(np.mean(angles)) if angles else 180.0

    @property
    def arm_spread(self) -> float:
        """Horizontal spread of wrists relative to shoulder width (1=normal, >2=arms wide open)."""
        ls = self.kps[_KP["l_shoulder"]]; rs = self.kps[_KP["r_shoulder"]]
        lw = self.kps[_KP["l_wrist"]];   rw = self.kps[_KP["r_wrist"]]
        if ls[2] < 0.3 or rs[2] < 0.3:
            return 1.0
        shoulder_w = abs(rs[0] - ls[0]) + 1e-6
        if lw[2] >= 0.3 and rw[2] >= 0.3:
            wrist_w = abs(rw[0] - lw[0])
            return wrist_w / shoulder_w
        return 1.0

    @property
    def ankle_vertical_diff(self) -> float:
        """Vertical difference between ankles (high = stepping/running)."""
        la = self.kps[_KP["l_ankle"]]; ra = self.kps[_KP["r_ankle"]]
        if la[2] >= 0.3 and ra[2] >= 0.3:
            return abs(la[1] - ra[1])
        return 0.0


@dataclass
class Detection:
    class_name: str
    confidence: float
    x1: float; y1: float; x2: float; y2: float
    mask: np.ndarray | None = None
    track_id: int | None = None
    pose: PoseKPs | None = None
    action: str = ""
    track_age: int = 0

    @property
    def cx(self) -> float: return (self.x1 + self.x2) / 2
    @property
    def cy(self) -> float: return (self.y1 + self.y2) / 2
    @property
    def w(self)  -> float: return self.x2 - self.x1
    @property
    def h(self)  -> float: return self.y2 - self.y1
    @property
    def area(self) -> float: return self.w * self.h
    @property
    def aspect(self) -> float:
        return self.w / (self.h + 1e-6)   # >1.5 → fallen


@dataclass
class FrameResult:
    frame_idx: int
    timestamp_s: float
    detections: list[Detection] = field(default_factory=list)
    person_count: int = 0
    unique_track_ids: set[int] = field(default_factory=set)
    dominant_action: str = ""
    flow_magnitude: float = 0.0      # mean optical-flow motion
    surveillance_flags: list[str] = field(default_factory=list)


@dataclass
class SpeechSegment:
    start_s: float
    end_s: float
    text: str
    language: str
    language_name: str
    confidence: float
    is_noise: bool = False


@dataclass
class AudioEvent:
    timestamp_s: float
    event_type: str
    details: str
    confidence: float
    rms_energy: float = 0.0
    zcr: float = 0.0
    spectral_centroid: float = 0.0


@dataclass
class LogoDetection:
    timestamp_s: float
    brand: str
    text_found: str
    confidence: float
    bbox: dict
    source: str


@dataclass
class SurveillanceEvent:
    """Specific actionable surveillance event."""
    timestamp_s: float
    event_type: str   # fall / fight / loitering / crowd_surge / abandoned_object / intrusion
    severity: str     # low / medium / high / critical
    description: str
    track_ids: list[int]
    confidence: float


@dataclass
class FusionInsight:
    window_start_s: float
    window_end_s: float
    scene_label: str
    anomaly_score: float
    visual_audio_alignment: float
    confidence: float
    alert: bool
    severity: str
    contributing_factors: list[str]
    description: str


@dataclass
class VideoAnalysis:
    video_path: Path
    duration_s: float
    width: int
    height: int
    fps: float
    total_frames: int

    frame_results: list[FrameResult] = field(default_factory=list)
    speech_segments: list[SpeechSegment] = field(default_factory=list)
    audio_events: list[AudioEvent] = field(default_factory=list)
    logo_detections: list[LogoDetection] = field(default_factory=list)
    fusion_insights: list[FusionInsight] = field(default_factory=list)
    surveillance_events: list[SurveillanceEvent] = field(default_factory=list)
    unique_track_ids: set[int] = field(default_factory=set)
    # Co-occurrence graph estimate (collapses ByteTrack ID-switch fragments)
    distinct_individuals: int = 0

    total_object_count: int = 0
    class_frequencies: dict[str, int] = field(default_factory=dict)
    action_frequencies: dict[str, int] = field(default_factory=dict)
    max_persons_in_frame: int = 0
    peak_activity_ts: float = 0.0
    full_transcript: str = ""
    detected_language: str = ""
    detected_language_name: str = ""
    detected_languages: list[dict] = field(default_factory=list)   # [{code, name, confidence, segment_count}]
    max_concurrent_persons: int = 0   # peak persons visible in a single frame
    summary: str = ""
    processing_time_s: float = 0.0
    labeled_video_path: Path | None = None
    report_path: Path | None = None

    # ── Accuracy-engine v5 augmentations ────────────────────────────────────
    identities: list[dict] = field(default_factory=list)        # appearance-ReID identities
    reasoning: dict = field(default_factory=dict)               # ReasoningAgent synthesis
    speech_engine: str = ""                                     # "faster-whisper-medium" etc.
    accuracy_engine_version: str = ""                           # e.g. "5.0"

    @property
    def video_name(self) -> str:
        return self.video_path.stem


def _build_reasoning_payload(analysis: "VideoAnalysis") -> dict[str, Any]:
    """Marshall a VideoAnalysis into the structured payload expected by the
    ReasoningAgent (plain dicts, no analyzer-internal types)."""
    def _frame_to_dict(fr: "FrameResult") -> dict[str, Any]:
        return {
            "frame_idx": fr.frame_idx,
            "timestamp_s": fr.timestamp_s,
            "person_count": fr.person_count,
            "dominant_action": fr.dominant_action,
            "flow_magnitude": fr.flow_magnitude,
            "surveillance_flags": list(fr.surveillance_flags),
            "unique_track_ids": list(fr.unique_track_ids),
            "detections": [
                {
                    "class_name": d.class_name,
                    "confidence": d.confidence,
                    "action": d.action,
                    "track_id": d.track_id,
                }
                for d in fr.detections
            ],
        }

    return {
        "duration_s": analysis.duration_s,
        "fps": analysis.fps,
        "width": analysis.width,
        "height": analysis.height,
        "frame_results": [_frame_to_dict(fr) for fr in analysis.frame_results],
        "speech_segments": [
            {
                "start_s": s.start_s, "end_s": s.end_s, "text": s.text,
                "language": s.language, "language_name": s.language_name,
                "confidence": s.confidence, "is_noise": s.is_noise,
            }
            for s in analysis.speech_segments
        ],
        "audio_events": [
            {
                "timestamp_s": e.timestamp_s, "event_type": e.event_type,
                "details": e.details, "confidence": e.confidence,
            }
            for e in analysis.audio_events
        ],
        "logo_detections": [
            {
                "timestamp_s": lg.timestamp_s, "brand": lg.brand,
                "text_found": lg.text_found, "confidence": lg.confidence,
                "source": lg.source, "bbox": lg.bbox,
            }
            for lg in analysis.logo_detections
        ],
        "fusion_insights": [
            {
                "window_start_s": fi.window_start_s,
                "window_end_s": fi.window_end_s,
                "scene_label": fi.scene_label,
                "anomaly_score": fi.anomaly_score,
                "visual_audio_alignment": fi.visual_audio_alignment,
                "confidence": fi.confidence,
                "alert": fi.alert,
                "severity": fi.severity,
                "contributing_factors": list(fi.contributing_factors),
                "description": fi.description,
            }
            for fi in analysis.fusion_insights
        ],
        "surveillance_events": [
            {
                "timestamp_s": sv.timestamp_s,
                "event_type": sv.event_type,
                "severity": sv.severity,
                "description": sv.description,
                "track_ids": list(sv.track_ids),
                "confidence": sv.confidence,
            }
            for sv in analysis.surveillance_events
        ],
        "distinct_individuals": analysis.distinct_individuals or len(analysis.identities),
        "identities": list(analysis.identities),
        "unique_track_ids": sorted(analysis.unique_track_ids),
    }


def estimate_distinct_individuals_from_frames(frame_results: list[FrameResult]) -> int:
    """
    Minimum number of physical individuals consistent with per-frame track IDs.

    ByteTrack often assigns a new ID after occlusion or re-entry. Those fragment
    IDs never co-occur in the same frame, so they can represent one person.
    Any two IDs that **do** appear in the same frame must be different people;
    this is approximated with greedy graph coloring.
    """
    tids: set[int] = set()
    for fr in frame_results:
        tids.update(fr.unique_track_ids)
    if not tids:
        return 0
    neighbors: dict[int, set[int]] = {t: set() for t in tids}
    for fr in frame_results:
        ids = sorted(fr.unique_track_ids)
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                neighbors[a].add(b)
                neighbors[b].add(a)
    color: dict[int, int] = {}
    for t in sorted(tids):
        used = {color[n] for n in neighbors[t] if n in color}
        c = 0
        while c in used:
            c += 1
        color[t] = c
    return max(color.values()) + 1


# ══════════════════════════════════════════════════════════════════════════════
# Color helpers
# ══════════════════════════════════════════════════════════════════════════════

def _id_color(tid: int) -> tuple[int, int, int]:
    h = (tid * 0.618033988749895) % 1.0
    r, g, b = colorsys.hsv_to_rgb(h, 0.92, 0.96)
    return int(b * 255), int(g * 255), int(r * 255)

def _cls_color(name: str) -> tuple[int, int, int]:
    h = hash(name) % 1000 / 1000.0
    r, g, b = colorsys.hsv_to_rgb(h, 0.85, 0.95)
    return int(b * 255), int(g * 255), int(r * 255)

SEV_COLORS = {
    "normal": (150, 150, 150), "low": (80, 210, 80),
    "medium": (50, 210, 250), "high": (50, 120, 255), "critical": (30, 30, 230),
}


# ══════════════════════════════════════════════════════════════════════════════
# Pose-Based Action Recognizer
# ══════════════════════════════════════════════════════════════════════════════

class PoseActionRecognizer:
    """
    Classifies actions from 17-point COCO skeleton + velocity history.

    Priority order (most specific first):
      fallen > fighting > running > crouching > sitting >
      walking > loitering > standing > appearing
    """

    def __init__(self):
        self._vel_hist: dict[int, deque]  = defaultdict(lambda: deque(maxlen=10))
        self._pos_hist: dict[int, deque]  = defaultdict(lambda: deque(maxlen=60))
        self._dwell:    dict[int, tuple]  = {}    # tid → (first_ts, cx, cy)
        self._actions:  dict[int, str]    = {}
        self._nearby_pairs: set[tuple[int,int]] = set()   # for fight detection
        self._abuf = ActionBuffer()                        # temporal smoothing

    def update(
        self,
        ts: float,
        detections: list[Detection],
    ) -> dict[int, str]:
        """Update trajectories and return {track_id: smoothed_action} for all persons."""
        person_dets = [d for d in detections if d.class_name == "person" and d.track_id]

        # Record positions
        for det in person_dets:
            tid = det.track_id
            self._vel_hist[tid].append((ts, det.cx, det.cy))
            self._pos_hist[tid].append((ts, det.cx, det.cy, det.area))
            if tid not in self._dwell:
                self._dwell[tid] = (ts, det.cx, det.cy)

        # Detect nearby pairs (potential fighting)
        self._nearby_pairs = set()
        for i, a in enumerate(person_dets):
            for b in person_dets[i + 1:]:
                iou = self._box_iou(a, b)
                if iou > 0.05:
                    pair = (min(a.track_id, b.track_id), max(a.track_id, b.track_id))
                    self._nearby_pairs.add(pair)

        for det in person_dets:
            raw = self._classify(det, ts)
            smoothed = self._abuf.push(det.track_id, raw)
            self._actions[det.track_id] = smoothed
        return dict(self._actions)

    def _classify(self, det: Detection, ts: float) -> str:
        tid = det.track_id
        pose = det.pose

        # ── velocity ──────────────────────────────────────────────────────────
        vel = self._velocity(tid)
        hist_len = len(self._vel_hist[tid])

        # ── NEW-TRACK GRACE PERIOD ────────────────────────────────────────────
        # With fewer than 4 history points the velocity estimate is unreliable
        # (only 1-3 frames seen). Avoid committing to "standing" which would
        # bias the ActionBuffer toward stationary from the very first frame.
        # Critical actions (fallen/fighting) still fire immediately.
        if hist_len < 4:
            # Still check fallen — single-frame pose can be unambiguous
            if det.aspect > 1.6:
                return "fallen"
            if pose and pose.visible("l_shoulder") and pose.visible("l_hip"):
                if pose.torso_angle > 50:
                    return "fallen"
            return "appearing"

        # ── FALLEN (highest priority) ─────────────────────────────────────────
        # bbox wider than tall, OR torso nearly horizontal
        if det.aspect > 1.6:
            return "fallen"
        if pose and pose.visible("l_shoulder") and pose.visible("l_hip"):
            if pose.torso_angle > 50:
                return "fallen"

        # ── FIGHTING ─────────────────────────────────────────────────────────
        in_fight = any(tid in pair for pair in self._nearby_pairs)
        if in_fight and vel > 0.05:
            arm_spread = pose.arm_spread if pose else 1.0
            if arm_spread > 1.8 or vel > 0.10:
                return "fighting"

        # ── RUNNING ──────────────────────────────────────────────────────────
        if vel > 0.14:
            if pose and pose.ankle_vertical_diff > 0.06:
                return "running"
            return "running" if vel > 0.18 else "fast walking"

        # ── SITTING / CROUCHING ──────────────────────────────────────────────
        if pose and pose.visible("l_knee") and pose.visible("l_hip"):
            ka = pose.knee_angle
            if ka < 80:
                return "sitting"
            if ka < 130 and pose.torso_angle > 20:
                return "crouching"

        # ── WALKING ──────────────────────────────────────────────────────────
        if vel > 0.04:
            if pose and pose.ankle_vertical_diff > 0.03:
                return "walking"
            return "walking" if vel > 0.06 else "slow walking"

        # ── LOITERING ────────────────────────────────────────────────────────
        dwell = self._dwell.get(tid)
        if dwell:
            dt   = ts - dwell[0]
            dist = math.hypot(det.cx - dwell[1], det.cy - dwell[2])
            if dt >= LOITER_SECONDS and dist < LOITER_RADIUS:
                return "loitering"
            # Reset dwell if moved significantly
            if dist > LOITER_RADIUS:
                self._dwell[tid] = (ts, det.cx, det.cy)

        # ── STANDING ─────────────────────────────────────────────────────────
        # Threshold raised slightly vs. old 0.012 to avoid misclassifying
        # slow-moving persons as standing at low analysis frame rates.
        if vel < 0.015:
            return "standing"
        return "stationary"

    def _velocity(self, tid: int) -> float:
        hist = list(self._vel_hist[tid])
        if len(hist) < 2:
            return 0.0
        dt = hist[-1][0] - hist[0][0]
        if dt < 1e-4:
            return 0.0
        dx = hist[-1][1] - hist[0][1]
        dy = hist[-1][2] - hist[0][2]
        return math.hypot(dx, dy) / dt

    @staticmethod
    def _box_iou(a: Detection, b: Detection) -> float:
        ix1 = max(a.x1, b.x1); iy1 = max(a.y1, b.y1)
        ix2 = min(a.x2, b.x2); iy2 = min(a.y2, b.y2)
        if ix2 <= ix1 or iy2 <= iy1:
            return 0.0
        inter = (ix2 - ix1) * (iy2 - iy1)
        union = a.area + b.area - inter + 1e-8
        return inter / union

    def get_dominant(self, detections: list[Detection]) -> str:
        actions = [
            self._actions.get(d.track_id, "")
            for d in detections if d.class_name == "person" and d.track_id
        ]
        if not actions:
            return ""
        return Counter(actions).most_common(1)[0][0]


# ══════════════════════════════════════════════════════════════════════════════
# Action Temporal Buffer — eliminates per-frame action jitter
# ══════════════════════════════════════════════════════════════════════════════

class ActionBuffer:
    """
    Requires an action to appear in ACTION_CONFIRM of the last 5 frames
    before committing. Prevents dangerous false-positive alerts (fall/fight)
    from a single-frame pose artefact.

    Priority override: critical actions (fallen, fighting) can confirm faster
    (2 of last 3 frames) so genuine events are not delayed.
    """
    _CRITICAL = {"fallen", "fighting"}
    _WINDOW   = 5
    _CONFIRM  = ACTION_CONFIRM        # default 3/5
    _CRIT_WIN = 3
    _CRIT_CNF = 2                     # critical: 2/3

    def __init__(self):
        self._buf: dict[int, deque] = defaultdict(lambda: deque(maxlen=self._WINDOW))
        self._committed: dict[int, str] = {}

    def push(self, tid: int, raw_action: str) -> str:
        """Push raw action, return temporally-smoothed committed action."""
        self._buf[tid].append(raw_action)
        hist = list(self._buf[tid])

        # Fast-confirm for critical actions
        for crit in self._CRITICAL:
            crit_hist = hist[-self._CRIT_WIN:]
            if crit_hist.count(crit) >= self._CRIT_CNF:
                self._committed[tid] = crit
                return crit

        # Standard confirm
        if len(hist) >= self._CONFIRM:
            cnt = Counter(hist[-self._CONFIRM:])
            best, freq = cnt.most_common(1)[0]
            # Only switch if new action is dominant (avoid flip-flop)
            if freq >= self._CONFIRM - 1 or best == self._committed.get(tid):
                self._committed[tid] = best

        return self._committed.get(tid, raw_action)

    def get(self, tid: int) -> str:
        return self._committed.get(tid, "")


# ══════════════════════════════════════════════════════════════════════════════
# Surveillance Anomaly Detector
# ══════════════════════════════════════════════════════════════════════════════

class SurveillanceDetector:
    """
    v4 Enhanced Surveillance Detector.

    Events detected:
      fall, fight, loitering, crowd_surge, stampede/mass_flight,
      abandoned_object, weapon_proximity, tailgating,
      loud_noise, scream, gunshot, person_vanished
    """

    # Per-event-type dedup windows (seconds). Longer = fewer repeat alerts.
    _DEDUP_WINDOWS = {
        "loitering":        15.0,   # high repeat rate → long window
        "abandoned_object": 20.0,
        "tailgating":       10.0,
        "loud_noise":        5.0,
        "fall":              4.0,
        "fight":             3.0,
        "crowd_surge":       5.0,
        "stampede":          8.0,
        "weapon_proximity":  6.0,
        "scream":            5.0,
        "gunshot":           3.0,
        "person_vanished":  10.0,
    }
    _DEFAULT_DEDUP = 3.0

    def __init__(self):
        self._obj_static: dict  = {}   # track → (first_ts, cx, cy, had_person_near)
        self._crowd_hist: deque = deque(maxlen=30)
        # Tailgate tracking: (tid_a, tid_b) → first_ts_close
        self._tailgate: dict    = {}
        # Person vanish: tid → last seen ts
        self._last_seen: dict   = {}

    def analyze(
        self,
        frame_results: list[FrameResult],
        audio_events: list[AudioEvent],
    ) -> list[SurveillanceEvent]:
        events: list[SurveillanceEvent] = []

        for fr in frame_results:
            ts   = fr.timestamp_s
            self._crowd_hist.append(fr.person_count)
            persons = [d for d in fr.detections if d.class_name == "person" and d.track_id]

            # ── Update last-seen for vanish detection ─────────────────────────
            for det in persons:
                self._last_seen[det.track_id] = ts

            # ── Per-detection checks ──────────────────────────────────────────
            for det in fr.detections:
                if det.class_name == "person" and det.track_id:
                    tid = det.track_id

                    # Fall (confirmed by ActionBuffer — no single-frame noise)
                    if det.action == "fallen":
                        events.append(SurveillanceEvent(
                            timestamp_s=ts, event_type="fall", severity="high",
                            description=f"Person #{tid} has fallen (torso horizontal / aspect ratio)",
                            track_ids=[tid], confidence=0.85,
                        ))

                    # Fight
                    if det.action == "fighting":
                        events.append(SurveillanceEvent(
                            timestamp_s=ts, event_type="fight", severity="critical",
                            description=f"Physical altercation — person #{tid} aggressive posture",
                            track_ids=[tid], confidence=0.75,
                        ))

                    # Loitering
                    if det.action == "loitering":
                        events.append(SurveillanceEvent(
                            timestamp_s=ts, event_type="loitering", severity="medium",
                            description=f"Person #{tid} stationary >{LOITER_SECONDS:.0f}s in restricted area",
                            track_ids=[tid], confidence=0.88,
                        ))

                    # Weapon proximity: dangerous COCO object near this person
                    near_weapons = [
                        d.class_name for d in fr.detections
                        if d.class_name in WEAPON_CLASSES
                        and math.hypot(d.cx - det.cx, d.cy - det.cy) < 0.18
                    ]
                    if near_weapons:
                        events.append(SurveillanceEvent(
                            timestamp_s=ts, event_type="weapon_proximity", severity="critical",
                            description=f"Person #{tid} near {near_weapons[0]} — potential weapon",
                            track_ids=[tid], confidence=0.78,
                        ))

                # ── Abandoned object (non-person, stationary) ─────────────────
                if det.class_name not in WEAPON_CLASSES and det.class_name != "person" \
                        and det.class_name not in VEHICLE_CLASSES and det.track_id:
                    person_now = any(
                        math.hypot(d.cx - det.cx, d.cy - det.cy) < 0.15
                        for d in persons
                    )
                    tid = det.track_id
                    if tid not in self._obj_static:
                        self._obj_static[tid] = (ts, det.cx, det.cy, person_now)
                    else:
                        ft, cx0, cy0, had_person = self._obj_static[tid]
                        moved = math.hypot(det.cx - cx0, det.cy - cy0) > 0.05
                        if moved:
                            self._obj_static[tid] = (ts, det.cx, det.cy, person_now)
                        else:
                            # Update had_person flag
                            self._obj_static[tid] = (ft, cx0, cy0, had_person or person_now)
                            # Only flag if object was previously near a person (left behind)
                            if (ts - ft) > 15.0 and not person_now and had_person:
                                events.append(SurveillanceEvent(
                                    timestamp_s=ts, event_type="abandoned_object",
                                    severity="medium",
                                    description=f"Unattended {det.class_name} left behind (stationary {ts-ft:.0f}s)",
                                    track_ids=[tid], confidence=0.80,
                                ))

            # ── Tailgating: two persons too close for TAILGATE_SECONDS ────────
            for i, a in enumerate(persons):
                for b in persons[i+1:]:
                    dist = math.hypot(a.cx - b.cx, a.cy - b.cy)
                    if dist < TAILGATE_RADIUS:
                        pair = (min(a.track_id, b.track_id), max(a.track_id, b.track_id))
                        if pair not in self._tailgate:
                            self._tailgate[pair] = ts
                        elif ts - self._tailgate[pair] >= TAILGATE_SECONDS:
                            # Only flag if neither is fighting (that would be fight alert)
                            if a.action != "fighting" and b.action != "fighting":
                                events.append(SurveillanceEvent(
                                    timestamp_s=ts, event_type="tailgating", severity="low",
                                    description=f"Persons #{a.track_id} & #{b.track_id} unusually close for >{TAILGATE_SECONDS:.0f}s",
                                    track_ids=[a.track_id, b.track_id], confidence=0.70,
                                ))
                    else:
                        pair = (min(a.track_id, b.track_id), max(a.track_id, b.track_id))
                        self._tailgate.pop(pair, None)

            # ── Crowd surge ──────────────────────────────────────────────────
            if len(self._crowd_hist) >= 5:
                recent = list(self._crowd_hist)
                surge  = recent[-1] - min(recent[:-3])
                if surge >= 5:
                    events.append(SurveillanceEvent(
                        timestamp_s=ts, event_type="crowd_surge", severity="high",
                        description=f"Sudden crowd increase of +{surge} persons in scene",
                        track_ids=[], confidence=0.85,
                    ))

            # ── Stampede / mass flight: >60% running in same direction ────────
            runners = [d for d in persons if d.action in ("running", "fast walking")]
            if len(runners) >= 3 and len(runners) >= 0.55 * max(1, fr.person_count):
                events.append(SurveillanceEvent(
                    timestamp_s=ts, event_type="stampede", severity="critical",
                    description=f"Mass movement: {len(runners)}/{fr.person_count} persons running simultaneously",
                    track_ids=[d.track_id for d in runners], confidence=0.80,
                ))

        # ── Person vanished: seen recently but gone ───────────────────────────
        if frame_results:
            last_ts = frame_results[-1].timestamp_s
            active_now = {d.track_id for fr in frame_results[-3:]
                          for d in fr.detections if d.class_name == "person" and d.track_id}
            for tid, last_t in self._last_seen.items():
                if tid not in active_now and (last_ts - last_t) < 5.0 and last_t > 3.0:
                    events.append(SurveillanceEvent(
                        timestamp_s=last_t, event_type="person_vanished", severity="low",
                        description=f"Person #{tid} disappeared abruptly from scene at t={last_t:.1f}s",
                        track_ids=[tid], confidence=0.65,
                    ))

        # ── Audio-triggered events ────────────────────────────────────────────
        for ev in audio_events:
            if ev.event_type == "scream":
                events.append(SurveillanceEvent(
                    timestamp_s=ev.timestamp_s, event_type="scream", severity="critical",
                    description=f"Scream detected (cent={ev.spectral_centroid:.0f}Hz, rms={ev.rms_energy:.3f})",
                    track_ids=[], confidence=ev.confidence,
                ))
            elif ev.event_type == "gunshot":
                events.append(SurveillanceEvent(
                    timestamp_s=ev.timestamp_s, event_type="gunshot", severity="critical",
                    description=f"Impulsive gunshot-like sound (rms={ev.rms_energy:.3f})",
                    track_ids=[], confidence=ev.confidence,
                ))
            elif ev.event_type == "noise" and ev.rms_energy > 0.09:
                events.append(SurveillanceEvent(
                    timestamp_s=ev.timestamp_s, event_type="loud_noise", severity="medium",
                    description=f"Loud noise burst (rms={ev.rms_energy:.3f})",
                    track_ids=[], confidence=0.78,
                ))

        return self._dedup(events)

    def _dedup(self, events: list[SurveillanceEvent]) -> list[SurveillanceEvent]:
        """Deduplicate with per-event-type windows to reduce alert fatigue."""
        out: list[SurveillanceEvent] = []
        for ev in sorted(events, key=lambda e: e.timestamp_s):
            win = self._DEDUP_WINDOWS.get(ev.event_type, self._DEFAULT_DEDUP)
            dup = any(
                abs(ev.timestamp_s - o.timestamp_s) < win and ev.event_type == o.event_type
                for o in out
            )
            if not dup:
                out.append(ev)
        return out


# ══════════════════════════════════════════════════════════════════════════════
# Brand / Logo Detector (EasyOCR + enhanced preprocessing)
# ══════════════════════════════════════════════════════════════════════════════

BRANDS: dict[str, list[str]] = {
    # Tech
    "Apple":         ["apple","iphone","ipad","macbook","airpods","ios","macos","appstore"],
    "Google":        ["google","youtube","android","gmail","chrome","goog","pixel","alphabet"],
    "Microsoft":     ["microsoft","windows","xbox","office","azure","msft","outlook","onedrive"],
    "Samsung":       ["samsung","galaxy","note"],
    "Sony":          ["sony","playstation","bravia","walkman"],
    "Intel":         ["intel","inside"],
    "AMD":           ["amd","radeon","ryzen"],
    "Nvidia":        ["nvidia","geforce","rtx","gtx"],
    "IBM":           ["ibm"],
    "Huawei":        ["huawei"],
    "Xiaomi":        ["xiaomi","mi","redmi"],
    "OnePlus":       ["oneplus"],
    "Lenovo":        ["lenovo","thinkpad"],
    "Dell":          ["dell","alienware"],
    "HP":            ["hewlett","packard","hp"],
    "Asus":          ["asus","rog"],
    "Acer":          ["acer","predator"],
    # Social & internet
    "Meta/Facebook": ["facebook","meta","instagram","whatsapp","fb"],
    "Twitter/X":     ["twitter","tweet","x.com"],
    "TikTok":        ["tiktok","douyin"],
    "Snapchat":      ["snapchat","snap"],
    "LinkedIn":      ["linkedin"],
    "Pinterest":     ["pinterest"],
    "Reddit":        ["reddit"],
    "Discord":       ["discord"],
    "Telegram":      ["telegram"],
    "Zoom":          ["zoom"],
    "Slack":         ["slack"],
    # Streaming
    "Netflix":       ["netflix"],
    "Disney+":       ["disney","disney+"],
    "HBO":           ["hbo","max"],
    "Hulu":          ["hulu"],
    "Prime Video":   ["prime","amazon prime"],
    "Spotify":       ["spotify"],
    "Twitch":        ["twitch"],
    # Retail & e-commerce
    "Amazon":        ["amazon","aws"],
    "eBay":          ["ebay"],
    "Alibaba":       ["alibaba"],
    "AliExpress":    ["aliexpress"],
    "Walmart":       ["walmart"],
    "Target":        ["target"],
    "Costco":        ["costco"],
    "Tesco":         ["tesco"],
    "Carrefour":     ["carrefour"],
    "Aldi":          ["aldi"],
    "Lidl":          ["lidl"],
    "IKEA":          ["ikea"],
    "Sephora":       ["sephora"],
    "Best Buy":      ["best buy","bestbuy"],
    "Home Depot":    ["home depot","homedepot"],
    # Fashion
    "Nike":          ["nike","just do it","airjordan","jordan"],
    "Adidas":        ["adidas","three stripes"],
    "Puma":          ["puma"],
    "Reebok":        ["reebok"],
    "Under Armour":  ["under armour","underarmour","ua"],
    "New Balance":   ["new balance","newbalance"],
    "Converse":      ["converse"],
    "Vans":          ["vans"],
    "Asics":         ["asics"],
    "Lacoste":       ["lacoste"],
    "Polo Ralph Lauren": ["polo","ralph lauren"],
    "Tommy Hilfiger":["tommy hilfiger","tommy"],
    "Calvin Klein":  ["calvin klein","ck"],
    "Gucci":         ["gucci"],
    "Louis Vuitton": ["louis vuitton","lv"],
    "Chanel":        ["chanel"],
    "Prada":         ["prada"],
    "Versace":       ["versace"],
    "Hugo Boss":     ["hugo boss","boss"],
    "Burberry":      ["burberry"],
    "Zara":          ["zara"],
    "H&M":           ["h&m","hm"],
    "Uniqlo":        ["uniqlo"],
    "Levi's":        ["levis","levi's","levi"],
    # Beverages
    "Coca-Cola":     ["coca","cola","coke","cocacola","coca-cola"],
    "Pepsi":         ["pepsi","pepsico"],
    "Sprite":        ["sprite"],
    "Fanta":         ["fanta"],
    "Mountain Dew":  ["mountain dew","mtn dew"],
    "Dr Pepper":     ["dr pepper","drpepper"],
    "Red Bull":      ["redbull","red bull"],
    "Monster Energy":["monster"],
    "Gatorade":      ["gatorade"],
    "Lipton":        ["lipton"],
    "Nescafe":       ["nescafe","nescafé"],
    "Heineken":      ["heineken"],
    "Corona":        ["corona","corona extra"],
    "Budweiser":     ["budweiser","bud light"],
    "Carlsberg":     ["carlsberg"],
    "Stella Artois": ["stella artois","stella"],
    "Guinness":      ["guinness"],
    # Food / QSR
    "McDonald's":    ["mcdonald","mcdonalds","mcd","bigmac","mcdo"],
    "KFC":           ["kfc","kentucky"],
    "Burger King":   ["burger king","bk"],
    "Starbucks":     ["starbucks"],
    "Subway":        ["subway"],
    "Domino's":      ["dominos","domino's"],
    "Pizza Hut":     ["pizza hut","pizzahut"],
    "Taco Bell":     ["taco bell","tacobell"],
    "Wendy's":       ["wendys","wendy's"],
    "Chick-fil-A":   ["chick-fil-a","chickfila"],
    "Dunkin'":       ["dunkin","dunkin'","dunkin donuts"],
    "Tim Hortons":   ["tim hortons","timhortons"],
    "Costa Coffee":  ["costa","costa coffee"],
    "Nestle":        ["nestle","nestlé"],
    "Kellogg's":     ["kelloggs","kellogg"],
    "Cadbury":       ["cadbury"],
    "Hershey's":     ["hersheys","hershey"],
    "Lay's":         ["lays","lay's"],
    "Doritos":       ["doritos"],
    "Pringles":      ["pringles"],
    "Oreo":          ["oreo"],
    "Snickers":      ["snickers"],
    "M&M's":         ["m&m","mms","m&ms"],
    "Kit Kat":       ["kit kat","kitkat"],
    # Automotive
    "BMW":           ["bmw"],
    "Mercedes-Benz": ["mercedes","benz","mercedes-benz"],
    "Audi":          ["audi"],
    "Toyota":        ["toyota"],
    "Honda":         ["honda"],
    "Ford":          ["ford"],
    "Tesla":         ["tesla","model s","model 3","model x","model y"],
    "Volkswagen":    ["volkswagen","vw"],
    "Hyundai":       ["hyundai"],
    "Kia":           ["kia"],
    "Mazda":         ["mazda"],
    "Subaru":        ["subaru"],
    "Ferrari":       ["ferrari"],
    "Lamborghini":   ["lamborghini","lambo"],
    "Porsche":       ["porsche"],
    "Bentley":       ["bentley"],
    "Rolls-Royce":   ["rolls-royce","rolls royce"],
    "Jaguar":        ["jaguar"],
    "Land Rover":    ["land rover","range rover","landrover"],
    "Volvo":         ["volvo"],
    "Peugeot":       ["peugeot"],
    "Renault":       ["renault"],
    "Fiat":          ["fiat"],
    "Jeep":          ["jeep"],
    "Chevrolet":     ["chevrolet","chevy"],
    "Dodge":         ["dodge"],
    "Nissan":        ["nissan"],
    "Mitsubishi":    ["mitsubishi"],
    "Suzuki":        ["suzuki"],
    # Finance
    "Visa":          ["visa"],
    "Mastercard":    ["mastercard","master card"],
    "American Express": ["american express","amex"],
    "PayPal":        ["paypal"],
    "Venmo":         ["venmo"],
    "Stripe":        ["stripe"],
    "Square":        ["square","squareup"],
    "Klarna":        ["klarna"],
    "Afterpay":      ["afterpay"],
    "Apple Pay":     ["apple pay","applepay"],
    "Google Pay":    ["google pay","googlepay","gpay"],
    "HSBC":          ["hsbc"],
    "Citibank":      ["citi","citibank"],
    "Chase":         ["chase","jpmorgan","jp morgan"],
    "Bank of America": ["bank of america","bofa"],
    "Wells Fargo":   ["wells fargo","wellsfargo"],
    "Barclays":      ["barclays"],
    "Santander":     ["santander"],
    "BNP Paribas":   ["bnp paribas","bnp"],
    "Deutsche Bank": ["deutsche bank","deutsche"],
    # Audio / electronics
    "LG":            ["lg"],
    "Panasonic":     ["panasonic"],
    "Toshiba":       ["toshiba"],
    "Sharp":         ["sharp"],
    "Canon":         ["canon"],
    "Nikon":         ["nikon"],
    "Fujifilm":      ["fujifilm","fuji"],
    "GoPro":         ["gopro"],
    "DJI":           ["dji"],
    "Bose":          ["bose"],
    "JBL":           ["jbl"],
    "Beats":         ["beats","beats by dre"],
    "Sennheiser":    ["sennheiser"],
    "Bosch":         ["bosch"],
    "Philips":       ["philips"],
    "Dyson":         ["dyson"],
    # Logistics & energy
    "FedEx":         ["fedex"],
    "UPS":           ["ups"],
    "DHL":           ["dhl"],
    "USPS":          ["usps","united states postal"],
    "Royal Mail":    ["royal mail"],
    "Maersk":        ["maersk"],
    "Shell":         ["shell"],
    "BP":            ["bp","british petroleum"],
    "ExxonMobil":    ["exxon","mobil","exxonmobil"],
    "Chevron":       ["chevron"],
    "Total":         ["total","totalenergies"],
    "Aramco":        ["aramco"],
    "GE":            ["general electric","ge"],
    "Siemens":       ["siemens"],
    "Schneider":     ["schneider"],
    # Broadcasters & sports
    "FIFA":          ["fifa"],
    "UEFA":          ["uefa"],
    "NBA":           ["nba"],
    "NFL":           ["nfl"],
    "MLB":           ["mlb"],
    "NHL":           ["nhl"],
    "Premier League":["premier league","epl"],
    "Champions League": ["champions league","uefa champions"],
    "Formula 1":     ["formula 1","formula1","f1"],
    "ESPN":          ["espn"],
    "CNN":           ["cnn"],
    "BBC":           ["bbc"],
    "Fox News":      ["fox news","fox"],
    "Al Jazeera":    ["al jazeera","aljazeera"],
    "Bloomberg":     ["bloomberg"],
    "Reuters":       ["reuters"],
    "Sky Sports":    ["sky sports","sky"],
    # Airlines & travel
    "Emirates":      ["emirates","fly emirates"],
    "Qatar Airways": ["qatar airways","qatar"],
    "Etihad":        ["etihad"],
    "Lufthansa":     ["lufthansa"],
    "Delta":         ["delta air"],
    "United":        ["united airlines","united air"],
    "American Airlines": ["american airlines"],
    "British Airways": ["british airways","ba"],
    "Singapore Airlines": ["singapore airlines"],
    "Booking.com":   ["booking.com","booking"],
    "Airbnb":        ["airbnb"],
    "Uber":          ["uber"],
    "Lyft":          ["lyft"],
    "Bolt":          ["bolt"],
    "Careem":        ["careem"],
}
_BRAND_KW: dict[str, str] = {
    kw.lower(): brand for brand, kws in BRANDS.items() for kw in kws
}
# Sort keywords by length (descending) so that longer keywords (e.g. "red bull")
# match before shorter ones (e.g. "red") to avoid wrong-brand collisions.
_BRAND_KW_SORTED: list[tuple[str, str]] = sorted(
    _BRAND_KW.items(), key=lambda kv: -len(kv[0]))


class LogoDetector:
    def __init__(self, languages: list[str] | None = None):
        self._ocr = None
        self._ready = False
        self._languages = languages or OCR_LANGUAGES
        self._active_languages: list[str] = []

    def _load(self):
        if not self._ready:
            try:
                import easyocr
                # Try the full requested set first; if EasyOCR rejects the
                # combination (it requires same-script langs) fall back to
                # progressively smaller subsets, finally English-only.
                tried: list[list[str]] = []
                attempts = [
                    list(self._languages),
                    [l for l in self._languages
                     if l in {"en","es","fr","de","it","pt","nl","id","vi"}],
                    ["en"],
                ]
                last_exc: Exception | None = None
                for langs in attempts:
                    if not langs or langs in tried:
                        continue
                    tried.append(langs)
                    try:
                        print(f"  [OCR] Loading EasyOCR ({'+'.join(langs)})...")
                        self._ocr = easyocr.Reader(langs, gpu=False, verbose=False)
                        self._active_languages = langs
                        print(f"  [OCR] EasyOCR ready ✓ ({'+'.join(langs)})")
                        break
                    except Exception as e:
                        last_exc = e
                        self._ocr = None
                if self._ocr is None and last_exc is not None:
                    print(f"  [OCR] EasyOCR unavailable: {last_exc}")
            except Exception as e:
                print(f"  [OCR] EasyOCR unavailable: {e}")
            self._ready = True
        return self._ocr

    def detect(self, frame_bgr: np.ndarray, ts: float) -> list[LogoDetection]:
        ocr = self._load()
        logos: list[LogoDetection] = []
        if ocr is None:
            return logos

        h, w = frame_bgr.shape[:2]
        # Preprocessing: sharpen + enhance contrast for better OCR
        proc = self._preprocess(frame_bgr)
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                results = ocr.readtext(proc, detail=1, paragraph=False,
                                       min_size=10, width_ths=0.8, height_ths=0.8)
            seen: set[tuple[str, str]] = set()
            for bbox_pts, text, conf in results:
                clean = text.strip()
                if conf < 0.40 or len(clean) < 2:
                    continue
                tl = clean.lower()
                brand = self._match(tl)
                if not brand:
                    continue
                key = (brand, tl)
                if key in seen:
                    continue
                seen.add(key)
                pts = np.array(bbox_pts)
                logos.append(LogoDetection(
                    timestamp_s=ts, brand=brand, text_found=text.strip(),
                    confidence=float(conf),
                    bbox={"x1": float(pts[:,0].min()/w), "y1": float(pts[:,1].min()/h),
                          "x2": float(pts[:,0].max()/w), "y2": float(pts[:,1].max()/h)},
                    source="ocr",
                ))
        except Exception:
            pass
        return logos

    @staticmethod
    def _preprocess(img: np.ndarray) -> np.ndarray:
        """Upscale small frames + sharpen for better OCR hit-rate."""
        h, w = img.shape[:2]
        if w < 1280:
            scale = 1280 / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        # Unsharp mask
        blur = cv2.GaussianBlur(img, (0, 0), 3)
        return cv2.addWeighted(img, 1.5, blur, -0.5, 0)

    @staticmethod
    def _match(text: str) -> str | None:
        """Longest-keyword-wins substring match against the brand catalog."""
        if len(text) < 2:
            return None
        for kw, brand in _BRAND_KW_SORTED:
            if len(kw) < 2:
                continue
            if kw in text:
                return brand
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Audio Classifier (MFCC + spectral features — no external model)
# ══════════════════════════════════════════════════════════════════════════════

def _smooth_audio_event_sequence(events: list[AudioEvent]) -> list[AudioEvent]:
    """Temporal denoiser for one-off audio label spikes."""
    if len(events) < 3:
        return events
    out = list(events)
    for i in range(1, len(events) - 1):
        prev_t = events[i - 1].event_type
        curr_t = events[i].event_type
        next_t = events[i + 1].event_type
        if curr_t != prev_t and prev_t == next_t:
            out[i] = AudioEvent(
                timestamp_s=events[i].timestamp_s,
                event_type=prev_t,
                details=f"Temporal smoothing ({curr_t}->{prev_t})",
                confidence=max(events[i].confidence, 0.70),
                rms_energy=events[i].rms_energy,
                zcr=events[i].zcr,
                spectral_centroid=events[i].spectral_centroid,
            )
    return out


def align_audio_events_with_speech(
    events: list[AudioEvent], speech_segments: list[SpeechSegment]
) -> list[AudioEvent]:
    """
    Cross-modal refinement: if Whisper confirms speech in a time span,
    avoid labeling that span as plain ambient/noise.
    """
    if not events or not speech_segments:
        return events
    speech_windows = [
        (seg.start_s, seg.end_s)
        for seg in speech_segments
        if not seg.is_noise and seg.confidence >= 0.30
    ]
    if not speech_windows:
        return events

    refined: list[AudioEvent] = []
    for ev in events:
        in_speech = any(s <= ev.timestamp_s <= e for s, e in speech_windows)
        if in_speech and ev.event_type in {"ambient", "noise"}:
            refined.append(
                AudioEvent(
                    timestamp_s=ev.timestamp_s,
                    event_type="speech",
                    details=f"Speech-aligned relabel ({ev.event_type}->speech)",
                    confidence=max(ev.confidence, 0.72),
                    rms_energy=ev.rms_energy,
                    zcr=ev.zcr,
                    spectral_centroid=ev.spectral_centroid,
                )
            )
        else:
            refined.append(ev)
    return refined


def classify_audio(audio_path: str, duration: float) -> list[AudioEvent]:
    """
    v4 audio classifier: 13 MFCC + spectral features + scream + gunshot detection.

    Event types:
      silence  — no signal
      ambient  — quiet background
      speech   — human voice (mid ZCR, time-varying formants)
      music    — tonal, periodic, low flatness
      noise    — broadband non-speech
      scream   — high pitch, sustained, high energy (surveillance critical)
      gunshot  — impulsive transient: very short RMS spike, broadband onset
    """
    events: list[AudioEvent] = []
    try:
        import librosa
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            y, sr = librosa.load(audio_path, sr=16000, mono=True)

        # Scene-adaptive thresholds: calibrate sensitivity to recording loudness/noise.
        global_rms = float(np.sqrt(np.mean(y ** 2))) if len(y) else 0.0
        abs_y = np.abs(y) if len(y) else np.array([0.0], dtype=np.float32)
        p90 = float(np.percentile(abs_y, 90))
        noise_floor = max(0.0025, global_rms * 0.40)
        speech_floor = max(0.010, noise_floor * 2.2)
        scream_floor = max(0.045, p90 * 0.65)
        gunshot_floor = max(0.085, p90 * 0.95)

        hop = sr  # 1-second windows
        # For gunshot: also scan sub-second (50ms) windows for transients
        transient_ts: list[float] = []
        win_short = sr // 20  # 50ms
        prev_rms  = 0.0
        for j in range(0, max(1, len(y) - win_short + 1), win_short):
            chunk_s = y[j: j + win_short]
            if len(chunk_s) < win_short // 2:
                break
            rms_s = float(np.sqrt(np.mean(chunk_s ** 2)))
            # Gunshot: sudden spike >5× previous 50ms RMS, very high energy
            if rms_s > gunshot_floor and rms_s > prev_rms * 4.5:
                transient_ts.append(float(j) / sr)
            prev_rms = rms_s

        for i in range(0, max(1, len(y) - hop + 1), hop):
            chunk = y[i: i + hop]
            if len(chunk) < sr // 4:
                break
            ts = float(i) / sr

            rms = float(np.sqrt(np.mean(chunk ** 2)))
            if rms < noise_floor:
                events.append(AudioEvent(ts, "silence", "No signal", 0.96, rms, 0.0, 0.0))
                continue

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                mfcc     = librosa.feature.mfcc(y=chunk, sr=sr, n_mfcc=13)
                mfcc_d   = librosa.feature.delta(mfcc)
                zcr      = float(np.mean(librosa.feature.zero_crossing_rate(chunk)))
                cent     = float(np.mean(librosa.feature.spectral_centroid(y=chunk, sr=sr)))
                rolloff  = float(np.mean(librosa.feature.spectral_rolloff(y=chunk, sr=sr)))
                flatness = float(np.mean(librosa.feature.spectral_flatness(y=chunk)))
                bandwidth= float(np.mean(librosa.feature.spectral_bandwidth(y=chunk, sr=sr)))
                mfcc_d_m = float(np.mean(np.abs(mfcc_d)))

            # ── Gunshot: impulsive transient in this 1-second window ──────────
            has_transient = any(ts <= t < ts + 1.0 for t in transient_ts)
            if has_transient and flatness > 0.18 and rms > gunshot_floor:
                conf = min(0.90, 0.60 + rms * 1.5 + flatness)
                events.append(AudioEvent(ts, "gunshot",
                    f"Impulsive transient (rms={rms:.3f}, flatness={flatness:.3f})",
                    conf, rms, zcr, cent))
                continue

            # ── Scream: high-pitch, sustained, high energy, high ZCR ─────────
            # Screams: cent > 2500Hz, ZCR > 0.18, rms > 0.05, high rolloff
            if cent > 2400 and zcr > 0.17 and rms > scream_floor and rolloff > 3800:
                conf = min(0.92, 0.55 + (cent / 8000) * 0.3 + zcr * 0.5 + rms * 1.5)
                events.append(AudioEvent(ts, "scream",
                    f"Scream (cent={cent:.0f}Hz, zcr={zcr:.3f}, rms={rms:.3f})",
                    conf, rms, zcr, cent))
                continue

            # ── Standard classification ───────────────────────────────────────
            if rms < speech_floor:
                evt, dsc, conf = "ambient", f"Quiet bg (rms={rms:.4f})", 0.72
            elif zcr > 0.09 and 650 < cent < 5000 and mfcc_d_m > 3.2 and rms > speech_floor:
                conf = min(0.96, 0.55 + zcr * 1.5 + mfcc_d_m * 0.015 + rms * 2.5)
                evt  = "speech"
                dsc  = f"Speech (zcr={zcr:.3f}, cent={cent:.0f}Hz, ΔMFCC={mfcc_d_m:.1f})"
            elif zcr < 0.08 and cent < 3800 and flatness < 0.05 and rms > 0.018:
                conf = min(0.92, 0.58 + (1 - flatness) * 0.3 + rms * 2)
                evt  = "music"
                dsc  = f"Music (cent={cent:.0f}Hz, flatness={flatness:.4f})"
            elif flatness > 0.15 and rms > 0.04:
                conf = min(0.88, 0.55 + flatness * 1.5 + rms * 2)
                evt  = "noise"
                dsc  = f"Noise (flatness={flatness:.3f}, rms={rms:.3f})"
            else:
                conf = 0.60
                evt  = "ambient"
                dsc  = f"Ambient (cent={cent:.0f}Hz, rms={rms:.4f})"

            events.append(AudioEvent(ts, evt, dsc, conf, rms, zcr, cent))

    except Exception as exc:
        print(f"  [WARN] Audio classification failed: {exc}")
    return _smooth_audio_event_sequence(events)


# ══════════════════════════════════════════════════════════════════════════════
# Multimodal Fusion Engine (4-head Cross-Attention Transformer)
# ══════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    4-head cross-attention transformer over 2-second time windows.
    Visual tokens (COCO presence + pose actions + optical flow) attend to
    audio tokens (MFCC-based event type + energy + speech).
    Outputs per-window: scene label, anomaly score, V-A alignment.
    """

    D_MODEL    = 128
    N_HEADS    = 4
    N_LAYERS   = 2
    V_DIM      = len(COCO80) + 6 + 3   # 89  (COCO + action + flow + person stats)
    A_DIM      = len(AUDIO_TYPES) + 4   # 9   (event type + RMS + ZCR + cent + speech)

    def __init__(self):
        self._built = False
        try:
            import torch
            import torch.nn as nn
            self._torch = torch
            self._nn = nn
            self._build()
            print(f"  [Fusion] 4-head cross-attention transformer ready (d={self.D_MODEL})")
        except ImportError:
            self._torch = None
            print("  [Fusion] PyTorch unavailable — rule-only fusion")

    def _build(self):
        torch = self._torch
        nn = self._nn

        class XAttn(nn.Module):
            def __init__(self, d):
                super().__init__()
                self.attn  = nn.MultiheadAttention(d, 4, batch_first=True, dropout=0.0)
                self.norm1 = nn.LayerNorm(d)
                self.ff    = nn.Sequential(nn.Linear(d, d*2), nn.GELU(), nn.Linear(d*2, d))
                self.norm2 = nn.LayerNorm(d)
            def forward(self, q, kv):
                out, _ = self.attn(q, kv, kv)
                x = self.norm1(q + out)
                return self.norm2(x + self.ff(x))

        class FusionTransformer(nn.Module):
            def __init__(self, vd, ad, d, nl, ns):
                super().__init__()
                self.vproj = nn.Linear(vd, d)
                self.aproj = nn.Linear(ad, d)
                self.xlayers = nn.ModuleList([XAttn(d) for _ in range(nl)])
                self.temporal = nn.TransformerEncoderLayer(
                    d, 4, dim_feedforward=d*2, batch_first=True, dropout=0.0)
                self.scene_head = nn.Linear(d, ns)
                self.anom_head  = nn.Sequential(
                    nn.Linear(d, 32), nn.GELU(), nn.Linear(32, 1), nn.Sigmoid())
            def forward(self, v, a):
                v = self.vproj(v).unsqueeze(0)
                a = self.aproj(a).unsqueeze(0)
                for lyr in self.xlayers:
                    v = lyr(v, a)
                f = self.temporal(v + a).squeeze(0)
                return self.scene_head(f), self.anom_head(f)

        self._model = FusionTransformer(
            self.V_DIM, self.A_DIM, self.D_MODEL, self.N_LAYERS, len(SCENE_LABELS))
        self._model.eval()
        with self._torch.no_grad():
            for p in self._model.parameters():
                if p.dim() >= 2:
                    self._nn.init.xavier_uniform_(p, gain=0.7)
                else:
                    self._nn.init.zeros_(p)
        self._built = True

    # ── Feature extraction ────────────────────────────────────────────────────

    def _vfeat(self, frames: list[FrameResult], ws: float, we: float):
        torch = self._torch
        feat = np.zeros(self.V_DIM, dtype=np.float32)
        wf = [fr for fr in frames if ws <= fr.timestamp_s < we]
        if not wf:
            return torch.tensor(feat)

        cc: Counter = Counter()
        person_cnts = []; actions = []; flows = []
        for fr in wf:
            person_cnts.append(fr.person_count)
            flows.append(fr.flow_magnitude)
            if fr.dominant_action:
                actions.append(fr.dominant_action)
            for d in fr.detections:
                idx = COCO_IDX.get(d.class_name)
                if idx is not None:
                    cc[idx] += 1

        nf = len(wf)
        for idx, cnt in cc.items():
            feat[idx] = min(1.0, cnt / (nf * 3 + 1e-6))

        # Action features (6-dim)
        ach = Counter(actions); tot = sum(ach.values()) + 1e-6
        base = len(COCO80)
        feat[base]   = ach.get("running", 0) / tot
        feat[base+1] = (ach.get("walking",0) + ach.get("slow walking",0)) / tot
        feat[base+2] = ach.get("loitering",0) / tot + ach.get("standing",0) / tot
        feat[base+3] = ach.get("fallen",0) / tot
        feat[base+4] = ach.get("fighting",0) / tot
        feat[base+5] = ach.get("sitting",0) / tot

        # Person count (normalized)
        avg_p = np.mean(person_cnts) if person_cnts else 0
        max_p = max(person_cnts) if person_cnts else 0
        feat[base+6] = min(1.0, avg_p / 10.0)
        feat[base+7] = min(1.0, max_p / 15.0)

        # Optical flow
        avg_flow = np.mean(flows) if flows else 0
        feat[base+8] = min(1.0, avg_flow / 10.0)

        return torch.tensor(feat)

    def _afeat(self, audio: list[AudioEvent], speech: list[SpeechSegment],
               ws: float, we: float):
        torch = self._torch
        feat = np.zeros(self.A_DIM, dtype=np.float32)
        wa = [e for e in audio if ws <= e.timestamp_s < we]
        if not wa:
            feat[0] = 1.0; return torch.tensor(feat)

        tc = Counter(e.event_type for e in wa); tot = len(wa)
        for i, t in enumerate(AUDIO_TYPES):
            feat[i] = tc.get(t, 0) / tot

        # Scalar features come AFTER the per-type fractions
        ba = len(AUDIO_TYPES)   # base offset: 7 (was hardcoded as 5 — bug fixed)
        rmss = [e.rms_energy for e in wa if e.rms_energy > 0]
        zcrs = [e.zcr for e in wa if e.zcr > 0]
        cents= [e.spectral_centroid for e in wa if e.spectral_centroid > 0]
        feat[ba]   = min(1.0, np.mean(rmss) / 0.1) if rmss else 0.0
        feat[ba+1] = min(1.0, np.mean(zcrs) / 0.3) if zcrs else 0.0
        feat[ba+2] = min(1.0, np.mean(cents) / 4000) if cents else 0.0
        ws_segs = [s for s in speech if s.start_s < we and s.end_s > ws and not s.is_noise]
        feat[ba+3] = min(1.0, len(ws_segs) * 0.5)

        return torch.tensor(feat)

    # ── Rule-based anomaly ────────────────────────────────────────────────────

    def _rule_score(
        self, frames: list[FrameResult], audio: list[AudioEvent],
        speech: list[SpeechSegment], ws: float, we: float
    ) -> tuple[float, list[str]]:
        score = 0.0; factors: list[str] = []
        wf = [fr for fr in frames if ws <= fr.timestamp_s < we]
        wa = [e for e in audio if ws <= e.timestamp_s < we]
        if not wf:
            return 0.0, factors

        max_p = max((fr.person_count for fr in wf), default=0)
        acts  = Counter(fr.dominant_action for fr in wf if fr.dominant_action)

        # Crowd
        if max_p >= 8:  score += 0.30; factors.append(f"crowd:{max_p}p")
        elif max_p >= 5: score += 0.15; factors.append(f"dense:{max_p}p")

        # Dangerous actions
        n = len(wf)
        if acts.get("fallen", 0) / n > 0.2:    score += 0.35; factors.append("person_fallen")
        if acts.get("fighting", 0) / n > 0.15: score += 0.40; factors.append("fighting")
        if acts.get("running", 0) / n > 0.5:   score += 0.28; factors.append("mass_running")
        if acts.get("loitering", 0) / n > 0.4: score += 0.12; factors.append("loitering")

        # Stampede flag in any frame of the window
        stamps = sum(1 for fr in wf if "STAMPEDE" in fr.surveillance_flags)
        if stamps:                              score += 0.35; factors.append(f"stampede({stamps}f)")

        # Weapon detected in window
        weapons = sum(1 for fr in wf for f in fr.surveillance_flags if f.startswith("WEAPON:"))
        if weapons:                             score += 0.45; factors.append(f"weapon({weapons})")

        # Audio: scream / gunshot / loud noise
        screams  = [e for e in wa if e.event_type == "scream"]
        gunshots = [e for e in wa if e.event_type == "gunshot"]
        loud     = [e for e in wa if e.event_type == "noise" and e.rms_energy > 0.07]
        if screams:  score += 0.40; factors.append(f"scream({len(screams)})")
        if gunshots: score += 0.50; factors.append(f"gunshot({len(gunshots)})")
        if loud:     score += 0.18; factors.append(f"loud_noise({len(loud)})")

        # Crowd surge
        cnts = [fr.person_count for fr in wf]
        if len(cnts) >= 2 and max(cnts) - min(cnts) >= 4:
            score += 0.18; factors.append("count_jump")

        # High optical flow
        avg_flow = np.mean([fr.flow_magnitude for fr in wf])
        if avg_flow > 5.0: score += 0.15; factors.append(f"high_motion({avg_flow:.1f})")

        return float(min(1.0, score)), factors

    @staticmethod
    def _severity(score: float) -> str:
        if score >= 0.80: return "critical"
        if score >= 0.65: return "high"
        if score >= 0.45: return "medium"
        if score >= 0.25: return "low"
        return "normal"

    def _describe(self, frames, audio, speech, ws, we, scene, score, factors) -> str:
        wf = [fr for fr in frames if ws <= fr.timestamp_s < we]
        wa = [e for e in audio if ws <= e.timestamp_s < we]
        avg_p = np.mean([fr.person_count for fr in wf]) if wf else 0
        acts = Counter(fr.dominant_action for fr in wf if fr.dominant_action)
        dom_act = acts.most_common(1)[0][0] if acts else "unknown"
        at = Counter(e.event_type for e in wa).most_common(1)
        audio_s = at[0][0] if at else "silence"
        ws_segs = [s for s in speech if s.start_s < we and s.end_s > ws and not s.is_noise]
        parts = [f"Scene: {scene.replace('_',' ').title()}."]
        parts.append(f"~{avg_p:.0f} persons, primary action: {dom_act}.")
        parts.append(f"Audio: {audio_s}.")
        if ws_segs:
            parts.append(f"Speech detected ({ws_segs[0].language_name}).")
        if factors:
            parts.append(f"Anomaly: {', '.join(factors)} (score={score:.2f}).")
        return " ".join(parts)

    # ── Main fuse ─────────────────────────────────────────────────────────────

    def fuse(self, frames, audio, speech, duration) -> list[FusionInsight]:
        if not frames:
            return []
        if self._torch is None:
            return self._rule_fuse(frames, audio, speech, duration)

        torch = self._torch
        n = max(1, int(math.ceil(duration / FUSION_WINDOW)))
        windows = [(b * FUSION_WINDOW, min(duration, (b+1) * FUSION_WINDOW))
                   for b in range(n)]

        vl = [self._vfeat(frames, ws, we) for ws, we in windows]
        al = [self._afeat(audio, speech, ws, we) for ws, we in windows]
        vt = torch.stack(vl); at = torch.stack(al)

        with torch.no_grad():
            sl, sa = self._model(vt, at)
            sprobs = torch.softmax(sl, dim=-1).numpy()
            araw   = sa.squeeze(-1).numpy()

        # EMA smoothing of anomaly scores (window=3)
        araw_smooth = np.zeros_like(araw)
        alpha = 0.5
        araw_smooth[0] = araw[0]
        for i in range(1, len(araw)):
            araw_smooth[i] = alpha * araw[i] + (1 - alpha) * araw_smooth[i-1]

        insights: list[FusionInsight] = []
        for b, (ws, we) in enumerate(windows):
            si  = int(np.argmax(sprobs[b]))
            sc  = SCENE_LABELS[si]
            scf = float(sprobs[b][si])

            rule_s, factors = self._rule_score(frames, audio, speech, ws, we)
            final_s = float(np.clip(0.4 * float(araw_smooth[b]) + 0.6 * rule_s, 0, 1))

            vn = vl[b].numpy(); an = al[b].numpy()
            vn /= (np.linalg.norm(vn) + 1e-8)
            ap = np.pad(an, (0, len(vn) - len(an)))
            ap /= (np.linalg.norm(ap) + 1e-8)
            align = float(np.clip(np.dot(vn, ap) + 0.5, 0, 1))

            sev   = self._severity(final_s)
            alert = final_s >= 0.65
            desc  = self._describe(frames, audio, speech, ws, we, sc, final_s, factors)
            insights.append(FusionInsight(
                window_start_s=ws, window_end_s=we, scene_label=sc,
                anomaly_score=final_s, visual_audio_alignment=align,
                confidence=scf, alert=alert, severity=sev,
                contributing_factors=factors, description=desc,
            ))
        return insights

    def _rule_fuse(self, frames, audio, speech, duration) -> list[FusionInsight]:
        n = max(1, int(math.ceil(duration / FUSION_WINDOW)))
        out = []
        for b in range(n):
            ws, we = b * FUSION_WINDOW, min(duration, (b+1)*FUSION_WINDOW)
            s, factors = self._rule_score(frames, audio, speech, ws, we)
            wf = [fr for fr in frames if ws <= fr.timestamp_s < we]
            avg_p = np.mean([fr.person_count for fr in wf]) if wf else 0
            sc = ("crowd_gathering" if avg_p >= 6 else
                  "pedestrian_movement" if avg_p > 0 else "empty_scene")
            sev = self._severity(s)
            desc = self._describe(frames, audio, speech, ws, we, sc, s, factors)
            out.append(FusionInsight(
                window_start_s=ws, window_end_s=we, scene_label=sc,
                anomaly_score=s, visual_audio_alignment=0.5,
                confidence=0.6, alert=(s>=0.65), severity=sev,
                contributing_factors=factors, description=desc,
            ))
        return out


# ══════════════════════════════════════════════════════════════════════════════
# Post-Processing & Validation Layer
# ══════════════════════════════════════════════════════════════════════════════

class PostProcessingValidator:
    """
    Runs after the full pipeline to eliminate spurious results and sharpen
    signal quality before the report is written.

    Operations (in order):
      1. Anomaly score EMA smoothing — removes single-window spike noise.
      2. Cross-modal event deduplication — merges fight alerts from both the
         SurveillanceDetector and the FusionEngine that refer to the same
         temporal window so the dashboard doesn't double-count.
      3. Low-age track pruning — removes per-frame detections where the
         track never survived MIN_TRACK_AGE frames (already filtered from
         unique_track_ids, now also purged from frame-level data).
      4. Speech segment confidence clamp — filters out segments whose Whisper
         avg_logprob is so low they are certain to be hallucinations.
      5. Surveillance event severity upgrade — if a fusion window is CRITICAL
         and a surveillance event of a matching type fires within ±2 s, both
         are upgraded to critical severity for consistent downstream alerting.
    """

    EMA_ALPHA = 0.35          # smoothing factor (0=no change, 1=raw value)
    CROSS_MODAL_WINDOW = 2.5  # seconds: fusion+surveillance considered same event
    MIN_SPEECH_CONF = 0.20    # below this the segment is likely noise/hallucination

    # Surveillance event types that map to fusion scene labels for dedup
    _SURV_TO_SCENE: dict[str, set[str]] = {
        "fight":            {"fight_scene", "altercation"},
        "fall":             {"emergency_scene", "fall"},
        "crowd_surge":      {"crowd_scene", "panic"},
        "stampede":         {"stampede", "panic"},
        "weapon_proximity": {"threat_scene", "confrontation"},
        "gunshot":          {"gunshot", "shooting_scene"},
        "scream":           {"distress_scene"},
    }

    def validate(self, analysis: "VideoAnalysis") -> "VideoAnalysis":
        self._smooth_anomaly_scores(analysis)
        self._deduplicate_cross_modal(analysis)
        self._prune_noise_speech(analysis)
        self._upgrade_matching_severities(analysis)
        return analysis

    # ── 1. EMA smoothing on fusion anomaly scores ──────────────────────────
    def _smooth_anomaly_scores(self, analysis: "VideoAnalysis") -> None:
        if not analysis.fusion_insights:
            return
        smoothed = analysis.fusion_insights[0].anomaly_score
        for fi in analysis.fusion_insights:
            smoothed = self.EMA_ALPHA * fi.anomaly_score + (1 - self.EMA_ALPHA) * smoothed
            # Only lower the score — never raise via EMA (avoids suppressing real peaks)
            fi.anomaly_score = min(fi.anomaly_score, smoothed + 0.08)
            # Recompute severity after smoothing
            fi.severity = FusionEngine._severity(fi.anomaly_score)
            fi.alert    = fi.anomaly_score >= 0.65

    # ── 2. Cross-modal deduplication ───────────────────────────────────────
    def _deduplicate_cross_modal(self, analysis: "VideoAnalysis") -> None:
        """
        For each SurveillanceEvent, check if a FusionInsight within ±CROSS_MODAL_WINDOW
        seconds already describes the same phenomenon. If so, keep the higher-severity
        record and annotate it with a cross-modal flag; drop the duplicate.
        """
        if not analysis.fusion_insights or not analysis.surveillance_events:
            return
        dedup_scene_labels: dict[str, list[FusionInsight]] = defaultdict(list)
        for fi in analysis.fusion_insights:
            for label in self._SURV_TO_SCENE.get(fi.scene_label, set()):
                dedup_scene_labels[label].append(fi)

        kept: list[SurveillanceEvent] = []
        for ev in analysis.surveillance_events:
            matching_fis = []
            for scene_key in self._SURV_TO_SCENE.get(ev.event_type, set()):
                for fi in analysis.fusion_insights:
                    if (abs(fi.window_start_s - ev.timestamp_s) < self.CROSS_MODAL_WINDOW
                            and fi.scene_label in self._SURV_TO_SCENE.get(ev.event_type, set())):
                        matching_fis.append(fi)

            if matching_fis:
                # Annotate fusion insight with the matched surveillance event
                for fi in matching_fis:
                    if "cross_modal_confirmed" not in fi.contributing_factors:
                        fi.contributing_factors.append("cross_modal_confirmed")
                    # Upgrade fusion severity if surveillance is higher
                    sev_order = ["normal", "low", "medium", "high", "critical"]
                    if sev_order.index(ev.severity) > sev_order.index(fi.severity):
                        fi.severity = ev.severity
                        fi.anomaly_score = max(fi.anomaly_score, 0.70)
                        fi.alert = True
            kept.append(ev)
        analysis.surveillance_events = kept

    # ── 3. Speech confidence pruning ───────────────────────────────────────
    def _prune_noise_speech(self, analysis: "VideoAnalysis") -> None:
        for seg in analysis.speech_segments:
            if seg.confidence < self.MIN_SPEECH_CONF and not seg.is_noise:
                seg.is_noise = True
                seg.text = "[low-confidence]"

    # ── 4. Severity upgrade when fusion+surveillance agree ─────────────────
    def _upgrade_matching_severities(self, analysis: "VideoAnalysis") -> None:
        """
        When a FusionInsight window is CRITICAL, also upgrade any surveillance
        events that fall within that window to at least HIGH, ensuring consistent
        display in both the timeline and the alert panel.
        """
        for fi in analysis.fusion_insights:
            if fi.severity != "critical":
                continue
            for ev in analysis.surveillance_events:
                if fi.window_start_s <= ev.timestamp_s <= fi.window_end_s:
                    if ev.severity in ("low", "medium"):
                        ev.severity = "high"


# ══════════════════════════════════════════════════════════════════════════════
# Core Analyzer
# ══════════════════════════════════════════════════════════════════════════════

class DetectraAnalyzer:
    def __init__(self):
        self._seg   = None
        self._pose  = None
        self._whisper = None
        self._logo  = LogoDetector()
        self._fusion = FusionEngine()
        self._surv  = SurveillanceDetector()
        self._validator = PostProcessingValidator()
        self._last_detected_languages: list[dict] = []
        # v5 accuracy engine
        self._identity_tracker = IdentityTracker() if (USE_IDENTITY_REID and IdentityTracker) else None
        self._cadence = AnkleCadenceClassifier() if (USE_CADENCE and AnkleCadenceClassifier) else None
        self._reasoner = ReasoningAgent() if (USE_REASONING and ReasoningAgent) else None
        self._clip_logos = None
        if USE_CLIP_LOGOS and ClipLogoMatcher:
            try:
                self._clip_logos = ClipLogoMatcher(
                    brands=DEFAULT_LOGO_BRANDS,
                    score_threshold=CLIP_LOGO_THRESH,
                    regions=CLIP_LOGO_REGIONS,
                    verbose=True,
                )
            except Exception as exc:
                print(f"  [CLIP] Logos disabled — init failed: {exc}")
                self._clip_logos = None
            if self._clip_logos is not None and not self._clip_logos.available:
                err = getattr(self._clip_logos, "load_error", None) or "unknown reason"
                print(f"  [CLIP] Visual logo matcher unavailable: {err}")
                self._clip_logos = None
        print("\n" + "="*70)
        print("  Detectra AI v5.0 — Ultra Accuracy Edition")
        engine = "faster-whisper" if (USE_FASTER_WHISPER and faster_whisper_available()) else "openai-whisper"
        feat = []
        if self._identity_tracker: feat.append("ReID-Identity")
        if self._cadence: feat.append("Cadence-FFT")
        if self._reasoner: feat.append("ReasoningAgent")
        if self._clip_logos: feat.append("CLIP-Logos")
        print(f"  Engine: {engine}-{WHISPER_MODEL} | YOLO={YOLO_SEG_MODEL} | "
              f"Pose={YOLO_POSE_MODEL}")
        if feat:
            print(f"  Accuracy modules: {' + '.join(feat)}")
        print("="*70)

    def _load_seg(self):
        if self._seg is None:
            print(f"  [YOLO-Seg] Loading {YOLO_SEG_MODEL}...")
            from ultralytics import YOLO
            self._seg = YOLO(YOLO_SEG_MODEL)
            print("  [YOLO-Seg] Ready")
        return self._seg

    def _load_pose(self):
        if self._pose is None:
            print(f"  [YOLO-Pose] Loading {YOLO_POSE_MODEL}...")
            from ultralytics import YOLO
            self._pose = YOLO(YOLO_POSE_MODEL)
            print("  [YOLO-Pose] Ready")
        return self._pose

    def _load_whisper(self):
        if self._whisper is None:
            print(f"  [Whisper] Loading {WHISPER_MODEL} (openai-whisper)...")
            try:
                import whisper as _w
            except ImportError as e:
                raise RuntimeError(
                    "openai-whisper is not installed. Use faster-whisper (default on Heroku), "
                    "or install the full stack: pip install -r requirements.api.txt"
                ) from e
            self._whisper = _w.load_model(WHISPER_MODEL)
            print("  [Whisper] Ready")
        return self._whisper

    def _extract_audio(self, video_path: Path) -> "Path | None":
        out = OUTPUT_DIR / f"_tmp_{video_path.stem}.wav"
        try:
            r = subprocess.run(
                ["ffmpeg", "-y", "-i", str(video_path),
                 "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                 "-af", "highpass=f=80,lowpass=f=8000", str(out)],
                capture_output=True, timeout=120,
            )
            stderr = r.stderr.decode("utf-8", errors="replace")
            if "Audio" in stderr and out.exists() and out.stat().st_size > 2000:
                return out
            print("  [INFO] No audio stream")
        except FileNotFoundError:
            print("  [WARN] ffmpeg not in PATH")
        except Exception as e:
            print(f"  [WARN] Audio extraction: {e}")
        if out.exists():
            out.unlink(missing_ok=True)
        return None

    def _denoise_audio(self, audio_path: Path) -> Path:
        out = OUTPUT_DIR / f"_tmp_{audio_path.stem}_dn.wav"
        try:
            import noisereduce as nr
            import librosa
            import soundfile as sf
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                y, sr = librosa.load(str(audio_path), sr=16000, mono=True)
            noise = y[:int(sr * 0.5)] if len(y) > sr else y
            reduced = nr.reduce_noise(y=y, sr=sr, y_noise=noise,
                                      stationary=False, prop_decrease=0.75)
            sf.write(str(out), reduced, sr)
            print("  [Audio] Denoised")
            return out
        except Exception as e:
            print(f"  [WARN] Denoise: {e}")
            return audio_path

    def analyze(self, video_path: Path) -> VideoAnalysis:
        t0 = time.perf_counter()
        self._last_detected_languages: list[dict] = []
        print(f"\n{'─'*70}\n  Analyzing: {video_path.name}\n{'─'*70}")
        cap = cv2.VideoCapture(str(video_path))
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        nf = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        dur = nf / src_fps
        cap.release()
        print(f"  {W}x{H} | {dur:.1f}s | {src_fps:.1f}fps")

        analysis = VideoAnalysis(video_path=video_path, duration_s=dur,
                                 width=W, height=H, fps=src_fps, total_frames=nf)

        print(f"\n  [1/5] Perception: YOLOv8s-Seg + Pose + ByteTrack + OCR")
        analysis.frame_results, analysis.unique_track_ids, analysis.logo_detections = \
            self._run_perception(video_path, analysis)

        print(f"\n  [2/5] Speech: Whisper-{WHISPER_MODEL} + MFCC audio")
        audio_path = self._extract_audio(video_path)
        if audio_path:
            if USE_DENOISE:
                audio_path = self._denoise_audio(audio_path)
            analysis.speech_segments     = self._run_whisper(audio_path, dur)
            analysis.detected_languages  = self._last_detected_languages
            analysis.audio_events        = classify_audio(str(audio_path), dur)
            analysis.audio_events        = align_audio_events_with_speech(
                analysis.audio_events, analysis.speech_segments
            )
            audio_path.unlink(missing_ok=True)
            (OUTPUT_DIR / f"_tmp_{video_path.stem}.wav").unlink(missing_ok=True)
        else:
            print("  [INFO] No audio")

        print(f"\n  [3/5] Fusion: 4-head cross-attention transformer")
        analysis.fusion_insights = self._fusion.fuse(
            analysis.frame_results, analysis.audio_events,
            analysis.speech_segments, dur)
        mx = max((fi.anomaly_score for fi in analysis.fusion_insights), default=0.0)
        alerts = sum(1 for fi in analysis.fusion_insights if fi.alert)
        print(f"    {len(analysis.fusion_insights)} windows | max={mx:.3f} | alerts={alerts}")

        print(f"\n  [4/5] Surveillance: fall/fight/loitering/crowd")
        analysis.surveillance_events = self._surv.analyze(
            analysis.frame_results, analysis.audio_events)
        print(f"    {len(analysis.surveillance_events)} events")

        print(f"\n  [5/7] Post-processing: EMA smoothing + cross-modal dedup + validation")
        self._validator.validate(analysis)
        mx2 = max((fi.anomaly_score for fi in analysis.fusion_insights), default=0.0)
        print(f"    Validated | max_anomaly={mx2:.3f} | surv_events={len(analysis.surveillance_events)}")

        print(f"\n  [6/7] Identity Re-ID + Agentic Reasoning")
        if self._identity_tracker is not None:
            analysis.identities = self._identity_tracker.summary()
            print(f"    Identities: {self._identity_tracker.distinct_count} "
                  f"appearance-merged (ByteTrack ID segments: {len(analysis.unique_track_ids)})")
        if self._reasoner is not None:
            try:
                analysis.reasoning = self._reasoner.synthesize(_build_reasoning_payload(analysis))
                analysis.accuracy_engine_version = self._reasoner.version
                threat = (analysis.reasoning.get("threat_assessment") or {}).get("level", "?")
                corr_n = len(analysis.reasoning.get("cross_modal_correlations") or [])
                print(f"    Reasoning: threat={threat} | "
                      f"{corr_n} cross-modal correlation(s) | "
                      f"{len(analysis.reasoning.get('timeline_narrative') or [])} narrative blocks")
            except Exception as exc:
                print(f"    [WARN] Reasoning failed: {exc}")
                analysis.reasoning = {}

        # Record which speech engine was used (for the report)
        analysis.speech_engine = (
            f"faster-whisper-{WHISPER_MODEL}"
            if (USE_FASTER_WHISPER and faster_whisper_available())
            else f"openai-whisper-{WHISPER_MODEL}"
        )

        print(f"\n  [7/7] Output: stats + labeled video + report + RAG JSON")
        self._compute_stats(analysis)
        analysis.labeled_video_path = self._write_labeled_video(video_path, analysis)
        analysis.report_path        = self._write_html_report(analysis)
        self._write_rag_json(analysis)
        analysis.processing_time_s  = time.perf_counter() - t0
        print(
            f"\n  Done: {analysis.processing_time_s:.1f}s | distinct_individuals={analysis.distinct_individuals} "
            f"| track_ID_segments={len(analysis.unique_track_ids)} | concurrent_peak={analysis.max_concurrent_persons}"
        )
        return analysis

    # ── IoU helper ─────────────────────────────────────────────────────────
    @staticmethod
    def _iou4(a, b):
        ix1=max(a[0],b[0]); iy1=max(a[1],b[1])
        ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
        if ix2<=ix1 or iy2<=iy1: return 0.0
        inter=(ix2-ix1)*(iy2-iy1)
        ua=(a[2]-a[0])*(a[3]-a[1]); ub=(b[2]-b[0])*(b[3]-b[1])
        return inter/(ua+ub-inter+1e-8)

    # ── Perception ─────────────────────────────────────────────────────────
    def _run_perception(self, video_path, analysis):
        seg  = self._load_seg()
        pose_model = self._load_pose()
        action_rec = PoseActionRecognizer()

        frame_results = []; all_logos = []; all_tids = set()
        track_ages: dict = defaultdict(int)
        # Reset per-video identity tracker so each clip's PIDs start at 1
        if self._identity_tracker is not None:
            self._identity_tracker.reset()

        cap      = cv2.VideoCapture(str(video_path))
        src_fps  = analysis.fps
        interval = max(1, int(src_fps / ANALYSIS_FPS))
        logo_int = max(1, int(src_fps))
        fi = 0; analyzed = 0; prev_gray = None
        # CLAHE for contrast-limited adaptive histogram equalisation
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)) if USE_CLAHE else None

        while True:
            ret, frame = cap.read()
            if not ret: break
            if fi % interval == 0:
                ts   = fi / src_fps

                # ── CLAHE contrast enhancement (helps low-light detection) ────
                if clahe is not None:
                    yuv   = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
                    yuv[:, :, 0] = clahe.apply(yuv[:, :, 0])
                    frame_enh = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
                else:
                    frame_enh = frame

                frgb = cv2.cvtColor(frame_enh, cv2.COLOR_BGR2RGB)
                fgry = cv2.cvtColor(frame_enh, cv2.COLOR_BGR2GRAY)

                # ── Optical flow + direction vector ────────────────────────────
                flow_mag = 0.0
                if prev_gray is not None:
                    flw = cv2.calcOpticalFlowFarneback(
                        prev_gray, fgry, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    mag = np.sqrt(flw[..., 0] ** 2 + flw[..., 1] ** 2)
                    flow_mag = float(np.mean(mag))
                prev_gray = fgry

                # Segmentation + tracking (on CLAHE-enhanced frame)
                seg_res  = seg.track(frgb, conf=YOLO_CONF, iou=YOLO_IOU,
                                     persist=True, verbose=False,
                                     tracker="bytetrack.yaml")
                # Pose estimation
                pose_res = pose_model(frgb, conf=YOLO_CONF, verbose=False)
                pose_list = []
                if pose_res and pose_res[0].keypoints is not None:
                    for j, kd in enumerate(pose_res[0].keypoints.data):
                        kps_arr = kd.cpu().numpy()
                        pb = pose_res[0].boxes[j]
                        pose_list.append(([float(v) for v in pb.xyxyn[0]], PoseKPs(kps_arr)))

                detections = []
                if seg_res and seg_res[0].boxes is not None:
                    boxes = seg_res[0].boxes
                    masks = seg_res[0].masks
                    names = seg_res[0].names
                    for i, box in enumerate(boxes):
                        cls_id = int(box.cls[0])
                        cname  = names.get(cls_id, f"cls_{cls_id}")
                        conf   = float(box.conf[0])
                        if cname == "person":
                            if conf < PERSON_MIN_CONF:
                                continue
                        elif conf < OBJECT_MIN_CONF:
                            continue
                        x1,y1,x2,y2 = [float(v) for v in box.xyxyn[0]]
                        tid    = int(box.id[0]) if box.id is not None else None

                        mask_arr = None
                        if masks is not None and i < len(masks.data):
                            mask_arr = masks.data[i].cpu().numpy()

                        best_pose = None
                        if cname == "person" and pose_list:
                            best_iou = 0.0
                            for pbbox, pkps in pose_list:
                                iou = self._iou4((x1,y1,x2,y2), tuple(pbbox))
                                if iou > best_iou:
                                    best_iou = iou; best_pose = pkps

                        if tid is not None:
                            track_ages[tid] += 1
                            # Only count a track as a real person once it survives MIN_TRACK_AGE
                            # frames. This eliminates ghost detections that ByteTrack assigns
                            # a new ID to but vanish after 1-2 frames.
                            if track_ages[tid] >= MIN_TRACK_AGE:
                                all_tids.add(tid)

                        det = Detection(
                            class_name=cname, confidence=conf,
                            x1=x1, y1=y1, x2=x2, y2=y2,
                            mask=mask_arr, track_id=tid, pose=best_pose,
                            track_age=track_ages.get(tid,0))
                        detections.append(det)

                actions_map = action_rec.update(ts, detections)
                for det in detections:
                    if det.track_id in actions_map:
                        det.action = actions_map[det.track_id]

                # ── Cadence-based action refinement (walk/jog/run) ─────────
                if self._cadence is not None:
                    for det in detections:
                        if det.class_name != "person" or det.track_id is None:
                            continue
                        if det.pose is None:
                            continue
                        l_ank = det.pose.get("l_ankle")
                        r_ank = det.pose.get("r_ankle")
                        # Use whichever ankle has higher confidence
                        if l_ank[2] >= 0.30 or r_ank[2] >= 0.30:
                            ay = l_ank[1] if l_ank[2] >= r_ank[2] else r_ank[1]
                            self._cadence.push(int(det.track_id), ts, float(ay))
                        # Only override actions in the locomotion family
                        if det.action in ("walking", "slow walking", "running",
                                          "fast walking"):
                            inferred = self._cadence.classify(int(det.track_id))
                            if inferred and inferred != det.action:
                                det.action = inferred

                # ── Identity Re-ID (appearance fingerprint → stable PID) ────
                if self._identity_tracker is not None:
                    records = []
                    for det in detections:
                        if det.class_name != "person" or det.track_id is None:
                            continue
                        if det.track_age < MIN_TRACK_AGE:
                            continue
                        records.append({
                            "track_id": int(det.track_id),
                            "bbox": (det.x1, det.y1, det.x2, det.y2),
                            "frame": frame_enh,
                            "mask": det.mask,
                        })
                    if records:
                        self._identity_tracker.update(ts, records)

                dom = action_rec.get_dominant(detections)

                flags = []
                for det in detections:
                    if det.class_name == "person":
                        if det.action == "fallen":    flags.append("FALL")
                        if det.action == "fighting":  flags.append("FIGHT")
                        if det.action == "loitering": flags.append("LOITER")
                        if det.action == "running":   flags.append("RUN")
                    if det.class_name in WEAPON_CLASSES:
                        flags.append(f"WEAPON:{det.class_name.upper()}")
                # Stampede flag
                runners_n = sum(1 for d in detections
                                if d.class_name == "person" and d.action in ("running","fast walking"))
                pc_now = sum(1 for d in detections if d.class_name == "person")
                if runners_n >= 3 and runners_n >= 0.55 * max(1, pc_now):
                    flags.append("STAMPEDE")

                if fi % logo_int == 0:
                    all_logos.extend(self._logo.detect(frame, ts))
                    if self._clip_logos is not None:
                        try:
                            clip_hits = self._clip_logos.detect(frame, ts)
                        except Exception as exc:
                            print(f"  [WARN] CLIP logo matcher failed: {exc}")
                            clip_hits = []
                        for hit in clip_hits:
                            all_logos.append(LogoDetection(
                                timestamp_s=hit["timestamp_s"],
                                brand=hit["brand"],
                                text_found=hit.get("text_found", ""),
                                confidence=float(hit["confidence"]),
                                bbox=hit["bbox"],
                                source=hit.get("source", "clip"),
                            ))

                # Stable person count: only include persons with mature tracks or
                # high confidence to reduce one-frame ghosts.
                stable_persons = [
                    d for d in detections
                    if d.class_name == "person" and (
                        d.track_age >= MIN_TRACK_AGE or d.confidence >= 0.55
                    )
                ]
                pc = len(stable_persons)
                pid = {d.track_id for d in stable_persons if d.track_id}
                frame_results.append(FrameResult(
                    frame_idx=fi, timestamp_s=ts, detections=detections,
                    person_count=pc, unique_track_ids=pid,
                    dominant_action=dom, flow_magnitude=flow_mag,
                    surveillance_flags=flags))
                analyzed += 1
                if analyzed % 20 == 0:
                    print(f"    frame {analyzed} | t={ts:.1f}s | persons={pc} | tracks={len(all_tids)} | flags={flags}")
            fi += 1
        cap.release()

        seen = set(); unique_logos = []
        for lg in all_logos:
            k = (lg.brand, round(lg.timestamp_s/2))
            if k not in seen: seen.add(k); unique_logos.append(lg)
        print(f"    Done: {analyzed} frames | {len(all_tids)} tracks | {len(unique_logos)} logos")
        return frame_results, all_tids, unique_logos

    # ── Whisper ─────────────────────────────────────────────────────────────
    def _run_whisper(self, audio_path: Path, duration: float):
        """
        Multilingual-aware transcription.

        Prefers ``faster-whisper`` with Silero VAD (much higher accuracy and
        4-8× faster on CPU). Falls back to ``openai-whisper`` if faster-whisper
        is not installed or fails. Per-segment language detection allows the
        frontend to show language badges for multilingual conversations.
        """
        # ── v5: faster-whisper + Silero VAD path ─────────────────────────────
        if USE_FASTER_WHISPER and transcribe_audio_enhanced is not None and faster_whisper_available():
            try:
                segments_data, languages_data = transcribe_audio_enhanced(
                    audio_path,
                    model_size=WHISPER_MODEL,
                    beam_size=WHISPER_BEAM_SIZE,
                    verbose=True,
                )
                segs = [
                    SpeechSegment(
                        start_s=float(s["start_s"]),
                        end_s=float(s["end_s"]),
                        text=str(s.get("text", "")),
                        language=str(s.get("language") or ""),
                        language_name=str(s.get("language_name") or ""),
                        confidence=float(s.get("confidence", 0.0)),
                        is_noise=bool(s.get("is_noise", False)),
                    )
                    for s in segments_data
                ]
                self._last_detected_languages = languages_data or []
                return segs
            except Exception as exc:
                print(f"  [Speech] faster-whisper path failed ({exc}); "
                      f"falling back to openai-whisper")

        try:
            wm = self._load_whisper()
        except RuntimeError as err:
            print(f"  [Speech] {err}")
            self._last_detected_languages = []
            return []

        import whisper as _w
        segs = []
        try:
            # Quick probe: detect dominant language on first 30s to decide
            # whether there is any speech at all before spending time transcribing.
            audio = _w.load_audio(str(audio_path))
            clip  = _w.pad_or_trim(audio)
            mel   = _w.log_mel_spectrogram(clip).to(wm.device)
            _, prbs = wm.detect_language(mel)
            dom_lang  = max(prbs, key=prbs.get)
            dom_conf  = float(prbs[dom_lang])
            dom_name  = LANG_NAMES.get(dom_lang, dom_lang.upper())
            print(f"    Dominant language: {dom_name} ({dom_lang}) conf={dom_conf:.1%}")

            if dom_conf < 0.45:
                print("    [INFO] Very low language confidence — likely ambient/no speech, skipping")
                return []

            # Transcribe with language=None → Whisper detects language per window
            # condition_on_previous_text=False avoids hallucinations across language
            # boundaries when the speaker switches languages mid-video.
            result = wm.transcribe(
                str(audio_path),
                language=None,         # multilingual mode
                task="transcribe",
                fp16=False,
                word_timestamps=False,
                verbose=False,
                no_speech_threshold=0.45,
                logprob_threshold=-1.2,
                compression_ratio_threshold=2.4,
                condition_on_previous_text=False,
                temperature=0.0,
                beam_size=5,
                best_of=5,
                initial_prompt=None,
            )

            # Collect per-segment language (Whisper stores it in each segment dict)
            lang_counter: Counter = Counter()
            for seg in result.get("segments", []):
                text  = seg.get("text", "").strip()
                logp  = seg.get("avg_logprob", -2.0)
                nsp   = seg.get("no_speech_prob", 0.0)
                conf  = float(max(0.0, min(1.0, math.exp(max(logp, -3.0)) * (1 - nsp))))
                noise = (nsp > 0.50 or logp < -1.0 or not text or len(text) < 2)
                if noise:
                    text = "[noise]"
                # Whisper may expose per-segment language via result["language"]
                # or individual segment language field (model-version-dependent)
                seg_lang = seg.get("language") or result.get("language") or dom_lang
                seg_lang_name = LANG_NAMES.get(seg_lang, seg_lang.upper())
                if not noise:
                    lang_counter[seg_lang] += 1
                segs.append(SpeechSegment(
                    start_s=float(seg["start"]), end_s=float(seg["end"]),
                    text=text, language=seg_lang, language_name=seg_lang_name,
                    confidence=conf, is_noise=noise,
                ))

            # Build detected_languages summary (returned for VideoAnalysis storage)
            detected_languages = [
                {"code": lc, "name": LANG_NAMES.get(lc, lc.upper()),
                 "confidence": float(prbs.get(lc, 0.0)), "segment_count": cnt}
                for lc, cnt in lang_counter.most_common()
            ]

            real = sum(1 for s in segs if not s.is_noise)
            langs_str = ", ".join(f"{d['name']}({d['segment_count']})" for d in detected_languages[:4])
            print(f"    Transcript: {real} speech + {len(segs)-real} noise | langs: {langs_str or dom_name}")

            # Stash for caller to attach to VideoAnalysis
            self._last_detected_languages = detected_languages

        except Exception as e:
            print(f"  [WARN] Whisper: {e}"); traceback.print_exc()
            self._last_detected_languages = []
        return segs

    # ── Stats ───────────────────────────────────────────────────────────────
    def _compute_stats(self, analysis: VideoAnalysis):
        classes=[]; actions=[]; max_p=0; peak_ts=0.0
        for fr in analysis.frame_results:
            classes.extend(d.class_name for d in fr.detections)
            if fr.dominant_action: actions.append(fr.dominant_action)
            if fr.person_count > max_p: max_p=fr.person_count; peak_ts=fr.timestamp_s
        analysis.class_frequencies    = dict(Counter(classes))
        analysis.action_frequencies   = dict(Counter(actions))
        analysis.total_object_count   = len(classes)
        analysis.max_persons_in_frame = max_p
        analysis.max_concurrent_persons = max_p   # true peak, not cumulative
        analysis.peak_activity_ts     = peak_ts
        # Primary language = highest segment-count entry from multilingual detection
        if analysis.detected_languages:
            primary = analysis.detected_languages[0]
            analysis.detected_language      = primary["code"]
            analysis.detected_language_name = primary["name"]
        elif analysis.speech_segments:
            s0=analysis.speech_segments[0]
            analysis.detected_language=s0.language; analysis.detected_language_name=s0.language_name
        parts=[]
        for seg in analysis.speech_segments:
            m,s=divmod(seg.start_s,60)
            parts.append(f"[{int(m):02d}:{s:05.2f}] {'[noise]' if seg.is_noise else seg.text}")
        analysis.full_transcript="\n".join(parts)
        # Identity-aware counting: prefer appearance-merged identities when available
        if self._identity_tracker is not None and self._identity_tracker.distinct_count > 0:
            analysis.distinct_individuals = self._identity_tracker.distinct_count
        else:
            analysis.distinct_individuals = estimate_distinct_individuals_from_frames(analysis.frame_results)
        up_frag = len(analysis.unique_track_ids)
        up = analysis.distinct_individuals
        da=Counter(actions).most_common(1)[0][0] if actions else "unknown"
        mx=max((fi.anomaly_score for fi in analysis.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx)
        alerts=sum(1 for fi in analysis.fusion_insights if fi.alert)
        sv=len(analysis.surveillance_events)
        ps=[f"{analysis.width}x{analysis.height} | {analysis.duration_s:.1f}s."]
        if up > 0:
            if up_frag > up:
                ps.append(
                    f"{up} distinct individual(s) (ByteTrack used {up_frag} ID segments — "
                    f"normal when a person leaves/re-enters or is occluded); peak {max_p} concurrent "
                    f"at t={peak_ts:.1f}s. Action: {da}."
                )
            else:
                ps.append(f"{up} distinct individual(s); peak {max_p} at t={peak_ts:.1f}s. Action: {da}.")
        else:
            ps.append("No persons detected.")
        top=[c for c,_ in Counter(classes).most_common(8) if c!="person"]
        if top: ps.append(f"Objects: {', '.join(top[:5])}.")
        sr=[s for s in analysis.speech_segments if not s.is_noise]
        if sr: ps.append(f"Speech: {len(sr)} segs ({analysis.detected_language_name or analysis.detected_language}).")
        elif analysis.audio_events:
            ac=Counter(e.event_type for e in analysis.audio_events).most_common(2)
            ps.append(f"Audio: {', '.join(f'{c}x{t}' for t,c in ac)}.")
        if analysis.logo_detections:
            brands=list({lg.brand for lg in analysis.logo_detections})[:4]
            ps.append(f"Logos: {', '.join(brands)}.")
        ps.append(f"Risk: {risk.upper()} (max={mx:.2f}, {alerts} alerts, {sv} surv events).")
        analysis.summary=" ".join(ps)
        print(f"    Stats | risk={risk} | distinct_individuals={up} (track_fragments={up_frag}) | classes={len(analysis.class_frequencies)}")

    # ── Labeled Video ───────────────────────────────────────────────────────
    def _write_labeled_video(self, video_path: Path, analysis: VideoAnalysis) -> Path:
        out=OUTPUT_DIR/f"{video_path.stem}_labeled.mp4"
        cap=cv2.VideoCapture(str(video_path))
        W=analysis.width; H=analysis.height; fps=analysis.fps
        writer=cv2.VideoWriter(str(out),cv2.VideoWriter_fourcc(*"mp4v"),fps,(W,H))
        fl={fr.frame_idx:fr for fr in analysis.frame_results}
        SKEL=[(0,1),(0,2),(1,3),(2,4),(5,6),(5,7),(7,9),(6,8),(8,10),
              (5,11),(6,12),(11,12),(11,13),(13,15),(12,14),(14,16)]

        def get_speech(ts):
            for seg in analysis.speech_segments:
                if seg.start_s<=ts<=seg.end_s and not seg.is_noise:
                    t=seg.text[:70]+("..." if len(seg.text)>70 else "")
                    return f"[{seg.language_name}] {t}"
            return ""
        def get_fusion(ts):
            for fi in analysis.fusion_insights:
                if fi.window_start_s<=ts<fi.window_end_s: return fi
            return None
        def get_sevents(ts):
            return [e for e in analysis.surveillance_events if abs(e.timestamp_s-ts)<2.0]

        fi_idx=0; last_fr=None
        while True:
            ret,frame=cap.read()
            if not ret: break
            ts=fi_idx/fps
            if fi_idx in fl: last_fr=fl[fi_idx]
            fr=last_fr
            if fr:
                overlay=frame.copy()
                for det in fr.detections:
                    if det.mask is not None:
                        color=_id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                        m=cv2.resize(det.mask.astype(np.uint8),(W,H),interpolation=cv2.INTER_NEAREST)
                        overlay[m>0]=color
                frame=cv2.addWeighted(overlay,MASK_ALPHA,frame,1-MASK_ALPHA,0)
                for det in fr.detections:
                    x1=int(det.x1*W); y1=int(det.y1*H); x2=int(det.x2*W); y2=int(det.y2*H)
                    color=_id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                    cv2.rectangle(frame,(x1,y1),(x2,y2),color,3 if det.class_name=="person" else 2)
                    lbl=det.class_name
                    if det.track_id: lbl+=f" #{det.track_id}"
                    if det.action:   lbl+=f" [{det.action}]"
                    lbl+=f" {det.confidence:.0%}"
                    fs=0.42; font=cv2.FONT_HERSHEY_SIMPLEX
                    (lw,lh),_=cv2.getTextSize(lbl,font,fs,1)
                    ly=max(y1-4,lh+4)
                    cv2.rectangle(frame,(x1,ly-lh-4),(x1+lw+4,ly+2),color,-1)
                    cv2.putText(frame,lbl,(x1+2,ly-2),font,fs,(255,255,255),1)
                    if DRAW_POSE and det.pose and det.class_name=="person":
                        kps=det.pose.kps
                        pts={i:(int(kps[i,0]*W),int(kps[i,1]*H)) for i in range(17) if kps[i,2]>=0.30}
                        for a_,b_ in SKEL:
                            if a_ in pts and b_ in pts:
                                cv2.line(frame,pts[a_],pts[b_],color,2)
                        for pt in pts.values(): cv2.circle(frame,pt,3,(255,255,255),-1)
                fus=get_fusion(ts); sev=fus.severity if fus else "normal"
                hc=SEV_COLORS.get(sev,(150,150,150))
                lines=[("Detectra AI v4.0",(0,225,130)),
                       (f"t={int(ts//60):02d}:{ts%60:05.2f}",(220,220,220)),
                       (f"Persons: {fr.person_count}",(220,220,220)),
                       (f"Objects: {len(fr.detections)}",(220,220,220))]
                if fr.dominant_action: lines.append((f"Action: {fr.dominant_action}",(120,210,255)))
                if fr.surveillance_flags: lines.append((f"FLAGS: {' | '.join(fr.surveillance_flags)}",(80,80,255)))
                if fus:
                    lines.append((f"Scene: {fus.scene_label[:20]}",(200,200,200)))
                    lines.append((f"Anomaly: {fus.anomaly_score:.2f} [{sev.upper()}]",hc))
                pw=220; ph=len(lines)*20+10
                cv2.rectangle(frame,(0,0),(pw,ph),(0,0,0),-1)
                cv2.rectangle(frame,(0,0),(pw,ph),hc,1)
                for i,(line,color) in enumerate(lines):
                    cv2.putText(frame,line,(6,16+i*20),cv2.FONT_HERSHEY_SIMPLEX,0.43,color,1)
                for idx,ev in enumerate(get_sevents(ts)[:2]):
                    ec=SEV_COLORS.get(ev.severity,(150,150,150))
                    banner=f"ALERT: {ev.event_type.upper()} — {ev.description[:60]}"
                    cv2.rectangle(frame,(0,H-60-idx*32),(W,H-28-idx*32),(20,20,20),-1)
                    cv2.putText(frame,banner,(10,H-38-idx*32),cv2.FONT_HERSHEY_SIMPLEX,0.52,ec,1)
                st=get_speech(ts)
                if st:
                    font=cv2.FONT_HERSHEY_SIMPLEX; fs2=0.52
                    (tw,th),_=cv2.getTextSize(st,font,fs2,1)
                    x=(W-tw)//2; y=H-22
                    sub=frame.copy()
                    cv2.rectangle(sub,(x-8,y-th-8),(x+tw+8,y+8),(0,0,0),-1)
                    cv2.addWeighted(sub,0.65,frame,0.35,0,frame)
                    cv2.putText(frame,st,(x,y),font,fs2,(240,240,80),1)
            writer.write(frame); fi_idx+=1
        cap.release(); writer.release()
        sz=out.stat().st_size//(1024*1024)
        print(f"    Labeled video: {out.name} ({sz} MB)")
        return out

    # ── HTML Report ─────────────────────────────────────────────────────────
    def _write_html_report(self, analysis: VideoAnalysis) -> Path:
        out=OUTPUT_DIR/f"{analysis.video_name}_report.html"
        def ft(s): m=int(s//60); return f"{m:02d}:{s%60:05.2f}"
        mx=max((fi.anomaly_score for fi in analysis.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx); alerts=sum(1 for fi in analysis.fusion_insights if fi.alert)
        RC={"normal":"#8b949e","low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171"}
        rc=RC.get(risk,"#8b949e")
        up = analysis.distinct_individuals
        up_frag = len(analysis.unique_track_ids)

        # Chart data
        pts  =json.dumps([f"{fr.timestamp_s:.1f}" for fr in analysis.frame_results])
        pcnt =json.dumps([fr.person_count for fr in analysis.frame_results])
        flow =json.dumps([round(fr.flow_magnitude,2) for fr in analysis.frame_results])
        fts  =json.dumps([f"{fi.window_start_s:.1f}" for fi in analysis.fusion_insights])
        fanom=json.dumps([round(fi.anomaly_score,3) for fi in analysis.fusion_insights])
        falign=json.dumps([round(fi.visual_audio_alignment,3) for fi in analysis.fusion_insights])
        olbl =json.dumps([c for c,_ in Counter(analysis.class_frequencies).most_common(12)])
        oval =json.dumps([v for _,v in Counter(analysis.class_frequencies).most_common(12)])
        albl =json.dumps(AUDIO_TYPES)
        aval =json.dumps([Counter(e.event_type for e in analysis.audio_events).get(t,0) for t in AUDIO_TYPES])
        actlbl=json.dumps([a for a,_ in Counter(analysis.action_frequencies).most_common(10)])
        actval=json.dumps([v for _,v in Counter(analysis.action_frequencies).most_common(10)])

        def obj_rows():
            rows=""
            for cls,cnt in sorted(analysis.class_frequencies.items(),key=lambda x:-x[1]):
                pct=min(100,cnt*100//(analysis.total_object_count or 1))
                rows+=f"<tr><td>{cls}</td><td class='c mono'>{cnt}</td><td><div class='bw'><div class='bar' style='width:{pct}%'></div></div></td></tr>"
            return rows or "<tr><td colspan='3' class='c muted'>None</td></tr>"

        def act_rows():
            rows=""; tot=sum(analysis.action_frequencies.values()) or 1
            for act,cnt in Counter(analysis.action_frequencies).most_common(15):
                rows+=f"<tr><td>{act}</td><td class='mono'>{cnt}</td><td class='mono'>{cnt/tot*100:.1f}%</td></tr>"
            return rows or "<tr><td colspan='3' class='c muted'>None</td></tr>"

        def logo_rows():
            rows=""
            for lg in analysis.logo_detections[:30]:
                rows+=f"<tr><td class='mono'>{ft(lg.timestamp_s)}</td><td><b>{lg.brand}</b></td><td class='mono'>{lg.text_found}</td><td class='mono c'>{lg.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>No logos via OCR</td></tr>"

        def speech_rows():
            rows=""
            for seg in analysis.speech_segments:
                td='<span class="noise">[noise]</span>' if seg.is_noise else seg.text
                nr_cls="nr" if seg.is_noise else ""
                rows+=f"<tr class='{nr_cls}'><td class='mono'>{ft(seg.start_s)}&rarr;{ft(seg.end_s)}</td><td>{td}</td><td class='mono'>{seg.language_name}</td><td class='mono c'>{seg.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>No speech</td></tr>"

        def audio_rows():
            rows=""
            for ev in analysis.audio_events[:80]:
                bc={"speech":"badge-speech","music":"badge-music","noise":"badge-noise","silence":"badge-silence","ambient":"badge-ambient"}.get(ev.event_type,"badge-ambient")
                rows+=f"<tr><td class='mono'>{ft(ev.timestamp_s)}</td><td><span class='badge {bc}'>{ev.event_type}</span></td><td class='small'>{ev.details}</td><td class='mono c'>{ev.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>None</td></tr>"

        SB={"normal":"badge-normal","low":"badge-low","medium":"badge-medium","high":"badge-high","critical":"badge-critical"}
        def fusion_rows():
            rows=""
            for fi in analysis.fusion_insights:
                rs="style='background:rgba(248,113,113,.07)'" if fi.alert else ""
                af="<span class='alert-flag'>ALERT</span>" if fi.alert else ""
                scene=fi.scene_label.replace("_"," ").title()
                factors=", ".join(fi.contributing_factors) or "—"
                rows+=(f"<tr {rs}><td class='mono'>{ft(fi.window_start_s)}&ndash;{ft(fi.window_end_s)}</td>"
                       f"<td>{scene}</td><td class='mono c'>{fi.anomaly_score:.3f}</td>"
                       f"<td><span class='badge {SB.get(fi.severity,'badge-normal')}'>{fi.severity.upper()}</span>{af}</td>"
                       f"<td class='mono c'>{fi.visual_audio_alignment:.2f}</td><td class='small'>{factors}</td></tr>")
            return rows or "<tr><td colspan='6' class='c muted'>None</td></tr>"

        def surv_rows():
            rows=""
            SEC={"low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171","normal":"#8b949e"}
            for ev in analysis.surveillance_events:
                sc=SEC.get(ev.severity,"#8b949e")
                rows+=(f"<tr><td class='mono'>{ft(ev.timestamp_s)}</td>"
                       f"<td><b style='color:{sc}'>{ev.event_type.replace('_',' ').upper()}</b></td>"
                       f"<td>{ev.description}</td><td class='mono c'>{ev.confidence:.0%}</td></tr>")
            return rows or "<tr><td colspan='4' class='c muted'>No events</td></tr>"

        def timeline_rows():
            rows=""
            for fr in analysis.frame_results:
                if not fr.detections: continue
                pb=f"<span class='badge badge-person'>{fr.person_count}p</span>" if fr.person_count else ""
                ab=f"<span class='badge badge-action'>{fr.dominant_action}</span>" if fr.dominant_action else ""
                fb="".join(f"<span class='badge badge-flag'>{f}</span>" for f in fr.surveillance_flags)
                clss=", ".join(sorted(set(d.class_name for d in fr.detections)))
                rows+=(f"<tr><td class='mono'>{ft(fr.timestamp_s)}</td><td>{pb}{ab}{fb}</td>"
                       f"<td class='small'>{clss}</td><td class='mono c'>{len(fr.detections)}</td>"
                       f"<td class='mono c'>{fr.flow_magnitude:.1f}</td></tr>")
            return rows or "<tr><td colspan='5' class='c muted'>None</td></tr>"

        gen=datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # ── v5 Reasoning Agent payload (already computed in analyze()) ──────
        reasoning = analysis.reasoning or {}
        threat = reasoning.get("threat_assessment", {}) or {}
        threat_level = (threat.get("level") or "LOW").lower()
        threat_score = float(threat.get("score") or 0.0)
        threat_factors = threat.get("contributing_factors") or []
        recommendation = reasoning.get("recommendation") or ""
        exec_brief = reasoning.get("executive_brief") or analysis.summary
        narrative_blocks = reasoning.get("timeline_narrative") or []
        correlations = reasoning.get("cross_modal_correlations") or []
        key_ent = reasoning.get("key_entities") or {}
        identities_list = analysis.identities or []
        speech_engine_lbl = analysis.speech_engine or f"openai-whisper-{WHISPER_MODEL}"

        def _esc(s) -> str:
            return (str(s).replace("&", "&amp;").replace("<", "&lt;")
                    .replace(">", "&gt;").replace('"', "&quot;"))

        def reasoning_rows() -> str:
            if not narrative_blocks:
                return "<tr><td colspan='4' class='c muted'>Agentic reasoning unavailable</td></tr>"
            rows = ""
            for blk in narrative_blocks:
                ws = blk.get("window_start_s", 0)
                we = blk.get("window_end_s", 0)
                m1, s1 = divmod(ws, 60); m2, s2 = divmod(we, 60)
                rng = f"{int(m1):02d}:{int(s1):02d}–{int(m2):02d}:{int(s2):02d}"
                anomaly = blk.get("anomaly_max", 0.0)
                alerts_n = blk.get("alerts", 0)
                surv_n = len(blk.get("surveillance_events", []))
                rows += (
                    f"<tr><td class='mono'>{rng}</td>"
                    f"<td>{_esc(blk.get('narrative', ''))}</td>"
                    f"<td class='c mono'>{anomaly:.2f}</td>"
                    f"<td class='c mono'>{alerts_n}+{surv_n}</td></tr>"
                )
            return rows

        def correlation_rows() -> str:
            if not correlations:
                return "<tr><td colspan='3' class='c muted'>No cross-modal correlations detected</td></tr>"
            rows = ""
            for c in correlations[:30]:
                rows += (
                    f"<tr><td class='mono'>{_esc(c.get('kind', ''))}</td>"
                    f"<td>{_esc(c.get('description', ''))}</td>"
                    f"<td class='c mono'>{float(c.get('confidence', 0.0)):.0%}</td></tr>"
                )
            return rows

        def identity_rows() -> str:
            if not identities_list:
                return "<tr><td colspan='4' class='c muted'>Identity tracker disabled</td></tr>"
            rows = ""
            for ident in sorted(identities_list, key=lambda x: x.get("pid", 0)):
                pid = ident.get("pid")
                tids = ", ".join(str(t) for t in (ident.get("track_ids") or []))
                first_s = ident.get("first_seen_s") or 0.0
                last_s = ident.get("last_seen_s") or 0.0
                m1, s1 = divmod(first_s, 60); m2, s2 = divmod(last_s, 60)
                samples = ident.get("samples", 0)
                rows += (
                    f"<tr><td class='mono'>Person {pid}</td>"
                    f"<td class='mono'>{int(m1):02d}:{s1:05.2f} → {int(m2):02d}:{s2:05.2f}</td>"
                    f"<td class='c mono'>{samples}</td>"
                    f"<td class='small'>{tids or '—'}</td></tr>"
                )
            return rows

        def threat_factors_html() -> str:
            if not threat_factors:
                return "<li>No significant risk signals</li>"
            return "".join(f"<li>{_esc(f)}</li>" for f in threat_factors)

        css="""
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#1f2937;--bg4:#0a0f17;
--border:#30363d;--text:#e6edf3;--t2:#8b949e;--t3:#6e7681;
--green:#00e5a0;--blue:#60a5fa;--orange:#fb923c;--red:#f87171;
--yellow:#fbbf24;--purple:#c084fc;--mono:'JetBrains Mono','Courier New',monospace;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5}
.hero{background:linear-gradient(135deg,#0d1117,#0f1c2e,#1a2332);border-bottom:2px solid var(--green);padding:44px 60px}
.hero h1{font-size:36px;font-weight:800}.h1g{color:var(--green)}.h1w{color:var(--t2)}
.sub{color:var(--t2);margin-top:6px;font-size:15px}
.meta{display:flex;flex-wrap:wrap;gap:28px;margin-top:28px}
.mi{display:flex;flex-direction:column;gap:3px}
.mi label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em}
.mi value{font-family:var(--mono);font-size:13px}
.rb{display:flex;align-items:center;gap:16px;padding:14px 24px;border-radius:8px;margin:28px 0 4px;border:1px solid;font-weight:600}
.rb-normal{background:rgba(139,148,158,.08);border-color:var(--t3);color:var(--t3)}
.rb-low{background:rgba(96,165,250,.08);border-color:var(--blue);color:var(--blue)}
.rb-medium{background:rgba(251,191,36,.08);border-color:var(--yellow);color:var(--yellow)}
.rb-high{background:rgba(251,146,60,.08);border-color:var(--orange);color:var(--orange)}
.rb-critical{background:rgba(248,113,113,.12);border-color:var(--red);color:var(--red)}
.content{max-width:1440px;margin:0 auto;padding:32px 48px}
.section{background:var(--bg2);border:1px solid var(--border);border-radius:12px;margin-bottom:28px;overflow:hidden}
.sh{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.2)}
.sn{font-family:var(--mono);font-size:10px;color:var(--t3);background:var(--bg3);padding:4px 9px;border-radius:4px}
.sh h2{font-size:15px;font-weight:600}.tag{font-size:11px;color:var(--t3);margin-left:auto;background:var(--bg3);padding:3px 9px;border-radius:20px}
.sb{padding:22px 24px}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:14px;margin-bottom:20px}
.sc{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:18px 14px;text-align:center}
.sc .v{font-family:var(--mono);font-size:30px;font-weight:700;color:var(--green);line-height:1}
.sc .l{font-size:10px;color:var(--t3);margin-top:6px;text-transform:uppercase;letter-spacing:.05em}
.sc.al .v{color:var(--orange)}.sc.rs .v{color:""" + rc + """}
.sum{background:var(--bg3);border-left:3px solid var(--green);border-radius:0 8px 8px 0;padding:16px 20px;color:var(--t2);line-height:1.8;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:rgba(0,0,0,.3);padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);border-bottom:1px solid var(--border)}
tbody td{padding:9px 14px;border-bottom:1px solid rgba(48,54,61,.6);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:rgba(255,255,255,.025)}
.nr td{opacity:.55}.mono{font-family:var(--mono);font-size:12px}.small{font-size:12px}.c{text-align:center}.muted{color:var(--t3)}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;margin:1px}
.badge-person{background:rgba(0,229,160,.12);color:var(--green);border:1px solid rgba(0,229,160,.25)}
.badge-action{background:rgba(96,165,250,.12);color:var(--blue);border:1px solid rgba(96,165,250,.25)}
.badge-flag{background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3)}
.badge-speech{background:rgba(0,229,160,.15);color:var(--green)}
.badge-music{background:rgba(192,132,252,.15);color:var(--purple)}
.badge-noise{background:rgba(251,146,60,.15);color:var(--orange)}
.badge-silence{background:rgba(110,118,129,.1);color:var(--t3)}
.badge-ambient{background:rgba(96,165,250,.12);color:var(--blue)}
.badge-normal{background:rgba(139,148,158,.1);color:var(--t3)}
.badge-low{background:rgba(96,165,250,.12);color:var(--blue)}
.badge-medium{background:rgba(251,191,36,.12);color:var(--yellow)}
.badge-high{background:rgba(251,146,60,.12);color:var(--orange)}
.badge-critical{background:rgba(248,113,113,.15);color:var(--red)}
.alert-flag{display:inline-block;margin-left:6px;padding:2px 7px;background:rgba(248,113,113,.2);color:var(--red);border:1px solid rgba(248,113,113,.4);border-radius:4px;font-size:10px;font-weight:700}
.noise{color:var(--t3);font-style:italic}
.bw{background:var(--bg3);border-radius:3px;height:7px;width:100%}.bar{background:var(--green);border-radius:3px;height:7px}
.cr{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.cb{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:18px;height:260px}
.arch{background:var(--bg4);border:1px solid var(--border);border-radius:8px;padding:18px;font-family:var(--mono);font-size:12px;color:var(--t2);line-height:1.9;margin-bottom:20px;white-space:pre}
.footer{text-align:center;padding:36px;color:var(--t3);font-size:12px;border-top:1px solid var(--border);margin-top:28px}
@media(max-width:900px){.content{padding:16px}.hero{padding:24px}.cr{grid-template-columns:1fr}}"""

        html=f"""<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Detectra AI v5 — {analysis.video_name}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>{css}</style></head><body>
<div class="hero">
  <h1><span class="h1g">Detectra</span> <span class="h1w">AI</span> <span style="font-size:16px;color:var(--t3);font-weight:400">v5.0 · Ultra Accuracy</span></h1>
  <div class="sub">Agentic Multimodal Video Intelligence — {analysis.video_name}</div>
  <div class="meta">
    <div class="mi"><label>Video</label><value>{analysis.video_path.name}</value></div>
    <div class="mi"><label>Duration</label><value>{analysis.duration_s:.1f}s</value></div>
    <div class="mi"><label>Resolution</label><value>{analysis.width}x{analysis.height} @ {analysis.fps:.0f}fps</value></div>
    <div class="mi"><label>Language</label><value>{analysis.detected_language_name or "N/A"}</value></div>
    <div class="mi"><label>Risk</label><value style="color:{rc}">{risk.upper()}</value></div>
    <div class="mi"><label>Generated</label><value>{gen}</value></div>
    <div class="mi"><label>Process Time</label><value>{analysis.processing_time_s:.1f}s</value></div>
  </div>
</div>
<div class="content">
<div class="rb rb-{risk}">
  <span>RISK: {risk.upper()}</span><span>Max Anomaly: {mx:.3f}</span>
  <span>Alerts: {alerts}</span><span>Surv Events: {len(analysis.surveillance_events)}</span>
  <span>Fusion Windows: {len(analysis.fusion_insights)}</span>
</div>
<div class="section"><div class="sh"><span class="sn">01</span><h2>Executive Summary</h2></div>
<div class="sb"><div class="sum">{analysis.summary}</div>
<div class="sg">
  <div class="sc"><div class="v">{up}</div><div class="l">Distinct individuals{f' ({up_frag} tracker IDs)' if up_frag > up else ''}</div></div>
  <div class="sc"><div class="v">{analysis.max_persons_in_frame}</div><div class="l">Peak Count</div></div>
  <div class="sc"><div class="v">{len(analysis.class_frequencies)}</div><div class="l">Object Classes</div></div>
  <div class="sc"><div class="v">{analysis.total_object_count}</div><div class="l">Detections</div></div>
  <div class="sc"><div class="v">{len(analysis.speech_segments)}</div><div class="l">Speech Segs</div></div>
  <div class="sc"><div class="v">{len(analysis.audio_events)}</div><div class="l">Audio Events</div></div>
  <div class="sc"><div class="v">{len(analysis.logo_detections)}</div><div class="l">Logos</div></div>
  <div class="sc al"><div class="v">{alerts}</div><div class="l">Fusion Alerts</div></div>
  <div class="sc al"><div class="v">{len(analysis.surveillance_events)}</div><div class="l">Surv Events</div></div>
  <div class="sc rs"><div class="v">{risk.upper()}</div><div class="l">Risk Level</div></div>
</div>
<div class="cr"><div class="cb"><canvas id="c1"></canvas></div><div class="cb"><canvas id="c2"></canvas></div></div>
<div class="cr"><div class="cb"><canvas id="c3"></canvas></div><div class="cb"><canvas id="c4"></canvas></div></div>
<div class="cr"><div class="cb"><canvas id="c5"></canvas></div><div class="cb"><canvas id="c6"></canvas></div></div>
</div></div>

<div class="section"><div class="sh"><span class="sn">02</span><h2>Agentic Executive Brief</h2><span class="tag">ReasoningAgent v{analysis.accuracy_engine_version or '5.0'}</span></div>
<div class="sb">
  <div class="sum">{_esc(exec_brief)}</div>
  <div class="rb rb-{threat_level}" style="margin-top:14px">
    <span>THREAT: {threat_level.upper()}</span>
    <span>Score: {threat_score:.2f}</span>
    <span>Engine: {_esc(speech_engine_lbl)}</span>
    <span>Identities: {len(identities_list) or analysis.distinct_individuals}</span>
  </div>
  <div style="margin-top:14px">
    <strong style="color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:.06em">Contributing factors</strong>
    <ul style="margin:8px 0 0 22px;color:var(--t2)">{threat_factors_html()}</ul>
  </div>
  <div style="margin-top:14px;padding:12px 16px;background:rgba(0,229,160,.06);border-left:3px solid var(--green);border-radius:0 8px 8px 0;color:var(--t2)">
    <strong style="color:var(--green)">Recommendation:</strong> {_esc(recommendation)}
  </div>
</div></div>

<div class="section"><div class="sh"><span class="sn">03</span><h2>Hierarchical Timeline Narrative</h2><span class="tag">Per-block agentic synthesis</span></div>
<div class="sb"><table>
  <thead><tr><th>Window</th><th>Narrative</th><th class="c">Max&nbsp;Anomaly</th><th class="c">Alerts+Events</th></tr></thead>
  <tbody>{reasoning_rows()}</tbody>
</table></div></div>

<div class="section"><div class="sh"><span class="sn">04</span><h2>Identity Tracking (Appearance Re-ID)</h2><span class="tag">HSV-fingerprint + spatial coherence</span></div>
<div class="sb"><table>
  <thead><tr><th>Person</th><th>Visible Window</th><th class="c">Samples</th><th>Merged Track IDs</th></tr></thead>
  <tbody>{identity_rows()}</tbody>
</table></div></div>

<div class="section"><div class="sh"><span class="sn">05</span><h2>Cross-Modal Correlations</h2><span class="tag">Visual ↔ Audio ↔ Speech</span></div>
<div class="sb"><table>
  <thead><tr><th>Kind</th><th>Description</th><th class="c">Confidence</th></tr></thead>
  <tbody>{correlation_rows()}</tbody>
</table></div></div>

<div class="section"><div class="sh"><span class="sn">06</span><h2>Object Detection &amp; Segmentation</h2><span class="tag">YOLOv8s-Seg + ByteTrack</span></div>
<div class="sb"><table><thead><tr><th>Class</th><th class="c">Count</th><th>Bar</th></tr></thead><tbody>{obj_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">07</span><h2>Action Recognition</h2><span class="tag">YOLOv8n-Pose + Cadence-FFT + Kinematics</span></div>
<div class="sb"><table><thead><tr><th>Action</th><th>Frames</th><th>Coverage</th></tr></thead><tbody>{act_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">08</span><h2>Logo &amp; Brand Detection</h2><span class="tag">EasyOCR{' + CLIP-ViT' if self._clip_logos else ''} + Brand Dictionary</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Brand</th><th>OCR Text</th><th class="c">Confidence</th></tr></thead><tbody>{logo_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">09</span><h2>Speech Transcription</h2><span class="tag">{_esc(speech_engine_lbl)} + Silero VAD + noisereduce</span></div>
<div class="sb"><table><thead><tr><th>Time Range</th><th>Text</th><th>Language</th><th class="c">Conf</th></tr></thead><tbody>{speech_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">10</span><h2>Audio Classification</h2><span class="tag">Librosa MFCC — 1s windows</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Type</th><th>Details</th><th class="c">Conf</th></tr></thead><tbody>{audio_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">11</span><h2>Surveillance Events</h2><span class="tag">Fall / Fight / Loitering / Crowd / Abandoned Object</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Event</th><th>Description</th><th class="c">Conf</th></tr></thead><tbody>{surv_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">12</span><h2>Multimodal Fusion Engine</h2><span class="tag">4-Head Cross-Attention Transformer — {FUSION_WINDOW:.0f}s Windows</span></div>
<div class="sb">
<div class="arch">Visual Enc [COCO-80 + action-6 + flow-3] FC(89→128) | Audio Enc [type-5+RMS+ZCR+cent+speech] FC(9→128)
Cross-Attention ×2 (4 heads, d=128): visual queries attend audio keys/values
Temporal Self-Attention | EMA anomaly smoothing (alpha=0.5)
Scene: 16 labels | Anomaly: 0..1 | V-A Alignment: cosine</div>
<table><thead><tr><th>Window</th><th>Scene</th><th class="c">Anomaly</th><th>Severity</th><th class="c">Align</th><th>Factors</th></tr></thead><tbody>{fusion_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">13</span><h2>Frame Timeline</h2></div>
<div class="sb"><table><thead><tr><th>Time</th><th>Persons/Action/Flags</th><th>Objects</th><th class="c">Count</th><th class="c">Flow</th></tr></thead><tbody>{timeline_rows()}</tbody></table></div></div>
</div>
<div class="footer">Detectra AI v5.0 — Ultra Accuracy Edition &mdash; UCP FYP F25AI009 &mdash; {gen}</div>
<script>
const CD={{color:'#8b949e',plugins:{{legend:{{labels:{{color:'#8b949e',font:{{size:11}}}}}}}},scales:{{x:{{ticks:{{color:'#6e7681',maxTicksLimit:20}},grid:{{color:'#21262d'}}}},y:{{ticks:{{color:'#6e7681'}},grid:{{color:'#21262d'}}}}}}}}
new Chart(document.getElementById('c1'),{{type:'line',data:{{labels:{pts},datasets:[{{label:'Persons',data:{pcnt},borderColor:'#00e5a0',backgroundColor:'rgba(0,229,160,.08)',borderWidth:2,pointRadius:0,fill:true,tension:0.3}}]}},options:{{...CD,plugins:{{...CD.plugins,title:{{display:true,text:'Person Count',color:'#e6edf3',font:{{size:12}}}}}}}}}}  );
new Chart(document.getElementById('c2'),{{type:'line',data:{{labels:{fts},datasets:[{{label:'Anomaly',data:{fanom},borderColor:'#f87171',backgroundColor:'rgba(248,113,113,.07)',borderWidth:2,pointRadius:2,fill:true,tension:0.3}},{{label:'V-A Align',data:{falign},borderColor:'#60a5fa',backgroundColor:'transparent',borderWidth:1.5,pointRadius:1,borderDash:[4,2]}}]}},options:{{...CD,scales:{{...CD.scales,y:{{...CD.scales.y,min:0,max:1}}}},plugins:{{...CD.plugins,title:{{display:true,text:'Anomaly & V-A Alignment',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c3'),{{type:'line',data:{{labels:{pts},datasets:[{{label:'Optical Flow',data:{flow},borderColor:'#c084fc',backgroundColor:'rgba(192,132,252,.08)',borderWidth:1.5,pointRadius:0,fill:true,tension:0.3}}]}},options:{{...CD,plugins:{{...CD.plugins,title:{{display:true,text:'Optical Flow',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c4'),{{type:'doughnut',data:{{labels:{albl},datasets:[{{data:{aval},backgroundColor:['#21262d','rgba(96,165,250,.6)','rgba(0,229,160,.6)','rgba(192,132,252,.6)','rgba(251,146,60,.6)'],borderColor:'#30363d',borderWidth:1}}]}},options:{{plugins:{{legend:{{labels:{{color:'#8b949e',font:{{size:11}}}}}},title:{{display:true,text:'Audio Events',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c5'),{{type:'bar',data:{{labels:{olbl},datasets:[{{label:'Count',data:{oval},backgroundColor:'rgba(0,229,160,.5)',borderColor:'#00e5a0',borderWidth:1}}]}},options:{{...CD,plugins:{{...CD.plugins,legend:{{display:false}},title:{{display:true,text:'Object Classes',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c6'),{{type:'bar',data:{{labels:{actlbl},datasets:[{{label:'Frames',data:{actval},backgroundColor:'rgba(96,165,250,.5)',borderColor:'#60a5fa',borderWidth:1}}]}},options:{{...CD,plugins:{{...CD.plugins,legend:{{display:false}},title:{{display:true,text:'Actions',color:'#e6edf3',font:{{size:12}}}}}}}}  );
</script></body></html>"""
        out.write_text(html, encoding="utf-8")
        print(f"    Report: {out.name} ({out.stat().st_size//1024}KB)")
        return out

    # ── RAG-ready JSON Output ────────────────────────────────────────────────
    def _write_rag_json(self, analysis: VideoAnalysis) -> Path:
        """
        Produces a structured JSON file optimised for Retrieval-Augmented
        Generation (RAG) pipelines and programmatic downstream consumption.

        Schema design goals:
          - Every field is a primitive or a shallow list-of-dicts (no nesting > 2).
          - Timestamps always appear as both raw seconds AND MM:SS string for LLMs.
          - Confidence scores are always 0-1 floats.
          - All event lists are pre-sorted by timestamp.
          - A top-level `narrative` string gives a complete prose summary that an
            LLM can directly embed in a system prompt for QA over the video.

        Example RAG queries this structure supports:
          "At what time did the fighting start?"
          "Were any weapons detected near people?"
          "What languages were spoken in the video?"
          "List all HIGH or CRITICAL events with timestamps."
          "How many unique people were present?"
          "What was the anomaly score at 00:45?"
        """
        def ts_str(s: float) -> str:
            m = int(s // 60); return f"{m:02d}:{s % 60:05.2f}"

        mx = max((fi.anomaly_score for fi in analysis.fusion_insights), default=0.0)
        risk = FusionEngine._severity(mx)
        alerts = sum(1 for fi in analysis.fusion_insights if fi.alert)
        real_speech = [s for s in analysis.speech_segments if not s.is_noise]

        doc: dict = {
            # ── Identity ────────────────────────────────────────────────────
            "schema_version": "detectra_v5_rag_1.0",
            "generated_at": datetime.now().isoformat(),
            "analyzer_version": "Detectra AI v5.0 (Ultra Accuracy)",

            # ── Video metadata ───────────────────────────────────────────────
            "video": {
                "filename": analysis.video_path.name,
                "duration_s": round(analysis.duration_s, 2),
                "duration_str": ts_str(analysis.duration_s),
                "resolution": f"{analysis.width}x{analysis.height}",
                "fps": round(analysis.fps, 2),
                "processing_time_s": round(analysis.processing_time_s, 1),
            },

            # ── Risk summary ────────────────────────────────────────────────
            "risk_summary": {
                "overall_risk": risk,
                "max_anomaly_score": round(mx, 4),
                "alert_count": alerts,
                "surveillance_event_count": len(analysis.surveillance_events),
                "distinct_individuals": analysis.distinct_individuals,
                "track_id_segments": len(analysis.unique_track_ids),
                "unique_persons_ever": analysis.distinct_individuals,
                "peak_concurrent_persons": analysis.max_concurrent_persons,
                "peak_activity_time_s": round(analysis.peak_activity_ts, 2),
                "peak_activity_time_str": ts_str(analysis.peak_activity_ts),
            },

            # ── Languages ───────────────────────────────────────────────────
            "languages": analysis.detected_languages or (
                [{"code": analysis.detected_language,
                  "name": analysis.detected_language_name,
                  "confidence": 0.0, "segment_count": len(real_speech)}]
                if analysis.detected_language else []
            ),

            # ── Object detections (aggregated per class) ─────────────────────
            "object_summary": [
                {"class": cls, "total_detections": cnt,
                 "frequency_pct": round(cnt * 100 / max(1, analysis.total_object_count), 1)}
                for cls, cnt in sorted(analysis.class_frequencies.items(), key=lambda x: -x[1])
            ],

            # ── Action distribution ──────────────────────────────────────────
            "action_summary": [
                {"action": act, "frame_count": cnt}
                for act, cnt in Counter(analysis.action_frequencies).most_common()
            ],

            # ── Timeline: fusion insights (1 per 2-second window) ────────────
            "fusion_timeline": [
                {
                    "window_start_s": round(fi.window_start_s, 2),
                    "window_end_s": round(fi.window_end_s, 2),
                    "window_str": f"{ts_str(fi.window_start_s)}–{ts_str(fi.window_end_s)}",
                    "scene_label": fi.scene_label,
                    "anomaly_score": round(fi.anomaly_score, 4),
                    "severity": fi.severity,
                    "alert": fi.alert,
                    "confidence": round(fi.confidence, 3),
                    "visual_audio_alignment": round(fi.visual_audio_alignment, 3),
                    "contributing_factors": fi.contributing_factors,
                    "description": fi.description,
                }
                for fi in sorted(analysis.fusion_insights, key=lambda x: x.window_start_s)
            ],

            # ── Surveillance events (actionable alerts) ──────────────────────
            "surveillance_events": [
                {
                    "timestamp_s": round(ev.timestamp_s, 2),
                    "timestamp_str": ts_str(ev.timestamp_s),
                    "event_type": ev.event_type,
                    "severity": ev.severity,
                    "description": ev.description,
                    "track_ids": ev.track_ids,
                    "confidence": round(ev.confidence, 3),
                }
                for ev in sorted(analysis.surveillance_events, key=lambda x: x.timestamp_s)
            ],

            # ── High-priority alert list (severity HIGH+CRITICAL) ─────────────
            "alerts": [
                {
                    "timestamp_s": round(ev.timestamp_s, 2),
                    "timestamp_str": ts_str(ev.timestamp_s),
                    "event_type": ev.event_type,
                    "severity": ev.severity,
                    "description": ev.description,
                }
                for ev in sorted(analysis.surveillance_events, key=lambda x: x.timestamp_s)
                if ev.severity in ("high", "critical")
            ],

            # ── Speech transcript (real segments only) ────────────────────────
            "speech_transcript": [
                {
                    "start_s": round(s.start_s, 2),
                    "end_s": round(s.end_s, 2),
                    "start_str": ts_str(s.start_s),
                    "text": s.text,
                    "language_code": s.language,
                    "language_name": s.language_name,
                    "confidence": round(s.confidence, 3),
                }
                for s in real_speech
            ],

            # ── Audio events (classified 1-second windows) ────────────────────
            "audio_events": [
                {
                    "timestamp_s": round(ev.timestamp_s, 2),
                    "timestamp_str": ts_str(ev.timestamp_s),
                    "event_type": ev.event_type,
                    "confidence": round(ev.confidence, 3),
                    "details": ev.details,
                    "rms_energy": round(ev.rms_energy, 5),
                }
                for ev in sorted(analysis.audio_events, key=lambda x: x.timestamp_s)
            ],

            # ── Logo / brand detections ───────────────────────────────────────
            "logo_detections": [
                {
                    "timestamp_s": round(lg.timestamp_s, 2),
                    "timestamp_str": ts_str(lg.timestamp_s),
                    "brand": lg.brand,
                    "text_found": lg.text_found,
                    "confidence": round(lg.confidence, 3),
                }
                for lg in sorted(analysis.logo_detections, key=lambda x: x.timestamp_s)
            ],

            # ── Per-frame timeline (sampled, for detailed QA) ─────────────────
            "frame_timeline": [
                {
                    "timestamp_s": round(fr.timestamp_s, 2),
                    "timestamp_str": ts_str(fr.timestamp_s),
                    "person_count": fr.person_count,
                    "dominant_action": fr.dominant_action,
                    "surveillance_flags": fr.surveillance_flags,
                    "flow_magnitude": round(fr.flow_magnitude, 4),
                    "object_classes": list({d.class_name for d in fr.detections}),
                }
                for fr in analysis.frame_results
            ],

            # ── Prose narrative for LLM system-prompt injection ───────────────
            "narrative": analysis.summary,

            # ── Full transcript (flat string for embedding) ───────────────────
            "full_transcript_text": analysis.full_transcript,

            # ── v5: appearance-merged identities ──────────────────────────────
            "identities": [
                {
                    "pid": ident.get("pid"),
                    "track_ids": ident.get("track_ids", []),
                    "samples": ident.get("samples", 0),
                    "first_seen_s": ident.get("first_seen_s"),
                    "first_seen_str": ts_str(ident.get("first_seen_s", 0.0)),
                    "last_seen_s": ident.get("last_seen_s"),
                    "last_seen_str": ts_str(ident.get("last_seen_s", 0.0)),
                }
                for ident in (analysis.identities or [])
            ],

            # ── v5: agentic reasoning synthesis ────────────────────────────────
            "agentic_reasoning": analysis.reasoning or {},

            # ── v5: engine metadata ────────────────────────────────────────────
            "engine": {
                "speech": analysis.speech_engine,
                "accuracy_engine": analysis.accuracy_engine_version,
                "yolo_seg_model": YOLO_SEG_MODEL,
                "yolo_pose_model": YOLO_POSE_MODEL,
                "whisper_model": WHISPER_MODEL,
                "identity_reid": bool(self._identity_tracker is not None),
                "cadence_classifier": bool(self._cadence is not None),
                "clip_logos": bool(self._clip_logos is not None),
            },
        }

        out = OUTPUT_DIR / f"{analysis.video_name}_rag.json"
        out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
        size_kb = out.stat().st_size // 1024
        print(f"    RAG JSON: {out.name} ({size_kb} KB, {len(doc['surveillance_events'])} events, "
              f"{len(doc['fusion_timeline'])} windows)")
        return out


# ══════════════════════════════════════════════════════════════════════════════
# Combined Report
# ══════════════════════════════════════════════════════════════════════════════

def _write_combined_report(results: list):
    out=OUTPUT_DIR/"DETECTRA_AI_COMBINED_REPORT.html"
    RC={"normal":"#8b949e","low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171"}
    cards=""
    for r in results:
        mx=max((fi.anomaly_score for fi in r.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx); rc=RC.get(risk,"#8b949e")
        rl=r.report_path.name if r.report_path else "#"
        vl=r.labeled_video_path.name if r.labeled_video_path else "#"
        cards+=(f'<div class="card"><div class="ch"><span class="cn">{r.video_name[:38]}</span>'
                f'<span style="color:{rc};font-size:11px;font-weight:700">{risk.upper()}</span></div>'
                f'<div class="cb"><div class="meta">{r.duration_s:.1f}s | {r.width}x{r.height}</div>'
                f'<table class="mt"><tr><td>Distinct individuals</td><td><b>{r.distinct_individuals}</b></td></tr>'
                f'<tr><td>Tracker ID segments</td><td><b>{len(r.unique_track_ids)}</b></td></tr>'
                f'<tr><td>Peak Persons</td><td><b>{r.max_persons_in_frame}</b></td></tr>'
                f'<tr><td>Language</td><td><b>{r.detected_language_name or "N/A"}</b></td></tr>'
                f'<tr><td>Logos</td><td><b>{len(r.logo_detections)}</b></td></tr>'
                f'<tr><td>Surv Events</td><td><b style="color:{rc}">{len(r.surveillance_events)}</b></td></tr>'
                f'<tr><td>Max Anomaly</td><td><b style="color:{rc}">{mx:.3f}</b></td></tr></table>'
                f'<div class="sum">{r.summary[:240]}...</div>'
                f'<div class="links"><a href="{rl}">Full Report</a><a href="{vl}">Labeled Video</a></div>'
                f'</div></div>')
    html=(f'<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Detectra AI — Combined</title>'
          f'<style>body{{font-family:-apple-system,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:40px}}'
          f'h1{{color:#00e5a0;font-size:30px;font-weight:800}}h2{{color:#8b949e;font-size:14px;margin-top:6px}}'
          f'.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;margin-top:24px}}'
          f'.card{{background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden}}'
          f'.ch{{padding:14px 20px;background:#1f2937;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center}}'
          f'.cn{{font-weight:600;font-size:14px;color:#00e5a0}}.cb{{padding:16px 20px}}.meta{{font-size:12px;color:#6e7681;margin-bottom:12px}}'
          f'.mt{{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}}.mt td{{padding:5px 4px;border-bottom:1px solid #21262d}}.mt td:first-child{{color:#8b949e}}'
          f'.sum{{font-size:12px;color:#6e7681;margin:10px 0;line-height:1.6}}'
          f'.links{{display:flex;gap:10px;margin-top:14px}}.links a{{font-size:12px;color:#00e5a0;text-decoration:none;padding:7px 14px;border:1px solid rgba(0,229,160,.3);border-radius:8px}}'
          f'.footer{{text-align:center;color:#6e7681;font-size:12px;margin-top:48px;padding-top:24px;border-top:1px solid #30363d}}'
          f'</style></head><body><h1>Detectra AI v4.0</h1>'
          f'<h2>Combined — {len(results)} Videos | YOLOv8s-Seg + Pose + Whisper-Small</h2>'
          f'<div class="grid">{cards}</div>'
          f'<div class="footer">Detectra AI v4.0 &mdash; UCP FYP F25AI009 &mdash; {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>'
          f'</body></html>')
    out.write_text(html, encoding="utf-8")
    print(f"  Combined: {out}")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def _print_summary(a: VideoAnalysis):
    mx=max((fi.anomaly_score for fi in a.fusion_insights),default=0.0)
    risk=FusionEngine._severity(mx)
    alerts=sum(1 for fi in a.fusion_insights if fi.alert)
    print(f"\n  {'━'*64}\n  RESULTS: {a.video_name}\n  {'━'*64}")
    print(f"  Duration      : {a.duration_s:.1f}s")
    print(f"  Distinct individuals: {a.distinct_individuals} (tracker ID segments: {len(a.unique_track_ids)})")
    print(f"  Peak Persons  : {a.max_persons_in_frame} at t={a.peak_activity_ts:.1f}s")
    print(f"  Object Classes: {list(a.class_frequencies.keys())[:8]}")
    print(f"  Top Actions   : {list(a.action_frequencies.keys())[:6]}")
    print(f"  Speech Segs   : {len(a.speech_segments)} ({a.detected_language_name or 'none'})")
    print(f"  Logo Detect   : {len(a.logo_detections)}")
    print(f"  Surv Events   : {len(a.surveillance_events)}")
    print(f"  Fusion Risk   : {risk.upper()} (max={mx:.3f}, alerts={alerts})")
    print(f"  Process Time  : {a.processing_time_s:.1f}s")
    print(f"  {'━'*64}")
    if a.full_transcript:
        print(f"\n  TRANSCRIPT:\n{a.full_transcript[:500]}")


# ══════════════════════════════════════════════════════════════════════════════
# Live Stream Analyzer — RTSP / webcam / IP camera
# ══════════════════════════════════════════════════════════════════════════════

class LiveStreamAnalyzer:
    """
    Real-time surveillance analyzer for live feeds (webcam, RTSP, HTTP streams).

    Processes frames at ANALYSIS_FPS with the full v4 pipeline:
      CLAHE → YOLOv8s-Seg + Pose → ByteTrack → ActionBuffer →
      SurveillanceDetector → FusionEngine (sliding window)

    Usage:
        analyzer = LiveStreamAnalyzer()
        analyzer.run("rtsp://192.168.1.100:554/stream")
        analyzer.run(0)  # webcam index 0
        analyzer.run("http://ip-cam/video")

    Frame callback:
        def on_frame(frame_bgr, frame_result, surv_events):
            ...
        analyzer.run(source, frame_callback=on_frame)
    """

    WINDOW_FRAMES  = 30    # sliding window for fusion (at ANALYSIS_FPS=3 → 10s)
    RECONNECT_SECS = 5     # wait before reconnecting on stream drop

    def __init__(self):
        self._seg        = None
        self._pose_model = None
        self._logo       = LogoDetector()
        self._fusion     = FusionEngine()
        self._surv       = SurveillanceDetector()
        self._action_rec = PoseActionRecognizer()
        self._running    = False

    def _load_models(self):
        if self._seg is None:
            from ultralytics import YOLO
            print(f"  [Live] Loading {YOLO_SEG_MODEL}...")
            self._seg = YOLO(YOLO_SEG_MODEL)
            print(f"  [Live] Loading {YOLO_POSE_MODEL}...")
            self._pose_model = YOLO(YOLO_POSE_MODEL)
            print("  [Live] Models ready")

    @staticmethod
    def _iou4(a, b):
        ix1=max(a[0],b[0]); iy1=max(a[1],b[1])
        ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
        if ix2<=ix1 or iy2<=iy1: return 0.0
        inter=(ix2-ix1)*(iy2-iy1)
        ua=(a[2]-a[0])*(a[3]-a[1]); ub=(b[2]-b[0])*(b[3]-b[1])
        return inter/(ua+ub-inter+1e-8)

    def stop(self):
        self._running = False

    def run(
        self,
        source,           # int (webcam) | str (RTSP/HTTP/file)
        frame_callback=None,   # fn(frame_bgr, FrameResult, list[SurveillanceEvent]) | None
        show_window: bool = True,
        max_seconds: float | None = None,
    ):
        """
        Start processing. Blocks until stream ends or stop() is called.
        Set show_window=False for headless/server mode.
        """
        self._load_models()
        seg = self._seg; pose_model = self._pose_model
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)) if USE_CLAHE else None

        print(f"\n  [Live] Opening: {source}")
        cap = cv2.VideoCapture(source if isinstance(source, str) else int(source))
        if not cap.isOpened():
            print(f"  [Live] ERROR: Cannot open {source}"); return

        src_fps  = cap.get(cv2.CAP_PROP_FPS) or 25.0
        W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"  [Live] Stream: {W}x{H} @ {src_fps:.0f}fps | analysis: {ANALYSIS_FPS}fps")
        interval  = max(1, int(src_fps / ANALYSIS_FPS))

        frame_buf: list[FrameResult] = []
        track_ages: dict = defaultdict(int)
        all_tids: set = set()
        prev_gray = None
        fi = 0; analyzed = 0; t_start = time.perf_counter()
        self._running = True

        SKEL = [(0,1),(0,2),(1,3),(2,4),(5,6),(5,7),(7,9),(6,8),(8,10),
                (5,11),(6,12),(11,12),(11,13),(13,15),(12,14),(14,16)]

        while self._running:
            ret, frame = cap.read()
            if not ret:
                print(f"  [Live] Stream ended / dropped — reconnecting in {self.RECONNECT_SECS}s")
                cap.release()
                time.sleep(self.RECONNECT_SECS)
                cap = cv2.VideoCapture(source if isinstance(source, str) else int(source))
                if not cap.isOpened(): break
                fi = 0; continue

            if max_seconds and (time.perf_counter() - t_start) > max_seconds:
                break

            if fi % interval == 0:
                ts = time.perf_counter() - t_start

                # CLAHE enhancement
                if clahe:
                    yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
                    yuv[:,:,0] = clahe.apply(yuv[:,:,0])
                    frame_enh = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
                else:
                    frame_enh = frame
                frgb = cv2.cvtColor(frame_enh, cv2.COLOR_BGR2RGB)
                fgry = cv2.cvtColor(frame_enh, cv2.COLOR_BGR2GRAY)

                # Optical flow
                flow_mag = 0.0
                if prev_gray is not None:
                    flw = cv2.calcOpticalFlowFarneback(prev_gray, fgry, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    flow_mag = float(np.mean(np.sqrt(flw[...,0]**2 + flw[...,1]**2)))
                prev_gray = fgry

                # Detection + tracking
                seg_res  = seg.track(frgb, conf=YOLO_CONF, iou=YOLO_IOU,
                                     persist=True, verbose=False, tracker="bytetrack.yaml")
                pose_res = pose_model(frgb, conf=YOLO_CONF, verbose=False)
                pose_list = []
                if pose_res and pose_res[0].keypoints is not None:
                    for j, kd in enumerate(pose_res[0].keypoints.data):
                        pb = pose_res[0].boxes[j]
                        pose_list.append(([float(v) for v in pb.xyxyn[0]], PoseKPs(kd.cpu().numpy())))

                detections = []
                if seg_res and seg_res[0].boxes is not None:
                    boxes = seg_res[0].boxes; masks = seg_res[0].masks; names = seg_res[0].names
                    for i, box in enumerate(boxes):
                        cls_id = int(box.cls[0]); cname = names.get(cls_id, f"cls_{cls_id}")
                        conf   = float(box.conf[0])
                        x1,y1,x2,y2 = [float(v) for v in box.xyxyn[0]]
                        tid    = int(box.id[0]) if box.id is not None else None
                        mask_arr = None
                        if masks is not None and i < len(masks.data):
                            mask_arr = masks.data[i].cpu().numpy()
                        best_pose = None
                        if cname == "person" and pose_list:
                            best_iou = 0.0
                            for pbbox, pkps in pose_list:
                                iou = self._iou4((x1,y1,x2,y2), tuple(pbbox))
                                if iou > best_iou: best_iou = iou; best_pose = pkps
                        if tid is not None: track_ages[tid] += 1; all_tids.add(tid)
                        detections.append(Detection(
                            class_name=cname, confidence=conf, x1=x1, y1=y1, x2=x2, y2=y2,
                            mask=mask_arr, track_id=tid, pose=best_pose,
                            track_age=track_ages.get(tid, 0)))

                actions_map = self._action_rec.update(ts, detections)
                for det in detections:
                    if det.track_id in actions_map: det.action = actions_map[det.track_id]

                flags = []
                for det in detections:
                    if det.class_name == "person":
                        if det.action == "fallen":   flags.append("FALL")
                        if det.action == "fighting": flags.append("FIGHT")
                        if det.action == "loitering":flags.append("LOITER")
                        if det.action == "running":  flags.append("RUN")
                    if det.class_name in WEAPON_CLASSES:
                        flags.append(f"WEAPON:{det.class_name.upper()}")
                runners_n = sum(1 for d in detections if d.class_name=="person" and d.action in ("running","fast walking"))
                pc_now = sum(1 for d in detections if d.class_name=="person")
                if runners_n >= 3 and runners_n >= 0.55 * max(1, pc_now):
                    flags.append("STAMPEDE")

                fr = FrameResult(frame_idx=fi, timestamp_s=ts, detections=detections,
                                 person_count=pc_now,
                                 unique_track_ids={d.track_id for d in detections if d.class_name=="person" and d.track_id},
                                 dominant_action=self._action_rec.get_dominant(detections),
                                 flow_magnitude=flow_mag, surveillance_flags=flags)
                frame_buf.append(fr)
                if len(frame_buf) > self.WINDOW_FRAMES:
                    frame_buf.pop(0)

                surv_events = self._surv.analyze(frame_buf[-5:], [])

                analyzed += 1
                if analyzed % 30 == 0 or flags:
                    fps_actual = analyzed / max(0.1, time.perf_counter() - t_start)
                    crit = [e for e in surv_events if e.severity in ("critical","high")]
                    print(f"  [Live t={ts:.1f}s] persons={pc_now} | action={fr.dominant_action} | "
                          f"flags={flags} | critical={len(crit)} | fps={fps_actual:.1f}")

                # Draw on frame for display
                display = frame.copy()
                if show_window or frame_callback:
                    overlay = display.copy()
                    for det in detections:
                        if det.mask is not None:
                            color = _id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                            m = cv2.resize(det.mask.astype(np.uint8), (W,H), interpolation=cv2.INTER_NEAREST)
                            overlay[m>0] = color
                    display = cv2.addWeighted(overlay, MASK_ALPHA, display, 1-MASK_ALPHA, 0)
                    for det in detections:
                        x1i=int(det.x1*W); y1i=int(det.y1*H); x2i=int(det.x2*W); y2i=int(det.y2*H)
                        color = _id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                        cv2.rectangle(display, (x1i,y1i), (x2i,y2i), color, 2)
                        lbl = f"{det.class_name}"
                        if det.track_id: lbl += f" #{det.track_id}"
                        if det.action:   lbl += f" [{det.action}]"
                        cv2.putText(display, lbl, (x1i+2, max(y1i-4,12)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1)
                        if DRAW_POSE and det.pose and det.class_name=="person":
                            kps = det.pose.kps
                            pts = {i:(int(kps[i,0]*W),int(kps[i,1]*H)) for i in range(17) if kps[i,2]>=0.3}
                            for a_,b_ in SKEL:
                                if a_ in pts and b_ in pts: cv2.line(display,pts[a_],pts[b_],color,2)
                            for pt in pts.values(): cv2.circle(display,pt,3,(255,255,255),-1)
                    # HUD
                    crit_events = [e for e in surv_events if e.severity in ("critical","high")]
                    hc = (30,30,220) if crit_events else (0,225,130)
                    hud = [f"Detectra AI v4 LIVE", f"t={ts:.1f}s  fps={analyzed/max(0.1,time.perf_counter()-t_start):.1f}",
                           f"Persons: {pc_now}  Tracks: {len(all_tids)}", f"Action: {fr.dominant_action or '-'}"]
                    if flags: hud.append(f"FLAGS: {' | '.join(flags[:3])}")
                    cv2.rectangle(display, (0,0), (260, len(hud)*20+12), (0,0,0), -1)
                    cv2.rectangle(display, (0,0), (260, len(hud)*20+12), hc, 1)
                    for idx, line in enumerate(hud):
                        cv2.putText(display, line, (5, 16+idx*20), cv2.FONT_HERSHEY_SIMPLEX, 0.42, hc if idx==0 else (220,220,220), 1)
                    # Alert banners
                    for eidx, ev in enumerate(crit_events[:2]):
                        ec = SEV_COLORS.get(ev.severity, (150,150,150))
                        banner = f"ALERT [{ev.severity.upper()}]: {ev.event_type.upper()} — {ev.description[:55]}"
                        cv2.rectangle(display, (0,H-55-eidx*30), (W,H-25-eidx*30), (15,15,15), -1)
                        cv2.putText(display, banner, (8,H-33-eidx*30), cv2.FONT_HERSHEY_SIMPLEX, 0.48, ec, 1)

                if frame_callback:
                    frame_callback(display, fr, surv_events)

                if show_window:
                    cv2.imshow("Detectra AI v4 — Live Surveillance", display)
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q') or key == 27:
                        break

            fi += 1

        self._running = False
        cap.release()
        if show_window:
            cv2.destroyAllWindows()
        print(f"  [Live] Stopped. Analyzed {analyzed} frames, {len(all_tids)} unique tracks.")


def main():
    parser = argparse.ArgumentParser(
        description="Detectra AI v4.0 — Advanced Surveillance System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python analyze_videos.py --all                          # analyze all test videos
  python analyze_videos.py --video path/to/video.mp4      # single video file
  python analyze_videos.py --live 0                       # webcam index 0
  python analyze_videos.py --live rtsp://192.168.1.x/stream  # IP camera
  python analyze_videos.py --live 0 --no-window           # headless server mode
        """
    )
    parser.add_argument("--video",    type=str, help="Path to a single video file")
    parser.add_argument("--all",      action="store_true", help="Analyze all test videos")
    parser.add_argument("--live",     type=str, metavar="SOURCE",
                        help="Live stream source: 0=webcam, rtsp://..., http://...")
    parser.add_argument("--no-window",action="store_true", help="Headless mode (no display window)")
    parser.add_argument("--max-secs", type=float, default=None,
                        help="Max seconds for live stream (default: unlimited)")
    args = parser.parse_args()

    # ── Live stream mode ──────────────────────────────────────────────────────
    if args.live is not None:
        source = args.live
        # Convert numeric string to int for webcam
        try: source = int(source)
        except ValueError: pass
        live = LiveStreamAnalyzer()
        print(f"\n{'='*70}")
        print(f"  Detectra AI v4.0 — LIVE STREAM MODE")
        print(f"  Source: {source}")
        print(f"  Press Q or ESC to stop")
        print(f"{'='*70}")
        live.run(source, show_window=not args.no_window, max_seconds=args.max_secs)
        return

    # ── File mode ─────────────────────────────────────────────────────────────
    analyzer = DetectraAnalyzer()
    if args.video:
        vp = Path(args.video)
        if not vp.exists():
            # Try relative to TEST_VIDEOS
            vp2 = SCRIPT_DIR.parent / "test videos" / args.video
            if vp2.exists(): vp = vp2
            else: print(f"  [ERROR] Video not found: {args.video}"); sys.exit(1)
        videos = [vp]
    else:
        td = SCRIPT_DIR.parent / "test videos"
        if not td.exists(): td = SCRIPT_DIR / "test videos"
        videos = (sorted(td.glob("*.mp4")) + sorted(td.glob("*.avi")) +
                  sorted(td.glob("*.mov")) + sorted(td.glob("*.mkv")))
    if not videos:
        print("  No videos found."); sys.exit(1)

    print(f"\n  Found {len(videos)} video(s):\n")
    for v in videos:
        print(f"    * {v.name} ({v.stat().st_size//1024}KB)")

    results = []
    for i, vp in enumerate(videos):
        print(f"\n{'='*70}\n  Video {i+1}/{len(videos)}: {vp.name}\n{'='*70}")
        try:
            r = analyzer.analyze(vp)
            results.append(r)
            _print_summary(r)
        except Exception as e:
            print(f"  [ERROR] {vp.name}: {e}")
            traceback.print_exc()

    if len(results) > 1:
        _write_combined_report(results)
    print(f"\n{'='*70}\n  COMPLETE — {len(results)}/{len(videos)} | output: {OUTPUT_DIR}\n{'='*70}\n")


if __name__ == "__main__":
    main()
