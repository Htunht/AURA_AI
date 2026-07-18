from dataclasses import dataclass

from app.models.recruitment import ScreeningRubric, ScreeningRubricCriterion
from app.schemas.screening import CandidateScreeningAIOutput, CriterionAssessmentOutput


RATING_NORMALIZATION = {
    1: 0,
    2: 25,
    3: 50,
    4: 75,
    5: 100,
}


@dataclass(frozen=True)
class CriterionScore:
    assessment: CriterionAssessmentOutput
    criterion: ScreeningRubricCriterion
    normalized_score: int | None
    weighted_contribution: float | None


@dataclass(frozen=True)
class ScreeningScore:
    criterion_scores: list[CriterionScore]
    assessed_coverage: int
    weighted_score: float | None
    recommendation: str


def calculate_screening_score(
    *,
    rubric: ScreeningRubric,
    criteria: list[ScreeningRubricCriterion],
    ai_output: CandidateScreeningAIOutput,
) -> ScreeningScore:
    criteria_by_key = {criterion.criterion_key: criterion for criterion in criteria}
    assessed_coverage = 0
    weighted_score = 0.0
    criterion_scores: list[CriterionScore] = []
    unresolved_must_have = False
    failed_must_have = False
    requires_human_review = False

    for assessment in ai_output.criterion_assessments:
        criterion = criteria_by_key[assessment.criterion_key]
        normalized_score = None
        weighted_contribution = None

        if assessment.suggested_rating is None:
            if criterion.must_have:
                unresolved_must_have = True
        else:
            normalized_score = RATING_NORMALIZATION[assessment.suggested_rating]
            weighted_contribution = normalized_score * criterion.weight / 100
            weighted_score += weighted_contribution
            assessed_coverage += criterion.weight
            if criterion.must_have and criterion.minimum_rating and assessment.suggested_rating < criterion.minimum_rating:
                failed_must_have = True

        requires_human_review = requires_human_review or assessment.requires_human_review
        criterion_scores.append(
            CriterionScore(
                assessment=assessment,
                criterion=criterion,
                normalized_score=normalized_score,
                weighted_contribution=weighted_contribution,
            )
        )

    final_score = round(weighted_score, 2) if assessed_coverage >= rubric.minimum_assessed_coverage else None

    if failed_must_have:
        recommendation = "DO_NOT_ADVANCE"
    elif unresolved_must_have or requires_human_review:
        recommendation = "HOLD_FOR_REVIEW"
    elif assessed_coverage < rubric.minimum_assessed_coverage:
        recommendation = "INSUFFICIENT_EVIDENCE"
    elif final_score is not None and final_score >= rubric.advance_threshold:
        recommendation = "ADVANCE"
    else:
        recommendation = "DO_NOT_ADVANCE"

    return ScreeningScore(
        criterion_scores=criterion_scores,
        assessed_coverage=assessed_coverage,
        weighted_score=final_score,
        recommendation=recommendation,
    )
