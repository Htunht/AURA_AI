import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.recruitment import Application, Candidate, Interview, Job
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.services.interview_calendar_service import build_calendar_response
from app.services.seed_auth import seed_auth


@pytest.fixture(scope="module")
def client() -> TestClient:
    seed_auth()
    return TestClient(app)


@pytest.fixture(scope="module")
def calendar_records(client: TestClient):
    marker = uuid.uuid4().hex
    with SessionLocal() as db:
        interviewer = db.scalar(select(User).where(User.email == "interviewer@aura.local"))
        assert interviewer is not None
        job_one = Job(title=f"Calendar Engineer {marker}", department="Engineering", description="Calendar test role", status="PUBLISHED")
        job_two = Job(title=f"Calendar Manager {marker}", department="People", description="Calendar filter role", status="PUBLISHED")
        candidate = Candidate(full_name=f"Calendar Candidate {marker}", email=f"calendar-{marker}@example.com")
        db.add_all([job_one, job_two, candidate])
        db.flush()
        application_one = Application(candidate_id=candidate.id, job_id=job_one.id)
        application_two = Application(candidate_id=candidate.id, job_id=job_two.id)
        db.add_all([application_one, application_two])
        db.flush()
        interviews = [
            Interview(application_id=application_one.id, interviewer_id=interviewer.id, interview_type="TECHNICAL", status="CONFIRMED", scheduled_start=datetime(2026, 7, 18, 2, 30, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 18, 3, 30, tzinfo=timezone.utc), timezone="Asia/Yangon", meeting_url="https://meet.example.com/calendar-one"),
            Interview(application_id=application_one.id, interviewer_id=interviewer.id, interview_type="TECHNICAL", status="PENDING_CONFIRMATION", scheduled_start=datetime(2026, 7, 18, 5, 0, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 18, 6, 0, tzinfo=timezone.utc), timezone="Asia/Yangon", location="Yangon office"),
            Interview(application_id=application_one.id, interviewer_id=interviewer.id, interview_type="TECHNICAL", status="CANCELLED", scheduled_start=datetime(2026, 7, 19, 2, 30, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 19, 3, 30, tzinfo=timezone.utc), timezone="Asia/Yangon"),
            Interview(application_id=application_two.id, interview_type="PANEL", status="SCHEDULED", scheduled_start=datetime(2026, 7, 20, 3, 0, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 20, 4, 0, tzinfo=timezone.utc), timezone="Asia/Yangon"),
            Interview(application_id=application_two.id, interview_type="FINAL", status="CONFIRMED", scheduled_start=datetime(2026, 7, 31, 18, 0, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 31, 19, 0, tzinfo=timezone.utc), timezone="Asia/Yangon"),
        ]
        db.add_all(interviews)

        viewer_role = Role(code=f"VIEWER_{marker}", name="Calendar viewer")
        viewer = User(email=f"viewer-{marker}@aura.local", full_name="Calendar Viewer", password_hash=hash_password("CalendarPassword123!"))
        db.add_all([viewer_role, viewer])
        db.flush()
        viewer_assignment = UserRole(user_id=viewer.id, role_id=viewer_role.id)
        db.add(viewer_assignment)
        db.commit()
        record_ids = {
            "job_one": job_one.id,
            "job_two": job_two.id,
            "application_one": application_one.id,
            "application_two": application_two.id,
            "candidate": candidate.id,
            "interviewer": interviewer.id,
            "viewer": viewer.id,
            "viewer_role": viewer_role.id,
            "viewer_assignment": viewer_assignment.id,
            "viewer_email": viewer.email,
        }

    yield record_ids

    with SessionLocal() as db:
        db.execute(delete(Interview).where(Interview.application_id.in_([record_ids["application_one"], record_ids["application_two"]])))
        db.execute(delete(Application).where(Application.id.in_([record_ids["application_one"], record_ids["application_two"]])))
        db.execute(delete(Candidate).where(Candidate.id == record_ids["candidate"]))
        db.execute(delete(Job).where(Job.id.in_([record_ids["job_one"], record_ids["job_two"]])))
        db.execute(delete(UserRole).where(UserRole.id == record_ids["viewer_assignment"]))
        db.execute(delete(User).where(User.id == record_ids["viewer"]))
        db.execute(delete(Role).where(Role.id == record_ids["viewer_role"]))
        db.commit()


