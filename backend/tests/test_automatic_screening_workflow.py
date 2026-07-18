import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.main import app
from app.models.recruitment import Application, ScreeningRubric, ScreeningRubricCriterion, ScreeningRun
from app.services.github_repository_service import GitHubRepositoryError, normalize_github_url
from app.services.screening_scoring_service import calculate_screening_score
from app.schemas.screening import CandidateScreeningAIOutput, CriterionAssessmentOutput
from app.services.seed_auth import seed_auth


@pytest.fixture(scope="module")
def client() -> TestClient:
    settings = get_settings()
    settings.ai_screening_client_mode = "FAKE"
    settings.ai_screening_enabled = True
    seed_auth()
    return TestClient(app)


def _admin_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@aura.local", "password": "AuraDemo123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _submit_application(client: TestClient, job_id: str, key: str):
    answers = [
        {
            "question_key": "api_design",
            "question_label": "Describe your API design experience",
            "answer_text": "I designed versioned REST APIs with validation, authentication, and error handling.",
            "linked_requirement_codes": ["api_design"],
        },
        {
            "question_key": "database_models",
            "question_label": "Describe your database modeling experience",
            "answer_text": "I modeled PostgreSQL tables with indexes, constraints, and migrations.",
            "linked_requirement_codes": ["database_models"],
        },
        {
            "question_key": "testing",
            "question_label": "Describe your testing practice",
            "answer_text": "I write API tests and unit tests for service logic.",
            "linked_requirement_codes": ["testing"],
        },
    ]
    return client.post(
        "/api/v1/applications/submit",
        data={
            "job_id": job_id,
            "candidate_full_name": f"Candidate {key}",
            "candidate_email": f"{key}@example.com",
            "candidate_phone": "+959000000",
            "application_answers": json.dumps(answers),
            "consent": "true",
        },
        headers={"Idempotency-Key": key},
    )


def test_github_url_normalization() -> None:
    assert normalize_github_url("https://github.com/openai/openai-python.git").url == "https://github.com/openai/openai-python"
    assert normalize_github_url("https://www.github.com/openai/openai-python").owner == "openai"


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/openai/openai-python",
        "https://example.com/openai/openai-python",
        "https://github.com/openai",
        "https://github.com/openai/openai-python/archive/main.zip",
        "https://github.com/openai/../secret",
        "https://github.com/openai/openai-python?tab=readme",
    ],
)
def test_github_url_rejects_unsafe_inputs(url: str) -> None:
    with pytest.raises(GitHubRepositoryError):
        normalize_github_url(url)


def test_automatic_submission_to_completed_screening(client: TestClient) -> None:
    seed_response = client.post("/api/v1/demo/seed-ai-screening")
    assert seed_response.status_code == 200
    job_id = seed_response.json()["job_id"]
    key = f"screening-{uuid.uuid4()}"

    response = _submit_application(client, job_id, key)

    assert response.status_code == 202
    body = response.json()
    assert body["submission_status"] == "SUBMITTED"
    assert body["screening_status"] == "QUEUED"
    assert body["status_token"]

    with SessionLocal() as db:
        application = db.get(Application, uuid.UUID(body["application_id"]))
        assert application is not None
        assert len(application.answers) == 3
        run_count = db.scalar(
            select(func.count()).select_from(ScreeningRun).where(ScreeningRun.application_id == application.id)
        )
        latest_run = db.scalar(select(ScreeningRun).where(ScreeningRun.application_id == application.id))

    assert run_count == 1
    assert latest_run is not None
    assert latest_run.status == "COMPLETED"
    assert latest_run.recommendation in {"ADVANCE", "HOLD_FOR_REVIEW", "DO_NOT_ADVANCE", "INSUFFICIENT_EVIDENCE"}

    status_response = client.get(
        f"/api/v1/applications/{body['application_id']}/submission-status",
        params={"status_token": body["status_token"]},
    )
    assert status_response.status_code == 200
    safe_status = status_response.json()
    assert "weighted_score" not in safe_status
    assert "recommendation" not in safe_status


