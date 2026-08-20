from __future__ import annotations

from collections import Counter

import pytest
from pydantic import ValidationError

from dt_matraix.catalog import expand_scenarios, load_cohort, load_scenario_sources
from dt_matraix.models import EvaluationCell
from dt_matraix.planning import (
    build_evaluation_plan,
    calibration_cells,
    plan_artifact,
    presented_feedback,
)


def test_plan_has_144_base_cells_and_48_additional_replicates() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, load_cohort())

    assert len(cells) == 192
    assert sum(cell.replicate == 0 for cell in cells) == 144
    assert sum(cell.replicate > 0 for cell in cells) == 48
    assert len({cell.cell_id for cell in cells}) == 192
    assert Counter(cell.replicate for cell in cells) == {0: 144, 1: 24, 2: 24}


def test_plan_is_deterministic() -> None:
    scenarios = expand_scenarios(load_scenario_sources())
    first = plan_artifact(build_evaluation_plan(scenarios, load_cohort()))
    second = plan_artifact(build_evaluation_plan(scenarios, load_cohort()))

    assert first == second
    assert first["scheduledEvaluations"] == 192
    assert len(str(first["planChecksum"])) == 64
    assert all(len(cell["input_checksum"]) == 64 for cell in first["cells"])
    assert len(first["calibrationCellIds"]) == 36


def test_calibration_selection_is_stratified_and_preselected() -> None:
    cells = build_evaluation_plan(expand_scenarios(load_scenario_sources()), load_cohort())
    selected = calibration_cells(cells)

    assert len(selected) == 36
    assert len({cell.scenario_id for cell in selected}) == 36
    assert {cell.feedback_variant for cell in selected} == {
        "baseline",
        "diagnostic_perturbation",
    }
    assert len({cell.persona_id for cell in selected}) == 8


def test_unsupported_variant_is_rejected_by_the_versioned_schema() -> None:
    cell = build_evaluation_plan(expand_scenarios(load_scenario_sources()), load_cohort())[0]
    payload = cell.model_dump(mode="json")
    payload["feedback_variant"] = "unreviewed_variant"

    with pytest.raises(ValidationError):
        EvaluationCell.model_validate(payload)


def test_diagnostic_variant_has_exactly_one_hidden_issue() -> None:
    for scenario in expand_scenarios(load_scenario_sources()):
        baseline = presented_feedback(scenario, "baseline")
        diagnostic = presented_feedback(scenario, "diagnostic_perturbation")

        assert baseline.expected_pedagogical_issues == ()
        assert diagnostic.expected_pedagogical_issues == (scenario.diagnostic_issue,)
