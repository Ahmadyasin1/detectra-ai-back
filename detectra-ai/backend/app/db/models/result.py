from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.analysis_job import AnalysisJob


class Modality(str, Enum):
    OBJECT = "object"
    LOGO = "logo"
    MOTION = "motion"
    SPEECH = "speech"
    AUDIO = "audio"
    FUSED = "fused"
    ANOMALY = "anomaly"  # Surveillance anomaly events (NEW)


class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    modality: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Temporal range this result covers
    timestamp_start_s: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    timestamp_end_s: Mapped[float] = mapped_column(Float, nullable=False)

    # Raw detection/recognition data (flexible JSON)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Overall confidence for this result entry
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    job: Mapped["AnalysisJob"] = relationship("AnalysisJob", back_populates="results")

    def __repr__(self) -> str:
        return (
            f"<Result id={self.id} modality={self.modality} "
            f"t=[{self.timestamp_start_s:.1f}s-{self.timestamp_end_s:.1f}s]>"
        )
