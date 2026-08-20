from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable
from typing import Any

from .calibration import blocked_calibration_summary
from .constants import (
    METRIC_NAMES,
    REPORT_VERSION,
    SYNTHETIC_EVIDENCE_DISCLAIMER,
)
from .models import EvaluationCell, EvaluationRecord
from .scoring import metric_vector
from .security import escape_markdown


def build_report(
    *,
    cells: tuple[EvaluationCell, ...],
    records: Iterable[EvaluationRecord],
    status: str,
    limitations: Iterable[str],
    human_calibration: dict[str, Any] | None = None,
) -> dict[str, Any]:
    records_tuple = tuple(records)
    records_by_cell = {record.cell.cell_id: record for record in records_tuple}
    if len(records_by_cell) != len(records_tuple):
        raise ValueError("Each report record must have a unique cell id.")
    scheduled_ids = {cell.cell_id for cell in cells}
    unexpected = sorted(set(records_by_cell) - scheduled_ids)
    if unexpected:
        raise ValueError(f"Report contains unscheduled cells: {', '.join(unexpected)}")

    metrics = {
        metric: _metric_summary(metric, len(cells), records_tuple) for metric in METRIC_NAMES
    }
    strata: dict[str, list[dict[str, Any]]] = {}
    for field in ("cefr_level", "error_category", "feedback_variant"):
        values = sorted({getattr(cell, field) for cell in cells})
        strata[field] = [
            _stratum_summary(
                field=field,
                value=value,
                cells=tuple(cell for cell in cells if getattr(cell, field) == value),
                records=tuple(
                    record for record in records_tuple if getattr(record.cell, field) == value
                ),
            )
            for value in values
        ]

    return {
        "disclaimer": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "schemaVersion": REPORT_VERSION,
        "status": status,
        "formalEvidence": False,
        "scheduledEvaluations": len(cells),
        "completedEvaluations": len(records_tuple),
        "artifactContractValid": sum(record.artifact_contract_valid for record in records_tuple),
        "failureBuckets": _failure_buckets(records_tuple),
        "metrics": metrics,
        "pedagogicalDetection": _pedagogical_detection(records_tuple),
        "strata": strata,
        "replicateConsistency": _replicate_summary(records_tuple),
        "humanCalibration": human_calibration or blocked_calibration_summary(),
        "limitations": list(limitations),
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        SYNTHETIC_EVIDENCE_DISCLAIMER,
        "",
        "# DeutschTrainer MatrAIx synthetic evaluation",
        "",
        f"Status: **{escape_markdown(str(report['status']))}**",
        "",
        f"Scheduled: {report['scheduledEvaluations']}",
        f"Completed: {report['completedEvaluations']}",
        f"Artifact-contract valid: {report['artifactContractValid']}",
        "",
        "## Interpretable metrics",
        "",
        (
            "| Metric | True / scorable | Conditional true rate | "
            "End-to-end true rate | 95% Wilson interval |"
        ),
        "| --- | ---: | ---: | ---: | --- |",
    ]
    for metric in METRIC_NAMES:
        summary = report["metrics"][metric]
        interval = summary["wilson95"]
        interval_text = (
            "not reported (n < 20)"
            if interval is None
            else f"{interval['lower']:.3f}–{interval['upper']:.3f}"
        )
        lines.append(
            "| {} | {} / {} | {} | {} | {} |".format(
                escape_markdown(metric),
                summary["true"],
                summary["scorable"],
                _rate_text(summary["conditionalTrueRate"]),
                _rate_text(summary["endToEndTrueRate"]),
                interval_text,
            )
        )

    repeat = report["replicateConsistency"]
    lines.extend(
        [
            "",
            "## Replicate consistency",
            "",
            f"- Complete 3-run groups: {repeat['completeGroups']}",
            (
                "- Exact response-checksum agreement: "
                f"{_rate_text(repeat['exactChecksumAgreementRate'])}"
            ),
            f"- Metric-vector agreement: {_rate_text(repeat['metricVectorAgreementRate'])}",
            f"- Metric flip rate: {_rate_text(repeat['metricFlipRate'])}",
            f"- Schema-valid rate: {_rate_text(repeat['schemaValidRate'])}",
            "- Per-metric 3/3 agreement:",
            *(
                f"  - {escape_markdown(metric)}: "
                f"{_rate_text(repeat['perMetricThreeOfThreeAgreement'][metric])}"
                for metric in METRIC_NAMES
            ),
            "",
            "## Human calibration",
            "",
            _calibration_markdown(report["humanCalibration"]),
            "",
            "## Limitations",
            "",
        ]
    )
    lines.extend(f"- {escape_markdown(str(item))}" for item in report["limitations"])
    lines.append("")
    return "\n".join(lines)


def wilson_interval(
    successes: int,
    total: int,
    z: float = 1.959963984540054,
) -> dict[str, float] | None:
    if total < 20:
        return None
    proportion = successes / total
    denominator = 1 + (z * z) / total
    centre = proportion + (z * z) / (2 * total)
    margin = z * math.sqrt((proportion * (1 - proportion) + (z * z) / (4 * total)) / total)
    return {
        "lower": max(0.0, (centre - margin) / denominator),
        "upper": min(1.0, (centre + margin) / denominator),
    }


