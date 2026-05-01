from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.models.analysis_job import AnalysisJob
from app.db.models.result import Modality, Result
from app.db.models.user import User
from app.db.models.video import Video
from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.schemas.result import FullAnalysisResults, ResultRead

router = APIRouter(prefix="/results", tags=["Results"])


def _authorize_job(job_id: int, user: User, db: Session) -> AnalysisJob:
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise NotFoundException("Analysis job")
    video = db.get(Video, job.video_id)
    if not video or video.user_id != user.id:
        raise ForbiddenException()
    return job


@router.get("/job/{job_id}", response_model=FullAnalysisResults)
def get_full_results(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> FullAnalysisResults:
    job = _authorize_job(job_id, current_user, db)

    def fetch(modality: Modality) -> list[Result]:
        return (
            db.query(Result)
            .filter(Result.job_id == job_id, Result.modality == modality)
            .order_by(Result.timestamp_start_s)
            .all()
        )

    objects = fetch(Modality.OBJECT)
    logos = fetch(Modality.LOGO)
    motions = fetch(Modality.MOTION)
    speech = fetch(Modality.SPEECH)
    audio = fetch(Modality.AUDIO)
    fused = fetch(Modality.FUSED)
    anomaly = fetch(Modality.ANOMALY)

    # ── Surveillance anomaly summary ──────────────────────────────────────────
    alert_events = [r for r in anomaly if r.data.get("alert", False)]
    anomaly_scores = [r.data.get("anomaly_score", 0.0) for r in anomaly]
    max_score = max(anomaly_scores, default=0.0)
    severity_counts: dict[str, int] = {}
    for r in anomaly:
        sev = r.data.get("severity", "normal")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Extract video-level context from job config (_summary injected by orchestrator)
    job_summary = job.config.get("_summary", {}) if job.config else {}
    video_context = job_summary.get("video_context", {})
    anomaly_report = job_summary.get("anomaly_summary", {})

    surveillance_summary: dict[str, Any] = {
        "overall_risk": anomaly_report.get("overall_risk", "normal"),
        "max_anomaly_score": round(max_score, 4),
        "total_anomaly_events": len(anomaly),
        "alert_count": len(alert_events),
        "severity_breakdown": severity_counts,
        "alert_timestamps": [r.timestamp_start_s for r in alert_events],
        "anomaly_types": anomaly_report.get("anomaly_types", {}),
        "highest_risk_timestamp": anomaly_report.get("highest_risk_timestamp"),
        "video_narrative": video_context.get("overall_narrative", ""),
        "dominant_scene": video_context.get("dominant_scene_type", ""),
        "person_present_seconds": video_context.get("person_present_seconds", 0),
        "vehicle_present_seconds": video_context.get("vehicle_present_seconds", 0),
        "total_object_count": video_context.get("total_object_count", 0),
        "unique_classes": video_context.get("unique_object_classes", []),
        "class_frequencies": video_context.get("class_frequencies", {}),
        "peak_activity_timestamp": video_context.get("peak_activity_timestamp", 0),
    }

    # ── Standard summary stats ────────────────────────────────────────────────
    summary_stats: dict[str, Any] = {
        "total_object_detections": sum(len(r.data.get("detections", [])) for r in objects),
        "total_logo_detections": sum(len(r.data.get("detections", [])) for r in logos),
        "total_action_segments": len(motions),
        "total_speech_segments": len(speech),
        "total_audio_events": len(audio),
        "total_fused_insights": len(fused),
        "total_anomaly_events": len(anomaly),
        "unique_objects": list({
            d["class_name"] for r in objects for d in r.data.get("detections", [])
        }),
        "unique_logos": list({
            d["brand"] for r in logos for d in r.data.get("detections", [])
        }),
        "unique_actions": list({r.data.get("action") for r in motions if r.data.get("action")}),
        "alerts_triggered": len(alert_events),
        "overall_risk_level": surveillance_summary["overall_risk"],
    }

    return FullAnalysisResults(
        job_id=job_id,
        video_id=job.video_id,
        status=job.status,
        object_detections=objects,
        logo_detections=logos,
        motion_detections=motions,
        speech_segments=speech,
        audio_events=audio,
        fused_insights=fused,
        anomaly_events=anomaly,
        summary_stats=summary_stats,
        surveillance_summary=surveillance_summary,
    )


@router.get("/job/{job_id}/anomalies", response_model=list[ResultRead])
def get_anomaly_events(
    job_id: int,
    min_severity: str = Query(default="low", description="Minimum severity: normal|low|medium|high|critical"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[Result]:
    """Get anomaly events filtered by minimum severity level."""
    _authorize_job(job_id, current_user, db)
    severity_order = {"normal": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    min_val = severity_order.get(min_severity, 1)

    all_anomalies = (
        db.query(Result)
        .filter(Result.job_id == job_id, Result.modality == Modality.ANOMALY)
        .order_by(Result.timestamp_start_s)
        .all()
    )
    return [
        r for r in all_anomalies
        if severity_order.get(r.data.get("severity", "normal"), 0) >= min_val
    ]


@router.get("/job/{job_id}/alerts", response_model=list[ResultRead])
def get_alerts(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[Result]:
    """Get only HIGH and CRITICAL anomaly events (the real alerts)."""
    _authorize_job(job_id, current_user, db)
    all_anomalies = (
        db.query(Result)
        .filter(Result.job_id == job_id, Result.modality == Modality.ANOMALY)
        .order_by(Result.timestamp_start_s)
        .all()
    )
    return [r for r in all_anomalies if r.data.get("alert", False)]


@router.get("/job/{job_id}/modality/{modality}", response_model=list[ResultRead])
def get_results_by_modality(
    job_id: int,
    modality: Modality,
    min_confidence: float = Query(default=0.0, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[Result]:
    _authorize_job(job_id, current_user, db)
    query = (
        db.query(Result)
        .filter(Result.job_id == job_id, Result.modality == modality)
    )
    if min_confidence > 0:
        query = query.filter(Result.confidence >= min_confidence)
    return query.order_by(Result.timestamp_start_s).all()


@router.get("/job/{job_id}/timeline", response_model=list[ResultRead])
def get_timeline(
    job_id: int,
    start_s: float = Query(default=0.0, ge=0.0),
    end_s: float = Query(default=9999.0, ge=0.0),
    modalities: list[Modality] = Query(default=list(Modality)),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[Result]:
    _authorize_job(job_id, current_user, db)
    results = (
        db.query(Result)
        .filter(
            Result.job_id == job_id,
            Result.modality.in_(modalities),
            Result.timestamp_start_s >= start_s,
            Result.timestamp_end_s <= end_s,
        )
        .order_by(Result.timestamp_start_s)
        .all()
    )
    return results
