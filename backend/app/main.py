from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.applications import router as applications_router
from app.api.auth import router as auth_router
from app.api.demo import router as demo_router
from app.api.public_jobs import router as public_jobs_router
from app.api.recruiter_screenings import router as recruiter_screenings_router
from app.api.screening_runs import router as screening_runs_router
from app.core.config import get_settings
from app.db.session import engine

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    applications_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    public_jobs_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    recruiter_screenings_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    screening_runs_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    demo_router,
    prefix=settings.api_v1_prefix,
)


@app.get("/api/v1/health/live")
def health_live() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
    }


@app.get("/api/v1/health/ready")
def health_ready() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "ready",
        "database": "connected",
    }
