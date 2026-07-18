import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ApplicationAnswerInput(BaseModel):
    question_key: str
    question_label: str
    answer_text: str
    linked_requirement_codes: list[str] = Field(default_factory=list)


class ApplicationSubmissionReceipt(BaseModel):
    application_id: uuid.UUID
    submission_status: str
    screening_run_id: uuid.UUID
    screening_status: str
    status_token: str
    message: str


class CandidateSubmissionStatus(BaseModel):
    application_id: uuid.UUID
    submission_status: str
    screening_status: str | None
    submitted_at: datetime
    message: str


class ScreeningEvidenceInput(BaseModel):
    evidence_id: str
    source_type: Literal["APPLICATION_FORM", "CV", "GITHUB", "SYSTEM"]
    source_record_id: str | None = None
    text: str
    related_criterion_keys: list[str] = Field(default_factory=list)


class EvidenceReferenceOutput(BaseModel):
    evidence_id: str
    source_type: Literal["APPLICATION_FORM", "CV", "GITHUB", "SYSTEM"]
    explanation: str


class CriterionAssessmentOutput(BaseModel):
    criterion_key: str
    suggested_rating: int | None = Field(default=None, ge=1, le=5)
    confidence: Literal["LOW", "MEDIUM", "HIGH"]
    evidence_summary: str
    evidence_references: list[EvidenceReferenceOutput] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    requires_human_review: bool = False


class CandidateScreeningAIOutput(BaseModel):
    criterion_assessments: list[CriterionAssessmentOutput]
    overall_strengths: list[str] = Field(default_factory=list)
    overall_concerns: list[str] = Field(default_factory=list)
    verification_questions: list[str] = Field(default_factory=list)
    unresolved_requirements: list[str] = Field(default_factory=list)
    data_quality_warnings: list[str] = Field(default_factory=list)


class RecruiterScreeningQueueItem(BaseModel):
    application_id: uuid.UUID
    screening_run_id: uuid.UUID | None = None
    job_id: uuid.UUID
    candidate_name: str
    candidate_email: str
    job_title: str
    submission_status: str
    screening_status: str | None
    recommendation: str | None
    weighted_score: float | None
    assessed_coverage: int | None = None
    submitted_at: datetime
    completed_at: datetime | None = None
    requires_human_review: bool = False


class RecruiterScreeningDetail(BaseModel):
    application_id: uuid.UUID
    screening_run_id: uuid.UUID | None
    candidate_name: str
    candidate_email: str
    job_title: str
    candidate: dict
    job: dict
    submission_status: str
    screening_status: str | None
    weighted_score: float | None
    assessed_coverage: int | None
    recommendation: str | None
    overall_confidence: str | None
    overall_strengths: list[str]
    overall_concerns: list[str]
    unresolved_requirements: list[str]
    data_quality_warnings: list[str]
    cv_extraction_status: str
    github_repository_url: str | None
    github_analysis: dict | None
    error_code: str | None = None
    safe_error_detail: str | None = None
    submitted_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    requires_human_review: bool = False
    criterion_results: list[dict]
    evidence_references: list[dict]
    human_reviews: list[dict]


class PublicApplicationFormField(BaseModel):
    id: str
    key: str
    label: str
    type: str
    required: bool
    placeholder: str | None = None
    helpText: str | None = None
    options: list[dict] = Field(default_factory=list)
    linkedRequirementCodes: list[str] = Field(default_factory=list)


class PublicJobApplicationForm(BaseModel):
    job_id: uuid.UUID
    title: str
    department: str | None
    description: str
    cv_required: bool
    github_repository_required: bool
    fields: list[PublicApplicationFormField]


class HumanScreeningReviewRequest(BaseModel):
    action: Literal[
        "CONFIRM_ADVANCE",
        "CONFIRM_HOLD",
        "CONFIRM_DO_NOT_ADVANCE",
        "OVERRIDE_TO_ADVANCE",
        "OVERRIDE_TO_HOLD",
        "OVERRIDE_TO_DO_NOT_ADVANCE",
        "REQUEST_MORE_EVIDENCE",
    ]
    override_reason: str | None = None
    reviewer_notes: str | None = None


class HumanScreeningReviewResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    screening_run_id: uuid.UUID
    action: str
    created_at: datetime
