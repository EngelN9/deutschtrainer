from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .constants import (
    CEFR_LEVELS,
    ERROR_CATEGORIES,
    FEEDBACK_VARIANTS,
    METRIC_NAMES,
    PEDAGOGICAL_ISSUES,
)

CefrLevel = Literal["B1", "B2", "C1", "C2"]
ErrorCategory = Literal[
    "word_order",
    "case",
    "article",
    "preposition",
    "tense",
    "collocation",
    "register",
    "cohesion",
    "literal_zh_de_transfer",
]
FeedbackVariant = Literal["baseline", "diagnostic_perturbation"]
PedagogicalIssue = Literal[
    "feedback_level_mismatch",
    "unclear_feedback_detected",
    "overly_complex_explanation",
    "missing_actionable_guidance",
]
MetricName = Literal[
    "error_identification_success",
    "rule_comprehension_success",
    "correction_comprehension_success",
    "transfer_item_success",
    "feedback_level_mismatch",
    "unclear_feedback_detected",
    "overly_complex_explanation",
    "missing_actionable_guidance",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)


class PersonaProfile(StrictModel):
    persona_id: str = Field(pattern=r"^dt-(B1|B2|C1|C2)-[ab]$")
    version: str = Field(pattern=r"^cohort\.v1$")
    adult: Literal[True]
    support_language: Literal["zh-TW"]
    cefr_level: CefrLevel
    writing_strength: Literal["developing", "steady", "advanced"]
    grammar_knowledge: Literal["low", "medium", "high"]
    german_vocabulary_strength: Literal["low", "medium", "high"]
    grammar_terminology_familiarity: Literal["low", "medium", "high"]
    preferred_explanation_style: Literal["example_first", "rule_first", "step_by_step"]
    feedback_tolerance: Literal["low", "medium", "high"]
    learning_goal: str = Field(min_length=1, max_length=160)
    recurring_error_profile: tuple[ErrorCategory, ...] = Field(min_length=1, max_length=4)


class CohortCatalog(StrictModel):
    schema_version: Literal["1.0"]
    cohort_version: Literal["cohort.v1"]
    synthetic_only: Literal[True]
    statistically_representative: Literal[False]
    personas: tuple[PersonaProfile, ...] = Field(min_length=8, max_length=8)

    @model_validator(mode="after")
    def validate_level_balance(self) -> CohortCatalog:
        ids = {persona.persona_id for persona in self.personas}
        if len(ids) != len(self.personas):
            raise ValueError("Persona ids must be unique.")
        for level in CEFR_LEVELS:
            if sum(persona.cefr_level == level for persona in self.personas) != 2:
                raise ValueError(f"Cohort must contain exactly two {level} personas.")
        return self


class LevelExample(StrictModel):
    review_status: Literal["pending_human_review", "approved"] = "pending_human_review"
    learner_text_de: str = Field(min_length=1, max_length=1200)
    original_de: str = Field(min_length=1, max_length=300)
    correction_de: str = Field(min_length=1, max_length=300)
    transfer_prompt_zh_tw: str = Field(min_length=1, max_length=500)
    accepted_transfer_answers_de: tuple[str, ...] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def original_must_exist(self) -> LevelExample:
        if self.learner_text_de.count(self.original_de) != 1:
            raise ValueError("original_de must occur exactly once in learner_text_de.")
        return self


class CategoryTemplate(StrictModel):
    category: ErrorCategory
    feedback_error_type: str = Field(min_length=1, max_length=80)
    related_skill_id_template: str = Field(min_length=1, max_length=120)
    explanation_zh_tw: str = Field(min_length=1, max_length=1000)
    rule_facet_groups_zh_tw: tuple[tuple[str, ...], ...] = Field(min_length=1, max_length=5)
    revision_task_zh_tw: str = Field(min_length=1, max_length=500)
    diagnostic_issue: PedagogicalIssue
    examples: dict[CefrLevel, LevelExample]

    @model_validator(mode="after")
    def validate_level_examples(self) -> CategoryTemplate:
        if set(self.examples) != set(CEFR_LEVELS):
            raise ValueError("Every category must define B1, B2, C1, and C2 examples.")
        return self


class ScenarioSourceCatalog(StrictModel):
    schema_version: Literal["1.0"]
    scenario_version: Literal["scenario.v1"]
    prompt_id: Literal["evaluate-writing"]
    prompt_version: Literal["1.0.0"]
    feedback_schema_id: Literal["WritingFeedback.v1"]
    categories: tuple[CategoryTemplate, ...] = Field(min_length=9, max_length=9)

    @model_validator(mode="after")
    def validate_categories(self) -> ScenarioSourceCatalog:
        categories = tuple(template.category for template in self.categories)
        if categories != ERROR_CATEGORIES:
            raise ValueError("Scenario categories must match the versioned evaluation taxonomy.")
        return self


