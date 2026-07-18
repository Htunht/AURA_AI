import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.auth_dependencies import require_roles
from app.api.dependencies import get_db
from app.core.config import get_settings
from app.models.recruitment import Application, GitHubRepositoryAnalysis, HumanScreeningReview, ScreeningRun
from app.models.user import User
from app.schemas.screening import (
    HumanScreeningReviewRequest,
    HumanScreeningReviewResponse,
    RecruiterScreeningDetail,
    RecruiterScreeningQueueItem,
)
from app.services.ai_screening_orchestrator import process_application_screening

router = APIRouter(prefix="/recruiter", tags=["Recruiter Screenings"])


StaffUser = Annotated[User, Depends(require_roles("ADMIN", "RECRUITER", "HIRING_MANAGER"))]
AdminRecruiter = Annotated[User, Depends(require_roles("ADMIN", "RECRUITER"))]


@router.get("/screenings", response_model=list[RecruiterScreeningQueueItem])
def list_screenings(
    _current_user: StaffUser,
    db: Annotated[Session, Depends(get_db)],
    screening_status: Annotated[str | None, Query()] = None,
    job_id: Annotated[uuid.UUID | None, Query()] = None,
    recommendation: Annotated[str | None, Query()] = None,
) -> list[RecruiterScreeningQueueItem]:
    statement = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.screening_runs),
        )
        .order_by(Application.submitted_at.desc())
    )
    if job_id:
        statement = statement.where(Application.job_id == job_id)

    items: list[RecruiterScreeningQueueItem] = []
    for application in db.scalars(statement).all():
        run = _latest_run(application)
        if screening_status and (run.status if run else None) != screening_status:
            continue
        if recommendation and (run.recommendation if run else None) != recommendation:
            continue
        items.append(
            RecruiterScreeningQueueItem(
                application_id=application.id,
                screening_run_id=run.id if run else None,
                job_id=application.job_id,
                candidate_name=application.candidate.full_name,
                candidate_email=application.candidate.email,
                job_title=application.job.title,
                submission_status=application.submission_status,
                screening_status=run.status if run else None,
                recommendation=run.recommendation if run else None,
                weighted_score=float(run.weighted_score) if run and run.weighted_score is not None else None,
                assessed_coverage=run.assessed_coverage if run else None,
                submitted_at=application.submitted_at,
                completed_at=run.completed_at if run else None,
                requires_human_review=_requires_human_review(application, run),
            )
        )
    return items


