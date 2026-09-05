from __future__ import annotations

import pytest
from pydantic import ValidationError

from dt_matraix.calibration import calibration_summary
from dt_matraix.constants import PEDAGOGICAL_ISSUES
from dt_matraix.models import CalibrationArtifact, CalibrationJudgment


def _artifact(*, disagree_on_first: bool = False) -> CalibrationArtifact:
    judgments = []
    for cell_index in range(36):
        cell_id = f"calibration-cell-{cell_index:02d}"
        for metric in PEDAGOGICAL_ISSUES:
            expected = cell_index % 2 == 0
            judgments.extend(
                (
                    CalibrationJudgment(
                        cell_id=cell_id,
                        reviewer_role_id="reviewer-a",
                        metric=metric,
                        value=expected,
                    ),
                    CalibrationJudgment(
                        cell_id=cell_id,
                        reviewer_role_id="reviewer-b",
                        metric=metric,
                        value=(not expected if disagree_on_first and cell_index == 0 else expected),
                    ),
                )
            )
    return CalibrationArtifact(
        schema_version="1.0",
        calibration_version="calibration.v1",
        judgments=tuple(judgments),
    )


def test_calibration_reports_raw_agreement_kappa_and_confusion_matrix() -> None:
    summary = calibration_summary(_artifact(disagree_on_first=True))

    metric = summary["metrics"]["feedback_level_mismatch"]
    assert summary["completedCells"] == 36
    assert metric["n"] == 36
    assert metric["rawAgreement"] == 35 / 36
    assert metric["cohensKappa"] is not None
    assert sum(metric["confusionMatrix"].values()) == 36


def test_calibration_requires_two_judgments_for_all_four_metrics() -> None:
    artifact = _artifact()
    payload = artifact.model_dump(mode="json")
    payload["judgments"] = payload["judgments"][:-1]

    with pytest.raises(ValidationError):
        CalibrationArtifact.model_validate(payload)
