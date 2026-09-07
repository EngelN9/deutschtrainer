from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from typing import Any, Literal

from pydantic import ValidationError

from .constants import METRIC_NAMES
from .models import (
    EvaluationCell,
    EvaluationRecord,
    ExpandedScenario,
    MetricOutcome,
    PersonaResponse,
    PresentedFeedback,
)
from .security import SecurityRejection, validate_untrusted_payload
from .serialization import canonical_json_bytes

SCORABLE_DENOMINATOR = "Include every schema-valid, security-accepted response for this metric."
END_TO_END_DENOMINATOR = "Include every scheduled evaluation, including failures."


def score_payload(
    *,
    cell: EvaluationCell,
    scenario: ExpandedScenario,
    presentation: PresentedFeedback,
    payload: Any,
) -> EvaluationRecord:
    checksum = hashlib.sha256(canonical_json_bytes(payload)).hexdigest()
    try:
        validate_untrusted_payload(payload)
        response = PersonaResponse.model_validate(payload)
    except SecurityRejection:
        return failure_record(
            cell=cell,
            presentation=presentation,
            checksum=checksum,
            failure_bucket="security_rejected",
        )
    except ValidationError:
        return failure_record(
            cell=cell,
            presentation=presentation,
            checksum=checksum,
            failure_bucket="schema_invalid",
        )

    correction_success = _normalized(response.required_correction_de) == _normalized(
        scenario.gold.required_correction_de
    )
    transfer_success = _normalized(response.transfer_answer_de) in {
        _normalized(answer) for answer in scenario.gold.accepted_transfer_answers_de
    }
    rule_text = _normalized(response.rule_explanation_zh_tw)
    rule_success = all(
        any(_normalized(term) in rule_text for term in group)
        for group in scenario.gold.rule_facet_groups_zh_tw
    )
    detected = set(response.detected_problem_ids)
    unclear_detected = bool((response.unclear_feedback_zh_tw or "").strip()) or (
        "unclear_feedback_detected" in detected
    )

    values: dict[str, tuple[bool, str]] = {
        "error_identification_success": (
            response.identified_error_category == scenario.gold.identified_error_category,
            "frozen_key",
        ),
        "rule_comprehension_success": (rule_success, "frozen_facets"),
        "correction_comprehension_success": (correction_success, "frozen_key"),
        "transfer_item_success": (transfer_success, "frozen_key"),
        "feedback_level_mismatch": ("feedback_level_mismatch" in detected, "persona_flag"),
        "unclear_feedback_detected": (unclear_detected, "persona_flag"),
        "overly_complex_explanation": (
            "overly_complex_explanation" in detected,
            "persona_flag",
        ),
        "missing_actionable_guidance": (
            "missing_actionable_guidance" in detected,
            "persona_flag",
        ),
    }
    metrics = tuple(
        MetricOutcome(
            metric=name,
            value=values[name][0],
            scorable=True,
            scoring_source=values[name][1],
            denominator_policy=SCORABLE_DENOMINATOR,
            not_scorable_reason=None,
        )
        for name in METRIC_NAMES
    )
    return EvaluationRecord(
        schema_version="1.0",
        cell=cell,
        expected_pedagogical_issues=presentation.expected_pedagogical_issues,
        response_checksum=checksum,
        artifact_contract_valid=True,
        failure_bucket="none",
        metrics=metrics,
    )


def failure_record(
    *,
    cell: EvaluationCell,
    presentation: PresentedFeedback,
    checksum: str,
    failure_bucket: Literal["timeout", "provider_failure", "schema_invalid", "security_rejected"],
) -> EvaluationRecord:
    metrics = tuple(
        MetricOutcome(
            metric=name,
            value=None,
            scorable=False,
            scoring_source="not_scorable",
            denominator_policy=END_TO_END_DENOMINATOR,
            not_scorable_reason=failure_bucket,
        )
        for name in METRIC_NAMES
    )
    return EvaluationRecord(
        schema_version="1.0",
        cell=cell,
        expected_pedagogical_issues=presentation.expected_pedagogical_issues,
        response_checksum=checksum,
        artifact_contract_valid=False,
        failure_bucket=failure_bucket,
        metrics=metrics,
    )


def persona_response_from_survey_artifact(payload: Any) -> dict[str, Any]:
    """Adapt MatrAIx survey_result.json to the versioned evaluation response."""
    if not isinstance(payload, dict) or not isinstance(payload.get("answers"), list):
        raise ValueError("survey_result.json must contain an answers array.")
    answers: dict[str, Any] = {}
    for item in payload["answers"]:
        if not isinstance(item, dict):
            raise ValueError("Each survey answer must be an object.")
        question_id = str(item.get("questionId") or "").strip()
        if not question_id or "value" not in item:
            raise ValueError("Each survey answer requires questionId and value.")
        if question_id in answers:
            raise ValueError("Duplicate survey question id.")
        answers[question_id] = item["value"]

    required = {
        "identified_error_category",
        "rule_explanation_zh_tw",
        "required_correction_de",
        "transfer_answer_de",
        "unclear_feedback_zh_tw",
        "feedback_level_mismatch",
        "overly_complex_explanation",
        "missing_actionable_guidance",
    }
    missing = sorted(required - set(answers))
    if missing:
        raise ValueError(f"Survey artifact is missing answers: {', '.join(missing)}")

    detected: list[str] = []
    for issue in (
        "feedback_level_mismatch",
        "overly_complex_explanation",
        "missing_actionable_guidance",
    ):
        if _yes(answers[issue]):
            detected.append(issue)
    unclear = str(answers["unclear_feedback_zh_tw"] or "").strip()
    if unclear and _normalized(unclear) not in {"無", "沒有", "none"}:
        detected.append("unclear_feedback_detected")
    else:
        unclear = ""

    return {
        "schema_version": "1.0",
        "identified_error_category": str(answers["identified_error_category"]),
        "rule_explanation_zh_tw": str(answers["rule_explanation_zh_tw"]),
        "required_correction_de": str(answers["required_correction_de"]),
        "transfer_answer_de": str(answers["transfer_answer_de"]),
        "unclear_feedback_zh_tw": unclear or None,
        "detected_problem_ids": detected,
    }


def metric_vector(record: EvaluationRecord) -> tuple[bool | None, ...]:
    return tuple(item.value for item in record.metrics)


def _normalized(value: str) -> str:
    text = unicodedata.normalize("NFKC", value).casefold().strip()
    text = re.sub(r"\s+", " ", text)
    return text.rstrip(" .!?")


def _yes(value: Any) -> bool:
    return _normalized(str(value)) in {"yes", "true", "是", "有"}


def checksum_for_failure_metadata(value: Any) -> str:
    safe = json.dumps(value, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(safe.encode("utf-8")).hexdigest()
