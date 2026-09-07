from __future__ import annotations

from collections import defaultdict
from typing import Any

from .constants import PEDAGOGICAL_ISSUES
from .models import CalibrationArtifact


def calibration_summary(artifact: CalibrationArtifact) -> dict[str, Any]:
    reviewers = tuple(sorted({item.reviewer_role_id for item in artifact.judgments}))
    by_metric: dict[str, list[tuple[bool, bool]]] = defaultdict(list)
    lookup = {
        (item.cell_id, item.metric, item.reviewer_role_id): item.value
        for item in artifact.judgments
    }
    cells = tuple(sorted({item.cell_id for item in artifact.judgments}))
    for metric in PEDAGOGICAL_ISSUES:
        for cell_id in cells:
            by_metric[metric].append(
                (
                    lookup[(cell_id, metric, reviewers[0])],
                    lookup[(cell_id, metric, reviewers[1])],
                )
            )

    return {
        "status": "CANDIDATE",
        "calibrationVersion": artifact.calibration_version,
        "reviewerRoleIds": list(reviewers),
        "completedCells": len(cells),
        "note": "Calibration evidence is not Gate C language-review evidence.",
        "metrics": {metric: _agreement_summary(pairs) for metric, pairs in by_metric.items()},
    }


def blocked_calibration_summary() -> dict[str, Any]:
    return {
        "status": "BLOCKED",
        "requiredCells": 36,
        "requiredReviewers": 2,
        "completedCells": 0,
        "note": "Calibration evidence is not Gate C language-review evidence.",
    }


def _agreement_summary(pairs: list[tuple[bool, bool]]) -> dict[str, Any]:
    both_positive = sum(first and second for first, second in pairs)
    first_positive_second_negative = sum(first and not second for first, second in pairs)
    first_negative_second_positive = sum(not first and second for first, second in pairs)
    both_negative = sum(not first and not second for first, second in pairs)
    total = len(pairs)
    observed = (both_positive + both_negative) / total
    first_positive_rate = (both_positive + first_positive_second_negative) / total
    second_positive_rate = (both_positive + first_negative_second_positive) / total
    expected = first_positive_rate * second_positive_rate + (1 - first_positive_rate) * (
        1 - second_positive_rate
    )
    kappa = None if expected == 1 else (observed - expected) / (1 - expected)
    positive_denominator = (
        2 * both_positive + first_positive_second_negative + first_negative_second_positive
    )
    negative_denominator = (
        2 * both_negative + first_positive_second_negative + first_negative_second_positive
    )
    return {
        "n": total,
        "rawAgreement": observed,
        "cohensKappa": kappa,
        "positiveAgreement": (
            2 * both_positive / positive_denominator if positive_denominator else None
        ),
        "negativeAgreement": (
            2 * both_negative / negative_denominator if negative_denominator else None
        ),
        "confusionMatrix": {
            "bothPositive": both_positive,
            "firstPositiveSecondNegative": first_positive_second_negative,
            "firstNegativeSecondPositive": first_negative_second_positive,
            "bothNegative": both_negative,
        },
        "interpretation": ("positive_negative_agreement_only" if kappa is None else "cohens_kappa"),
    }
