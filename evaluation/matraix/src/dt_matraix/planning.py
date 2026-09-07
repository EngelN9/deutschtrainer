from __future__ import annotations

from collections.abc import Iterable

from .constants import (
    COHORT_VERSION,
    FEEDBACK_VARIANTS,
    SUITE_VERSION,
    SYNTHETIC_EVIDENCE_DISCLAIMER,
)
from .models import (
    CohortCatalog,
    EvaluationCell,
    ExpandedScenario,
    FeedbackVariant,
    PersonaProfile,
    PresentedFeedback,
)
from .serialization import sha256_value


def build_evaluation_plan(
    scenarios: Iterable[ExpandedScenario],
    cohort: CohortCatalog,
) -> tuple[EvaluationCell, ...]:
    persona_by_level = {
        level: tuple(
            sorted(
                (persona for persona in cohort.personas if persona.cefr_level == level),
                key=lambda persona: persona.persona_id,
            )
        )
        for level in ("B1", "B2", "C1", "C2")
    }
    base_cells: list[EvaluationCell] = []
    for scenario in sorted(scenarios, key=lambda item: item.scenario_id):
        for persona in persona_by_level[scenario.cefr_level]:
            for variant in FEEDBACK_VARIANTS:
                base_cells.append(
                    _cell(
                        scenario=scenario,
                        persona=persona,
                        variant=variant,
                        replicate=0,
                        is_repeat_sample=False,
                    )
                )

    if len(base_cells) != 144:
        raise ValueError(f"Expected 144 base cells, got {len(base_cells)}.")

    repeat_seeds = tuple(cell for index, cell in enumerate(base_cells) if index % 6 == 0)
    if len(repeat_seeds) != 24:
        raise ValueError(f"Expected 24 repeat seeds, got {len(repeat_seeds)}.")

    repeated_cells = [
        EvaluationCell(
            **{
                **seed.model_dump(),
                "cell_id": seed.cell_id[:-2] + f"r{replicate}",
                "replicate": replicate,
                "is_repeat_sample": True,
            }
        )
        for seed in repeat_seeds
        for replicate in (1, 2)
    ]
    plan = tuple(base_cells + repeated_cells)
    if len(plan) != 192:
        raise ValueError(f"Expected 192 scheduled evaluations, got {len(plan)}.")
    return plan


def plan_artifact(cells: tuple[EvaluationCell, ...]) -> dict[str, object]:
    return {
        "disclaimer": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "schemaVersion": "1.0",
        "suiteVersion": SUITE_VERSION,
        "cohortVersion": COHORT_VERSION,
        "baseEvaluations": sum(cell.replicate == 0 for cell in cells),
        "repeatSeedCells": sum(
            cell.replicate == 0 and _is_repeat_seed(cell, cells) for cell in cells
        ),
        "additionalReplicates": sum(cell.replicate > 0 for cell in cells),
        "scheduledEvaluations": len(cells),
        "calibrationCellIds": [cell.cell_id for cell in calibration_cells(cells)],
        "planChecksum": sha256_value(cells),
        "cells": [cell.model_dump(mode="json") for cell in cells],
    }


def calibration_cells(cells: tuple[EvaluationCell, ...]) -> tuple[EvaluationCell, ...]:
    base_by_scenario: dict[str, list[EvaluationCell]] = {}
    for cell in cells:
        if cell.replicate == 0:
            base_by_scenario.setdefault(cell.scenario_id, []).append(cell)
    selected = []
    for index, scenario_id in enumerate(sorted(base_by_scenario)):
        candidates = sorted(
            base_by_scenario[scenario_id],
            key=lambda cell: (cell.persona_id, cell.feedback_variant),
        )
        if len(candidates) != 4:
            raise ValueError("Each scenario requires two personas and two variants.")
        selected.append(candidates[index % len(candidates)])
    if len(selected) != 36:
        raise ValueError("Calibration plan requires exactly 36 preselected cells.")
    return tuple(selected)


def presented_feedback(
    scenario: ExpandedScenario,
    variant: FeedbackVariant,
) -> PresentedFeedback:
    error = scenario.feedback.inline_errors[0]
    explanation = error.explanation_zh_tw
    revision_task = scenario.feedback.revision_tasks[0]
    expected_issues: tuple[str, ...] = ()

    if variant == "diagnostic_perturbation":
        issue = scenario.diagnostic_issue
        expected_issues = (issue,)
        if issue == "unclear_feedback_detected":
            explanation = "這裡不自然，請修改成比較好的德文。"
        elif issue == "overly_complex_explanation":
            explanation = (
                "此處涉及句法拓撲場模型中的右句框配置與補語域線性化，"
                "須依 CP/IP 分層重新分析限定動詞的投射位置。"
            )
        elif issue == "feedback_level_mismatch":
            explanation = "請以形態句法介面、次範疇化框架及語用標記性理論重新建構此形式。"
        elif issue == "missing_actionable_guidance":
            revision_task = "請再檢查這一句。"
        else:  # pragma: no cover - protected by the literal contract
            raise ValueError(f"Unsupported diagnostic issue: {issue}")

    return PresentedFeedback(
        original_de=error.original,
        correction_de=error.correction,
        explanation_zh_tw=explanation,
        revision_task_zh_tw=revision_task,
        expected_pedagogical_issues=expected_issues,
    )


def _cell(
    *,
    scenario: ExpandedScenario,
    persona: PersonaProfile,
    variant: str,
    replicate: int,
    is_repeat_sample: bool,
) -> EvaluationCell:
    variant_slug = variant.replace("_", "-")
    cell_id = f"cell-{scenario.scenario_id}-{persona.persona_id}-{variant_slug}-r{replicate}"
    input_checksum = sha256_value(
        {
            "scenarioId": scenario.scenario_id,
            "persona": persona.model_dump(mode="json"),
            "feedbackVariant": variant,
            "learnerText": scenario.learner_text_de,
            "transferPrompt": scenario.transfer_prompt_zh_tw,
            "presentedFeedback": presented_feedback(scenario, variant),
        }
    )
    return EvaluationCell(
        cell_id=cell_id,
        scenario_id=scenario.scenario_id,
        persona_id=persona.persona_id,
        cefr_level=scenario.cefr_level,
        error_category=scenario.error_category,
        feedback_variant=variant,
        replicate=replicate,
        is_repeat_sample=is_repeat_sample,
        input_checksum=input_checksum,
    )


def _is_repeat_seed(cell: EvaluationCell, cells: tuple[EvaluationCell, ...]) -> bool:
    prefix = cell.cell_id[:-2]
    return any(other.cell_id == prefix + "r1" for other in cells)
