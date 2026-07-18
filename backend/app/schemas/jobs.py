import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


JobLifecycleStatus = Literal["DRAFT", "PUBLISHED", "CLOSED"]


class RecruiterJobRequirementInput(BaseModel):
    code: str
    title: str
    description: str
    priority: Literal["MUST_HAVE", "IMPORTANT", "PREFERRED"]

    @field_validator("code", "title", "description")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip()


class RecruiterApplicationFieldInput(BaseModel):
    field_key: str
    label: str
    field_type: Literal["TEXT", "EMAIL", "PHONE", "URL", "NUMBER", "TEXTAREA", "MULTI_SELECT", "FILE"]
    placeholder: str | None = None
    help_text: str | None = None
    required: bool = False
    display_order: int = 0
    options: list[dict] = Field(default_factory=list)
    linked_requirement_codes: list[str] = Field(default_factory=list)
    evaluation_categories: list[str] = Field(default_factory=list)

    @field_validator("field_key", "label", "field_type")
    @classmethod
    def trim_field_text(cls, value: str) -> str:
        return value.strip()


class RecruiterRubricCriterionInput(BaseModel):
    criterion_key: str
    title: str
    description: str
    weight: int = Field(ge=1, le=100)
    must_have: bool = False
    minimum_rating: int | None = Field(default=None, ge=1, le=5)
    linked_requirement_codes: list[str] = Field(default_factory=list)


class RecruiterScreeningRubricInput(BaseModel):
    version: int = 1
    status: Literal["DRAFT", "PUBLISHED"] = "DRAFT"
    minimum_assessed_coverage: int = Field(default=70, ge=0, le=100)
    advance_threshold: int = Field(default=70, ge=0, le=100)
    criteria: list[RecruiterRubricCriterionInput] = Field(default_factory=list)


class RecruiterJobUpsertRequest(BaseModel):
    title: str
    department: str | None = None
    description: str
    status: JobLifecycleStatus = "DRAFT"
    position_count: int = Field(default=1, ge=1)
    employment_type: Literal["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"] = "FULL_TIME"
    work_arrangement: Literal["ONSITE", "HYBRID", "REMOTE"] = "HYBRID"
    location: str | None = None
    minimum_experience_years: float = Field(default=0, ge=0)
    application_deadline: date | None = None
    is_accepting_applications: bool = False
    cv_required: bool = False
    github_repository_required: bool = False
    requirements: list[RecruiterJobRequirementInput] = Field(default_factory=list)
    application_fields: list[RecruiterApplicationFieldInput] = Field(default_factory=list)
    screening_rubric: RecruiterScreeningRubricInput | None = None

    @field_validator("title", "description")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("department", "location")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        value = value.strip() if value else None
        return value or None


class RecruiterJobRequirementsStepRequest(BaseModel):
    title: str
    department: str | None = None
    description: str
    position_count: int = Field(default=1, ge=1)
    employment_type: Literal["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"] = "FULL_TIME"
    work_arrangement: Literal["ONSITE", "HYBRID", "REMOTE"] = "HYBRID"
    location: str | None = None
    minimum_experience_years: float = Field(default=0, ge=0)
    application_deadline: date | None = None
    requirements: list[RecruiterJobRequirementInput] = Field(default_factory=list)

    @field_validator("title", "description")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("department", "location")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        value = value.strip() if value else None
        return value or None


class RecruiterApplicationFormStepRequest(BaseModel):
    cv_required: bool = False
    github_repository_required: bool = False
    application_fields: list[RecruiterApplicationFieldInput]


class RecruiterScreeningRulesStepRequest(BaseModel):
    screening_rubric: RecruiterScreeningRubricInput


class RecruiterApplicationFieldOutput(BaseModel):
    id: uuid.UUID
    field_key: str
    label: str
    field_type: str
    placeholder: str | None
    help_text: str | None
    required: bool
    display_order: int
    options: list[dict]
    linked_requirement_codes: list[str]
    evaluation_categories: list[str]


class RecruiterJobRequirementOutput(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: str
    priority: str


class RecruiterRubricCriterionOutput(BaseModel):
    id: uuid.UUID
    criterion_key: str
    title: str
    description: str
    weight: int
    must_have: bool
    minimum_rating: int | None
    linked_requirement_codes: list[str]


class RecruiterScreeningRubricOutput(BaseModel):
    id: uuid.UUID
    version: int
    status: str
    minimum_assessed_coverage: int
    advance_threshold: int
    criteria: list[RecruiterRubricCriterionOutput]


class RecruiterJobOutput(BaseModel):
    id: uuid.UUID
    title: str
    department: str | None
    description: str
    status: str
    position_count: int
    employment_type: str
    work_arrangement: str
    location: str | None
    minimum_experience_years: float
    application_deadline: date | None
    is_accepting_applications: bool
    cv_required: bool
    github_repository_required: bool
    created_at: datetime
    updated_at: datetime
    requirements: list[RecruiterJobRequirementOutput]
    application_fields: list[RecruiterApplicationFieldOutput]
    screening_rubric: RecruiterScreeningRubricOutput | None


class RecruiterJobPublishRequest(BaseModel):
    is_accepting_applications: bool = True