def test_idempotency_key_prevents_duplicate_submission(client: TestClient) -> None:
    job_id = client.post("/api/v1/demo/seed-ai-screening").json()["job_id"]
    key = f"screening-{uuid.uuid4()}"

    first = _submit_application(client, job_id, key)
    second = _submit_application(client, job_id, key)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["application_id"] == second.json()["application_id"]
    with SessionLocal() as db:
        count = db.scalar(
            select(func.count()).select_from(Application).where(Application.submission_idempotency_key == key)
        )
    assert count == 1


def test_recruiter_screening_detail_requires_auth_and_returns_internal_result(client: TestClient) -> None:
    job_id = client.post("/api/v1/demo/seed-ai-screening").json()["job_id"]
    submit_response = _submit_application(client, job_id, f"screening-{uuid.uuid4()}")
    application_id = submit_response.json()["application_id"]

    assert client.get(f"/api/v1/recruiter/applications/{application_id}/screening").status_code == 401

    token = _admin_token(client)
    detail = client.get(
        f"/api/v1/recruiter/applications/{application_id}/screening",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert detail.status_code == 200
    body = detail.json()
    assert body["application_id"] == application_id
    assert "weighted_score" in body
    assert "recommendation" in body
    assert body["candidate"]["email"].endswith("@example.com")
    assert body["candidate_email"] == body["candidate"]["email"]
    assert body["job"]["id"] == job_id
    assert body["job_title"] == body["job"]["title"]
    assert "cv_extraction_status" in body
    assert "github_analysis" in body
    assert body["criterion_results"]


def test_public_backend_application_form_uses_backend_job_and_url_field(client: TestClient) -> None:
    job_id = client.post("/api/v1/demo/seed-ai-screening").json()["job_id"]

    response = client.get(f"/api/v1/public/jobs/{job_id}/application-form")

    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == job_id
    fields = {field["key"]: field for field in body["fields"]}
    assert fields["github_repository_url"]["type"] == "URL"
    assert fields["github_repository_url"]["placeholder"] == "https://github.com/username/repository"
    assert fields["cv"]["type"] == "FILE"


def test_override_review_requires_reason(client: TestClient) -> None:
    job_id = client.post("/api/v1/demo/seed-ai-screening").json()["job_id"]
    submit_response = _submit_application(client, job_id, f"screening-{uuid.uuid4()}")
    application_id = submit_response.json()["application_id"]
    token = _admin_token(client)

    response = client.post(
        f"/api/v1/recruiter/applications/{application_id}/screening/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "OVERRIDE_TO_ADVANCE", "override_reason": ""},
    )

    assert response.status_code == 400


def test_scoring_null_rating_is_not_zero() -> None:
    rubric = ScreeningRubric(
        version=1,
        status="PUBLISHED",
        minimum_assessed_coverage=70,
        advance_threshold=70,
    )
    criteria = [
        ScreeningRubricCriterion(
            criterion_key="must_have",
            title="Must have",
            description="Required evidence",
            weight=50,
            must_have=True,
            minimum_rating=3,
            linked_requirement_codes=["must_have"],
        ),
        ScreeningRubricCriterion(
            criterion_key="supporting",
            title="Supporting",
            description="Supporting evidence",
            weight=50,
            must_have=False,
            linked_requirement_codes=["supporting"],
        ),
    ]
    output = CandidateScreeningAIOutput(
        criterion_assessments=[
            CriterionAssessmentOutput(
                criterion_key="must_have",
                suggested_rating=None,
                confidence="LOW",
                evidence_summary="Missing",
                missing_evidence=["No evidence"],
                requires_human_review=True,
            ),
            CriterionAssessmentOutput(
                criterion_key="supporting",
                suggested_rating=4,
                confidence="MEDIUM",
                evidence_summary="Evidence",
            ),
        ]
    )
    score = calculate_screening_score(rubric=rubric, criteria=criteria, ai_output=output)
    assert score.recommendation in {"HOLD_FOR_REVIEW", "INSUFFICIENT_EVIDENCE"}
    assert score.assessed_coverage == 50
    assert score.weighted_score is None
