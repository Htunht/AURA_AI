import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.auth_dependencies import require_roles
from app.api.dependencies import get_db
from app.models.recruitment import Job, JobApplicationFormField, JobRequirement, ScreeningRubric, ScreeningRubricCriterion, ScreeningRun
from app.models.user import User
from app.schemas.jobs import (
    RecruiterApplicationFormStepRequest,
    RecruiterJobOutput,
    RecruiterJobPublishRequest,
    RecruiterJobRequirementsStepRequest,
    RecruiterJobUpsertRequest,
    RecruiterScreeningRulesStepRequest,
)

router = APIRouter(prefix="/recruiter/jobs", tags=["Recruiter Jobs"])


StaffUser = Annotated[User, Depends(require_roles("ADMIN", "RECRUITER", "HIRING_MANAGER"))]
AdminRecruiter = Annotated[User, Depends(require_roles("ADMIN", "RECRUITER"))]


@router.get("", response_model=list[RecruiterJobOutput])
def list_jobs(
    _current_user: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[RecruiterJobOutput]:
    jobs = db.scalars(_job_statement().order_by(Job.updated_at.desc())).all()
    return [_serialize_job(job) for job in jobs]


@router.post("", response_model=RecruiterJobOutput, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: RecruiterJobUpsertRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = Job(
        title=payload.title,
        department=payload.department,
        description=payload.description,
        status="DRAFT",
        position_count=payload.position_count,
        employment_type=payload.employment_type,
        work_arrangement=payload.work_arrangement,
        location=payload.location,
        minimum_experience_years=payload.minimum_experience_years,
        application_deadline=payload.application_deadline,
        is_accepting_applications=False,
        cv_required=payload.cv_required,
        github_repository_required=payload.github_repository_required,
    )
    db.add(job)
    db.flush()
    _replace_job_children(db, job, payload)
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.get("/{job_id}", response_model=RecruiterJobOutput)
def get_job(
    job_id: uuid.UUID,
    _current_user: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    return _serialize_job(_load_job(db, job_id))


@router.put("/{job_id}", response_model=RecruiterJobOutput)
def update_job(
    job_id: uuid.UUID,
    payload: RecruiterJobUpsertRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    if job.status == "PUBLISHED":
        job.status = payload.status if payload.status in {"PUBLISHED", "CLOSED"} else "DRAFT"
    else:
        job.status = payload.status if payload.status in {"DRAFT", "CLOSED"} else job.status
    job.title = payload.title
    job.department = payload.department
    job.description = payload.description
    job.position_count = payload.position_count
    job.employment_type = payload.employment_type
    job.work_arrangement = payload.work_arrangement
    job.location = payload.location
    job.minimum_experience_years = payload.minimum_experience_years
    job.application_deadline = payload.application_deadline
    job.is_accepting_applications = payload.is_accepting_applications if job.status == "PUBLISHED" else False
    job.cv_required = payload.cv_required
    job.github_repository_required = payload.github_repository_required
    _replace_job_children(db, job, payload)
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.put("/{job_id}/requirements", response_model=RecruiterJobOutput)
def save_job_requirements_step(
    job_id: uuid.UUID,
    payload: RecruiterJobRequirementsStepRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    job.title = payload.title
    job.department = payload.department
    job.description = payload.description
    job.position_count = payload.position_count
    job.employment_type = payload.employment_type
    job.work_arrangement = payload.work_arrangement
    job.location = payload.location
    job.minimum_experience_years = payload.minimum_experience_years
    job.application_deadline = payload.application_deadline
    _replace_requirements(db, job, payload.requirements)
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.put("/{job_id}/application-form", response_model=RecruiterJobOutput)
def save_application_form_step(
    job_id: uuid.UUID,
    payload: RecruiterApplicationFormStepRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    job.cv_required = payload.cv_required
    job.github_repository_required = payload.github_repository_required
    _replace_application_fields(db, job, payload.application_fields)
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.put("/{job_id}/screening-rules", response_model=RecruiterJobOutput)
def save_screening_rules_step(
    job_id: uuid.UUID,
    payload: RecruiterScreeningRulesStepRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    _replace_screening_rubric(db, job, payload.screening_rubric)
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.post("/{job_id}/publish", response_model=RecruiterJobOutput)
def publish_job(
    job_id: uuid.UUID,
    payload: RecruiterJobPublishRequest,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    _validate_publishable(job)
    job.status = "PUBLISHED"
    job.is_accepting_applications = payload.is_accepting_applications
    rubric = _latest_rubric(job)
    if rubric:
        rubric.status = "PUBLISHED"
    db.commit()
    return _serialize_job(_load_job(db, job.id))


@router.post("/{job_id}/close", response_model=RecruiterJobOutput)
def close_job(
    job_id: uuid.UUID,
    _current_user: AdminRecruiter,
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterJobOutput:
    job = _load_job(db, job_id)
    job.status = "CLOSED"
    job.is_accepting_applications = False
    db.commit()
    return _serialize_job(_load_job(db, job.id))


def _job_statement():
    return select(Job).options(
        selectinload(Job.requirements),
        selectinload(Job.application_fields),
        selectinload(Job.rubrics).selectinload(ScreeningRubric.criteria),
    )


def _load_job(db: Session, job_id: uuid.UUID) -> Job:
    job = db.scalar(_job_statement().where(Job.id == job_id))
    if job is None:
        raise HTTPException(status_code=404, detail="Job was not found.")
    return job


def _replace_job_children(db: Session, job: Job, payload: RecruiterJobUpsertRequest) -> None:
    _replace_requirements(db, job, payload.requirements)
    _replace_application_fields(db, job, payload.application_fields)
    _replace_screening_rubric(db, job, payload.screening_rubric)


def _replace_requirements(db: Session, job: Job, requirements) -> None:
    job.requirements.clear()
    db.flush()
    for requirement in requirements:
        job.requirements.append(
            JobRequirement(
                code=requirement.code,
                title=requirement.title,
                description=requirement.description,
                priority=requirement.priority,
            )
        )


def _replace_application_fields(db: Session, job: Job, application_fields) -> None:
    job.application_fields.clear()
    db.flush()
    for index, field in enumerate(application_fields):
        job.application_fields.append(
            JobApplicationFormField(
                field_key=field.field_key,
                label=field.label,
                field_type=field.field_type,
                placeholder=field.placeholder,
                help_text=field.help_text,
                required=field.required,
                display_order=field.display_order or index,
                options=field.options,
                linked_requirement_codes=field.linked_requirement_codes,
                evaluation_categories=field.evaluation_categories,
            )
        )


def _replace_screening_rubric(db: Session, job: Job, screening_rubric) -> None:
    referenced_ids = _referenced_rubric_ids(db, job)
    preserved_rubrics = [rubric for rubric in job.rubrics if rubric.id in referenced_ids]
    job.rubrics[:] = preserved_rubrics
    db.flush()
    if screening_rubric:
        latest_version = max((rubric.version for rubric in preserved_rubrics), default=0)
        rubric = ScreeningRubric(
            version=max(screening_rubric.version, latest_version + 1),
            status=screening_rubric.status,
            minimum_assessed_coverage=screening_rubric.minimum_assessed_coverage,
            advance_threshold=screening_rubric.advance_threshold,
        )
        job.rubrics.append(rubric)
        for criterion in screening_rubric.criteria:
            rubric.criteria.append(
                ScreeningRubricCriterion(
                    criterion_key=criterion.criterion_key,
                    title=criterion.title,
                    description=criterion.description,
                    weight=criterion.weight,
                    must_have=criterion.must_have,
                    minimum_rating=criterion.minimum_rating,
                    linked_requirement_codes=criterion.linked_requirement_codes,
                )
            )


def _referenced_rubric_ids(db: Session, job: Job) -> set[uuid.UUID]:
    rubric_ids = [rubric.id for rubric in job.rubrics if rubric.id is not None]
    if not rubric_ids:
        return set()
    return set(db.scalars(select(ScreeningRun.rubric_id).where(ScreeningRun.rubric_id.in_(rubric_ids))).all())


def _latest_rubric(job: Job) -> ScreeningRubric | None:
    if not job.rubrics:
        return None
    return sorted(job.rubrics, key=lambda item: item.version, reverse=True)[0]


def _validate_publishable(job: Job) -> None:
    if not job.requirements:
        raise HTTPException(status_code=400, detail="Add job requirements before publishing.")
    if not job.application_fields:
        raise HTTPException(status_code=400, detail="Add application form fields before publishing.")
    present_keys = {field.field_key for field in job.application_fields}
    missing = {"full_name", "email", "github_repository_url", "cv"} - present_keys
    if missing:
        raise HTTPException(status_code=400, detail=f"Application form is missing required public fields: {', '.join(sorted(missing))}.")
    rubric = _latest_rubric(job)
    if rubric is None or not rubric.criteria:
        raise HTTPException(status_code=400, detail="Add screening rubric criteria before publishing.")
    total = sum(criterion.weight for criterion in rubric.criteria)
    if total != 100:
        raise HTTPException(status_code=400, detail=f"Screening rubric weights must total 100. Current total: {total}.")


def _serialize_job(job: Job) -> RecruiterJobOutput:
    rubric = _latest_rubric(job)
    return RecruiterJobOutput(
        id=job.id,
        title=job.title,
        department=job.department,
        description=job.description,
        status=job.status,
        position_count=job.position_count,
        employment_type=job.employment_type,
        work_arrangement=job.work_arrangement,
        location=job.location,
        minimum_experience_years=float(job.minimum_experience_years),
        application_deadline=job.application_deadline,
        is_accepting_applications=job.is_accepting_applications,
        cv_required=job.cv_required,
        github_repository_required=job.github_repository_required,
        created_at=job.created_at,
        updated_at=job.updated_at,
        requirements=[
            {
                "id": requirement.id,
                "code": requirement.code,
                "title": requirement.title,
                "description": requirement.description,
                "priority": requirement.priority,
            }
            for requirement in sorted(job.requirements, key=lambda item: item.code)
        ],
        application_fields=[
            {
                "id": field.id,
                "field_key": field.field_key,
                "label": field.label,
                "field_type": field.field_type,
                "placeholder": field.placeholder,
                "help_text": field.help_text,
                "required": field.required,
                "display_order": field.display_order,
                "options": field.options,
                "linked_requirement_codes": field.linked_requirement_codes,
                "evaluation_categories": field.evaluation_categories,
            }
            for field in sorted(job.application_fields, key=lambda item: item.display_order)
        ],
        screening_rubric=None
        if rubric is None
        else {
            "id": rubric.id,
            "version": rubric.version,
            "status": rubric.status,
            "minimum_assessed_coverage": rubric.minimum_assessed_coverage,
            "advance_threshold": rubric.advance_threshold,
            "criteria": [
                {
                    "id": criterion.id,
                    "criterion_key": criterion.criterion_key,
                    "title": criterion.title,
                    "description": criterion.description,
                    "weight": criterion.weight,
                    "must_have": criterion.must_have,
                    "minimum_rating": criterion.minimum_rating,
                    "linked_requirement_codes": criterion.linked_requirement_codes,
                }
                for criterion in sorted(rubric.criteria, key=lambda item: item.criterion_key)
            ],
        },
    )
