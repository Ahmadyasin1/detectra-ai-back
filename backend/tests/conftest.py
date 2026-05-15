"""
Pytest configuration for Detectra AI backend tests.
Uses SQLite in-memory DB so no PostgreSQL needed for unit tests.
"""
# ── Set env vars BEFORE any app imports so pydantic-settings reads them ──────
import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL_OVERRIDE", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_ci_only_not_production")
os.environ.setdefault("CELERY_BROKER_URL", "memory://")
os.environ.setdefault("CELERY_RESULT_BACKEND", "cache+memory://")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("DEBUG", "true")

# Bust the lru_cache so settings picks up the env overrides above
from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.db.models  # noqa: E402,F401  ensure models are registered
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402

# SQLite in-memory engine for tests
SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Each test gets a fresh DB state via transaction rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    """Create and return a test user + auth token."""
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@detectra.ai",
        "password": "password123",
        "full_name": "Test User",
    })
    assert resp.status_code == 201

    login = client.post("/api/v1/auth/login", data={
        "username": "test@detectra.ai",
        "password": "password123",
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"token": token, "headers": {"Authorization": f"Bearer {token}"}}
