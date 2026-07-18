import uuid
from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.auth_dependencies import require_roles
from app.api.dependencies import get_db
from app.core.config import get_settings
from app.models.recruitment import Application, Interview
from app.models.user import User
from app.schemas.interview_calendar import InterviewCalendarItem, InterviewCalendarResponse
from app.services.interview_calendar_service import build_calendar_response, get_timezone, serialize_interview

router = APIRouter(prefix="/recruiter/interviews", tags=["Recruiter Interviews"])

_MAX_RANGE = timedelta(days=93)
_ALLOWED_STATUSES = {"DRAFT", "PENDING_CONFIRMATION", "SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "NEEDS_RESCHEDULING"}
_ALLOWED_TYPES = {"SCREENING", "TECHNICAL", "BEHAVIORAL", "PANEL", "FINAL", "OTHER"}

CalendarUser = Annotated[
    User,
    Depends(require_roles("ADMIN", "RECRUITER", "INTERVIEWER", "HIRING_MANAGER")),
]


@router.get("/calendar", response_model=InterviewCalendarResponse)
def get_interview_calendar(
    current_user: CalendarUser,
    db: Annotated[Session, Depends(get_db)],
    start: Annotated[str, Query(description="Inclusive ISO-8601 date or datetime")],
    end: Annotated[str, Query(description="Exclusive ISO-8601 date or datetime")],
    job_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    interviewer_id: Annotated[uuid.UUID | None, Query()] = None,
    interview_type: Annotated[str | None, Query()] = None,
) -> InterviewCalendarResponse:
    settings = get_settings()
    zone = get_timezone(settings.recruiter_timezone)
    range_start = _parse_boundary(start, zone)
    range_end = _parse_boundary(end, zone)
    if range_end <= range_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end must be after start")
    if range_end - range_start > _MAX_RANGE:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Calendar range cannot exceed 93 days")
    normalized_status = status_filter.upper() if status_filter else None
    normalized_type = interview_type.upper() if interview_type else None
    if normalized_status and normalized_status not in _ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported interview status")
    if normalized_type and normalized_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported interview type")

    statement = (
        select(Interview)
        .where(Interview.scheduled_start >= range_start, Interview.scheduled_start < range_end)
        .options(
            selectinload(Interview.application).selectinload(Application.candidate),
            selectinload(Interview.application).selectinload(Application.job),
            selectinload(Interview.interviewer),
        )
        .order_by(Interview.scheduled_start)
    )
    if job_id:
        statement = statement.join(Interview.application).where(Application.job_id == job_id)
    if normalized_status:
        statement = statement.where(Interview.status == normalized_status)
    if interviewer_id:
        statement = statement.where(Interview.interviewer_id == interviewer_id)
    if normalized_type:
        statement = statement.where(Interview.interview_type == normalized_type)

    role_codes = {assignment.role.code for assignment in current_user.user_roles}
    if "INTERVIEWER" in role_codes and role_codes.isdisjoint({"ADMIN", "RECRUITER", "HIRING_MANAGER"}):
        statement = statement.where(Interview.interviewer_id == current_user.id)

    interviews = list(db.scalars(statement).unique().all())
    return build_calendar_response(
        interviews,
        range_start=range_start,
        range_end=range_end,
        display_timezone=settings.recruiter_timezone,
    )


@router.get("/{interview_id}", response_model=InterviewCalendarItem)
def get_interview_detail(
    interview_id: uuid.UUID,
    current_user: CalendarUser,
    db: Annotated[Session, Depends(get_db)],
) -> InterviewCalendarItem:
    statement = (
        select(Interview)
        .where(Interview.id == interview_id)
        .options(
            selectinload(Interview.application).selectinload(Application.candidate),
            selectinload(Interview.application).selectinload(Application.job),
            selectinload(Interview.interviewer),
        )
    )
    role_codes = {assignment.role.code for assignment in current_user.user_roles}
    if "INTERVIEWER" in role_codes and role_codes.isdisjoint({"ADMIN", "RECRUITER", "HIRING_MANAGER"}):
        statement = statement.where(Interview.interviewer_id == current_user.id)
    interview = db.scalar(statement)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return serialize_interview(interview)


def _parse_boundary(value: str, zone) -> datetime:
    try:
        if "T" not in value:
            return datetime.combine(date.fromisoformat(value), time.min, tzinfo=zone)
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=zone)
        return parsed
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid ISO-8601 boundary: {value}") from exc
