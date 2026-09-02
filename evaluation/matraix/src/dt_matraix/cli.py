from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer

from .artifacts import generate_checked_artifacts, verify_checked_artifacts
from .calibration import calibration_summary
from .catalog import (
    assert_expanded_artifact_current,
    load_cohort,
    load_expanded_scenarios,
    load_scenario_sources,
)
from .isolation import verify_isolation as collect_isolation_problems
from .live import run_live as execute_live_run
from .materialize import materialize_suite
from .models import CalibrationArtifact
from .paths import REPORTS_ROOT, RUNS_ROOT, resolve_safe_child
from .planning import build_evaluation_plan, calibration_cells, plan_artifact
from .reporting import build_report, render_markdown
from .runtime import BlockedRun
from .security import validate_synthetic_catalog
from .serialization import write_json

app = typer.Typer(
    no_args_is_help=True,
    add_completion=False,
    help="Isolated synthetic writing-feedback evaluation for DeutschTrainer.",
)

RunId = Annotated[
    str,
    typer.Option("--run-id", help="Allowlisted evaluation run id; never a filesystem path."),
]


@app.command()
def validate() -> None:
    """Validate catalogs, checked artifacts, security boundaries, and matrix cardinality."""
    cohort = load_cohort()
    sources = load_scenario_sources()
    scenarios = assert_expanded_artifact_current(sources)
    verify_checked_artifacts()
    validate_synthetic_catalog(cohort)
    validate_synthetic_catalog(sources)
    cells = build_evaluation_plan(scenarios, cohort)
    typer.echo(
        json.dumps(
            {
                "status": "PASS",
                "personas": len(cohort.personas),
                "scenarios": len(scenarios),
                "baseEvaluations": sum(cell.replicate == 0 for cell in cells),
                "scheduledEvaluations": len(cells),
                "formalRun": "BLOCKED",
            },
            ensure_ascii=False,
        )
    )


@app.command("plan")
def plan_command(run_id: RunId = "preflight-v1") -> None:
    """Create a deterministic, non-provider evaluation plan under ignored .runs."""
    cohort = load_cohort()
    scenarios = load_expanded_scenarios()
    artifact = plan_artifact(build_evaluation_plan(scenarios, cohort))
    path = resolve_safe_child(RUNS_ROOT / "plans", run_id).with_suffix(".json")
    write_json(path, artifact)
    typer.echo(str(path))


@app.command("materialize")
def materialize_command(run_id: RunId = "preflight-v1") -> None:
    """Materialize official MatrAIx survey task folders without running a model."""
    cohort = load_cohort()
    scenarios = load_expanded_scenarios()
    cells = build_evaluation_plan(scenarios, cohort)
    output_root = resolve_safe_child(RUNS_ROOT / "materialized", run_id)
    manifest = materialize_suite(
        output_root=output_root,
        cells=cells,
        scenarios=scenarios,
        cohort=cohort,
    )
    typer.echo(
        json.dumps(
            {
                "outputRoot": str(output_root),
                "taskCount": manifest["taskCount"],
                "personaCount": manifest["personaCount"],
                "scheduledCellCount": manifest["scheduledCellCount"],
            },
            ensure_ascii=False,
        )
    )


@app.command("ingest")
def ingest_command(
    job_id: Annotated[str, typer.Option("--job-id", help="Allowlisted MatrAIx job id.")],
) -> None:
    """Ingest a normalized job artifact from the ignored jobs directory."""
    job_root = resolve_safe_child(RUNS_ROOT / "jobs", job_id)
    metadata_path = job_root / "metadata.json"
    if not metadata_path.is_file():
        raise typer.BadParameter("Job metadata is unavailable.")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    run_id = str(metadata.get("runId") or "")
    cell_id = str(metadata.get("cellId") or "")
    run_root = resolve_safe_child(RUNS_ROOT / "runs", run_id)
    plan_path = resolve_safe_child(RUNS_ROOT / "plans", run_id).with_suffix(".json")
    plan_payload = json.loads(plan_path.read_text(encoding="utf-8"))
    cell_payload = next(
        (item for item in plan_payload["cells"] if item["cell_id"] == cell_id), None
    )
    if cell_payload is None:
        raise typer.BadParameter("Job cell is not present in the versioned run plan.")
    from .ingest import ingest_survey_result
    from .models import EvaluationCell

    cell = EvaluationCell.model_validate(cell_payload)
    scenario = next(
        item for item in load_expanded_scenarios() if item.scenario_id == cell.scenario_id
    )
    record = ingest_survey_result(
        survey_result_path=job_root / "survey_result.json",
        cell=cell,
        scenario=scenario,
        record_path=run_root / "records" / f"{cell.cell_id}.json",
    )
    typer.echo(record.response_checksum)


