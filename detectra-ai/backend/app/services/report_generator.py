"""
Report Generator
Produces PDF reports (WeasyPrint) and CSV exports (pandas) from analysis results.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone

import structlog
from sqlalchemy.orm import Session

from app.db.models.analysis_job import AnalysisJob
from app.db.models.result import Modality, Result
from app.db.models.user import User
from app.db.models.video import Video

logger = structlog.get_logger(__name__)


class ReportGenerator:
    def __init__(self, db: Session):
        self.db = db

    def _fetch_all_results(self, job_id: int) -> dict[str, list[Result]]:
        results = {}
        for modality in Modality:
            results[modality.value] = (
                self.db.query(Result)
                .filter(Result.job_id == job_id, Result.modality == modality)
                .order_by(Result.timestamp_start_s)
                .all()
            )
        return results

    def generate_pdf(self, job: AnalysisJob, video: Video, user: User) -> bytes:
        """Generate a well-formatted PDF report using WeasyPrint."""
        from weasyprint import HTML

        results = self._fetch_all_results(job.id)
        html = self._build_html_report(job, video, user, results)
        pdf_bytes = HTML(string=html).write_pdf()
        logger.info("PDF report generated", job_id=job.id, size_bytes=len(pdf_bytes))
        return pdf_bytes

    def _build_html_report(
        self,
        job: AnalysisJob,
        video: Video,
        user: User,
        results: dict[str, list[Result]],
    ) -> str:
        fused = results.get("fused", [])
        objects = results.get("object", [])
        logos = results.get("logo", [])
        motions = results.get("motion", [])
        speech = results.get("speech", [])
        audio = results.get("audio", [])

        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        duration = f"{video.duration_seconds:.1f}s" if video.duration_seconds else "Unknown"

        def fmts(ts: float) -> str:
            m = int(ts // 60)
            s = ts % 60
            return f"{m:02d}:{s:05.2f}"

        fused_rows = ""
        for r in fused:
            data = r.data
            fused_rows += f"""
            <tr>
              <td>{fmts(r.timestamp_start_s)}</td>
              <td><strong>{data.get("scene_label","").replace("_"," ").title()}</strong></td>
              <td>{data.get("summary","")}</td>
              <td>{data.get("anomaly_score", 0.0):.2f}</td>
              <td>{data.get("visual_audio_correlation", 0.0):.2f}</td>
            </tr>"""

        speech_rows = ""
        for r in speech:
            speech_rows += f"""
            <tr>
              <td>{fmts(r.timestamp_start_s)} → {fmts(r.timestamp_end_s)}</td>
              <td>{r.data.get("text","")}</td>
              <td>{r.data.get("language","")}</td>
            </tr>"""

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 12px; color: #1a1a2e; }}
  .cover {{ background: linear-gradient(135deg, #16213e, #0f3460); color: white; padding: 60px 50px; min-height: 200px; }}
  .cover h1 {{ font-size: 36px; font-weight: 700; letter-spacing: -1px; }}
  .cover .subtitle {{ font-size: 16px; opacity: 0.8; margin-top: 8px; }}
  .cover .meta {{ margin-top: 30px; font-size: 13px; opacity: 0.7; }}
  .section {{ padding: 24px 50px; border-bottom: 1px solid #e8eaf6; }}
  .section h2 {{ font-size: 18px; color: #0f3460; margin-bottom: 16px; border-left: 4px solid #e94560; padding-left: 10px; }}
  .stat-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }}
  .stat-card {{ background: #f8f9fd; border-radius: 8px; padding: 16px; text-align: center; }}
  .stat-card .value {{ font-size: 28px; font-weight: 700; color: #0f3460; }}
  .stat-card .label {{ font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
  th {{ background: #0f3460; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 11px; }}
  tr:nth-child(even) td {{ background: #fafafa; }}
  .footer {{ padding: 20px 50px; text-align: center; font-size: 10px; color: #999; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }}
  .badge-completed {{ background: #d4edda; color: #155724; }}
  @page {{ margin: 0; }}
</style>
</head>
<body>
<div class="cover">
  <h1>Detectra AI</h1>
  <div class="subtitle">Multimodal Video Intelligence Report</div>
  <div class="meta">
    <p><strong>Video:</strong> {video.original_filename}</p>
    <p><strong>Duration:</strong> {duration} | <strong>Resolution:</strong> {video.width}×{video.height}</p>
    <p><strong>Analysis Job:</strong> #{job.id} | <strong>Status:</strong> {job.status.upper()}</p>
    <p><strong>Analyst:</strong> {user.full_name} ({user.email})</p>
    <p><strong>Generated:</strong> {generated_at}</p>
  </div>
</div>

<div class="section">
  <h2>Executive Summary</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">{sum(len(r.data.get("detections",[])) for r in results.get("object",[]))}</div><div class="label">Object Detections</div></div>
    <div class="stat-card"><div class="value">{sum(len(r.data.get("detections",[])) for r in results.get("logo",[]))}</div><div class="label">Logo Detections</div></div>
    <div class="stat-card"><div class="value">{len(results.get("motion",[]))}</div><div class="label">Action Segments</div></div>
    <div class="stat-card"><div class="value">{len(speech)}</div><div class="label">Speech Segments</div></div>
    <div class="stat-card"><div class="value">{len(audio)}</div><div class="label">Audio Events</div></div>
    <div class="stat-card"><div class="value">{len(fused)}</div><div class="label">Fused Insights</div></div>
  </div>
</div>

<div class="section">
  <h2>Fused Timeline Insights</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Scene</th><th>Summary</th><th>Anomaly</th><th>V-A Correlation</th></tr></thead>
    <tbody>{fused_rows or "<tr><td colspan='5'>No fusion insights available</td></tr>"}</tbody>
  </table>
</div>

<div class="section">
  <h2>Speech Transcript</h2>
  <table>
    <thead><tr><th>Time Range</th><th>Transcription</th><th>Language</th></tr></thead>
    <tbody>{speech_rows or "<tr><td colspan='3'>No speech detected</td></tr>"}</tbody>
  </table>
</div>

<div class="footer">
  Generated by Detectra AI • University of Central Punjab • FYP F25AI009 •
  {generated_at}
</div>
</body>
</html>"""

    def generate_csv(self, job: AnalysisJob) -> bytes:
        """Generate a CSV with all results across all modalities."""
        import pandas as pd

        results = self._fetch_all_results(job.id)
        rows = []
        for modality, result_list in results.items():
            for r in result_list:
                rows.append({
                    "job_id": job.id,
                    "modality": modality,
                    "timestamp_start_s": r.timestamp_start_s,
                    "timestamp_end_s": r.timestamp_end_s,
                    "confidence": r.confidence,
                    "data": str(r.data),
                })

        df = pd.DataFrame(rows)
        buf = io.BytesIO()
        df.to_csv(buf, index=False, encoding="utf-8")
        csv_bytes = buf.getvalue()
        logger.info("CSV report generated", job_id=job.id, rows=len(rows))
        return csv_bytes
