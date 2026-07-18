import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.recruitment import (
    Application,
    GitHubCodeEvidence,
    GitHubRepositoryAnalysis,
    Job,
    ScreeningCriterionResult,
    ScreeningEvidenceReference,
    ScreeningRubric,
    ScreeningRun,
)
from app.schemas.screening import ScreeningEvidenceInput
from app.services.cv_extraction_service import CVExtractionError, CVExtractionService
from app.services.github_repository_service import GitHubRepositoryError, GitHubRepositoryService, normalize_github_url
from app.services.screening_ai_client import create_screening_ai_client
from app.services.screening_deidentification import build_deidentified_screening_payload
from app.services.screening_output_validation import ScreeningOutputValidationError, validate_screening_output
from app.services.screening_scoring_service import calculate_screening_score


async def process_application_screening(application_id: uuid.UUID, screening_run_id: uuid.UUID) -> None:
    with SessionLocal() as db:
        try:
            _process_application_screening(db, application_id, screening_run_id)
        except Exception as exc:
            db.rollback()
            _mark_failed(application_id, screening_run_id, type(exc).__name__, "Automated screening could not be completed.")


def _process_application_screening(db: Session, application_id: uuid.UUID, screening_run_id: uuid.UUID) -> None:
    settings = get_settings()
    run = db.scalar(select(ScreeningRun).where(ScreeningRun.id == screening_run_id))
    application = db.scalar(
        select(Application)
        .where(Application.id == application_id)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job).selectinload(Job.requirements),
            selectinload(Application.job).selectinload(Job.rubrics).selectinload(ScreeningRubric.criteria),
            selectinload(Application.answers),
        )
    )
    if run is None or application is None:
        return
    if run.status != "QUEUED":
        return

    rubric = next((item for item in application.job.rubrics if item.id == run.rubric_id), None)
    if rubric is None:
        raise RuntimeError("PUBLISHED_RUBRIC_NOT_FOUND")
    criteria = sorted(rubric.criteria, key=lambda item: item.criterion_key)
    if sum(criterion.weight for criterion in criteria) != 100:
        raise RuntimeError("INVALID_RUBRIC_WEIGHT_TOTAL")

    now = datetime.now(UTC)
    run.status = "PROCESSING"
    run.started_at = now
    application.submission_status = "PROCESSING"
    db.commit()

    evidence: list[ScreeningEvidenceInput] = []
    warnings: list[str] = []
    criterion_keys_by_requirement = {
        code: [criterion.criterion_key for criterion in criteria if code in criterion.linked_requirement_codes]
        for requirement in application.job.requirements
        for code in [requirement.code]
    }

    for answer in application.answers:
        related_keys = [
            key
            for code in answer.linked_requirement_codes
            for key in criterion_keys_by_requirement.get(code, [])
        ] or [criterion.criterion_key for criterion in criteria]
        evidence.append(
            ScreeningEvidenceInput(
                evidence_id=f"form:answer:{answer.id}",
                source_type="APPLICATION_FORM",
                source_record_id=str(answer.id),
                text=f"{answer.question_label}: {answer.answer_text}",
                related_criterion_keys=related_keys,
            )
        )

    if application.cv_storage_path:
        extractor = CVExtractionService(settings.cv_max_extracted_characters)
        try:
            status, cv_text, cv_warnings = extractor.extract_text(Path(application.cv_storage_path), application.cv_mime_type or "")
            application.cv_extraction_status = status
            application.cv_extracted_text = cv_text
            warnings.extend(cv_warnings)
            if cv_text:
                evidence.append(
                    ScreeningEvidenceInput(
                        evidence_id=f"cv:application:{application.id}",
                        source_type="CV",
                        source_record_id=str(application.id),
                        text=cv_text,
                        related_criterion_keys=[criterion.criterion_key for criterion in criteria],
                    )
                )
        except CVExtractionError as exc:
            application.cv_extraction_status = "FAILED"
            warnings.append(exc.detail)

    if application.github_repository_url:
        try:
            github_service = GitHubRepositoryService(
                api_base_url=settings.github_api_base_url,
                token=settings.github_token,
                timeout_seconds=settings.github_request_timeout_seconds,
                max_files=settings.github_max_files,
                max_file_size_bytes=settings.github_max_file_size_bytes,
                max_total_characters=settings.github_max_total_characters,
            )
            github_result = github_service.analyze(application.github_repository_url)
            analysis = GitHubRepositoryAnalysis(
                application_id=application.id,
                repository_url=github_result.repository.url,
                owner=github_result.repository.owner,
                repository_name=github_result.repository.repository,
                default_branch=github_result.default_branch,
                repository_description=github_result.description,
                primary_language=github_result.primary_language,
                languages=github_result.languages,
                repository_size=github_result.repository_size,
                is_fork=github_result.is_fork,
                archived=github_result.archived,
                readme_present=any(item.path.lower().startswith("readme") for item in github_result.files),
                tests_detected=any("test" in item.path.lower() for item in github_result.files),
                ci_detected=any(item.path.lower().startswith(".github/workflows/") for item in github_result.files),
                docker_detected=any("dockerfile" in item.path.lower() or "compose" in item.path.lower() for item in github_result.files),
                dependency_files=[item.path for item in github_result.files if item.path.lower().endswith(("package.json", "requirements.txt", "pyproject.toml"))],
                files_reviewed_count=len(github_result.files),
                total_characters_analyzed=sum(len(item.content) for item in github_result.files),
                analysis_status="COMPLETED",
                warnings=github_result.warnings,
                analyzed_at=datetime.now(UTC),
            )
            db.add(analysis)
            db.flush()
            warnings.extend(github_result.warnings)
            for selected_file in github_result.files:
                evidence_id = f"github:file:{selected_file.path}"
                db.add(
                    GitHubCodeEvidence(
                        repository_analysis_id=analysis.id,
                        evidence_id=evidence_id,
                        file_path=selected_file.path,
                        language=selected_file.language,
                        evidence_type="STATIC_FILE_REVIEW",
                        summary=f"The submitted repository contains evidence in {selected_file.path}.",
                        content_excerpt=selected_file.content[:2500],
                        related_criterion_keys=[criterion.criterion_key for criterion in criteria],
                    )
                )
                evidence.append(
                    ScreeningEvidenceInput(
                        evidence_id=evidence_id,
                        source_type="GITHUB",
                        source_record_id=str(analysis.id),
                        text=selected_file.content[:2500],
                        related_criterion_keys=[criterion.criterion_key for criterion in criteria],
                    )
                )
        except GitHubRepositoryError as exc:
            parsed = normalize_github_url(application.github_repository_url)
            db.add(
                GitHubRepositoryAnalysis(
                    application_id=application.id,
                    repository_url=parsed.url,
                    owner=parsed.owner,
                    repository_name=parsed.repository,
                    languages={},
                    is_fork=False,
                    archived=False,
                    readme_present=False,
                    tests_detected=False,
                    ci_detected=False,
                    docker_detected=False,
                    dependency_files=[],
                    files_reviewed_count=0,
                    total_characters_analyzed=0,
                    analysis_status="FAILED",
                    error_code=exc.code,
                    warnings=[exc.detail, "Repository ownership has not been independently verified."],
                )
            )
            warnings.append(exc.detail)

    payload = build_deidentified_screening_payload(
        application=application,
        candidate=application.candidate,
        job=application.job,
        rubric=rubric,
        criteria=criteria,
        evidence=evidence,
        warnings=warnings,
    )
    ai_output = create_screening_ai_client(settings).assess(payload)
    validate_screening_output(output=ai_output, criteria=criteria, evidence=evidence)
    score = calculate_screening_score(rubric=rubric, criteria=criteria, ai_output=ai_output)

    for item in score.criterion_scores:
        db.add(
            ScreeningCriterionResult(
                screening_run_id=run.id,
                criterion_key=item.criterion.criterion_key,
                suggested_rating=item.assessment.suggested_rating,
                normalized_score=item.normalized_score,
                weight=item.criterion.weight,
                weighted_contribution=item.weighted_contribution,
                confidence=item.assessment.confidence,
                evidence_summary=item.assessment.evidence_summary,
                strengths=item.assessment.strengths,
                concerns=item.assessment.concerns,
                missing_evidence=item.assessment.missing_evidence,
                requires_human_review=item.assessment.requires_human_review,
            )
        )
        for reference in item.assessment.evidence_references:
            db.add(
                ScreeningEvidenceReference(
                    screening_run_id=run.id,
                    criterion_key=item.criterion.criterion_key,
                    evidence_id=reference.evidence_id,
                    source_type=reference.source_type,
                    source_record_id=uuid.UUID(next((ev.source_record_id for ev in evidence if ev.evidence_id == reference.evidence_id and ev.source_record_id), str(application.id))),
                    explanation=reference.explanation,
                )
            )

    run.status = "COMPLETED"
    run.assessed_coverage = score.assessed_coverage
    run.weighted_score = score.weighted_score
    run.recommendation = score.recommendation
    run.overall_confidence = "MEDIUM"
    run.overall_strengths = ai_output.overall_strengths
    run.overall_concerns = ai_output.overall_concerns
    run.verification_questions = ai_output.verification_questions
    run.unresolved_requirements = ai_output.unresolved_requirements
    run.data_quality_warnings = ai_output.data_quality_warnings + warnings
    run.completed_at = datetime.now(UTC)
    application.submission_status = "REQUIRES_HUMAN_REVIEW" if score.recommendation in {"HOLD_FOR_REVIEW", "INSUFFICIENT_EVIDENCE"} else "SCREENED"
    application.stage = "SCREENING"
    db.commit()


def _mark_failed(application_id: uuid.UUID, screening_run_id: uuid.UUID, error_code: str, detail: str) -> None:
    with SessionLocal() as db:
        run = db.scalar(select(ScreeningRun).where(ScreeningRun.id == screening_run_id))
        application = db.scalar(select(Application).where(Application.id == application_id))
        if run:
            run.status = "FAILED"
            run.error_code = error_code
            run.safe_error_detail = detail
            run.completed_at = datetime.now(UTC)
        if application:
            application.submission_status = "SCREENING_FAILED"
        db.commit()
