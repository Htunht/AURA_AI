from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import get_settings
from app.models.recruitment import Job, JobRequirement, ScreeningRubric, ScreeningRubricCriterion

router = APIRouter(prefix="/demo", tags=["Development Demo"])


@router.post("/seed-ai-screening")
def seed_ai_screening_demo(db: Annotated[Session, Depends(get_db)]) -> dict:
    if get_settings().app_env != "development":
        raise HTTPException(status_code=404, detail="Not found")

    job = db.scalar(select(Job).where(Job.title == "Backend Developer"))
    if job is None:
        job = Job(
            title="Backend Developer",
            department="Engineering",
            description="Build reliable APIs and services for AURA AI recruitment workflows.",
            status="PUBLISHED",
            is_accepting_applications=True,
            cv_required=False,
            github_repository_required=False,
        )
        db.add(job)
        db.flush()

        for code, title, priority in [
            ("api_design", "API design", "MUST_HAVE"),
            ("database_models", "Database models", "IMPORTANT"),
            ("testing", "Testing", "PREFERRED"),
        ]:
            db.add(
                JobRequirement(
                    job_id=job.id,
                    code=code,
                    title=title,
                    description=f"Evidence related to {title.lower()}.",
                    priority=priority,
                )
            )
        db.flush()

    rubric = db.scalar(select(ScreeningRubric).where(ScreeningRubric.job_id == job.id, ScreeningRubric.status == "PUBLISHED"))
    if rubric is None:
        rubric = ScreeningRubric(
            job_id=job.id,
            version=1,
            status="PUBLISHED",
            minimum_assessed_coverage=70,
            advance_threshold=70,
        )
        db.add(rubric)
        db.flush()
        for key, title, weight, must_have, minimum_rating, requirement_codes in [
            ("api_design", "API design", 40, True, 3, ["api_design"]),
            ("database_models", "Database modeling", 35, False, None, ["database_models"]),
            ("testing", "Testing practice", 25, False, None, ["testing"]),
        ]:
            db.add(
                ScreeningRubricCriterion(
                    rubric_id=rubric.id,
                    criterion_key=key,
                    title=title,
                    description=f"Assess submitted evidence for {title.lower()}.",
                    weight=weight,
                    must_have=must_have,
                    minimum_rating=minimum_rating,
                    linked_requirement_codes=requirement_codes,
                )
            )

    db.commit()
    return {"job_id": job.id, "rubric_id": rubric.id, "message": "Demo AI screening job and rubric are ready."}
