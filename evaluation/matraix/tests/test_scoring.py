from __future__ import annotations

from dt_matraix.catalog import expand_scenarios, load_cohort, load_scenario_sources
from dt_matraix.planning import build_evaluation_plan, presented_feedback
from dt_matraix.scoring import persona_response_from_survey_artifact, score_payload
from dt_matraix.security import MAX_PROVIDER_OUTPUT_BYTES


def _scenario_and_cell():
    scenarios = expand_scenarios(load_scenario_sources())
    scenario = scenarios[0]
    cell = next(
        item
        for item in build_evaluation_plan(scenarios, load_cohort())
        if item.scenario_id == scenario.scenario_id and item.feedback_variant == "baseline"
    )
    return scenario, cell


def test_frozen_keys_score_interpretable_metrics() -> None:
    scenario, cell = _scenario_and_cell()
    facets = " ".join(group[0] for group in scenario.gold.rule_facet_groups_zh_tw)
    payload = {
        "schema_version": "1.0",
        "identified_error_category": scenario.gold.identified_error_category,
        "rule_explanation_zh_tw": facets,
        "required_correction_de": scenario.gold.required_correction_de,
        "transfer_answer_de": scenario.gold.accepted_transfer_answers_de[0],
        "unclear_feedback_zh_tw": None,
        "detected_problem_ids": [],
    }

    record = score_payload(
        cell=cell,
        scenario=scenario,
        presentation=presented_feedback(scenario, "baseline"),
        payload=payload,
    )

    assert record.artifact_contract_valid is True
    assert [metric.value for metric in record.metrics[:4]] == [True, True, True, True]
    assert [metric.value for metric in record.metrics[4:]] == [False, False, False, False]


def test_invalid_schema_remains_in_end_to_end_denominator() -> None:
    scenario, cell = _scenario_and_cell()
    record = score_payload(
        cell=cell,
        scenario=scenario,
        presentation=presented_feedback(scenario, "baseline"),
        payload={"schema_version": "1.0"},
    )

    assert record.failure_bucket == "schema_invalid"
    assert all(metric.value is None and not metric.scorable for metric in record.metrics)


def test_secret_like_output_is_rejected_without_echoing_it() -> None:
    scenario, cell = _scenario_and_cell()
    secret_like_value = "sk-" + "1234567890abcdefghijklmnop"
    payload = {
        "schema_version": "1.0",
        "identified_error_category": scenario.error_category,
        "rule_explanation_zh_tw": secret_like_value,
        "required_correction_de": scenario.gold.required_correction_de,
        "transfer_answer_de": scenario.gold.accepted_transfer_answers_de[0],
        "unclear_feedback_zh_tw": None,
        "detected_problem_ids": [],
    }
    record = score_payload(
        cell=cell,
        scenario=scenario,
        presentation=presented_feedback(scenario, "baseline"),
        payload=payload,
    )

    assert record.failure_bucket == "security_rejected"


def test_raw_html_pii_and_oversized_outputs_are_rejected() -> None:
    scenario, cell = _scenario_and_cell()
    base = {
        "schema_version": "1.0",
        "identified_error_category": scenario.error_category,
        "required_correction_de": scenario.gold.required_correction_de,
        "transfer_answer_de": scenario.gold.accepted_transfer_answers_de[0],
        "unclear_feedback_zh_tw": None,
        "detected_problem_ids": [],
    }
    dangerous_values = (
        "<script>alert(1)</script>",
        "請寄到 synthetic.person@example.com",
        "字" * (MAX_PROVIDER_OUTPUT_BYTES + 1),
    )

    for dangerous in dangerous_values:
        record = score_payload(
            cell=cell,
            scenario=scenario,
            presentation=presented_feedback(scenario, "baseline"),
            payload={**base, "rule_explanation_zh_tw": dangerous},
        )
        assert record.failure_bucket == "security_rejected"


def test_matraix_survey_artifact_adapter_is_explicit() -> None:
    answers = {
        "identified_error_category": "word_order",
        "rule_explanation_zh_tw": "從屬子句的動詞放在句末。",
        "required_correction_de": "weil ich krank bin",
        "transfer_answer_de": "Er kommt später, weil er arbeiten muss.",
        "unclear_feedback_zh_tw": "無",
        "feedback_level_mismatch": "false",
        "overly_complex_explanation": "true",
        "missing_actionable_guidance": "false",
    }
    artifact = {
        "answers": [
            {"questionId": question_id, "value": value} for question_id, value in answers.items()
        ]
    }

    result = persona_response_from_survey_artifact(artifact)

    assert result["unclear_feedback_zh_tw"] is None
    assert result["detected_problem_ids"] == ["overly_complex_explanation"]
