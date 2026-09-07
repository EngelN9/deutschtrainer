from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import yaml

from .catalog import load_cohort, load_expanded_scenarios
from .constants import (
    COHORT_VERSION,
    FEEDBACK_SCHEMA_ID,
    HARNESS_VERSION,
    MATRIX_COMMIT,
    MATRIX_DECLARED_VERSION,
    METRIC_VERSION,
    PROMPT_ID,
    PROMPT_VERSION,
    SCENARIO_VERSION,
    SUITE_VERSION,
)
from .ingest import ingest_survey_result
from .materialize import materialize_suite, task_name_for
from .models import RunManifest
from .paths import RUNS_ROOT, resolve_safe_child
from .planning import build_evaluation_plan, plan_artifact, presented_feedback
from .reporting import build_report, render_markdown
from .runtime import BlockedRun, validate_live_environment
from .scoring import checksum_for_failure_metadata, failure_record
from .serialization import sha256_value, write_json

UPSTREAM_CREDENTIAL_NAMES = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}
HARBOR_ENVIRONMENT_ALLOWLIST = (
    "HOME",
    "LANG",
    "LC_ALL",
    "PATH",
    "SSL_CERT_DIR",
    "SSL_CERT_FILE",
    "TMPDIR",
)


def run_live(*, run_id: str, provider: str, model: str, seed: int) -> RunManifest:
    environment = validate_live_environment(provider=provider, model=model, run_id=run_id)
    cohort = load_cohort()
    scenarios = load_expanded_scenarios()
    if any(scenario.status != "approved" for scenario in scenarios):
        raise BlockedRun("All 36 scenarios require qualified German-language approval.")
    cells = build_evaluation_plan(scenarios, cohort)
    plan = plan_artifact(cells)

    materialized_root = resolve_safe_child(RUNS_ROOT / "materialized", run_id)
    run_root = resolve_safe_child(RUNS_ROOT / "runs", run_id)
    materialize_suite(
        output_root=materialized_root,
        cells=cells,
        scenarios=scenarios,
        cohort=cohort,
    )
    write_json(resolve_safe_child(RUNS_ROOT / "plans", run_id).with_suffix(".json"), plan)
    scenario_by_id = {scenario.scenario_id: scenario for scenario in scenarios}
    records = []

    for cell in cells:
        cell_job_root = run_root / "jobs" / cell.cell_id
        cell_job_root.mkdir(parents=True, exist_ok=True)
        config_path = cell_job_root / "job.yaml"
        config = _job_config(
            run_id=run_id,
            cell_id=cell.cell_id,
            task_name=task_name_for(cell),
            persona_file=f"{cell.persona_id}.yaml",
            model=model,
            seed=seed,
        )
        config_path.write_text(
            yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding="utf-8"
        )
        evaluation_key_name = str(environment["keyName"])
        subprocess_environment = _harbor_environment(provider, evaluation_key_name)
        try:
            harbor_executable = shutil.which("harbor")
            if harbor_executable is None:
                raise FileNotFoundError("Pinned Harbor executable is unavailable.")
            subprocess.run(  # noqa: S603 - fixed executable and allowlisted config path
                [harbor_executable, "run", "-c", str(config_path)],
                cwd="/opt/matraix",
                env=subprocess_environment,
                check=True,
                timeout=900,
            )
            survey_result = _single_survey_result(run_id, cell.cell_id)
            record = ingest_survey_result(
                survey_result_path=survey_result,
                cell=cell,
                scenario=scenario_by_id[cell.scenario_id],
                record_path=run_root / "records" / f"{cell.cell_id}.json",
            )
        except subprocess.TimeoutExpired:
            record = failure_record(
                cell=cell,
                presentation=presented_feedback(
                    scenario_by_id[cell.scenario_id], cell.feedback_variant
                ),
                checksum=checksum_for_failure_metadata(
                    {"cellId": cell.cell_id, "failure": "timeout"}
                ),
                failure_bucket="timeout",
            )
            write_json(run_root / "records" / f"{cell.cell_id}.json", record)
        except ValueError:
            record = failure_record(
                cell=cell,
                presentation=presented_feedback(
                    scenario_by_id[cell.scenario_id], cell.feedback_variant
                ),
                checksum=checksum_for_failure_metadata(
                    {"cellId": cell.cell_id, "failure": "schema_invalid"}
                ),
                failure_bucket="schema_invalid",
            )
            write_json(run_root / "records" / f"{cell.cell_id}.json", record)
        except (subprocess.CalledProcessError, FileNotFoundError):
            record = failure_record(
                cell=cell,
                presentation=presented_feedback(
                    scenario_by_id[cell.scenario_id], cell.feedback_variant
                ),
                checksum=checksum_for_failure_metadata(
                    {"cellId": cell.cell_id, "failure": "provider_failure"}
                ),
                failure_bucket="provider_failure",
            )
            write_json(run_root / "records" / f"{cell.cell_id}.json", record)
        records.append(record)

    report_status = (
        "ACCEPTED_FOR_HUMAN_REVIEW"
        if records and all(record.artifact_contract_valid for record in records)
        else "REJECTED"
    )
    limitations = (
        "Synthetic personas are not real learner evidence.",
        "Model seed support is best effort and does not imply deterministic behavior.",
        "Human calibration remains distinct from Gate C language review.",
        "No grading, CEFR, publishing, prompt update, or release action is authorized.",
    )
    report = build_report(
        cells=cells,
        records=records,
        status=report_status,
        limitations=limitations,
    )
    reports_root = run_root / "reports"
    write_json(reports_root / "report.json", report)
    reports_root.mkdir(parents=True, exist_ok=True)
    (reports_root / "report.md").write_text(render_markdown(report), encoding="utf-8")
    scorable = sum(any(item.scorable for item in record.metrics) for record in records)
    manifest = RunManifest(
        schema_version="1.0",
        harness_version=HARNESS_VERSION,
        suite_version=SUITE_VERSION,
        cohort_version=COHORT_VERSION,
        scenario_version=SCENARIO_VERSION,
        metric_version=METRIC_VERSION,
        deutschtrainer_commit=str(environment["sourceCommit"]),
        deutschtrainer_clean=True,
        matraix_commit=MATRIX_COMMIT,
        matraix_declared_version=MATRIX_DECLARED_VERSION,
        provider=provider,
        model=model,
        seed=seed,
        prompt_id=PROMPT_ID,
        prompt_version=PROMPT_VERSION,
        feedback_schema_id=FEEDBACK_SCHEMA_ID,
        prompt_contract_checksum=sha256_value(
            {"promptId": PROMPT_ID, "promptVersion": PROMPT_VERSION}
        ),
        feedback_contract_checksum=sha256_value([scenario.feedback for scenario in scenarios]),
        cohort_checksum=sha256_value(cohort),
        scenario_checksum=sha256_value(scenarios),
        plan_checksum=str(plan["planChecksum"]),
        scheduled_evaluations=len(cells),
        completed_evaluations=len(records),
        valid_evaluations=sum(record.artifact_contract_valid for record in records),
        scorable_evaluations=scorable,
        formal_run_status=report_status,
        limitations=limitations,
    )
    write_json(run_root / "run-manifest.json", manifest)
    return manifest


