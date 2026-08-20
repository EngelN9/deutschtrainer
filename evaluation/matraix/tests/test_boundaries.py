from __future__ import annotations

import os

import pytest

from dt_matraix import isolation
from dt_matraix.isolation import verify_isolation
from dt_matraix.runtime import BlockedRun, validate_live_environment


def test_production_workspaces_do_not_depend_on_evaluation() -> None:
    assert verify_isolation() == []


def test_missing_root_dockerignore_fails_closed_outside_container(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setattr(isolation, "REPOSITORY_ROOT", tmp_path)
    monkeypatch.delenv("DT_MATRAIX_CONTAINER", raising=False)

    assert isolation.verify_isolation() == [
        "Root .dockerignore is unavailable for isolation verification."
    ]


def test_narrow_container_context_does_not_require_repository_dockerignore(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setattr(isolation, "REPOSITORY_ROOT", tmp_path)
    monkeypatch.setenv("DT_MATRAIX_CONTAINER", "1")

    assert isolation.verify_isolation() == []


def test_live_runner_is_blocked_outside_the_isolated_image(monkeypatch) -> None:
    monkeypatch.delenv("DT_MATRAIX_CONTAINER", raising=False)
    monkeypatch.delenv("MATRAIX_EVAL_OPENAI_API_KEY", raising=False)

    with pytest.raises(BlockedRun, match="only in the isolated evaluation image"):
        validate_live_environment(
            provider="openai",
            model="openai/evaluation-model-required",
            run_id="blocked-test",
        )


def test_test_process_does_not_require_provider_secrets() -> None:
    assert os.environ.get("MATRAIX_EVAL_OPENAI_API_KEY") is None
    assert os.environ.get("MATRAIX_EVAL_ANTHROPIC_API_KEY") is None