@router.get("/applications/{application_id}/screening", response_model=RecruiterScreeningDetail)
def get_screening_detail(
    application_id: uuid.UUID,
    _current_user: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterScreeningDetail:
    application = _load_application(db, application_id)
    run = _latest_run(application)
    github_analysis = db.scalar(
        select(GitHubRepositoryAnalysis)
        .where(GitHubRepositoryAnalysis.application_id == application.id)
        .order_by(GitHubRepositoryAnalysis.created_at.desc())
    )
    reviews = db.scalars(
        select(HumanScreeningReview)
        .where(HumanScreeningReview.application_id == application.id)
        .order_by(HumanScreeningReview.created_at.desc())
    ).all()
    return RecruiterScreeningDetail(
        application_id=application.id,
        screening_run_id=run.id if run else None,
        candidate_name=application.candidate.full_name,
        candidate_email=application.candidate.email,
        job_title=application.job.title,
        candidate={
            "id": str(application.candidate.id),
            "full_name": application.candidate.full_name,
            "email": application.candidate.email,
            "phone": application.candidate.phone,
        },
        job={
            "id": str(application.job.id),
            "title": application.job.title,
            "department": application.job.department,
            "description": application.job.description,
        },
        submission_status=application.submission_status,
        screening_status=run.status if run else None,
        weighted_score=float(run.weighted_score) if run and run.weighted_score is not None else None,
        assessed_coverage=run.assessed_coverage if run else None,
        recommendation=run.recommendation if run else None,
        overall_confidence=run.overall_confidence if run else None,
        overall_strengths=run.overall_strengths if run else [],
        overall_concerns=run.overall_concerns if run else [],
        unresolved_requirements=run.unresolved_requirements if run else [],
        data_quality_warnings=run.data_quality_warnings if run else [],
        cv_extraction_status=application.cv_extraction_status,
        github_repository_url=application.github_repository_url,
        github_analysis=_github_analysis_payload(github_analysis),
        error_code=run.error_code if run else None,
        safe_error_detail=run.safe_error_detail if run else None,
        submitted_at=application.submitted_at,
        started_at=run.started_at if run else None,
        completed_at=run.completed_at if run else None,
        requires_human_review=_requires_human_review(application, run),
        criterion_results=[
            {
                "criterion_key": item.criterion_key,
                "suggested_rating": item.suggested_rating,
                "normalized_score": item.normalized_score,
                "weight": item.weight,
                "weighted_contribution": float(item.weighted_contribution) if item.weighted_contribution is not None else None,
                "confidence": item.confidence,
                "evidence_summary": item.evidence_summary,
                "strengths": item.strengths,
                "concerns": item.concerns,
                "missing_evidence": item.missing_evidence,
                "requires_human_review": item.requires_human_review,
            }
            for item in (run.criterion_results if run else [])
        ],
        evidence_references=[
            {
                "criterion_key": item.criterion_key,
                "evidence_id": item.evidence_id,
                "source_type": item.source_type,
                "explanation": item.explanation,
            }
            for item in (run.evidence_references if run else [])
        ],
        human_reviews=[
            {
                "id": str(review.id),
                "screening_run_id": str(review.screening_run_id),
                "action": review.action,
                "override_reason": review.override_reason,
                "reviewer_notes": review.reviewer_notes,
                "created_at": review.created_at.isoformat(),
            }
            for review in reviews
        ],
    )


@router.post("/applications/{application_id}/screening/retry", response_model=RecruiterScreeningQueueItem, status_code=status.HTTP_202_ACCEPTED)
def retry_screening(
    application_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterScreeningQueueItem:
    application = _load_application(db, application_id)
    latest = _latest_run(application)
    if latest is None or latest.status != "FAILED":
        raise HTTPException(status_code=400, detail="Only failed screening runs can be retried.")
    if any(run.status in {"QUEUED", "PROCESSING"} for run in application.screening_runs):
        raise HTTPException(status_code=409, detail="A screening run is already active.")

    new_run = ScreeningRun(
        application_id=application.id,
        rubric_id=latest.rubric_id,
        rubric_version=latest.rubric_version,
        model=get_settings().openai_model,
        prompt_version=get_settings().ai_screening_prompt_version,
        status="QUEUED",
    )
    application.submission_status = "SUBMITTED"
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    background_tasks.add_task(process_application_screening, application.id, new_run.id)

    return RecruiterScreeningQueueItem(
        application_id=application.id,
        screening_run_id=new_run.id,
        job_id=application.job_id,
        candidate_name=application.candidate.full_name,
        candidate_email=application.candidate.email,
        job_title=application.job.title,
        submission_status=application.submission_status,
        screening_status=new_run.status,
        recommendation=None,
        weighted_score=None,
        assessed_coverage=None,
        submitted_at=application.submitted_at,
        completed_at=None,
        requires_human_review=False,
    )


@router.post("/applications/{application_id}/screening/review", response_model=HumanScreeningReviewResponse)
def record_human_review(
    application_id: uuid.UUID,
    payload: HumanScreeningReviewRequest,
    current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> HumanScreeningReviewResponse:
    application = _load_application(db, application_id)
    run = _latest_run(application)
    if run is None or run.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="A completed screening run is required before human review.")
    if payload.action.startswith("OVERRIDE") and not (payload.override_reason or "").strip():
        raise HTTPException(status_code=400, detail="Override actions require a reason.")

    review = HumanScreeningReview(
        application_id=application.id,
        screening_run_id=run.id,
        reviewer_id=current_user.id,
        action=payload.action,
        override_reason=payload.override_reason,
        reviewer_notes=payload.reviewer_notes,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return HumanScreeningReviewResponse(
        id=review.id,
        application_id=review.application_id,
        screening_run_id=review.screening_run_id,
        action=review.action,
        created_at=review.created_at,
    )


def _load_application(db: Session, application_id: uuid.UUID) -> Application:
    application = db.scalar(
        select(Application)
        .where(Application.id == application_id)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.screening_runs).selectinload(ScreeningRun.criterion_results),
            selectinload(Application.screening_runs).selectinload(ScreeningRun.evidence_references),
        )
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application was not found.")
    return application


def _latest_run(application: Application) -> ScreeningRun | None:
    if not application.screening_runs:
        return None
    return sorted(application.screening_runs, key=lambda item: item.created_at, reverse=True)[0]


def _requires_human_review(application: Application, run: ScreeningRun | None) -> bool:
    if application.submission_status == "REQUIRES_HUMAN_REVIEW":
        return True
    if run is None:
        return False
    if run.status == "FAILED":
        return True
    return run.recommendation in {"HOLD_FOR_REVIEW", "INSUFFICIENT_EVIDENCE"}


def _github_analysis_payload(analysis: GitHubRepositoryAnalysis | None) -> dict | None:
    if analysis is None:
        return None
    return {
        "repository_url": analysis.repository_url,
        "owner": analysis.owner,
        "repository_name": analysis.repository_name,
        "default_branch": analysis.default_branch,
        "primary_language": analysis.primary_language,
        "languages": analysis.languages,
        "analysis_status": analysis.analysis_status,
        "error_code": analysis.error_code,
        "warnings": analysis.warnings,
        "files_reviewed_count": analysis.files_reviewed_count,
        "tests_detected": analysis.tests_detected,
        "ci_detected": analysis.ci_detected,
        "docker_detected": analysis.docker_detected,
        "analyzed_at": analysis.analyzed_at.isoformat() if analysis.analyzed_at else None,
    }
