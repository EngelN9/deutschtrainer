from __future__ import annotations

from dt_matraix.catalog import expand_scenarios, load_cohort, load_scenario_sources
from dt_matraix.planning import build_evaluation_plan, presented_feedback
from dt_matraix.reporting import build_report, render_markdown, wilson_interval
from dt_matraix.scoring import score_payload


def test_empty_report_keeps_all_scheduled_failures_visible() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, load_cohort())
    report = build_report(
        cells=cells,
        records=(),
        status="BLOCKED",
        limitations=("No provider run.",),
    )

    metric = report["metrics"]["error_identification_success"]
    assert metric["scheduled"] == 192
    assert metric["scorable"] == 0
    assert metric["notScorable"] == 192
    assert metric["conditionalTrueRate"] is None
    assert metric["endToEndTrueRate"] == 0
    assert render_markdown(report).startswith("SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE")


def test_wilson_interval_is_only_reported_for_n_at_least_20() -> None:
    assert wilson_interval(9, 19) is None
    interval = wilson_interval(10, 20)
    assert interval is not None
    assert 0 <= interval["lower"] < interval["upper"] <= 1


def test_three_identical_replicates_report_exact_agreement() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, load_cohort())
    seed = next(cell for cell in cells if cell.replicate == 1)
    group = tuple(
        cell
        for cell in cells
        if (
            cell.scenario_id,
            cell.persona_id,
            cell.feedback_variant,
        )
        == (seed.scenario_id, seed.persona_id, seed.feedback_variant)
    )
    scenario = next(item for item in scenarios if item.scenario_id == seed.scenario_id)
    payload = {
        "schema_version": "1.0",
        "identified_error_category": scenario.error_category,
        "rule_explanation_zh_tw": " ".join(
            facet[0] for facet in scenario.gold.rule_facet_groups_zh_tw
        ),
        "required_correction_de": scenario.gold.required_correction_de,
        "transfer_answer_de": scenario.gold.accepted_transfer_answers_de[0],
        "unclear_feedback_zh_tw": None,
        "detected_problem_ids": [],
    }
    records = tuple(
        score_payload(
            cell=cell,
            scenario=scenario,
            presentation=presented_feedback(scenario, cell.feedback_variant),
            payload=payload,
        )
        for cell in group
    )
    report = build_report(
        cells=cells,
        records=records,
        status="CANDIDATE",
        limitations=("Synthetic only.",),
    )

    repeat = report["replicateConsistency"]
    assert repeat["completeGroups"] == 1
    assert repeat["exactChecksumAgreementRate"] == 1
    assert repeat["metricVectorAgreementRate"] == 1
    assert repeat["metricFlipRate"] == 0
    assert all(value == 1 for value in repeat["perMetricThreeOfThreeAgreement"].values())


def test_diagnostic_detection_keeps_issue_present_and_absent_counts() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, load_cohort())
    selected = tuple(cell for cell in cells if cell.replicate == 0)[:2]
    records = []
    for cell in selected:
        scenario = next(item for item in scenarios if item.scenario_id == cell.scenario_id)
        presentation = presented_feedback(scenario, cell.feedback_variant)
        payload = {
            "schema_version": "1.0",
            "identified_error_category": scenario.error_category,
            "rule_explanation_zh_tw": " ".join(
                group[0] for group in scenario.gold.rule_facet_groups_zh_tw
            ),
            "required_correction_de": scenario.gold.required_correction_de,
            "transfer_answer_de": scenario.gold.accepted_transfer_answers_de[0],
            "unclear_feedback_zh_tw": None,
            "detected_problem_ids": list(presentation.expected_pedagogical_issues),
        }
        records.append(
            score_payload(
                cell=cell,
                scenario=scenario,
                presentation=presentation,
                payload=payload,
            )
        )

    report = build_report(
        cells=cells,
        records=records,
        status="CANDIDATE",
        limitations=("Synthetic only.",),
    )
    diagnostic_cell = next(
        cell for cell in selected if cell.feedback_variant == "diagnostic_perturbation"
    )
    issue = next(
        scenario.diagnostic_issue
        for scenario in scenarios
        if scenario.scenario_id == diagnostic_cell.scenario_id
    )
    detection = report["pedagogicalDetection"][issue]
    assert detection["truePositive"] == 1
    assert detection["trueNegative"] == 1
