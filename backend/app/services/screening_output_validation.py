from app.models.recruitment import ScreeningRubricCriterion
from app.schemas.screening import CandidateScreeningAIOutput, ScreeningEvidenceInput


class ScreeningOutputValidationError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(detail)


FINAL_DECISION_TERMS = ("hire", "hired", "reject", "rejected", "selected")
IDENTITY_TERMS = ("gender", "race", "ethnicity", "religion", "age", "marital", "disability")


def validate_screening_output(
    *,
    output: CandidateScreeningAIOutput,
    criteria: list[ScreeningRubricCriterion],
    evidence: list[ScreeningEvidenceInput],
) -> None:
    valid_criterion_keys = {criterion.criterion_key for criterion in criteria}
    valid_evidence_ids = {item.evidence_id for item in evidence}
    seen_keys: set[str] = set()

    for assessment in output.criterion_assessments:
        if assessment.criterion_key not in valid_criterion_keys:
            raise ScreeningOutputValidationError("UNKNOWN_CRITERION", "AI output referenced an unknown criterion.")
        if assessment.criterion_key in seen_keys:
            raise ScreeningOutputValidationError("DUPLICATE_CRITERION", "AI output duplicated a criterion.")
        seen_keys.add(assessment.criterion_key)

        check_text = " ".join(
            [
                assessment.evidence_summary,
                " ".join(assessment.strengths),
                " ".join(assessment.concerns),
                " ".join(assessment.missing_evidence),
            ]
        ).lower()
        if any(term in check_text for term in IDENTITY_TERMS):
            raise ScreeningOutputValidationError("IDENTITY_REASONING", "AI output contained identity-based reasoning.")
        if any(term in check_text for term in FINAL_DECISION_TERMS):
            raise ScreeningOutputValidationError("FINAL_DECISION_ATTEMPT", "AI output attempted a final employment decision.")

        for reference in assessment.evidence_references:
            if reference.evidence_id not in valid_evidence_ids:
                raise ScreeningOutputValidationError("UNKNOWN_EVIDENCE", "AI output referenced unknown evidence.")

    missing = valid_criterion_keys - seen_keys
    if missing:
        raise ScreeningOutputValidationError("MISSING_CRITERION", "AI output did not assess every rubric criterion.")
