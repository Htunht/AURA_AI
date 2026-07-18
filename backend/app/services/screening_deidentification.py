from app.models.recruitment import Application, Candidate, Job, ScreeningRubric, ScreeningRubricCriterion
from app.schemas.screening import ScreeningEvidenceInput


def build_deidentified_screening_payload(
    *,
    application: Application,
    candidate: Candidate,
    job: Job,
    rubric: ScreeningRubric,
    criteria: list[ScreeningRubricCriterion],
    evidence: list[ScreeningEvidenceInput],
    warnings: list[str],
) -> dict:
    blocked_values = [
        candidate.full_name,
        candidate.email,
        candidate.phone or "",
    ]

    payload = {
        "anonymous_application_id": str(application.id),
        "job": {
            "title": job.title,
            "department": job.department,
            "description": job.description,
        },
        "rubric": {
            "version": rubric.version,
            "minimum_assessed_coverage": rubric.minimum_assessed_coverage,
            "advance_threshold": rubric.advance_threshold,
            "criteria": [
                {
                    "criterion_key": criterion.criterion_key,
                    "title": criterion.title,
                    "description": criterion.description,
                    "must_have": criterion.must_have,
                    "minimum_rating": criterion.minimum_rating,
                    "linked_requirement_codes": criterion.linked_requirement_codes,
                }
                for criterion in criteria
            ],
        },
        "evidence": [item.model_dump() for item in evidence],
        "warnings": warnings,
    }

    serialized = str(payload).lower()
    for value in blocked_values:
        if value and value.lower() in serialized:
            raise ValueError("De-identified screening payload contains candidate identity data.")

    return payload
