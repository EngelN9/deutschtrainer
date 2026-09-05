from __future__ import annotations

HARNESS_VERSION = "0.1.0"
SCHEMA_VERSION = "1.0"
SUITE_VERSION = "writing-feedback-comprehension.v1"
COHORT_VERSION = "cohort.v1"
SCENARIO_VERSION = "scenario.v1"
METRIC_VERSION = "metrics.v1"
REPORT_VERSION = "report.v1"
PROMPT_ID = "evaluate-writing"
PROMPT_VERSION = "1.0.0"
FEEDBACK_SCHEMA_ID = "WritingFeedback.v1"
MATRIX_COMMIT = "6439df181996c2a67cac16f3b0089a909c011ada"
MATRIX_DECLARED_VERSION = "0.1.0"

SYNTHETIC_EVIDENCE_DISCLAIMER = "SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE"

CEFR_LEVELS = ("B1", "B2", "C1", "C2")
ERROR_CATEGORIES = (
    "word_order",
    "case",
    "article",
    "preposition",
    "tense",
    "collocation",
    "register",
    "cohesion",
    "literal_zh_de_transfer",
)
FEEDBACK_VARIANTS = ("baseline", "diagnostic_perturbation")
PEDAGOGICAL_ISSUES = (
    "feedback_level_mismatch",
    "unclear_feedback_detected",
    "overly_complex_explanation",
    "missing_actionable_guidance",
)
METRIC_NAMES = (
    "error_identification_success",
    "rule_comprehension_success",
    "correction_comprehension_success",
    "transfer_item_success",
    "feedback_level_mismatch",
    "unclear_feedback_detected",
    "overly_complex_explanation",
    "missing_actionable_guidance",
)

FORMAL_SCENARIO_STATUS = "pending_human_review"
FORMAL_RUN_STATUS = "BLOCKED"
