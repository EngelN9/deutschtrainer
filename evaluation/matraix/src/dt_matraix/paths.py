from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
DATA_ROOT = PROJECT_ROOT / "data"
COHORT_PATH = DATA_ROOT / "cohorts" / "cohort.v1.json"
SCENARIO_SOURCE_PATH = DATA_ROOT / "scenarios" / "scenarios.v1.json"
EXPANDED_SCENARIO_PATH = DATA_ROOT / "expanded" / "scenarios.v1.json"
WRITING_CONTRACT_PATH = DATA_ROOT / "expanded" / "writing-feedback-contracts.v1.json"
RUNS_ROOT = PROJECT_ROOT / ".runs"
REPORTS_ROOT = PROJECT_ROOT / "reports"

SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$")


def resolve_safe_child(root: Path, identifier: str) -> Path:
    if not SAFE_ID_PATTERN.fullmatch(identifier):
        raise ValueError("Identifier contains unsupported characters.")
    root_resolved = root.resolve()
    candidate = (root_resolved / identifier).resolve()
    if candidate.parent != root_resolved:
        raise ValueError("Resolved path escaped its allowlisted root.")
    return candidate
