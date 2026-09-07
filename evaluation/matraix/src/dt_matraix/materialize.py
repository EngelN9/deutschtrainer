from __future__ import annotations

import json
from pathlib import Path

import yaml

from .constants import ERROR_CATEGORIES, SYNTHETIC_EVIDENCE_DISCLAIMER
from .models import CohortCatalog, EvaluationCell, ExpandedScenario, PersonaProfile
from .planning import presented_feedback
from .serialization import write_json


def materialize_suite(
    *,
    output_root: Path,
    cells: tuple[EvaluationCell, ...],
    scenarios: tuple[ExpandedScenario, ...],
    cohort: CohortCatalog,
) -> dict[str, object]:
    tasks_root = output_root / "tasks"
    personas_root = output_root / "personas"
    scenarios_by_id = {scenario.scenario_id: scenario for scenario in scenarios}
    personas_by_id = {persona.persona_id: persona for persona in cohort.personas}

    for persona in cohort.personas:
        _write_persona(personas_root / f"{persona.persona_id}.yaml", persona)

    task_names: set[str] = set()
    for cell in cells:
        scenario = scenarios_by_id[cell.scenario_id]
        task_name = task_name_for(cell)
        if task_name in task_names:
            continue
        task_names.add(task_name)
        _write_task(tasks_root / task_name, scenario, cell.feedback_variant)

    mapping = {
        cell.cell_id: {
            "taskName": task_name_for(cell),
            "personaFile": f"{personas_by_id[cell.persona_id].persona_id}.yaml",
            "replicate": cell.replicate,
        }
        for cell in cells
    }
    manifest = {
        "disclaimer": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "schemaVersion": "1.0",
        "taskCount": len(task_names),
        "personaCount": len(cohort.personas),
        "scheduledCellCount": len(cells),
        "mapping": mapping,
    }
    write_json(output_root / "materialization-manifest.json", manifest)
    return manifest


def task_name_for(cell: EvaluationCell) -> str:
    variant = cell.feedback_variant.replace("_", "-")
    return f"{cell.scenario_id}-{variant}"


def _write_task(task_root: Path, scenario: ExpandedScenario, variant: str) -> None:
    task_root.mkdir(parents=True, exist_ok=True)
    input_root = task_root / "input"
    tests_root = task_root / "tests"
    input_root.mkdir(exist_ok=True)
    tests_root.mkdir(exist_ok=True)
    presentation = presented_feedback(scenario, variant)
    task_name = f"application/{task_root.name}"
    (task_root / "task.toml").write_text(_task_toml(task_name, scenario), encoding="utf-8")
    (task_root / "instruction.md").write_text(_instruction(), encoding="utf-8")
    (input_root / "context.md").write_text(
        _context(scenario, presentation.model_dump(mode="json")), encoding="utf-8"
    )
    (input_root / "questionnaire.yaml").write_text(
        yaml.safe_dump(
            _questionnaire(scenario, variant),
            allow_unicode=True,
            sort_keys=False,
            width=100,
        ),
        encoding="utf-8",
    )
    (tests_root / "test.sh").write_text(_verifier_shell(), encoding="utf-8", newline="\n")
    (tests_root / "test_state.py").write_text(_verifier_python(), encoding="utf-8", newline="\n")
    write_json(
        task_root / "reporting.json",
        {
            "schemaVersion": "1.0",
            "contextRules": [],
            "evidenceBoundary": SYNTHETIC_EVIDENCE_DISCLAIMER,
        },
    )
    write_json(
        task_root / "persona_strategy.json",
        {
            "schemaVersion": "1.0",
            "sources": ["deutschtrainer-fully-synthetic-adults"],
            "dimensionFilters": {},
            "sampling": {"mode": "manual", "sampleSize": 1},
        },
    )


def _write_persona(path: Path, persona: PersonaProfile) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "persona_id": persona.persona_id,
        "version": persona.version,
        "source": "deutschtrainer_fully_synthetic_adult",
        "summary": (
            "Entirely fictional adult evaluation persona. Not derived from a real learner "
            "or the MatrAIx Persona 1M dataset."
        ),
        "demographics": {
            "age_status": "adult_18_plus",
            "support_language": persona.support_language,
            "cefr_level": persona.cefr_level,
        },
        "psychology": {
            "feedback_tolerance": persona.feedback_tolerance,
        },
        "communication": {
            "preferred_explanation_style": persona.preferred_explanation_style,
            "grammar_terminology_familiarity": persona.grammar_terminology_familiarity,
        },
        "preferences": {
            "learning_goal": persona.learning_goal,
        },
        "behavior": {
            "writing_strength": persona.writing_strength,
            "grammar_knowledge": persona.grammar_knowledge,
            "german_vocabulary_strength": persona.german_vocabulary_strength,
            "recurring_error_profile": list(persona.recurring_error_profile),
        },
    }
    path.write_text(
        yaml.safe_dump(payload, allow_unicode=True, sort_keys=False, width=100),
        encoding="utf-8",
    )


def _task_toml(task_name: str, scenario: ExpandedScenario) -> str:
    return f'''version = "1.0"
artifacts = ["/app/output"]

[task]
name = "{task_name}"

[metadata]
difficulty = "medium"
type = "survey"
domain = "education"
tags = [
  "DeutschTrainer",
  "synthetic-only",
  "writing-feedback",
  "{scenario.cefr_level}",
  "{scenario.error_category}",
]

[verifier]
timeout_sec = 120.0

[agent]
timeout_sec = 600.0

[environment]
definition = "application/shared-survey-form"
build_timeout_sec = 600.0
cpus = 1
memory_mb = 2048
storage_mb = 10240
gpus = 0
'''


