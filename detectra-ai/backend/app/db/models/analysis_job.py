from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.result import Result
    from app.db.models.video import Video


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True, nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Analysis configuration (which modules to run)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default=JobStatus.PENDING, nullable=False, index=True)
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    video: Mapped["Video"] = relationship("Video", back_populates="analysis_jobs")
    results: Mapped[list["Result"]] = relationship(
        "Result", back_populates="job", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AnalysisJob id={self.id} status={self.status} progress={self.progress_pct:.0f}%>"
