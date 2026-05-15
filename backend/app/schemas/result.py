from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class ObjectDetection(BaseModel):
    class_name: str
    confidence: float
    bbox: BoundingBox


class LogoDetection(BaseModel):
    brand: str
    confidence: float
    bbox: BoundingBox | None = None


class ActionDetection(BaseModel):
    action: str
    confidence: float
    clip_start_s: float
    clip_end_s: float


class SpeechSegment(BaseModel):
    text: str
    start_s: float
    end_s: float
    language: str | None = None
    avg_logprob: float | None = None


class AudioEvent(BaseModel):
    event_class: str
    confidence: float
    timestamp_s: float


class FusedInsight(BaseModel):
    time_bin: int                  # Index of the 1-second time bin
    timestamp_start_s: float
    timestamp_end_s: float
    scene_label: str | None
    anomaly_score: float
    visual_audio_correlation: float
    summary: str
    contributing_events: list[str]


class ResultRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    job_id: int
    modality: str
    timestamp_start_s: float
    timestamp_end_s: float
    data: dict[str, Any]
    confidence: float | None
    created_at: datetime


class AnomalyEvent(BaseModel):
    timestamp_start_s: float
    timestamp_end_s: float
    anomaly_score: float
    severity: str
    anomaly_type: str
    description: str
    alert: bool


class FullAnalysisResults(BaseModel):
    job_id: int
    video_id: int
    status: str
    object_detections: list[ResultRead]
    logo_detections: list[ResultRead]
    motion_detections: list[ResultRead]
    speech_segments: list[ResultRead]
    audio_events: list[ResultRead]
    fused_insights: list[ResultRead]
    anomaly_events: list[ResultRead]
    summary_stats: dict[str, Any]
    surveillance_summary: dict[str, Any]
