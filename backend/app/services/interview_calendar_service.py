from collections import defaultdict
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.recruitment import Interview
from app.schemas.interview_calendar import (
    InterviewCalendarDay,
    InterviewCalendarItem,
    InterviewCalendarRange,
    InterviewCalendarResponse,
    InterviewCalendarSummary,
)


ACTIVE_EXCLUDED_STATUSES = {"CANCELLED"}
PENDING_CONFIRMATION_STATUSES = {"DRAFT", "PENDING_CONFIRMATION", "NEEDS_RESCHEDULING"}


def get_timezone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown timezone: {name}") from exc


def build_calendar_response(
    interviews: list[Interview],
    *,
    range_start: datetime,
    range_end: datetime,
    display_timezone: str,
    today: date | None = None,
) -> InterviewCalendarResponse:
    zone = get_timezone(display_timezone)
    grouped: dict[date, list[Interview]] = defaultdict(list)
    for interview in interviews:
        grouped[interview.scheduled_start.astimezone(zone).date()].append(interview)

    calendar_days: list[InterviewCalendarDay] = []
    active_counts: dict[date, int] = {}
    for local_date in sorted(grouped):
        ordered = sorted(grouped[local_date], key=lambda item: item.scheduled_start)
        active_count = sum(item.status not in ACTIVE_EXCLUDED_STATUSES for item in ordered)
        active_counts[local_date] = active_count
        calendar_days.append(
            InterviewCalendarDay(
                date=local_date,
                total_interviews=active_count,
                interviews=[serialize_interview(item) for item in ordered],
            )
        )

    busiest_date = min(
        (local_date for local_date, count in active_counts.items() if count == max(active_counts.values(), default=0) and count > 0),
        default=None,
    )
    local_today = today or datetime.now(zone).date()
    active_interviews = [item for item in interviews if item.status not in ACTIVE_EXCLUDED_STATUSES]
    return InterviewCalendarResponse(
        range=InterviewCalendarRange(start=range_start, end=range_end, timezone=display_timezone),
        days=calendar_days,
        summary=InterviewCalendarSummary(
            total_interviews=len(active_interviews),
            today_interviews=active_counts.get(local_today, 0),
            pending_confirmation=sum(item.status in PENDING_CONFIRMATION_STATUSES for item in active_interviews),
            busiest_date=busiest_date,
            busiest_date_total=active_counts.get(busiest_date, 0) if busiest_date else 0,
        ),
    )


def serialize_interview(interview: Interview) -> InterviewCalendarItem:
    application = interview.application
    return InterviewCalendarItem(
        id=interview.id,
        application_id=application.id,
        candidate_id=application.candidate.id,
        candidate_name=application.candidate.full_name,
        job_id=application.job.id,
        job_title=application.job.title,
        interviewer_id=interview.interviewer_id,
        interviewer_name=interview.interviewer.full_name if interview.interviewer else None,
        interview_type=interview.interview_type,
        status=interview.status,
        scheduled_start=interview.scheduled_start,
        scheduled_end=interview.scheduled_end,
        timezone=interview.timezone,
        location=interview.location,
        meeting_url=interview.meeting_url,
    )
