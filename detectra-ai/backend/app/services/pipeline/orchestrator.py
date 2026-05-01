"""
Detectra AI — Multi-Agent Pipeline Orchestrator
================================================
Celery task that coordinates a 4-agent surveillance analysis pipeline:

  Agent 1: StreamAgent        → video ingestion, frame extraction, CLAHE
  Agent 2: PerceptionAgent    → parallel detection/recognition (5 models)
  Agent 3: ReasoningAgent     → fusion + anomaly detection + scene context
  Agent 4: persistence        → save all results to DB

The PerceptionAgent runs all 5 perception modules concurrently via
ThreadPoolExecutor, dramatically reducing total analysis time vs sequential.

Progress reporting:
  0%   → initializing
  5%   → stream_agent (preprocessing)
  20%  → perception_agent starting (parallel inference)
  65%  → perception_agent complete
  78%  → reasoning_agent (fusion + anomaly + context)
  97%  → reasoning_agent complete
  100% → saved to DB, done
"""
from __future__ import annotations

import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


# ─── DB helpers ───────────────────────────────────────────────────────────────

def _update_job(db, job, status: str, progress: float, stage: str, error: str | None = None):
    job.status = status
    job.progress_pct = progress
    job.current_stage = stage
    if error:
        job.error_message = error
    if status == "running" and not job.started_at:
        job.started_at = datetime.now(timezone.utc)
    if status in ("completed", "failed"):
        job.completed_at = datetime.now(timezone.utc)
    db.commit()


def _save_results(db, job_id: int, modality: str, results: list[dict[str, Any]]):
    from app.db.models.result import Result
    for r in results:
        result = Result(
            job_id=job_id,
            modality=modality,
            timestamp_start_s=r.get("timestamp_start_s", 0.0),
            timestamp_end_s=r.get("timestamp_end_s", 0.0),
            data=r.get("data", {}),
            confidence=r.get("confidence"),
        )
        db.add(result)
    db.commit()