def _instruction() -> str:
    return f"""# DeutschTrainer writing-feedback comprehension

{SYNTHETIC_EVIDENCE_DISCLAIMER}

Read the fictional learner submission and the learner-visible feedback in `context.md`.
Answer every survey question from the perspective supplied by the persona file.

This task does not ask you to grade the learner, assign a CEFR level, rewrite the full text,
or approve content. Do not invent private information. Use Traditional Chinese for explanations
and German only where a German correction or transfer answer is requested.
"""


def _context(scenario: ExpandedScenario, presentation: dict[str, object]) -> str:
    presentation.pop("expected_pedagogical_issues", None)  # Verifier-only labels stay hidden.
    return f"""# Fictional writing sample

{SYNTHETIC_EVIDENCE_DISCLAIMER}

- CEFR task level: {scenario.cefr_level}
- Fictional learner text: {scenario.learner_text_de}

## Learner-visible feedback

- Original excerpt: {presentation["original_de"]}
- Suggested correction: {presentation["correction_de"]}
- Explanation (zh-TW): {presentation["explanation_zh_tw"]}
- Revision task (zh-TW): {presentation["revision_task_zh_tw"]}

## Unseen transfer item

{scenario.transfer_prompt_zh_tw}
"""


def _questionnaire(scenario: ExpandedScenario, variant: str) -> dict[str, object]:
    category_options = [
        {"id": category, "label": category.replace("_", " ")} for category in ERROR_CATEGORIES
    ]
    yes_no = [{"id": "false", "label": "否"}, {"id": "true", "label": "是"}]
    return {
        "schemaVersion": "1.0",
        "id": f"{scenario.scenario_id}_{variant}",
        "title": "DeutschTrainer 寫作回饋理解度",
        "description": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "questions": [
            {
                "id": "identified_error_category",
                "prompt": "這段回饋主要指出哪一類錯誤？",
                "type": "single_choice",
                "construct": "error_identification",
                "required": True,
                "options": category_options,
            },
            {
                "id": "rule_explanation_zh_tw",
                "prompt": "請用繁體中文自己的話說明規則。",
                "type": "free_text",
                "construct": "rule_comprehension",
                "required": True,
            },
            {
                "id": "required_correction_de",
                "prompt": "請寫出回饋要求的德文修正片段。",
                "type": "free_text",
                "construct": "correction_comprehension",
                "required": True,
            },
            {
                "id": "transfer_answer_de",
                "prompt": scenario.transfer_prompt_zh_tw,
                "type": "free_text",
                "construct": "transfer",
                "required": True,
            },
            {
                "id": "unclear_feedback_zh_tw",
                "prompt": "哪個部分不清楚？若沒有，請回答「無」。",
                "type": "free_text",
                "construct": "unclear_feedback",
                "required": True,
            },
            {
                "id": "feedback_level_mismatch",
                "prompt": "這個解釋是否明顯不符合此 CEFR 程度？",
                "type": "single_choice",
                "construct": "level_mismatch",
                "required": True,
                "options": yes_no,
            },
            {
                "id": "overly_complex_explanation",
                "prompt": "這個解釋是否過度複雜？",
                "type": "single_choice",
                "construct": "complexity",
                "required": True,
                "options": yes_no,
            },
            {
                "id": "missing_actionable_guidance",
                "prompt": "這個回饋是否缺少可立即採取的修改步驟？",
                "type": "single_choice",
                "construct": "actionability",
                "required": True,
                "options": yes_no,
            },
        ],
    }


def _verifier_shell() -> str:
    return """#!/usr/bin/env bash
set -euo pipefail
VERIFIER_DIR="${HARBOR_VERIFIER_DIR:-/logs/verifier}"
TESTS_DIR="${HARBOR_TESTS_DIR:-/tests}"
mkdir -p "${VERIFIER_DIR}"
if python3 "${TESTS_DIR}/test_state.py"; then
  echo 1 > "${VERIFIER_DIR}/reward.txt"
else
  echo 0 > "${VERIFIER_DIR}/reward.txt"
  exit 1
fi
"""


def _verifier_python() -> str:
    required_ids = [
        "identified_error_category",
        "rule_explanation_zh_tw",
        "required_correction_de",
        "transfer_answer_de",
        "unclear_feedback_zh_tw",
        "feedback_level_mismatch",
        "overly_complex_explanation",
        "missing_actionable_guidance",
    ]
    return f"""from __future__ import annotations

import json
import os
from pathlib import Path

output_dir = Path(os.environ.get("HARBOR_OUTPUT_DIR") or "/app/output")
verifier_dir = Path(os.environ.get("HARBOR_VERIFIER_DIR") or "/logs/verifier")
result_path = output_dir / "survey_result.json"
required_ids = {json.dumps(required_ids)}

payload = json.loads(result_path.read_text(encoding="utf-8"))
answers = payload.get("answers")
if not isinstance(answers, list):
    raise SystemExit("survey_result.answers must be an array")
answer_ids = [str(item.get("questionId") or "") for item in answers if isinstance(item, dict)]
if sorted(answer_ids) != sorted(required_ids):
    raise SystemExit("survey_result does not contain exactly the required answers")
if any("value" not in item for item in answers if isinstance(item, dict)):
    raise SystemExit("every answer requires a value")

verifier_dir.mkdir(parents=True, exist_ok=True)
(verifier_dir / "structured_output.json").write_text(
    json.dumps(
        {{
            "schemaVersion": "1.0",
            "artifactType": "deutschtrainer.synthetic.contract_check",
            "artifactContractValid": True,
            "learningQualityScored": False,
            "disclaimer": {json.dumps(SYNTHETIC_EVIDENCE_DISCLAIMER)},
        }},
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)
"""
