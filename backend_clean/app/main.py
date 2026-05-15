from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

# Import all models to ensure they are registered with SQLAlchemy metadata
import app.db.models  # noqa: F401
from app.api.v1.router import api_router
from app.config import settings
from app.core.logging import configure_logging, logger
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info("Starting Detectra AI", version=settings.APP_VERSION, env=settings.ENVIRONMENT)

    # Create upload/temp directories
    for d in [settings.UPLOAD_DIR, settings.MODELS_DIR, settings.TEMP_DIR]:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Create all DB tables (in development only, production uses migrations)
    if settings.ENVIRONMENT == "development" and "pytest" not in str(Path(__file__).parent):
        import os
        if not os.getenv("PYTEST_CURRENT_TEST"):
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables ensured")

    logger.info("Detectra AI startup complete")
    yield

    logger.info("Detectra AI shutting down")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Detectra AI — Multimodal Video Intelligence Platform. "
            "Analyzes video for objects, logos, motion, speech, and audio "
            "events using a transformer-based fusion engine."
        ),
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Include all API routes
    app.include_router(api_router)

    # Serve static assets under /static and provide a simple index at /
    static_path = Path("static")
    static_path.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(static_path), html=True), name="static")

    # Serve uploaded files (thumbnails etc.) — in production use Nginx
    uploads_path = Path(settings.UPLOAD_DIR)
    uploads_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

    @app.get("/", include_in_schema=False)
    async def root_index():
        index = Path("static/index.html")
        if index.exists():
            from fastapi.responses import FileResponse
            return FileResponse(index)
        return {"message": "Detectra minimal frontend not installed"}

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "version": settings.APP_VERSION}

    return app


app = create_application()