def token_for(client: TestClient, email: str, password: str = "AuraDemo123!") -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_calendar_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-01", "end": "2026-08-01"})
    assert response.status_code == 401


def test_calendar_rejects_unauthorized_role(client: TestClient, calendar_records) -> None:
    token = token_for(client, calendar_records["viewer_email"], "CalendarPassword123!")
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-01", "end": "2026-08-01"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_authenticated_calendar_returns_grouped_active_totals(client: TestClient, calendar_records) -> None:
    token = token_for(client, "admin@aura.local")
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-01", "end": "2026-08-01"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["range"]["timezone"] == "Asia/Yangon"
    assert body["summary"]["total_interviews"] == 3
    assert body["summary"]["pending_confirmation"] == 1
    assert body["summary"]["busiest_date"] == "2026-07-18"
    assert body["summary"]["busiest_date_total"] == 2
    july_18 = next(day for day in body["days"] if day["date"] == "2026-07-18")
    assert july_18["total_interviews"] == 2
    assert july_18["interviews"][0]["candidate_id"] == str(calendar_records["candidate"])
    assert july_18["interviews"][0]["scheduled_start"].endswith(("Z", "+00:00"))


def test_authenticated_interview_detail_uses_persisted_ids(client: TestClient, calendar_records) -> None:
    token = token_for(client, "admin@aura.local")
    calendar = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-18", "end": "2026-07-19"}, headers={"Authorization": f"Bearer {token}"})
    interview_id = calendar.json()["days"][0]["interviews"][0]["id"]
    response = client.get(f"/api/v1/recruiter/interviews/{interview_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["application_id"] == str(calendar_records["application_one"])
    assert response.json()["candidate_id"] == str(calendar_records["candidate"])


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"job_id": "job_one"}, 2),
        ({"status": "PENDING_CONFIRMATION"}, 1),
        ({"interviewer_id": "interviewer"}, 2),
        ({"interview_type": "PANEL"}, 1),
    ],
)
def test_calendar_filters(client: TestClient, calendar_records, params: dict, expected: int) -> None:
    resolved = {key: str(calendar_records.get(value, value)) for key, value in params.items()}
    token = token_for(client, "recruiter@aura.local")
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-01", "end": "2026-08-01", **resolved}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["summary"]["total_interviews"] == expected


def test_interviewer_only_sees_assigned_records(client: TestClient, calendar_records) -> None:
    token = token_for(client, "interviewer@aura.local")
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-01", "end": "2026-08-01"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["summary"]["total_interviews"] == 2


def test_calendar_range_and_month_boundary(client: TestClient, calendar_records) -> None:
    token = token_for(client, "admin@aura.local")
    july = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-07-20", "end": "2026-07-21"}, headers={"Authorization": f"Bearer {token}"})
    assert july.status_code == 200
    assert july.json()["summary"]["total_interviews"] == 1
    august = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-08-01", "end": "2026-08-02"}, headers={"Authorization": f"Bearer {token}"})
    assert august.status_code == 200
    assert august.json()["days"][0]["date"] == "2026-08-01"


def test_calendar_invalid_range_is_rejected(client: TestClient) -> None:
    token = token_for(client, "admin@aura.local")
    response = client.get("/api/v1/recruiter/interviews/calendar", params={"start": "2026-08-01", "end": "2026-07-01"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 422


def test_calendar_today_and_timezone_aggregation(calendar_records) -> None:
    with SessionLocal() as db:
        records = list(db.scalars(select(Interview).where(Interview.application_id == calendar_records["application_one"])).all())
        response = build_calendar_response(records, range_start=datetime(2026, 7, 1, tzinfo=timezone.utc), range_end=datetime(2026, 8, 2, tzinfo=timezone.utc), display_timezone="Asia/Yangon", today=date(2026, 7, 18))
    assert response.summary.today_interviews == 2
    assert response.summary.total_interviews == 2


def test_interview_end_must_be_after_start(calendar_records) -> None:
    with SessionLocal() as db:
        invalid = Interview(application_id=calendar_records["application_one"], interview_type="TECHNICAL", status="SCHEDULED", scheduled_start=datetime(2026, 7, 25, 4, 0, tzinfo=timezone.utc), scheduled_end=datetime(2026, 7, 25, 3, 0, tzinfo=timezone.utc), timezone="Asia/Yangon")
        db.add(invalid)
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()