# ─── Main Pipeline Task ────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="app.services.pipeline.orchestrator.run_analysis_pipeline")
def run_analysis_pipeline(self, job_id: int, video_path: str, config: dict[str, Any]):
    """
    Multi-agent surveillance video analysis pipeline.
    Coordinates StreamAgent → PerceptionAgent → ReasoningAgent → DB persistence.
    """
    from app.db.session import SessionLocal
    from app.db.models.analysis_job import AnalysisJob, JobStatus
    from app.db.models.video import Video, VideoStatus

    db = SessionLocal()
    try:
        job = db.get(AnalysisJob, job_id)
        if not job:
            logger.error("Job not found", job_id=job_id)
            return

        video = db.get(Video, job.video_id)
        video_path_obj = Path(video.file_path)

        _update_job(db, job, JobStatus.RUNNING, 0, "initializing")
        logger.info("Multi-agent pipeline started", job_id=job_id, video=str(video_path_obj))

        # ── Build EventBus ────────────────────────────────────────────────────
        from app.services.agents.base_agent import EventBus

        bus = EventBus(video_path=str(video_path_obj), config=config)

        def progress_cb(pct: float, stage: str):
            try:
                job_ref = db.get(AnalysisJob, job_id)
                if job_ref:
                    job_ref.progress_pct = pct
                    job_ref.current_stage = stage
                    db.commit()
            except Exception:
                pass

        # ─────────────────────────────────────────────────────────────────────
        # AGENT 1: StreamAgent — video ingestion + CLAHE preprocessing
        # ─────────────────────────────────────────────────────────────────────
        _update_job(db, job, JobStatus.RUNNING, 2, "stream_agent:starting")
        from app.services.agents.stream_agent import StreamAgent

        stream_agent = StreamAgent(bus, progress_cb, apply_clahe=True)
        stream_result = stream_agent.execute()

        if not stream_result.success:
            raise RuntimeError(f"StreamAgent failed: {stream_result.error}")

        # Update video metadata from StreamAgent output
        if bus.metadata:
            video.duration_seconds = bus.metadata.duration_seconds
            video.width = bus.metadata.width
            video.height = bus.metadata.height
            video.fps = bus.metadata.fps
            video.status = VideoStatus.PROCESSING
            db.commit()

        _update_job(db, job, JobStatus.RUNNING, 18, "stream_agent:complete")
        logger.info("StreamAgent done",
                    frames=len(bus.frames),
                    audio=bus.audio_path,
                    duration=getattr(bus.metadata, 'duration_seconds', 0))

        # ─────────────────────────────────────────────────────────────────────
        # AGENT 2: PerceptionAgent — parallel multi-model inference
        # ─────────────────────────────────────────────────────────────────────
        _update_job(db, job, JobStatus.RUNNING, 20, "perception_agent:starting")
        from app.services.agents.perception_agent import PerceptionAgent

        perception_agent = PerceptionAgent(bus, progress_cb, max_workers=5)
        perception_result = perception_agent.execute()

        # Save raw perception results to DB as they arrive
        _save_results(db, job_id, "object", bus.object_results)
        _save_results(db, job_id, "logo", bus.logo_results)
        _save_results(db, job_id, "motion", bus.motion_results)
        _save_results(db, job_id, "speech", bus.speech_results)
        _save_results(db, job_id, "audio", bus.audio_results)

        if not perception_result.success:
            logger.warning("PerceptionAgent had errors", errors=bus.errors)
            # Don't abort — partial results are still useful

        _update_job(db, job, JobStatus.RUNNING, 65, "perception_agent:complete")
        logger.info("PerceptionAgent done",
                    objects=len(bus.object_results),
                    logos=len(bus.logo_results),
                    motions=len(bus.motion_results),
                    speech=len(bus.speech_results),
                    audio=len(bus.audio_results))

        # ─────────────────────────────────────────────────────────────────────
        # AGENT 3: ReasoningAgent — fusion + anomaly + context + narrative
        # ─────────────────────────────────────────────────────────────────────
        _update_job(db, job, JobStatus.RUNNING, 68, "reasoning_agent:starting")
        from app.services.agents.reasoning_agent import ReasoningAgent

        reasoning_agent = ReasoningAgent(bus, progress_cb)
        reasoning_result = reasoning_agent.execute()

        if not reasoning_result.success:
            logger.warning("ReasoningAgent had errors", errors=bus.errors)

        # Save fused insights (enriched with anomaly + context)
        _save_results(db, job_id, "fused", bus.fused_results)

        # Save anomaly events as a separate modality
        _save_results(db, job_id, "anomaly", bus.anomaly_events)

        _update_job(db, job, JobStatus.RUNNING, 97, "reasoning_agent:complete")
        logger.info("ReasoningAgent done",
                    fused=len(bus.fused_results),
                    anomalies=len(bus.anomaly_events))

        # ─────────────────────────────────────────────────────────────────────
        # Finalize
        # ─────────────────────────────────────────────────────────────────────

        # Store tracking summary in job config for quick access
        if reasoning_result.success and reasoning_result.output:
            job.config = {**job.config, "_summary": reasoning_result.output}

        video.status = VideoStatus.COMPLETED
        db.commit()
        _update_job(db, job, JobStatus.COMPLETED, 100, "completed")

        # Cleanup temp audio
        if bus.audio_path and Path(bus.audio_path).exists():
            Path(bus.audio_path).unlink(missing_ok=True)

        logger.info(
            "Multi-agent pipeline completed",
            job_id=job_id,
            agents_errors=len(bus.errors),
            alerts=bus.tracking_summary.get("alert_count", 0),
        )

    except Exception as exc:
        logger.error("Pipeline failed", job_id=job_id, error=str(exc), tb=traceback.format_exc())
        try:
            from app.db.models.analysis_job import AnalysisJob, JobStatus
            from app.db.models.video import Video, VideoStatus
            job = db.get(AnalysisJob, job_id)
            if job:
                _update_job(db, job, JobStatus.FAILED, job.progress_pct, "failed", error=str(exc))
            video_obj = db.get(Video, job.video_id) if job else None
            if video_obj:
                video_obj.status = VideoStatus.FAILED
                db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()
