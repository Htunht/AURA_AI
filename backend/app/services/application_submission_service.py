import hashlib
import json
import secrets
import uuid
from pathlib import Path
from typing import BinaryIO

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.models.recruitment import (
    Application,
    ApplicationAnswer,
    Candidate,
    Job,
    ScreeningRubric,
    ScreeningRun,
)
from app.schemas.screening import ApplicationAnswerInput, ApplicationSubmissionReceipt
from app.services.github_repository_service import GitHubRepositoryError, normalize_github_url


ALLOWED_CV_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


class ApplicationSubmissionError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def hash_status_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_application_answers(raw_answers: str) -> list[ApplicationAnswerInput]:
    try:
        data = json.loads(raw_answers)
    except json.JSONDecodeError as exc:
        raise ApplicationSubmissionError(400, "Application answers must be valid JSON.") from exc

    if not isinstance(data, list):
        raise ApplicationSubmissionError(400, "Application answers must be a JSON list.")

    return [ApplicationAnswerInput.model_validate(item) for item in data]


def create_application_submission(
    *,
    db: Session,
    settings: Settings,
    job_id: uuid.UUID,
    candidate_full_name: str,
    candidate_email: str,
    candidate_phone: str | None,
    answers: list[ApplicationAnswerInput],
    github_repository_url: str | None,
    cv_file: UploadFile | None,
    consent: bool,
    idempotency_key: str | None,
) -> ApplicationSubmissionReceipt:
    if not consent:
        raise ApplicationSubmissionError(400, "Required consent was not provided.")
    if not candidate_full_name.strip() or "@" not in candidate_email:
        raise ApplicationSubmissionError(400, "Candidate name and email are required.")
    if not answers:
        raise ApplicationSubmissionError(400, "Application answers are required.")

    if idempotency_key:
        existing = db.scalar(select(Application).where(Application.submission_idempotency_key == idempotency_key))
        if existing:
            run = _latest_or_active_run(db, existing.id)
            return ApplicationSubmissionReceipt(
                application_id=existing.id,
                submission_status=existing.submission_status,
                screening_run_id=run.id,
                screening_status=run.status,
                status_token="",
                message="Application submitted successfully. AI screening has started.",
            )

    job = db.scalar(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.rubrics).selectinload(ScreeningRubric.criteria))
    )
    if job is None:
        raise ApplicationSubmissionError(404, "Job was not found.")
    if job.status != "PUBLISHED":
        raise ApplicationSubmissionError(400, "This job is not published.")
    if not job.is_accepting_applications:
        raise ApplicationSubmissionError(400, "This job is not accepting applications.")

    rubric = _published_rubric(job)
    if rubric is None:
        raise ApplicationSubmissionError(400, "This job does not have a published screening rubric.")
    if sum(criterion.weight for criterion in rubric.criteria) != 100:
        raise ApplicationSubmissionError(400, "Published screening rubric weights must total 100.")

    if job.cv_required and cv_file is None:
        raise ApplicationSubmissionError(400, "CV is required for this job.")
    normalized_github_url = None
    if github_repository_url:
        try:
            normalized_github_url = normalize_github_url(github_repository_url).url
        except GitHubRepositoryError as exc:
            raise ApplicationSubmissionError(400, exc.detail) from exc
    elif job.github_repository_required:
        raise ApplicationSubmissionError(400, "GitHub repository URL is required for this job.")

    candidate = db.scalar(select(Candidate).where(Candidate.email == candidate_email.lower().strip()))
    if candidate is None:
        candidate = Candidate(
            full_name=candidate_full_name.strip(),
            email=candidate_email.lower().strip(),
            phone=candidate_phone.strip() if candidate_phone else None,
        )
        db.add(candidate)
        db.flush()

    status_token = secrets.token_urlsafe(32)
    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        submission_status="SUBMITTED",
        stage="SCREENING",
        github_repository_url=normalized_github_url,
        cv_extraction_status="PENDING" if cv_file else "NOT_UPLOADED",
        submission_idempotency_key=idempotency_key,
        candidate_status_token_hash=hash_status_token(status_token),
    )
    db.add(application)
    db.flush()

    for answer in answers:
        if not answer.answer_text.strip():
            raise ApplicationSubmissionError(400, f"Answer is required for {answer.question_label}.")
        db.add(
            ApplicationAnswer(
                application_id=application.id,
                question_key=answer.question_key,
                question_label=answer.question_label,
                answer_text=answer.answer_text.strip(),
                linked_requirement_codes=answer.linked_requirement_codes,
            )
        )

    if cv_file is not None:
        _save_cv_file(settings, application, cv_file)

    screening_run = ScreeningRun(
        application_id=application.id,
        rubric_id=rubric.id,
        rubric_version=rubric.version,
        model=settings.openai_model,
        prompt_version=settings.ai_screening_prompt_version,
        status="QUEUED",
    )
    db.add(screening_run)
    db.flush()

    return ApplicationSubmissionReceipt(
        application_id=application.id,
        submission_status=application.submission_status,
        screening_run_id=screening_run.id,
        screening_status=screening_run.status,
        status_token=status_token,
        message="Application submitted successfully. AI screening has started.",
    )


def _published_rubric(job: Job) -> ScreeningRubric | None:
    published = [rubric for rubric in job.rubrics if rubric.status == "PUBLISHED"]
    if not published:
        return None
    return sorted(published, key=lambda item: item.version, reverse=True)[0]


def _latest_or_active_run(db: Session, application_id: uuid.UUID) -> ScreeningRun:
    run = db.scalar(
        select(ScreeningRun)
        .where(ScreeningRun.application_id == application_id)
        .order_by(ScreeningRun.created_at.desc())
    )
    if run is None:
        raise ApplicationSubmissionError(409, "Existing application has no screening run.")
    return run


def _save_cv_file(settings: Settings, application: Application, cv_file: UploadFile) -> None:
    if cv_file.content_type not in ALLOWED_CV_MIME_TYPES:
        raise ApplicationSubmissionError(400, "CV file type is not supported.")

    storage_root = Path(settings.cv_upload_directory)
    if not storage_root.is_absolute():
        storage_root = Path.cwd() / storage_root
    storage_root.mkdir(parents=True, exist_ok=True)

    extension = {
        "application/pdf": ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "text/plain": ".txt",
    }[cv_file.content_type or "text/plain"]
    destination = (storage_root / f"{application.id}{extension}").resolve()
    if storage_root.resolve() not in destination.parents:
        raise ApplicationSubmissionError(400, "CV storage path is invalid.")

    max_bytes = settings.cv_max_file_size_mb * 1024 * 1024
    size = _copy_limited(cv_file.file, destination, max_bytes)
    if size == 0:
        destination.unlink(missing_ok=True)
        raise ApplicationSubmissionError(400, "CV file is empty.")

    application.cv_original_filename = cv_file.filename
    application.cv_storage_path = str(destination)
    application.cv_mime_type = cv_file.content_type


def _copy_limited(source: BinaryIO, destination: Path, max_bytes: int) -> int:
    total = 0
    with destination.open("wb") as output:
        while chunk := source.read(1024 * 1024):
            total += len(chunk)
            if total > max_bytes:
                output.close()
                destination.unlink(missing_ok=True)
                raise ApplicationSubmissionError(400, "CV file exceeds the configured size limit.")
            output.write(chunk)
    return total
