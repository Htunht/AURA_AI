import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import get_settings
from app.models.recruitment import Application, ScreeningRun
from app.schemas.screening import ApplicationSubmissionReceipt, CandidateSubmissionStatus
from app.services.ai_screening_orchestrator import process_application_screening
from app.services.application_submission_service import (
    ApplicationSubmissionError,
    create_application_submission,
    hash_status_token,
    parse_application_answers,
)

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/submit", response_model=ApplicationSubmissionReceipt, status_code=status.HTTP_202_ACCEPTED)
async def submit_application(
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    job_id: Annotated[uuid.UUID, Form()],
    candidate_full_name: Annotated[str, Form()],
    candidate_email: Annotated[str, Form()],
    application_answers: Annotated[str, Form()],
    candidate_phone: Annotated[str | None, Form()] = None,
    github_repository_url: Annotated[str | None, Form()] = None,
    consent: Annotated[bool, Form()] = False,
    cv_file: Annotated[UploadFile | None, File()] = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ApplicationSubmissionReceipt:
    try:
        receipt = create_application_submission(
            db=db,
            settings=get_settings(),
            job_id=job_id,
            candidate_full_name=candidate_full_name,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
            answers=parse_application_answers(application_answers),
            github_repository_url=github_repository_url,
            cv_file=cv_file,
            consent=consent,
            idempotency_key=idempotency_key,
        )
        db.commit()
    except ApplicationSubmissionError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if receipt.screening_status == "QUEUED":
        background_tasks.add_task(process_application_screening, receipt.application_id, receipt.screening_run_id)

    return receipt


@router.get("/{application_id}/submission-status", response_model=CandidateSubmissionStatus)
def get_submission_status(
    application_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    status_token: Annotated[str | None, Query(alias="status_token")] = None,
) -> CandidateSubmissionStatus:
    if not status_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Status token is required.")

    application = db.scalar(select(Application).where(Application.id == application_id))
    if application is None or application.candidate_status_token_hash != hash_status_token(status_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid status token.")

    run = db.scalar(
        select(ScreeningRun)
        .where(ScreeningRun.application_id == application.id)
        .order_by(ScreeningRun.created_at.desc())
    )
    return CandidateSubmissionStatus(
        application_id=application.id,
        submission_status=application.submission_status,
        screening_status=run.status if run else None,
        submitted_at=application.submitted_at,
        message=_candidate_message(application.submission_status),
    )


def _candidate_message(status_value: str) -> str:
    return {
        "SUBMITTED": "Your application was submitted successfully.",
        "PROCESSING": "Your application is being reviewed.",
        "SCREENED": "Your application review has been completed.",
        "REQUIRES_HUMAN_REVIEW": "Your application requires additional human review.",
        "SCREENING_FAILED": "Your application was submitted, but automated review is delayed.",
    }.get(status_value, "Your application status is available.")
