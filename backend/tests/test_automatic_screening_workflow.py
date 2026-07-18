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


def _backend_job_payload(weight: int = 100) -> dict:
    return {
        "title": "Backend API Engineer",
        "department": "Engineering",
        "description": "Own reliable API delivery, database-backed services, and production quality controls.",
        "status": "DRAFT",
        "position_count": 2,
        "employment_type": "FULL_TIME",
        "work_arrangement": "REMOTE",
        "location": "Remote",
        "minimum_experience_years": 2,
        "application_deadline": "2026-08-30",
        "is_accepting_applications": False,
        "cv_required": False,
        "github_repository_required": False,
        "requirements": [
            {"code": "minimum_experience", "title": "Minimum 2 years experience", "description": "At least 2 years.", "priority": "MUST_HAVE"},
            {"code": "api_design", "title": "API design", "description": "REST API evidence.", "priority": "MUST_HAVE"},
        ],
        "application_fields": [
            {"field_key": "full_name", "label": "Full name", "field_type": "TEXT", "required": True, "display_order": 0, "options": [], "linked_requirement_codes": [], "evaluation_categories": []},
            {"field_key": "email", "label": "Email", "field_type": "EMAIL", "required": True, "display_order": 1, "options": [], "linked_requirement_codes": [], "evaluation_categories": []},
            {"field_key": "github_repository_url", "label": "GitHub Repository URL", "field_type": "URL", "required": False, "display_order": 2, "options": [], "linked_requirement_codes": [], "evaluation_categories": []},
            {"field_key": "cv", "label": "CV", "field_type": "FILE", "required": False, "display_order": 3, "options": [], "linked_requirement_codes": [], "evaluation_categories": []},
            {"field_key": "api_design_evidence", "label": "Describe API design work", "field_type": "TEXTAREA", "required": True, "display_order": 4, "options": [], "linked_requirement_codes": ["api_design"], "evaluation_categories": ["required_qualifications"]},
        ],
        "screening_rubric": {
            "version": 1,
            "status": "DRAFT",
            "minimum_assessed_coverage": 70,
            "advance_threshold": 70,
            "criteria": [
                {"criterion_key": "required_qualifications", "title": "Required qualifications", "description": "Assess must-have evidence.", "weight": weight, "must_have": True, "minimum_rating": 3, "linked_requirement_codes": ["api_design"]},
            ],
        },
    }


def test_recruiter_job_create_publish_and_public_form_flow(client: TestClient) -> None:
    token = _admin_token(client)
    response = client.post(
        "/api/v1/recruiter/jobs",
        headers={"Authorization": f"Bearer {token}"},
        json=_backend_job_payload(),
    )

    assert response.status_code == 201
    body = response.json()
    job_id = body["id"]
    assert uuid.UUID(job_id)
    assert not job_id.startswith("job-")
    assert body["requirements"]
    assert body["application_fields"]
    assert body["screening_rubric"]["criteria"]
    assert body["position_count"] == 2
    assert body["employment_type"] == "FULL_TIME"
    assert body["work_arrangement"] == "REMOTE"
    assert body["location"] == "Remote"
    assert body["minimum_experience_years"] == 2
    assert body["application_deadline"] == "2026-08-30"

    draft_public = client.get(f"/api/v1/public/jobs/{job_id}/application-form")
    assert draft_public.status_code == 400

    publish = client.post(
        f"/api/v1/recruiter/jobs/{job_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_accepting_applications": True},
    )
    assert publish.status_code == 200
    assert publish.json()["status"] == "PUBLISHED"

    public = client.get(f"/api/v1/public/jobs/{job_id}/application-form")
    assert public.status_code == 200
    fields = {field["key"]: field for field in public.json()["fields"]}
    assert fields["github_repository_url"]["type"] == "URL"
    assert fields["cv"]["type"] == "FILE"

    close = client.post(f"/api/v1/recruiter/jobs/{job_id}/close", headers={"Authorization": f"Bearer {token}"})
    assert close.status_code == 200
    assert client.get(f"/api/v1/public/jobs/{job_id}/application-form").status_code == 400