class RubricScores(StrictModel):
    task_completion: int = Field(ge=0, le=100)
    grammar: int = Field(ge=0, le=100)
    vocabulary: int = Field(ge=0, le=100)
    coherence: int = Field(ge=0, le=100)
    cohesion: int = Field(ge=0, le=100)
    register_score: int = Field(ge=0, le=100)
    argumentation: int = Field(ge=0, le=100)
    style: int = Field(ge=0, le=100)
    accuracy: int = Field(ge=0, le=100)
    idiomaticity: int = Field(ge=0, le=100)


class InlineErrorFixture(StrictModel):
    type: str = Field(min_length=1, max_length=80)
    severity: Literal["minor", "moderate", "major", "critical"]
    original: str = Field(min_length=1, max_length=300)
    correction: str = Field(min_length=1, max_length=300)
    explanation_zh_tw: str = Field(min_length=1, max_length=1000)
    related_skill_id: str = Field(min_length=1, max_length=120)
    grammar_topic_id: str | None
    vocabulary_id: str | None
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)


class WritingFeedbackFixture(StrictModel):
    score: int = Field(ge=0, le=100)
    cefr_level_estimate: CefrLevel
    rubric_scores: RubricScores
    inline_errors: tuple[InlineErrorFixture, ...] = Field(min_length=1, max_length=1)
    strengths: tuple[str, ...] = Field(max_length=10)
    revision_tasks: tuple[str, ...] = Field(min_length=1, max_length=10)
    reference_version: None
    repeated_error_types: tuple[str, ...] = Field(max_length=20)
    requires_human_review: Literal[True]


class ScenarioGold(StrictModel):
    identified_error_category: ErrorCategory
    required_correction_de: str = Field(min_length=1, max_length=300)
    accepted_transfer_answers_de: tuple[str, ...] = Field(min_length=1, max_length=6)
    rule_facet_groups_zh_tw: tuple[tuple[str, ...], ...] = Field(min_length=1, max_length=5)


class ExpandedScenario(StrictModel):
    scenario_id: str = Field(pattern=r"^dt-(B1|B2|C1|C2)-[a-z0-9-]+-v1$")
    scenario_version: Literal["scenario.v1"]
    status: Literal["pending_human_review", "approved"]
    cefr_level: CefrLevel
    error_category: ErrorCategory
    prompt_id: Literal["evaluate-writing"]
    prompt_version: Literal["1.0.0"]
    feedback_schema_id: Literal["WritingFeedback.v1"]
    learner_text_de: str = Field(min_length=1, max_length=1200)
    transfer_prompt_zh_tw: str = Field(min_length=1, max_length=500)
    feedback: WritingFeedbackFixture
    gold: ScenarioGold
    diagnostic_issue: PedagogicalIssue


class PresentedFeedback(StrictModel):
    original_de: str = Field(min_length=1, max_length=300)
    correction_de: str = Field(min_length=1, max_length=300)
    explanation_zh_tw: str = Field(min_length=1, max_length=1000)
    revision_task_zh_tw: str = Field(min_length=1, max_length=500)
    expected_pedagogical_issues: tuple[PedagogicalIssue, ...] = Field(max_length=1)


class EvaluationCell(StrictModel):
    cell_id: str = Field(pattern=r"^cell-[a-zA-Z0-9-]+-r[0-2]$")
    scenario_id: str
    persona_id: str
    cefr_level: CefrLevel
    error_category: ErrorCategory
    feedback_variant: FeedbackVariant
    replicate: int = Field(ge=0, le=2)
    is_repeat_sample: bool
    input_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")


class PersonaResponse(StrictModel):
    schema_version: Literal["1.0"]
    identified_error_category: ErrorCategory
    rule_explanation_zh_tw: str = Field(min_length=1, max_length=2000)
    required_correction_de: str = Field(min_length=1, max_length=500)
    transfer_answer_de: str = Field(min_length=1, max_length=800)
    unclear_feedback_zh_tw: str | None = Field(default=None, max_length=1000)
    detected_problem_ids: tuple[PedagogicalIssue, ...] = Field(max_length=4)