def _job_config(
    *,
    run_id: str,
    cell_id: str,
    task_name: str,
    persona_file: str,
    model: str,
    seed: int,
) -> dict[str, object]:
    return {
        "job_name": cell_id,
        "jobs_dir": f"/runs/harbor-jobs/{run_id}/{cell_id}",
        "n_attempts": 1,
        "timeout_multiplier": 1.0,
        "n_concurrent_trials": 1,
        "quiet": False,
        # JSON survey agents are host-native in MatrAIx auto mode. Here, "host" is still the
        # locked-down outer evaluation container; it does not require or receive a Docker socket.
        "environment": {"type": "host", "delete": True},
        "agents": [
            {
                "name": "persona-json-survey",
                "model_name": model,
                "kwargs": {
                    "persona_path": (
                        f"persona/datasets/deutschtrainer-runs/{run_id}/personas/{persona_file}"
                    ),
                    "seed": seed,
                },
            }
        ],
        "tasks": [{"path": (f"application/tasks/deutschtrainer-runs/{run_id}/tasks/{task_name}")}],
    }


def _harbor_environment(provider: str, evaluation_key_name: str) -> dict[str, str]:
    environment = {
        name: value for name in HARBOR_ENVIRONMENT_ALLOWLIST if (value := os.environ.get(name))
    }
    environment[UPSTREAM_CREDENTIAL_NAMES[provider]] = os.environ[evaluation_key_name]
    return environment


def _single_survey_result(run_id: str, cell_id: str) -> Path:
    root = Path("/runs/harbor-jobs") / run_id / cell_id
    candidates = tuple(root.rglob("survey_result.json"))
    if len(candidates) != 1:
        raise ValueError("Expected exactly one MatrAIx survey_result.json artifact.")
    return candidates[0]
