from __future__ import annotations

import json
from typing import Any

from .catalog import (
    expand_scenarios,
    expanded_contract_artifact,
    load_cohort,
    load_scenario_sources,
)
from .constants import (
    FEEDBACK_SCHEMA_ID,
    PROMPT_ID,
    PROMPT_VERSION,
    SYNTHETIC_EVIDENCE_DISCLAIMER,
)
from .paths import EXPANDED_SCENARIO_PATH, REPORTS_ROOT, WRITING_CONTRACT_PATH
from .planning import build_evaluation_plan, plan_artifact
from .reporting import build_report, render_markdown
from .serialization import canonical_json_bytes, sha256_value, write_json


def generate_checked_artifacts() -> dict[str, str]:
    artifacts = _checked_artifact_payloads()
    write_json(EXPANDED_SCENARIO_PATH, artifacts["scenarios"])
    write_json(WRITING_CONTRACT_PATH, artifacts["contracts"])
    write_json(REPORTS_ROOT / "golden-plan.json", artifacts["plan"])
    write_json(REPORTS_ROOT / "golden-report.json", artifacts["report"])
    (REPORTS_ROOT / "golden-report.md").write_text(str(artifacts["markdown"]), encoding="utf-8")
    write_json(REPORTS_ROOT / "golden-manifest.json", artifacts["checksums"])
    return artifacts["checksums"]


def verify_checked_artifacts() -> dict[str, str]:
    artifacts = _checked_artifact_payloads()
    expected_json = {
        EXPANDED_SCENARIO_PATH: artifacts["scenarios"],
        WRITING_CONTRACT_PATH: artifacts["contracts"],
        REPORTS_ROOT / "golden-plan.json": artifacts["plan"],
        REPORTS_ROOT / "golden-report.json": artifacts["report"],
        REPORTS_ROOT / "golden-manifest.json": artifacts["checksums"],
    }
    for path, expected in expected_json.items():
        actual = json.loads(path.read_text(encoding="utf-8"))
        if canonical_json_bytes(actual) != canonical_json_bytes(expected):
            raise ValueError(f"Checked deterministic artifact is stale: {path}")
    markdown_path = REPORTS_ROOT / "golden-report.md"
    if markdown_path.read_text(encoding="utf-8") != artifacts["markdown"]:
        raise ValueError(f"Checked deterministic artifact is stale: {markdown_path}")
    return artifacts["checksums"]


def _checked_artifact_payloads() -> dict[str, Any]:
    cohort = load_cohort()
    sources = load_scenario_sources()
    scenarios = expand_scenarios(sources)
    cells = build_evaluation_plan(scenarios, cohort)
    plan = plan_artifact(cells)
    report = build_report(
        cells=cells,
        records=(),
        status="BLOCKED",
        limitations=(
            "No live provider run has been performed.",
            "All 36 formal scenarios remain pending qualified German-language review.",
            "The 36-cell, two-reviewer measurement calibration is incomplete.",
            "Synthetic evidence cannot satisfy any product release gate.",
        ),
    )
    checksums = {
        "disclaimer": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "cohortChecksum": sha256_value(cohort),
        "scenarioSourceChecksum": sha256_value(sources),
        "expandedScenarioChecksum": sha256_value(scenarios),
        "planChecksum": str(plan["planChecksum"]),
        "promptContractChecksum": sha256_value(
            {"promptId": PROMPT_ID, "promptVersion": PROMPT_VERSION}
        ),
        "feedbackContractChecksum": sha256_value([scenario.feedback for scenario in scenarios]),
        "feedbackSchemaId": FEEDBACK_SCHEMA_ID,
        "reportChecksum": sha256_value(report),
    }
    return {
        "scenarios": [item.model_dump(mode="json") for item in scenarios],
        "contracts": expanded_contract_artifact(scenarios),
        "plan": plan,
        "report": report,
        "markdown": render_markdown(report),
        "checksums": checksums,
    }
