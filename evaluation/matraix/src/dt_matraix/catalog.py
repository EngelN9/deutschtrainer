from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .constants import (
    CEFR_LEVELS,
    FEEDBACK_SCHEMA_ID,
    PROMPT_ID,
    PROMPT_VERSION,
    SCENARIO_VERSION,
)
from .models import (
    CohortCatalog,
    ExpandedScenario,
    InlineErrorFixture,
    RubricScores,
    ScenarioGold,
    ScenarioSourceCatalog,
    WritingFeedbackFixture,
)
from .paths import COHORT_PATH, EXPANDED_SCENARIO_PATH, SCENARIO_SOURCE_PATH
from .serialization import canonical_json_bytes

LEVEL_BASE_SCORE = {"B1": 72, "B2": 76, "C1": 80, "C2": 84}


def load_cohort(path: Path = COHORT_PATH) -> CohortCatalog:
    return CohortCatalog.model_validate_json(path.read_text(encoding="utf-8"))


def load_scenario_sources(path: Path = SCENARIO_SOURCE_PATH) -> ScenarioSourceCatalog:
    return ScenarioSourceCatalog.model_validate_json(path.read_text(encoding="utf-8"))


def utf16_offset(text: str, codepoint_offset: int) -> int:
    return len(text[:codepoint_offset].encode("utf-16-le")) // 2


def expand_scenarios(source: ScenarioSourceCatalog) -> tuple[ExpandedScenario, ...]:
    scenarios: list[ExpandedScenario] = []
    for template in source.categories:
        for level in CEFR_LEVELS:
            example = template.examples[level]
            start_codepoint = example.learner_text_de.index(example.original_de)
            end_codepoint = start_codepoint + len(example.original_de)
            score = LEVEL_BASE_SCORE[level]
            feedback = WritingFeedbackFixture(
                score=score,
                cefr_level_estimate=level,
                rubric_scores=RubricScores(
                    task_completion=score + 4,
                    grammar=score - 8,
                    vocabulary=score,
                    coherence=score + 2,
                    cohesion=score,
                    register_score=score,
                    argumentation=score - 2,
                    style=score,
                    accuracy=score - 6,
                    idiomaticity=score - 4,
                ),
                inline_errors=(
                    InlineErrorFixture(
                        type=template.feedback_error_type,
                        severity="moderate",
                        original=example.original_de,
                        correction=example.correction_de,
                        explanation_zh_tw=template.explanation_zh_tw,
                        related_skill_id=template.related_skill_id_template.format(level=level),
                        grammar_topic_id=(
                            f"{level}.{template.category}"
                            if template.feedback_error_type
                            not in {"collocation", "register", "cohesion", "idiomaticity"}
                            else None
                        ),
                        vocabulary_id=(
                            f"{level}.{template.category}"
                            if template.feedback_error_type in {"collocation", "idiomaticity"}
                            else None
                        ),
                        start_offset=utf16_offset(example.learner_text_de, start_codepoint),
                        end_offset=utf16_offset(example.learner_text_de, end_codepoint),
                    ),
                ),
                strengths=("內容主旨可辨識；本 fixture 僅用於回饋理解度評估。",),
                revision_tasks=(template.revision_task_zh_tw,),
                reference_version=None,
                repeated_error_types=(),
                requires_human_review=True,
            )
            slug = template.category.replace("_", "-")
            scenarios.append(
                ExpandedScenario(
                    scenario_id=f"dt-{level}-{slug}-v1",
                    scenario_version=SCENARIO_VERSION,
                    status=example.review_status,
                    cefr_level=level,
                    error_category=template.category,
                    prompt_id=PROMPT_ID,
                    prompt_version=PROMPT_VERSION,
                    feedback_schema_id=FEEDBACK_SCHEMA_ID,
                    learner_text_de=example.learner_text_de,
                    transfer_prompt_zh_tw=example.transfer_prompt_zh_tw,
                    feedback=feedback,
                    gold=ScenarioGold(
                        identified_error_category=template.category,
                        required_correction_de=example.correction_de,
                        accepted_transfer_answers_de=example.accepted_transfer_answers_de,
                        rule_facet_groups_zh_tw=template.rule_facet_groups_zh_tw,
                    ),
                    diagnostic_issue=template.diagnostic_issue,
                )
            )
    return tuple(scenarios)


def load_expanded_scenarios(path: Path = EXPANDED_SCENARIO_PATH) -> tuple[ExpandedScenario, ...]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Expanded scenario artifact must be a JSON array.")
    return tuple(ExpandedScenario.model_validate(item) for item in payload)


def assert_expanded_artifact_current(
    source: ScenarioSourceCatalog,
    artifact_path: Path = EXPANDED_SCENARIO_PATH,
) -> tuple[ExpandedScenario, ...]:
    expected = expand_scenarios(source)
    actual = load_expanded_scenarios(artifact_path)
    if canonical_json_bytes(actual) != canonical_json_bytes(expected):
        raise ValueError(
            "Checked-in expanded scenarios are stale; regenerate deterministic artifacts."
        )
    return actual


def fixture_to_writing_feedback_contract(scenario: ExpandedScenario) -> dict[str, Any]:
    fixture = scenario.feedback
    rubric = fixture.rubric_scores
    return {
        "score": fixture.score,
        "cefrLevelEstimate": fixture.cefr_level_estimate,
        "rubricScores": {
            "taskCompletion": rubric.task_completion,
            "grammar": rubric.grammar,
            "vocabulary": rubric.vocabulary,
            "coherence": rubric.coherence,
            "cohesion": rubric.cohesion,
            "register": rubric.register_score,
            "argumentation": rubric.argumentation,
            "style": rubric.style,
            "accuracy": rubric.accuracy,
            "idiomaticity": rubric.idiomaticity,
        },
        "inlineErrors": [
            {
                "type": item.type,
                "severity": item.severity,
                "original": item.original,
                "correction": item.correction,
                "explanationZhTw": item.explanation_zh_tw,
                "relatedSkillId": item.related_skill_id,
                "grammarTopicId": item.grammar_topic_id,
                "vocabularyId": item.vocabulary_id,
                "startOffset": item.start_offset,
                "endOffset": item.end_offset,
            }
            for item in fixture.inline_errors
        ],
        "strengths": list(fixture.strengths),
        "revisionTasks": list(fixture.revision_tasks),
        "referenceVersion": None,
        "repeatedErrorTypes": list(fixture.repeated_error_types),
        "requiresHumanReview": True,
    }


def expanded_contract_artifact(scenarios: tuple[ExpandedScenario, ...]) -> list[dict[str, Any]]:
    return [
        {
            **scenario.model_dump(mode="json"),
            "writingFeedbackContract": fixture_to_writing_feedback_contract(scenario),
        }
        for scenario in scenarios
    ]
