import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db
from app.models.recruitment import Job, JobRequirement, ScreeningRubric
from app.schemas.screening import PublicApplicationFormField, PublicJobApplicationForm

router = APIRouter(prefix="/public/jobs", tags=["Public Jobs"])


@router.get("/latest/application-form", response_model=PublicJobApplicationForm)
def get_latest_public_application_form(
    db: Annotated[Session, Depends(get_db)],
) -> PublicJobApplicationForm:
    job = db.scalar(
        select(Job)
        .where(Job.status == "PUBLISHED", Job.is_accepting_applications.is_(True))
        .options(selectinload(Job.requirements), selectinload(Job.rubrics).selectinload(ScreeningRubric.criteria))
        .order_by(Job.created_at.desc())
    )
    if job is None:
        raise HTTPException(status_code=404, detail="No published backend job is accepting applications.")
    return _public_form(job)


@router.get("/{job_id}/application-form", response_model=PublicJobApplicationForm)
def get_public_application_form(
    job_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
) -> PublicJobApplicationForm:
    job = db.scalar(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.requirements), selectinload(Job.rubrics).selectinload(ScreeningRubric.criteria))
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Published backend job was not found.")
    if job.status != "PUBLISHED" or not job.is_accepting_applications:
        raise HTTPException(status_code=400, detail="This backend job is not accepting applications.")
    return _public_form(job)


def _public_form(job: Job) -> PublicJobApplicationForm:
    fields: list[PublicApplicationFormField] = [
        PublicApplicationFormField(id="field-full-name", key="full_name", label="Full Name", type="TEXT", required=True, placeholder="Your full name"),
        PublicApplicationFormField(id="field-email", key="email", label="Email", type="EMAIL", required=True, placeholder="you@example.com"),
        PublicApplicationFormField(id="field-phone", key="phone", label="Phone", type="PHONE", required=False, placeholder="+1 555 0100"),
    ]
    for requirement in sorted(job.requirements, key=lambda item: (item.priority != "MUST_HAVE", item.code)):
        fields.append(
            PublicApplicationFormField(
                id=f"field-requirement-{requirement.code}",
                key=f"requirement_{requirement.code}",
                label=requirement.title,
                type="TEXTAREA",
                required=requirement.priority == "MUST_HAVE",
                helpText=requirement.description,
                linkedRequirementCodes=[requirement.code],
            )
        )
    fields.append(
        PublicApplicationFormField(
            id="field-github-repository-url",
            key="github_repository_url",
            label="GitHub Repository URL",
            type="URL",
            required=job.github_repository_required,
            placeholder="https://github.com/username/repository",
            helpText="Enter a public GitHub repository URL containing work relevant to this role.",
        )
    )
    fields.append(
        PublicApplicationFormField(
            id="field-cv",
            key="cv",
            label="CV / Resume",
            type="FILE",
            required=job.cv_required,
            helpText="Upload a PDF, DOCX, or TXT CV.",
        )
    )
    return PublicJobApplicationForm(
        job_id=job.id,
        title=job.title,
        department=job.department,
        description=job.description,
        cv_required=job.cv_required,
        github_repository_required=job.github_repository_required,
        fields=fields,
    )
