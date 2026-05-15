from celery import Celery

from app.config import settings

celery_app = Celery(
    "detectra",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.services.pipeline.orchestrator"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,   # Process one heavy task at a time
    task_routes={
        "app.services.pipeline.orchestrator.run_analysis_pipeline": {"queue": "analysis"},
    },
    task_time_limit=3600,           # 1 hour max per task
    task_soft_time_limit=3300,      # Soft limit: send warning at 55 min
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
)
