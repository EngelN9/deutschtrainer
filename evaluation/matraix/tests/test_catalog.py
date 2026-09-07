from __future__ import annotations

from dt_matraix.artifacts import verify_checked_artifacts
from dt_matraix.catalog import (
    expand_scenarios,
    fixture_to_writing_feedback_contract,
    load_cohort,
    load_scenario_sources,
)
from dt_matraix.constants import ERROR_CATEGORIES
from dt_matraix.models import ScenarioSourceCatalog


def test_cohort_is_balanced_and_entirely_synthetic() -> None:
    cohort = load_cohort()

    assert cohort.synthetic_only is True
    assert cohort.statistically_representative is False
    assert len(cohort.personas) == 8
    assert all(persona.adult and persona.support_language == "zh-TW" for persona in cohort.personas)


def test_source_catalog_expands_to_36_pending_scenarios() -> None:
    scenarios = expand_scenarios(load_scenario_sources())

    assert len(scenarios) == 36
    assert {scenario.error_category for scenario in scenarios} == set(ERROR_CATEGORIES)
    assert all(scenario.status == "pending_human_review" for scenario in scenarios)
    assert all(scenario.feedback.requires_human_review for scenario in scenarios)


def test_human_review_status_is_granular_per_scenario() -> None:
    sources = load_scenario_sources()
    payload = sources.model_dump(mode="json")
    payload["categories"][0]["examples"]["B1"]["review_status"] = "approved"

    scenarios = expand_scenarios(ScenarioSourceCatalog.model_validate(payload))

    assert sum(scenario.status == "approved" for scenario in scenarios) == 1
    assert sum(scenario.status == "pending_human_review" for scenario in scenarios) == 35


def test_utf16_offsets_select_the_original_error() -> None:
    for scenario in expand_scenarios(load_scenario_sources()):
        error = scenario.feedback.inline_errors[0]
        encoded = scenario.learner_text_de.encode("utf-16-le")
        selected = encoded[error.start_offset * 2 : error.end_offset * 2].decode("utf-16-le")
        assert selected == error.original


def test_literal_transfer_stays_evaluation_only() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    transfer = [item for item in scenarios if item.error_category == "literal_zh_de_transfer"]

    assert len(transfer) == 4
    assert {item.feedback.inline_errors[0].type for item in transfer} == {"idiomaticity"}


def test_expanded_fixture_exposes_the_production_contract_shape() -> None:
    scenario = expand_scenarios(load_scenario_sources())[0]
    contract = fixture_to_writing_feedback_contract(scenario)

    assert contract["cefrLevelEstimate"] == scenario.cefr_level
    assert contract["referenceVersion"] is None
    assert contract["requiresHumanReview"] is True
    assert contract["inlineErrors"][0]["original"] in scenario.learner_text_de


def test_checked_deterministic_artifacts_are_current() -> None:
    checksums = verify_checked_artifacts()

    assert checksums["disclaimer"] == "SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE"
    assert len(checksums["planChecksum"]) == 64