def _metric_summary(
    metric: str,
    scheduled: int,
    records: tuple[EvaluationRecord, ...],
) -> dict[str, Any]:
    outcomes = [
        next(item for item in record.metrics if item.metric == metric) for record in records
    ]
    scorable = [item for item in outcomes if item.scorable]
    true_count = sum(item.value is True for item in scorable)
    return {
        "true": true_count,
        "false": sum(item.value is False for item in scorable),
        "scorable": len(scorable),
        "scheduled": scheduled,
        "notScorable": scheduled - len(scorable),
        "conditionalTrueRate": true_count / len(scorable) if scorable else None,
        "endToEndTrueRate": true_count / scheduled if scheduled else None,
        "wilson95": wilson_interval(true_count, len(scorable)),
    }


def _stratum_summary(
    *,
    field: str,
    value: str,
    cells: tuple[EvaluationCell, ...],
    records: tuple[EvaluationRecord, ...],
) -> dict[str, Any]:
    return {
        "field": field,
        "value": value,
        "scheduled": len(cells),
        "completed": len(records),
        "rankingAllowed": len(cells) >= 20,
        "metrics": {
            metric: _metric_summary(metric, len(cells), records) for metric in METRIC_NAMES
        },
    }


def _failure_buckets(records: tuple[EvaluationRecord, ...]) -> dict[str, int]:
    buckets = {
        "none": 0,
        "timeout": 0,
        "provider_failure": 0,
        "schema_invalid": 0,
        "security_rejected": 0,
    }
    for record in records:
        buckets[record.failure_bucket] += 1
    return buckets


def _replicate_summary(records: tuple[EvaluationRecord, ...]) -> dict[str, Any]:
    grouped: dict[tuple[str, str, str], list[EvaluationRecord]] = defaultdict(list)
    for record in records:
        key = (
            record.cell.scenario_id,
            record.cell.persona_id,
            record.cell.feedback_variant,
        )
        grouped[key].append(record)
    complete = [
        sorted(group, key=lambda record: record.cell.replicate)
        for group in grouped.values()
        if {record.cell.replicate for record in group} == {0, 1, 2}
    ]
    exact = sum(len({record.response_checksum for record in group}) == 1 for group in complete)
    vector_matches = sum(
        len({metric_vector(record) for record in group}) == 1 for group in complete
    )
    comparisons = len(complete) * len(METRIC_NAMES)
    flips = sum(
        len({metric_vector(record)[index] for record in group}) > 1
        for group in complete
        for index in range(len(METRIC_NAMES))
    )
    repeat_records = [record for group in complete for record in group]
    per_metric_agreement = {
        metric: (
            sum(len({metric_vector(record)[index] for record in group}) == 1 for group in complete)
            / len(complete)
            if complete
            else None
        )
        for index, metric in enumerate(METRIC_NAMES)
    }
    return {
        "completeGroups": len(complete),
        "exactChecksumAgreementRate": exact / len(complete) if complete else None,
        "metricVectorAgreementRate": vector_matches / len(complete) if complete else None,
        "metricFlipRate": flips / comparisons if comparisons else None,
        "perMetricThreeOfThreeAgreement": per_metric_agreement,
        "schemaValidRate": (
            sum(record.artifact_contract_valid for record in repeat_records) / len(repeat_records)
            if repeat_records
            else None
        ),
    }


def _pedagogical_detection(
    records: tuple[EvaluationRecord, ...],
) -> dict[str, dict[str, int | float | None]]:
    result: dict[str, dict[str, int | float | None]] = {}
    for metric in METRIC_NAMES[4:]:
        true_positive = false_positive = false_negative = true_negative = 0
        for record in records:
            outcome = next(item for item in record.metrics if item.metric == metric)
            if not outcome.scorable:
                continue
            expected = metric in record.expected_pedagogical_issues
            observed = outcome.value is True
            if expected and observed:
                true_positive += 1
            elif expected:
                false_negative += 1
            elif observed:
                false_positive += 1
            else:
                true_negative += 1
        positive_total = true_positive + false_negative
        negative_total = false_positive + true_negative
        result[metric] = {
            "truePositive": true_positive,
            "falsePositive": false_positive,
            "falseNegative": false_negative,
            "trueNegative": true_negative,
            "sensitivity": true_positive / positive_total if positive_total else None,
            "falsePositiveRate": false_positive / negative_total if negative_total else None,
        }
    return result


def _rate_text(value: float | None) -> str:
    return "not available" if value is None else f"{value:.3f}"


def _calibration_markdown(calibration: dict[str, Any]) -> str:
    if calibration.get("status") != "CANDIDATE":
        return "BLOCKED — 36 cells require two independent reviewers. This does not satisfy Gate C."
    return (
        f"CANDIDATE — {calibration['completedCells']} cells were independently reviewed. "
        "Agreement statistics calibrate this harness only and do not satisfy Gate C."
    )
