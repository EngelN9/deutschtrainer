from __future__ import annotations

import json

import yaml

from dt_matraix.catalog import expand_scenarios, load_cohort, load_scenario_sources
from dt_matraix.materialize import materialize_suite
from dt_matraix.paths import resolve_safe_child
from dt_matraix.planning import build_evaluation_plan


def test_materializer_uses_72_tasks_and_eight_custom_personas(tmp_path) -> None:
    cohort = load_cohort()
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, cohort)

    manifest = materialize_suite(
        output_root=tmp_path,
        cells=cells,
        scenarios=scenarios,
        cohort=cohort,
    )

    assert manifest["taskCount"] == 72
    assert manifest["personaCount"] == 8
    assert manifest["scheduledCellCount"] == 192
    assert len(tuple((tmp_path / "tasks").iterdir())) == 72
    assert len(tuple((tmp_path / "personas").glob("*.yaml"))) == 8


def test_materialized_context_does_not_expose_gold_or_rubric(tmp_path) -> None:
    cohort = load_cohort()
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, cohort)
    materialize_suite(output_root=tmp_path, cells=cells, scenarios=scenarios, cohort=cohort)

    context = next((tmp_path / "tasks").glob("*/input/context.md")).read_text(encoding="utf-8")
    assert "rubric" not in context.casefold()
    assert "verifier" not in context.casefold()
    assert "expected_pedagogical_issues" not in context
    assert "SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE" in context


def test_materialized_persona_declares_synthetic_adult_source(tmp_path) -> None:
    cohort = load_cohort()
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, cohort)
    materialize_suite(output_root=tmp_path, cells=cells, scenarios=scenarios, cohort=cohort)

    persona = yaml.safe_load(
        next((tmp_path / "personas").glob("*.yaml")).read_text(encoding="utf-8")
    )
    assert persona["source"] == "deutschtrainer_fully_synthetic_adult"
    assert persona["demographics"]["age_status"] == "adult_18_plus"
    assert "provenance" not in persona


def test_verifier_reward_only_means_artifact_contract_valid(tmp_path) -> None:
    cohort = load_cohort()
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, cohort)
    materialize_suite(output_root=tmp_path, cells=cells, scenarios=scenarios, cohort=cohort)

    verifier = next((tmp_path / "tasks").glob("*/tests/test_state.py")).read_text(encoding="utf-8")
    assert '"artifactContractValid": True' in verifier
    assert '"learningQualityScored": False' in verifier


def test_safe_child_rejects_paths_and_traversal(tmp_path) -> None:
    for value in ("../escape", "folder/name", "C:\\absolute"):
        try:
            resolve_safe_child(tmp_path, value)
        except ValueError:
            pass
        else:
            raise AssertionError(f"Unsafe identifier was accepted: {value}")


def test_materialization_manifest_is_machine_readable(tmp_path) -> None:
    cohort = load_cohort()
    scenarios = expand_scenarios(load_scenario_sources())
    cells = build_evaluation_plan(scenarios, cohort)
    materialize_suite(output_root=tmp_path, cells=cells, scenarios=scenarios, cohort=cohort)

    payload = json.loads((tmp_path / "materialization-manifest.json").read_text(encoding="utf-8"))
    assert payload["scheduledCellCount"] == 192
