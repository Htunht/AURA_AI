from fastapi import FastAPI
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.core.config import get_settings
from app.db.session import engine

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
)

app.include_router(
    auth_router,
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