from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

from .constants import MATRIX_COMMIT
from .paths import REPOSITORY_ROOT, RUNS_ROOT, resolve_safe_child


class BlockedRun(RuntimeError):
    pass


def repository_state() -> tuple[str, bool]:
    git_executable = shutil.which("git")
    if git_executable is None:
        raise RuntimeError("Git executable is unavailable.")
    safe = REPOSITORY_ROOT.as_posix()
    base = [git_executable, "-c", f"safe.directory={safe}", "-C", str(REPOSITORY_ROOT)]
    commit = subprocess.run(  # noqa: S603 - fixed executable and arguments
        [*base, "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    ).stdout.strip()
    status = subprocess.run(  # noqa: S603 - fixed executable and arguments
        [*base, "status", "--porcelain"],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    ).stdout.strip()
    return commit, not bool(status)


def load_live_approval(run_id: str) -> dict[str, object]:
    import json

    approval_path = resolve_safe_child(RUNS_ROOT / "approvals", run_id).with_suffix(".json")
    if not approval_path.is_file():
        raise BlockedRun("Live run requires an evaluation-only approval artifact.")
    payload = json.loads(approval_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise BlockedRun("Approval artifact must be a JSON object.")
    required_true = (
        "scenarioReviewApproved",
        "measurementReviewApproved",
        "providerTermsApproved",
    )
    if any(payload.get(key) is not True for key in required_true):
        raise BlockedRun("Scenario, measurement, and provider reviews must all be approved.")
    reviewers = payload.get("reviewerRoleIds")
    if not isinstance(reviewers, list) or len(set(map(str, reviewers))) < 2:
        raise BlockedRun("Two distinct reviewer role ids are required for calibration.")
    return payload


def validate_live_environment(*, provider: str, model: str, run_id: str) -> dict[str, object]:
    if os.environ.get("DT_MATRAIX_CONTAINER") != "1":
        raise BlockedRun("Live MatrAIx execution is allowed only in the isolated evaluation image.")
    if not model.strip() or not model.startswith(f"{provider}/"):
        raise BlockedRun("An explicit provider-qualified model id is required.")
    if os.environ.get("DT_MATRAIX_COMMIT") != MATRIX_COMMIT:
        raise BlockedRun("Evaluation image does not attest the pinned MatrAIx commit.")
    source_commit = os.environ.get("DT_SOURCE_COMMIT", "")
    if not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise BlockedRun("Evaluation image is missing an exact DeutschTrainer source commit.")
    if os.environ.get("DT_SOURCE_CLEAN") != "true":
        raise BlockedRun("Live execution requires an image built from a clean worktree.")
    approval = load_live_approval(run_id)

    key_name = {
        "openai": "MATRAIX_EVAL_OPENAI_API_KEY",
        "anthropic": "MATRAIX_EVAL_ANTHROPIC_API_KEY",
    }.get(provider)
    if key_name is None:
        raise BlockedRun(
            "Only separately reviewed OpenAI or Anthropic evaluation keys are supported."
        )
    if not os.environ.get(key_name):
        raise BlockedRun(f"Missing evaluation-only credential name: {key_name}")
    if provider == "openai" and approval.get("storeFalseVerified") is not True:
        raise BlockedRun("OpenAI live execution requires a reviewed store:false adapter path.")
    if shutil.which("harbor") is None:
        raise BlockedRun("Pinned MatrAIx Harbor CLI is unavailable in the evaluation image.")
    return {"sourceCommit": source_commit, "keyName": key_name, "approval": approval}


def matraix_root() -> Path:
    root = Path("/opt/matraix")
    if not root.is_dir():
        raise BlockedRun("Pinned MatrAIx source tree is unavailable in the evaluation image.")
    return root
