from typing import Protocol

from app.core.config import Settings
from app.schemas.screening import (
    CandidateScreeningAIOutput,
    CriterionAssessmentOutput,
    EvidenceReferenceOutput,
)


class ScreeningAIClient(Protocol):
    def assess(self, payload: dict) -> CandidateScreeningAIOutput:
        ...


class FakeScreeningAIClient:
    def assess(self, payload: dict) -> CandidateScreeningAIOutput:
        evidence_by_criterion: dict[str, list[dict]] = {}
        for item in payload.get("evidence", []):
            for key in item.get("related_criterion_keys", []):
                evidence_by_criterion.setdefault(key, []).append(item)

        assessments: list[CriterionAssessmentOutput] = []
        for criterion in payload["rubric"]["criteria"]:
            criterion_key = criterion["criterion_key"]
            related_evidence = evidence_by_criterion.get(criterion_key, [])
            if related_evidence:
                rating = 4 if len(" ".join(item["text"] for item in related_evidence)) > 80 else 3
                summary = f"Submitted evidence addresses {criterion['title']}."
                references = [
                    EvidenceReferenceOutput(
                        evidence_id=item["evidence_id"],
                        source_type=item["source_type"],
                        explanation="Evidence was submitted for this criterion.",
                    )
                    for item in related_evidence[:3]
                ]
                strengths = [summary]
                missing = []
            else:
                rating = None
                summary = f"No direct submitted evidence was found for {criterion['title']}."
                references = []
                strengths = []
                missing = [summary]

            assessments.append(
                CriterionAssessmentOutput(
                    criterion_key=criterion_key,
                    suggested_rating=rating,
                    confidence="MEDIUM" if rating else "LOW",
                    evidence_summary=summary,
                    evidence_references=references,
                    strengths=strengths,
                    concerns=[],
                    missing_evidence=missing,
                    requires_human_review=rating is None or bool(payload.get("warnings")),
                )
            )

        return CandidateScreeningAIOutput(
            criterion_assessments=assessments,
            overall_strengths=["Relevant submitted evidence was found."],
            overall_concerns=[],
            verification_questions=[],
            unresolved_requirements=[],
            data_quality_warnings=payload.get("warnings", []),
        )


class OpenAIScreeningClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def assess(self, payload: dict) -> CandidateScreeningAIOutput:
        if not self.settings.openai_api_key:
            raise RuntimeError("CONFIGURATION_ERROR")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("OPENAI_SDK_NOT_INSTALLED") from exc

        client = OpenAI(api_key=self.settings.openai_api_key, timeout=self.settings.openai_request_timeout_seconds)
        response = client.responses.parse(
            model=self.settings.openai_model,
            input=[
                {"role": "system", "content": _system_prompt(self.settings.ai_screening_prompt_version)},
                {"role": "user", "content": str(payload)},
            ],
            text_format=CandidateScreeningAIOutput,
        )
        parsed = response.output_parsed
        if parsed is None:
            raise RuntimeError("OPENAI_EMPTY_STRUCTURED_OUTPUT")
        return parsed


def create_screening_ai_client(settings: Settings) -> ScreeningAIClient:
    if not settings.ai_screening_enabled:
        return FakeScreeningAIClient()

    mode = settings.ai_screening_client_mode.upper()
    if mode == "FAKE":
        return FakeScreeningAIClient()
    if mode == "REAL":
        return OpenAIScreeningClient(settings)
    raise RuntimeError("UNKNOWN_AI_SCREENING_CLIENT_MODE")


def _system_prompt(prompt_version: str) -> str:
    return (
        f"AURA AI screening prompt {prompt_version}. Assess only submitted job-related evidence. "
        "Use rubric criterion keys exactly. Cite evidence IDs. Do not infer protected traits, "
        "unsubmitted skills, repository ownership, or final employment decisions. Do not calculate "
        "weights, thresholds, or final scores. Return null when evidence is insufficient. Do not use "
        "GitHub popularity or answer length as competence proof."
    )
