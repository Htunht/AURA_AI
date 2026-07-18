import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth_dependencies import require_roles
from app.api.dependencies import get_db
from app.models.recruitment import ScreeningRun
from app.models.user import User

router = APIRouter(prefix="/screening-runs", tags=["Screening Runs"])


@router.get("/{screening_run_id}")
def get_screening_run(
    screening_run_id: uuid.UUID,
    _current_user: Annotated[User, Depends(require_roles("ADMIN", "RECRUITER", "HIRING_MANAGER"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    run = db.scalar(select(ScreeningRun).where(ScreeningRun.id == screening_run_id))
    if run is None:
        raise HTTPException(status_code=404, detail="Screening run was not found.")
    return {
        "id": run.id,
        "application_id": run.application_id,
        "status": run.status,
        "model": run.model,
        "prompt_version": run.prompt_version,
        "assessed_coverage": run.assessed_coverage,
        "weighted_score": float(run.weighted_score) if run.weighted_score is not None else None,
        "recommendation": run.recommendation,
        "error_code": run.error_code,
        "safe_error_detail": run.safe_error_detail,
        "created_at": run.created_at,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
    }