@app.command("report")
def report_command(run_id: RunId) -> None:
    """Generate machine and human reports without exposing raw provider responses."""
    from .models import EvaluationCell, EvaluationRecord

    plan_path = resolve_safe_child(RUNS_ROOT / "plans", run_id).with_suffix(".json")
    plan_payload = json.loads(plan_path.read_text(encoding="utf-8"))
    cells = tuple(EvaluationCell.model_validate(item) for item in plan_payload["cells"])
    run_root = resolve_safe_child(RUNS_ROOT / "runs", run_id)
    record_root = run_root / "records"
    records = (
        tuple(
            EvaluationRecord.model_validate_json(path.read_text(encoding="utf-8"))
            for path in sorted(record_root.glob("*.json"))
        )
        if record_root.is_dir()
        else ()
    )
    calibration_path = resolve_safe_child(RUNS_ROOT / "calibration", run_id).with_suffix(".json")
    human_calibration = None
    if calibration_path.is_file():
        calibration_artifact = CalibrationArtifact.model_validate_json(
            calibration_path.read_text(encoding="utf-8")
        )
        expected_calibration_ids = {cell.cell_id for cell in calibration_cells(cells)}
        actual_calibration_ids = {item.cell_id for item in calibration_artifact.judgments}
        if actual_calibration_ids != expected_calibration_ids:
            raise typer.BadParameter(
                "Calibration judgments must match the 36 preselected plan cells."
            )
        human_calibration = calibration_summary(calibration_artifact)
    report = build_report(
        cells=cells,
        records=records,
        status="CANDIDATE" if records else "BLOCKED",
        limitations=(
            "Synthetic personas are not real learner evidence.",
            "Human calibration and qualified German-language review remain required.",
        ),
        human_calibration=human_calibration,
    )
    reports_root = run_root / "reports"
    write_json(reports_root / "report.json", report)
    reports_root.mkdir(parents=True, exist_ok=True)
    (reports_root / "report.md").write_text(render_markdown(report), encoding="utf-8")
    typer.echo(str(reports_root))


@app.command("verify-isolation")
def verify_isolation_command() -> None:
    """Fail when production workspaces or secrets depend on the evaluation harness."""
    problems = collect_isolation_problems()
    if problems:
        for problem in problems:
            typer.echo(problem, err=True)
        raise typer.Exit(code=1)
    typer.echo("PASS: production workspaces do not depend on MatrAIx evaluation code.")


@app.command("generate-checked-artifacts", hidden=True)
def generate_checked_artifacts_command() -> None:
    """Regenerate deterministic checked artifacts after intentional source review."""
    typer.echo(json.dumps(generate_checked_artifacts(), ensure_ascii=False))


@app.command("run-live")
def run_live_command(
    run_id: RunId,
    provider: Annotated[str, typer.Option("--provider")],
    model: Annotated[str, typer.Option("--model")],
    seed: Annotated[int, typer.Option("--seed")] = 42,
) -> None:
    """Run the formal matrix only inside the reviewed, isolated container."""
    try:
        manifest = execute_live_run(
            run_id=run_id,
            provider=provider,
            model=model,
            seed=seed,
        )
    except BlockedRun as error:
        typer.echo(f"BLOCKED: {error}", err=True)
        raise typer.Exit(code=2) from error
    typer.echo(manifest.model_dump_json())


@app.command("golden-report")
def golden_report_command() -> None:
    """Print the checked deterministic report path."""
    path: Path = REPORTS_ROOT / "golden-report.md"
    if not path.is_file():
        raise typer.BadParameter("Golden report is missing.")
    typer.echo(str(path))


if __name__ == "__main__":
    app()
