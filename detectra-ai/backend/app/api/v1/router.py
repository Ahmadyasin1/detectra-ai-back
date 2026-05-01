from fastapi import APIRouter

from app.api.v1 import auth, videos, analysis, results, reports

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(videos.router)
api_router.include_router(analysis.router)
api_router.include_router(results.router)
api_router.include_router(reports.router)
