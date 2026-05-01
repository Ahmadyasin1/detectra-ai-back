"""
Integration tests for Videos, Analysis, and Results APIs.
All tests use the in-memory SQLite DB from conftest.py.
"""
import io
import pytest


# ─── Helper ──────────────────────────────────────────────────────────────────

def _make_mp4_bytes(size: int = 100) -> bytes:
    """Create a minimal fake MP4 file (just needs correct extension, not valid video)."""
    return b"\x00" * size


# ─── Videos API ──────────────────────────────────────────────────────────────

def test_upload_video_success(client, registered_user):
    """Upload a valid MP4 file."""
    headers = registered_user["headers"]
    resp = client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("test_video.mp4", io.BytesIO(_make_mp4_bytes(1024)), "video/mp4")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["original_filename"] == "test_video.mp4"
    assert data["status"] in ("uploaded", "ready")
    assert "id" in data


def test_upload_video_invalid_extension(client, registered_user):
    """Reject files with unsupported extensions."""
    headers = registered_user["headers"]
    resp = client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("malware.exe", io.BytesIO(b"data"), "application/octet-stream")},
    )
    assert resp.status_code == 415


def test_upload_video_requires_auth(client):
    """Upload endpoint must require authentication."""
    resp = client.post(
        "/api/v1/videos/upload",
        files={"file": ("video.mp4", io.BytesIO(_make_mp4_bytes()), "video/mp4")},
    )
    assert resp.status_code == 401


def test_list_videos_empty(client, registered_user):
    """Fresh user has no videos."""
    headers = registered_user["headers"]
    resp = client.get("/api/v1/videos/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["items"] == []


def test_list_videos_after_upload(client, registered_user):
    """After upload, video appears in list."""
    headers = registered_user["headers"]
    client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("clip.mp4", io.BytesIO(_make_mp4_bytes(512)), "video/mp4")},
    )
    resp = client.get("/api/v1/videos/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1


def test_get_video_by_id(client, registered_user):
    """GET /videos/{id} returns the correct video."""
    headers = registered_user["headers"]
    upload = client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("demo.mp4", io.BytesIO(_make_mp4_bytes(256)), "video/mp4")},
    )
    video_id = upload.json()["id"]

    resp = client.get(f"/api/v1/videos/{video_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == video_id


def test_get_video_not_found(client, registered_user):
    headers = registered_user["headers"]
    resp = client.get("/api/v1/videos/99999", headers=headers)
    assert resp.status_code == 404


def test_delete_video(client, registered_user):
    """DELETE removes the video."""
    headers = registered_user["headers"]
    upload = client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("todel.mp4", io.BytesIO(_make_mp4_bytes(128)), "video/mp4")},
    )
    video_id = upload.json()["id"]

    resp = client.delete(f"/api/v1/videos/{video_id}", headers=headers)
    assert resp.status_code == 204

    # Confirm it's gone
    resp = client.get(f"/api/v1/videos/{video_id}", headers=headers)
    assert resp.status_code == 404


# ─── Analysis API ────────────────────────────────────────────────────────────

def _upload_video(client, headers) -> int:
    """Helper: upload a fake MP4 and return its id."""
    resp = client.post(
        "/api/v1/videos/upload",
        headers=headers,
        files={"file": ("analysis_test.mp4", io.BytesIO(_make_mp4_bytes(512)), "video/mp4")},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_start_analysis_success(client, registered_user):
    """Start an analysis job for an uploaded video."""
    headers = registered_user["headers"]
    video_id = _upload_video(client, headers)

    resp = client.post(f"/api/v1/analysis/{video_id}/start", headers=headers, json={})
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert data["status"] in ("pending", "running", "completed")


def test_start_analysis_video_not_found(client, registered_user):
    """Starting analysis on non-existent video returns 404."""
    headers = registered_user["headers"]
    resp = client.post("/api/v1/analysis/99999/start", headers=headers, json={})
    assert resp.status_code == 404


def test_get_analysis_status(client, registered_user):
    """Can retrieve job status after starting analysis."""
    headers = registered_user["headers"]
    video_id = _upload_video(client, headers)

    start_resp = client.post(f"/api/v1/analysis/{video_id}/start", headers=headers, json={})
    job_id = start_resp.json()["job_id"]

    status_resp = client.get(f"/api/v1/analysis/{job_id}/status", headers=headers)
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["job_id"] == job_id
    assert "progress_pct" in data


def test_list_jobs_for_video(client, registered_user):
    """List all jobs for a video."""
    headers = registered_user["headers"]
    video_id = _upload_video(client, headers)
    client.post(f"/api/v1/analysis/{video_id}/start", headers=headers, json={})

    resp = client.get(f"/api/v1/analysis/video/{video_id}/jobs", headers=headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert isinstance(jobs, list)
    assert len(jobs) >= 1


# ─── Results API ─────────────────────────────────────────────────────────────

def test_get_results_job_not_found(client, registered_user):
    """Non-existent job returns 404."""
    headers = registered_user["headers"]
    resp = client.get("/api/v1/results/job/99999", headers=headers)
    assert resp.status_code == 404


def test_get_results_after_analysis(client, registered_user):
    """After a completed analysis job, results endpoint works."""
    headers = registered_user["headers"]
    video_id = _upload_video(client, headers)

    start_resp = client.post(f"/api/v1/analysis/{video_id}/start", headers=headers, json={})
    job_id = start_resp.json()["job_id"]

    resp = client.get(f"/api/v1/results/job/{job_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    assert "summary_stats" in data
    assert "object_detections" in data


def test_timeline_endpoint(client, registered_user):
    """Timeline endpoint returns a list."""
    headers = registered_user["headers"]
    video_id = _upload_video(client, headers)
    start_resp = client.post(f"/api/v1/analysis/{video_id}/start", headers=headers, json={})
    job_id = start_resp.json()["job_id"]

    resp = client.get(
        f"/api/v1/results/job/{job_id}/timeline",
        headers=headers,
        params={"start_s": 0, "end_s": 9999},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ─── Health check ────────────────────────────────────────────────────────────

def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "healthy")
