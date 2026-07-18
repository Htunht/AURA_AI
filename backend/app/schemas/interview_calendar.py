import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


InterviewCalendarStatus = Literal[
    "DRAFT",
    "PENDING_CONFIRMATION",
    "SCHEDULED",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "NEEDS_RESCHEDULING",
]
InterviewCalendarType = Literal["SCREENING", "TECHNICAL", "BEHAVIORAL", "PANEL", "FINAL", "OTHER"]


class InterviewCalendarItem(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    job_id: uuid.UUID
    job_title: str
    interviewer_id: uuid.UUID | None
    interviewer_name: str | None
    interview_type: str
    status: str
    scheduled_start: datetime
    scheduled_end: datetime
    timezone: str
    location: str | None
    meeting_url: str | None


class InterviewCalendarDay(BaseModel):
    date: date
    total_interviews: int
    interviews: list[InterviewCalendarItem]


class InterviewCalendarRange(BaseModel):
    start: datetime
    end: datetime
    timezone: str


class InterviewCalendarSummary(BaseModel):
    total_interviews: int
    today_interviews: int
    pending_confirmation: int
    busiest_date: date | None
    busiest_date_total: int


class InterviewCalendarResponse(BaseModel):
    range: InterviewCalendarRange
    days: list[InterviewCalendarDay]
    summary: InterviewCalendarSummary
