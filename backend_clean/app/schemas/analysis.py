from datetime import datetime

from pydantic import BaseModel, Field


class AnalysisConfig(BaseModel):
    enable_object_detection: bool = True
    enable_logo_recognition: bool = True
    enable_motion_recognition: bool = True
    enable_speech_to_text: bool = True
    enable_audio_classification: bool = True
    enable_fusion: bool = True
    frame_extraction_fps: float = Field(default=1.0, ge=0.1, le=5.0)


class AnalysisStartRequest(BaseModel):
    config: AnalysisConfig = Field(default_factory=AnalysisConfig)


class AnalysisStatusResponse(BaseModel):
    model_config = {"from_attributes": True, "populate_by_name": True}

    job_id: int = Field(validation_alias="id")
    video_id: int
    status: str
    progress_pct: float
    current_stage: str | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class ProgressEvent(BaseModel):
    job_id: int
    progress: float
    stage: str
    status: str
    message: str | None = None
