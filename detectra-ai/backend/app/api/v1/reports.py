from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.models.analysis_job import AnalysisJob
from app.db.models.user import User
from app.db.models.video import Video
from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports"])


def _authorize_job(job_id: int, user: User, db: Session) -> tuple[AnalysisJob, Video]:
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise NotFoundException("Analysis job")
    video = db.get(Video, job.video_id)
    if not video or video.user_id != user.id:
        raise ForbiddenException()
    return job, video


@router.get("/job/{job_id}/pdf")
def download_pdf_report(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Response:
    job, video = _authorize_job(job_id, current_user, db)
    generator = ReportGenerator(db)
    pdf_bytes = generator.generate_pdf(job, video, current_user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="detectra-report-job{job_id}.pdf"'
        },
    )


@router.get("/job/{job_id}/csv")
def download_csv_report(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Response:
    job, video = _authorize_job(job_id, current_user, db)
    generator = ReportGenerator(db)
    csv_bytes = generator.generate_csv(job)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="detectra-results-job{job_id}.csv"'
        },
    )