class MetricOutcome(StrictModel):
    metric: MetricName
    value: bool | None
    scorable: bool
    scoring_source: Literal["frozen_key", "frozen_facets", "persona_flag", "not_scorable"]
    denominator_policy: str = Field(min_length=1, max_length=240)
    not_scorable_reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_scorability(self) -> MetricOutcome:
        if self.scorable != (self.value is not None):
            raise ValueError(
                "Scorable outcomes require a boolean value; unscorable outcomes require null."
            )
        if self.metric not in METRIC_NAMES:
            raise ValueError("Unsupported metric name.")
        return self


class EvaluationRecord(StrictModel):
    schema_version: Literal["1.0"]
    cell: EvaluationCell
    expected_pedagogical_issues: tuple[PedagogicalIssue, ...] = Field(max_length=1)
    response_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    artifact_contract_valid: bool
    failure_bucket: Literal[
        "none",
        "timeout",
        "provider_failure",
        "schema_invalid",
        "security_rejected",
    ]
    metrics: tuple[MetricOutcome, ...] = Field(min_length=8, max_length=8)

    @model_validator(mode="after")
    def validate_metric_order(self) -> EvaluationRecord:
        if tuple(item.metric for item in self.metrics) != METRIC_NAMES:
            raise ValueError("Evaluation record must contain the complete ordered metric contract.")
        return self


class RunManifest(StrictModel):
    schema_version: Literal["1.0"]
    harness_version: str
    suite_version: str
    cohort_version: str
    scenario_version: str
    metric_version: str
    deutschtrainer_commit: str = Field(pattern=r"^[0-9a-f]{40}$")
    deutschtrainer_clean: bool
    matraix_commit: Literal["6439df181996c2a67cac16f3b0089a909c011ada"]
    matraix_declared_version: Literal["0.1.0"]
    provider: str | None
    model: str | None
    seed: int
    prompt_id: str
    prompt_version: str
    feedback_schema_id: str
    prompt_contract_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    feedback_contract_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    cohort_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    scenario_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    plan_checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    scheduled_evaluations: int = Field(ge=0)
    completed_evaluations: int = Field(ge=0)
    valid_evaluations: int = Field(ge=0)
    scorable_evaluations: int = Field(ge=0)
    formal_run_status: Literal["BLOCKED", "CANDIDATE", "ACCEPTED_FOR_HUMAN_REVIEW", "REJECTED"]
    limitations: tuple[str, ...] = Field(min_length=1)


class CalibrationJudgment(StrictModel):
    cell_id: str
    reviewer_role_id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$")
    metric: PedagogicalIssue
    value: bool


class CalibrationArtifact(StrictModel):
    schema_version: Literal["1.0"]
    calibration_version: Literal["calibration.v1"]
    judgments: tuple[CalibrationJudgment, ...] = Field(min_length=288, max_length=288)

    @model_validator(mode="after")
    def validate_two_reviewer_contract(self) -> CalibrationArtifact:
        reviewers = {item.reviewer_role_id for item in self.judgments}
        if len(reviewers) != 2:
            raise ValueError("Calibration requires exactly two independent reviewer role ids.")
        keys = [(item.cell_id, item.reviewer_role_id, item.metric) for item in self.judgments]
        if len(keys) != len(set(keys)):
            raise ValueError("Calibration judgments must be unique per cell, reviewer, and metric.")
        cells = {item.cell_id for item in self.judgments}
        if len(cells) != 36:
            raise ValueError("Calibration requires exactly 36 preselected cells.")
        cell_metric_reviewers: dict[tuple[str, str], set[str]] = {}
        for item in self.judgments:
            key = (item.cell_id, item.metric)
            cell_metric_reviewers.setdefault(key, set()).add(item.reviewer_role_id)
        if any(len(item) != 2 for item in cell_metric_reviewers.values()):
            raise ValueError("Every calibrated cell metric requires both reviewers.")
        for cell_id in cells:
            metrics = {item.metric for item in self.judgments if item.cell_id == cell_id}
            if metrics != set(PEDAGOGICAL_ISSUES):
                raise ValueError("Each calibrated cell requires all four pedagogical metrics.")
        return self


def assert_literal_contracts() -> None:
    """Keep runtime constants and type-level contracts synchronized."""
    if set(CEFR_LEVELS) != {"B1", "B2", "C1", "C2"}:
        raise RuntimeError("CEFR contract drifted.")
    if len(ERROR_CATEGORIES) != 9 or len(FEEDBACK_VARIANTS) != 2:
        raise RuntimeError("Evaluation taxonomy drifted.")
    if len(PEDAGOGICAL_ISSUES) != 4 or len(METRIC_NAMES) != 8:
        raise RuntimeError("Metric contract drifted.")
