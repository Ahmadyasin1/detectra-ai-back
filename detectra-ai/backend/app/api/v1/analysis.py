import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.exceptions import AnalysisInProgressException, ForbiddenException, NotFoundException
from app.core.security import decode_token
from app.db.models.analysis_job import AnalysisJob, JobStatus
from app.db.models.user import User
from app.db.models.video import Video, VideoStatus
from app.db.session import SessionLocal, get_db
from app.dependencies import get_current_active_user
from app.schemas.analysis import AnalysisStartRequest, AnalysisStatusResponse

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _get_video_or_raise(video_id: int, user: User, db: Session) -> Video:
    video = db.get(Video, video_id)
    if not video:
        raise NotFoundException("Video")
    if video.user_id != user.id:
        raise ForbiddenException()
    return video


def _resolve_user_from_token(token: str, db: Session) -> Optional[User]:
    """Resolve a User from a raw JWT string. Returns None on failure."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        return None
    return user


@router.post("/{video_id}/start", response_model=AnalysisStatusResponse, status_code=status.HTTP_202_ACCEPTED)
def start_analysis(
    video_id: int,
    request: AnalysisStartRequest | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AnalysisJob:
    if request is None:
        request = AnalysisStartRequest()
    video = _get_video_or_raise(video_id, current_user, db)

    # Check if an active job already exists
    active_job = (
        db.query(AnalysisJob)
        .filter(
            AnalysisJob.video_id == video_id,
            AnalysisJob.status.in_([JobStatus.PENDING, JobStatus.RUNNING]),
        )
        .first()
    )
    if active_job:
        raise AnalysisInProgressException()

    # Create job record
    job = AnalysisJob(
        video_id=video_id,
        config=request.config.model_dump(),
        status=JobStatus.PENDING,
    )
    db.add(job)
    video.status = VideoStatus.QUEUED
    db.commit()
    db.refresh(job)

    # Dispatch Celery task
    from app.workers.celery_app import celery_app  # noqa: F401
    from app.services.pipeline.orchestrator import run_analysis_pipeline

    task = run_analysis_pipeline.apply_async(
        args=[job.id, video.file_path, request.config.model_dump()],
        task_id=f"analysis-job-{job.id}",
    )
    job.celery_task_id = task.id
    db.commit()
    db.refresh(job)

    return job


@router.get("/{job_id}/status", response_model=AnalysisStatusResponse)
def get_job_status(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AnalysisJob:
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise NotFoundException("Analysis job")
    video = db.get(Video, job.video_id)
    if not video or video.user_id != current_user.id:
        raise ForbiddenException()
    return job


@router.delete("/{job_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_analysis(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Cancel a pending or running analysis job (UC-0 alternate course)."""
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise NotFoundException("Analysis job")
    video = db.get(Video, job.video_id)
    if not video or video.user_id != current_user.id:
        raise ForbiddenException()

    if job.status not in (JobStatus.PENDING, JobStatus.RUNNING):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job is not in a cancellable state",
        )

    # Revoke the Celery task
    if job.celery_task_id:
        try:
            from app.workers.celery_app import celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)
        except Exception:
            pass  # Best-effort revoke

    job.status = JobStatus.FAILED
    job.error_message = "Cancelled by user"
    from datetime import datetime, timezone
    job.completed_at = datetime.now(timezone.utc)
    video.status = VideoStatus.FAILED
    db.commit()


@router.get("/{job_id}/progress")
async def stream_progress(
    job_id: int,
    token: str = Query(default=""),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """
    SSE endpoint for real-time progress (UC-8).
    EventSource cannot set Authorization headers, so we accept
    the JWT via ?token= query parameter instead.
    """
    # Authenticate via query-param token (EventSource browser limitation)
    current_user = _resolve_user_from_token(token, db)
    if current_user is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )

    # Validate job ownership
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise NotFoundException("Analysis job")
    video = db.get(Video, job.video_id)
    if not video or video.user_id != current_user.id:
        raise ForbiddenException()

    async def event_generator():
        # Use a dedicated session — the request-scoped `db` session closes
        # when the endpoint handler returns, before the generator finishes.
        with SessionLocal() as stream_db:
            while True:
                job_state = stream_db.get(AnalysisJob, job_id)
                if not job_state:
                    break

                event_data = {
                    "job_id": job_id,
                    "progress": round(job_state.progress_pct, 1),
                    "stage": job_state.current_stage or "initializing",
                    "status": job_state.status,
                    "message": job_state.error_message,
                }
                yield f"data: {json.dumps(event_data)}\n\n"

                if job_state.status in (JobStatus.COMPLETED, JobStatus.FAILED):
                    # Send one final event then close
                    break

                # Expire to force re-read from DB on next iteration
                stream_db.expire(job_state)
                await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/video/{video_id}/jobs", response_model=list[AnalysisStatusResponse])
def list_video_jobs(
    video_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[AnalysisJob]:
    video = _get_video_or_raise(video_id, current_user, db)
    jobs = (
        db.query(AnalysisJob)
        .filter(AnalysisJob.video_id == video_id)
        .order_by(AnalysisJob.created_at.desc())
        .all()
    )
    return jobs
