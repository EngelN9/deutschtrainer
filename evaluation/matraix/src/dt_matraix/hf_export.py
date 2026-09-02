from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import Field

from .catalog import expand_scenarios, load_scenario_sources
from .constants import HARNESS_VERSION, SYNTHETIC_EVIDENCE_DISCLAIMER
from .models import CefrLevel, ErrorCategory, StrictModel
from .security import validate_synthetic_catalog
from .serialization import canonical_json_bytes, sha256_value, write_json

HF_DATASET_ID = "EngelN9/deutschtrainer-writing-feedback-eval"
HF_EXPORT_ROOT = Path(__file__).resolve().parents[2] / "data" / "huggingface"
DATASET_CARD_PATH = HF_EXPORT_ROOT / "README.md"


class HuggingFaceEvalRow(StrictModel):
    scenario_id: str = Field(pattern=r"^dt-(B1|B2|C1|C2)-[a-z0-9-]+-v1$")
    scenario_version: Literal["scenario.v1"]
    cefr_level: CefrLevel
    error_category: ErrorCategory
    synthetic_learner_input: str = Field(min_length=1, max_length=1200)
    gold_correction: str = Field(min_length=1, max_length=300)
    expected_facets: tuple[tuple[str, ...], ...] = Field(min_length=1, max_length=5)
    prompt_id: Literal["evaluate-writing"]
    prompt_version: Literal["1.0.0"]
    schema_id: Literal["WritingFeedback.v1"]
    harness_version: Literal["0.1.0"]
    synthetic_only: Literal[True]
    source_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")


class ModelRegistryEntry(StrictModel):
    model_id: str
    role: str
    parameters: str
    license: str
    status: Literal["NOT_EVALUATED"]
    recommendation: str


def build_rows() -> tuple[HuggingFaceEvalRow, ...]:
    source = load_scenario_sources()
    validate_synthetic_catalog(source)
    source_fingerprint = sha256_value(source)
    rows = tuple(
        HuggingFaceEvalRow(
            scenario_id=scenario.scenario_id,
            scenario_version=scenario.scenario_version,
            cefr_level=scenario.cefr_level,
            error_category=scenario.error_category,
            synthetic_learner_input=scenario.learner_text_de,
            gold_correction=scenario.gold.required_correction_de,
            expected_facets=scenario.gold.rule_facet_groups_zh_tw,
            prompt_id=scenario.prompt_id,
            prompt_version=scenario.prompt_version,
            schema_id=scenario.feedback_schema_id,
            harness_version=HARNESS_VERSION,
            synthetic_only=True,
            source_fingerprint=source_fingerprint,
        )
        for scenario in expand_scenarios(source)
    )
    ordered = tuple(sorted(rows, key=lambda row: row.scenario_id))
    if len(ordered) != 36:
        raise ValueError("Hugging Face export requires exactly 36 scenarios.")
    if len({row.scenario_id for row in ordered}) != len(ordered):
        raise ValueError("Hugging Face export scenario ids must be unique.")
    validate_synthetic_catalog(ordered)
    return ordered


def model_registry() -> tuple[ModelRegistryEntry, ...]:
    return (
        ModelRegistryEntry(
            model_id="utter-project/EuroLLM-9B-Instruct-2512",
            role="quality_candidate",
            parameters="9.15B",
            license="Apache-2.0",
            status="NOT_EVALUATED",
            recommendation=(
                "Primary quality comparison candidate for German and European languages."
            ),
        ),
        ModelRegistryEntry(
            model_id="utter-project/EuroLLM-1.7B-Instruct",
            role="smoke_baseline",
            parameters="1.66B",
            license="Apache-2.0",
            status="NOT_EVALUATED",
            recommendation="Pipeline, schema, and prompt smoke baseline only.",
        ),
        ModelRegistryEntry(
            model_id="Qwen/Qwen3-4B-Instruct-2507",
            role="general_control",
            parameters="4.02B",
            license="Apache-2.0",
            status="NOT_EVALUATED",
            recommendation=(
                "Control for Traditional Chinese output, JSON adherence, and German ability."
            ),
        ),
        ModelRegistryEntry(
            model_id="gpt-5.6-luna",
            role="current_api_baseline",
            parameters="API-only",
            license="Proprietary API",
            status="NOT_EVALUATED",
            recommendation=(
                "API model candidate for a future separately authorized comparison; do not "
                "change the production provider."
            ),
        ),
    )


def jsonl_bytes(rows: tuple[HuggingFaceEvalRow, ...]) -> bytes:
    return b"".join(canonical_json_bytes(row) + b"\n" for row in rows)


def scan_export_files(output_root: Path) -> None:
    expected_files = (
        "README.md",
        "metadata.v1.json",
        "model-registry.v1.json",
        "schema.v1.json",
        "writing-feedback-eval.v1.jsonl",
    )
    for name in expected_files:
        path = output_root / name
        if not path.is_file():
            raise ValueError(f"Hugging Face export is missing required file: {name}")
        validate_synthetic_catalog(path.read_text(encoding="utf-8"))


def export_huggingface_dataset(output_root: Path = HF_EXPORT_ROOT) -> dict[str, object]:
    rows = build_rows()
    payload = jsonl_bytes(rows)
    dataset_card = DATASET_CARD_PATH.read_text(encoding="utf-8")
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "README.md").write_text(dataset_card, encoding="utf-8")
    data_path = output_root / "writing-feedback-eval.v1.jsonl"
    data_path.write_bytes(payload)
    write_json(output_root / "schema.v1.json", HuggingFaceEvalRow.model_json_schema())
    write_json(output_root / "model-registry.v1.json", model_registry())
    metadata = {
        "dataset_id": HF_DATASET_ID,
        "dataset_visibility": "not_uploaded",
        "disclaimer": SYNTHETIC_EVIDENCE_DISCLAIMER,
        "gold_answers_public": True,
        "harness_version": HARNESS_VERSION,
        "provider_outputs_included": False,
        "repository_artifact_visibility": "public",
        "row_count": len(rows),
        "rows_sha256": hashlib.sha256(payload).hexdigest(),
        "source_fingerprint": rows[0].source_fingerprint,
        "synthetic_only": True,
    }
    validate_synthetic_catalog(metadata)
    write_json(output_root / "metadata.v1.json", metadata)
    scan_export_files(output_root)
    return metadata


def load_exported_rows(path: Path) -> tuple[HuggingFaceEvalRow, ...]:
    rows = tuple(
        HuggingFaceEvalRow.model_validate(json.loads(line))
        for line in path.read_text(encoding="utf-8").splitlines()
        if line
    )
    validate_synthetic_catalog(rows)
    return rows