def test_recruiter_job_setup_steps_match_frontend_hiring_flow(client: TestClient) -> None:
    token = _admin_token(client)
    create = client.post(
        "/api/v1/recruiter/jobs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Draft role",
            "department": "Engineering",
            "description": "Initial role outline.",
            "status": "DRAFT",
            "requirements": [],
            "application_fields": [],
            "screening_rubric": None,
        },
    )
    assert create.status_code == 201
    job_id = create.json()["id"]

    requirements = client.put(
        f"/api/v1/recruiter/jobs/{job_id}/requirements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Backend Platform Engineer",
            "department": "Platform",
            "description": "Build internal APIs, database-backed services, and production operations.",
            "position_count": 3,
            "employment_type": "CONTRACT",
            "work_arrangement": "HYBRID",
            "location": "Yangon",
            "minimum_experience_years": 3,
            "application_deadline": "2026-09-15",
            "requirements": [
                {
                    "code": "api_design",
                    "title": "API design",
                    "description": "Can design maintainable service APIs.",
                    "priority": "MUST_HAVE",
                },
                {
                    "code": "database_models",
                    "title": "Database modeling",
                    "description": "Can model relational data safely.",
                    "priority": "IMPORTANT",
                },
            ],
        },
    )
    assert requirements.status_code == 200
    assert requirements.json()["title"] == "Backend Platform Engineer"
    assert requirements.json()["position_count"] == 3
    assert requirements.json()["location"] == "Yangon"
    assert [item["code"] for item in requirements.json()["requirements"]] == ["api_design", "database_models"]

    form = client.put(
        f"/api/v1/recruiter/jobs/{job_id}/application-form",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cv_required": True,
            "github_repository_required": True,
            "application_fields": [
                {
                    "field_key": "full_name",
                    "label": "Full name",
                    "field_type": "TEXT",
                    "required": True,
                    "display_order": 0,
                },
                {
                    "field_key": "email",
                    "label": "Email",
                    "field_type": "EMAIL",
                    "required": True,
                    "display_order": 1,
                },
                {
                    "field_key": "github_repository_url",
                    "label": "GitHub Repository URL",
                    "field_type": "URL",
                    "placeholder": "https://github.com/username/repository",
                    "help_text": "Enter a public GitHub repository URL containing work relevant to this role.",
                    "required": True,
                    "display_order": 2,
                    "linked_requirement_codes": ["api_design"],
                    "evaluation_categories": ["required_qualifications"],
                },
                {
                    "field_key": "cv",
                    "label": "CV",
                    "field_type": "FILE",
                    "required": True,
                    "display_order": 3,
                },
            ],
        },
    )
    assert form.status_code == 200
    fields = {field["field_key"]: field for field in form.json()["application_fields"]}
    assert fields["github_repository_url"]["field_type"] == "URL"
    assert fields["cv"]["field_type"] == "FILE"

    rules = client.put(
        f"/api/v1/recruiter/jobs/{job_id}/screening-rules",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "screening_rubric": {
                "version": 1,
                "status": "DRAFT",
                "minimum_assessed_coverage": 70,
                "advance_threshold": 70,
                "criteria": [
                    {
                        "criterion_key": "required_qualifications",
                        "title": "Required qualifications",
                        "description": "Assess the must-have backend requirements.",
                        "weight": 100,
                        "must_have": True,
                        "minimum_rating": 3,
                        "linked_requirement_codes": ["api_design", "database_models"],
                    }
                ],
            }
        },
    )
    assert rules.status_code == 200
    assert rules.json()["screening_rubric"]["criteria"][0]["weight"] == 100

    publish = client.post(
        f"/api/v1/recruiter/jobs/{job_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_accepting_applications": True},
    )
    assert publish.status_code == 200
    assert publish.json()["status"] == "PUBLISHED"


def test_recruiter_job_publish_requires_weight_total_100(client: TestClient) -> None:
    token = _admin_token(client)
    response = client.post(
        "/api/v1/recruiter/jobs",
        headers={"Authorization": f"Bearer {token}"},
        json=_backend_job_payload(weight=90),
    )
    assert response.status_code == 201
    publish = client.post(
        f"/api/v1/recruiter/jobs/{response.json()['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_accepting_applications": True},
    )
    assert publish.status_code == 400
    assert "weights must total 100" in publish.json()["detail"]


def test_recruiter_job_update_preserves_rubric_used_by_screening_run(client: TestClient) -> None:
    token = _admin_token(client)
    create = client.post(
        "/api/v1/recruiter/jobs",
        headers={"Authorization": f"Bearer {token}"},
        json=_backend_job_payload(),
    )
    assert create.status_code == 201
    job_id = create.json()["id"]
    publish = client.post(
        f"/api/v1/recruiter/jobs/{job_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_accepting_applications": True},
    )
    assert publish.status_code == 200

    submit = _submit_application(client, job_id, f"screening-{uuid.uuid4()}")
    assert submit.status_code == 202

    updated_payload = _backend_job_payload()
    updated_payload["description"] = "Updated job setup while preserving previous screening audit records."
    updated_payload["screening_rubric"]["criteria"][0]["title"] = "Updated required qualifications"
    update = client.put(
        f"/api/v1/recruiter/jobs/{job_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=updated_payload,
    )

    assert update.status_code == 200
    assert update.json()["screening_rubric"]["version"] == 2
    with SessionLocal() as db:
        rubrics = db.scalars(select(ScreeningRubric).where(ScreeningRubric.job_id == uuid.UUID(job_id))).all()
        run_count = db.scalar(
            select(func.count()).select_from(ScreeningRun).where(ScreeningRun.rubric_id.in_([rubric.id for rubric in rubrics]))
        )
    assert len(rubrics) == 2
    assert run_count == 1


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
