import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT", index=True)
    is_accepting_applications: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    cv_required: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    github_repository_required: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    requirements: Mapped[list["JobRequirement"]] = relationship(back_populates="job", cascade="all, delete-orphan")
    rubrics: Mapped[list["ScreeningRubric"]] = relationship(back_populates="job", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="job")


class JobRequirement(Base):
    __tablename__ = "job_requirements"
    __table_args__ = (UniqueConstraint("job_id", "code", name="uq_job_requirements_job_code"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    job: Mapped[Job] = relationship(back_populates="requirements")


class ScreeningRubric(Base):
    __tablename__ = "screening_rubrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    minimum_assessed_coverage: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    advance_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    job: Mapped[Job] = relationship(back_populates="rubrics")
    criteria: Mapped[list["ScreeningRubricCriterion"]] = relationship(back_populates="rubric", cascade="all, delete-orphan")


class ScreeningRubricCriterion(Base):
    __tablename__ = "screening_rubric_criteria"
    __table_args__ = (UniqueConstraint("rubric_id", "criterion_key", name="uq_screening_rubric_criteria_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rubric_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("screening_rubrics.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_key: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    must_have: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    minimum_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    linked_requirement_codes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    rubric: Mapped[ScreeningRubric] = relationship(back_populates="criteria")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    applications: Mapped[list["Application"]] = relationship(back_populates="candidate")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="RESTRICT"), nullable=False, index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False, index=True)
    submission_status: Mapped[str] = mapped_column(String(40), nullable=False, default="SUBMITTED", index=True)
    stage: Mapped[str] = mapped_column(String(40), nullable=False, default="APPLIED", index=True)
    github_repository_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cv_original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cv_storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cv_mime_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cv_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cv_extraction_status: Mapped[str] = mapped_column(String(40), nullable=False, default="NOT_UPLOADED")
    submission_idempotency_key: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True)
    candidate_status_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    candidate: Mapped[Candidate] = relationship(back_populates="applications")
    job: Mapped[Job] = relationship(back_populates="applications")
    answers: Mapped[list["ApplicationAnswer"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    screening_runs: Mapped[list["ScreeningRun"]] = relationship(back_populates="application")


class ApplicationAnswer(Base):
    __tablename__ = "application_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    question_key: Mapped[str] = mapped_column(String(160), nullable=False)
    question_label: Mapped[str] = mapped_column(String(300), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    linked_requirement_codes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application: Mapped[Application] = relationship(back_populates="answers")


class GitHubRepositoryAnalysis(Base):
    __tablename__ = "github_repository_analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_url: Mapped[str] = mapped_column(String(500), nullable=False)
    owner: Mapped[str] = mapped_column(String(120), nullable=False)
    repository_name: Mapped[str] = mapped_column(String(160), nullable=False)
    default_branch: Mapped[str | None] = mapped_column(String(160), nullable=True)
    repository_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_language: Mapped[str | None] = mapped_column(String(120), nullable=True)
    languages: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    repository_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_fork: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    readme_present: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    tests_detected: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    ci_detected: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    docker_detected: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    dependency_files: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    files_reviewed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_characters_analyzed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analysis_status: Mapped[str] = mapped_column(String(40), nullable=False, default="PENDING")
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    warnings: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    code_evidence: Mapped[list["GitHubCodeEvidence"]] = relationship(back_populates="repository_analysis", cascade="all, delete-orphan")


class GitHubCodeEvidence(Base):
    __tablename__ = "github_code_evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("github_repository_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    language: Mapped[str | None] = mapped_column(String(120), nullable=True)
    line_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    line_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(80), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    related_criterion_keys: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    repository_analysis: Mapped[GitHubRepositoryAnalysis] = relationship(back_populates="code_evidence")


class ScreeningRun(Base):
    __tablename__ = "screening_runs"
    __table_args__ = (
        Index(
            "uq_screening_runs_active_application",
            "application_id",
            unique=True,
            postgresql_where=text("status in ('QUEUED', 'PROCESSING')"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    rubric_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("screening_rubrics.id", ondelete="RESTRICT"), nullable=False, index=True)
    rubric_version: Mapped[int] = mapped_column(Integer, nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="QUEUED", index=True)
    assessed_coverage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weighted_score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(60), nullable=True)
    overall_confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    overall_strengths: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    overall_concerns: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    verification_questions: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    unresolved_requirements: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    data_quality_warnings: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    safe_error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application: Mapped[Application] = relationship(back_populates="screening_runs")
    criterion_results: Mapped[list["ScreeningCriterionResult"]] = relationship(back_populates="screening_run", cascade="all, delete-orphan")
    evidence_references: Mapped[list["ScreeningEvidenceReference"]] = relationship(back_populates="screening_run", cascade="all, delete-orphan")


class ScreeningCriterionResult(Base):
    __tablename__ = "screening_criterion_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("screening_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    suggested_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    normalized_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    weighted_contribution: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False)
    evidence_summary: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    concerns: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    missing_evidence: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    requires_human_review: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    screening_run: Mapped[ScreeningRun] = relationship(back_populates="criterion_results")


class ScreeningEvidenceReference(Base):
    __tablename__ = "screening_evidence_references"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("screening_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_key: Mapped[str] = mapped_column(String(100), nullable=False)
    evidence_id: Mapped[str] = mapped_column(String(300), nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_record_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    screening_run: Mapped[ScreeningRun] = relationship(back_populates="evidence_references")


class HumanScreeningReview(Base):
    __tablename__ = "human_screening_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    screening_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("screening_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
