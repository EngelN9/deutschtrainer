from __future__ import annotations

import hashlib

import pytest

from dt_matraix.hf_export import (
    build_rows,
    export_huggingface_dataset,
    jsonl_bytes,
    load_exported_rows,
    model_registry,
    scan_export_files,
)
from dt_matraix.security import SecurityRejection, validate_synthetic_catalog


def test_export_is_stable_unique_and_exactly_36_rows() -> None:
    first = build_rows()
    second = build_rows()

    assert len(first) == 36
    assert [row.scenario_id for row in first] == sorted(row.scenario_id for row in first)
    assert len({row.scenario_id for row in first}) == 36
    assert (
        hashlib.sha256(jsonl_bytes(first)).hexdigest()
        == hashlib.sha256(jsonl_bytes(second)).hexdigest()
    )
    assert all(row.synthetic_only for row in first)


def test_export_round_trips_through_checked_schema(tmp_path) -> None:
    metadata = export_huggingface_dataset(tmp_path)
    rows = load_exported_rows(tmp_path / "writing-feedback-eval.v1.jsonl")

    assert len(rows) == metadata["row_count"] == 36
    assert metadata["dataset_visibility"] == "not_uploaded"
    assert metadata["repository_artifact_visibility"] == "public"
    assert metadata["gold_answers_public"] is True
    assert metadata["provider_outputs_included"] is False
    assert (
        metadata["rows_sha256"]
        == hashlib.sha256((tmp_path / "writing-feedback-eval.v1.jsonl").read_bytes()).hexdigest()
    )


@pytest.mark.parametrize(
    "leak",
    (
        {"email": "learner@example.com"},
        {"hf_token": "hf_abcdefghijklmnopqrstuvwxyz123456"},
        {"supabase_id": "123e4567-e89b-42d3-a456-426614174000"},
        {"production_submission_id": "submission-1"},
    ),
)
def test_export_scanner_fails_closed_for_pii_and_secrets(leak) -> None:
    with pytest.raises(SecurityRejection):
        validate_synthetic_catalog(leak)


def test_model_candidates_are_registry_only_and_not_evaluated() -> None:
    entries = model_registry()

    assert len(entries) == 4
    assert all(entry.status == "NOT_EVALUATED" for entry in entries)


def test_export_file_scanner_fails_closed(tmp_path) -> None:
    export_huggingface_dataset(tmp_path)
    (tmp_path / "README.md").write_text("contact learner@example.com", encoding="utf-8")

    with pytest.raises(SecurityRejection):
        scan_export_files(tmp_path)
