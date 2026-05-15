from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Detectra AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND_HEX_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    POSTGRES_USER: str = "detectra"
    POSTGRES_PASSWORD: str = "detectra_pass"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "detectra_db"
    DATABASE_URL_OVERRIDE: str | None = None

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            return str(self.DATABASE_URL_OVERRIDE)
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CELERY_TASK_ALWAYS_EAGER: bool = False

    # File Storage
    UPLOAD_DIR: Path = Path("uploads")
    MODELS_DIR: Path = Path("models")
    TEMP_DIR: Path = Path("temp")
    MAX_VIDEO_SIZE_MB: int = 500
    ALLOWED_VIDEO_EXTENSIONS: set[str] = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    # AI Pipeline
    FRAME_EXTRACTION_FPS: float = 1.0       # Frames per second to extract
    YOLO_CONFIDENCE_THRESHOLD: float = 0.5
    LOGO_CONFIDENCE_THRESHOLD: float = 0.7
    MOTION_WINDOW_FRAMES: int = 16          # VideoMAE sliding window
    MOTION_WINDOW_FPS: int = 8
    WHISPER_MODEL_SIZE: str = "base"        # tiny, base, small, medium
    YAMNET_WINDOW_S: float = 0.96           # YAMNet analysis window
    FUSION_TIME_BIN_S: float = 1.0          # Seconds per fusion time bin


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
