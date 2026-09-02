from __future__ import annotations

import os
from pathlib import Path

from .paths import PROJECT_ROOT, REPOSITORY_ROOT

PRODUCTION_TARGETS = (
    REPOSITORY_ROOT / "apps",
    REPOSITORY_ROOT / "packages",
    REPOSITORY_ROOT / "supabase",
    REPOSITORY_ROOT / "package.json",
    REPOSITORY_ROOT / "pnpm-lock.yaml",
    REPOSITORY_ROOT / "pnpm-workspace.yaml",
    REPOSITORY_ROOT / "render.yaml",
)
FORBIDDEN_PRODUCTION_MARKERS = (
    "dt_matraix",
    "MATRAIX_EVAL_",
    "MatrAIx-Persona-8B",
    "evaluation/matraix",
    "evaluation\\matraix",
)
FORBIDDEN_EVALUATION_IMPORTS = (
    "WritingEvaluationService",
    "apps/api/src/writing/writingService",
    'os.environ.get("SUPABASE_SERVICE_ROLE_KEY")',
    'os.environ.get("OPENAI_API_KEY")',
    'os.getenv("SUPABASE_SERVICE_ROLE_KEY")',
    'os.getenv("OPENAI_API_KEY")',
    "process.env.NEXT_PUBLIC_",
    "process.env.EXPO_PUBLIC_",
)
TEXT_SUFFIXES = {".cjs", ".js", ".json", ".mjs", ".ts", ".tsx", ".yaml", ".yml"}
IGNORED_DIRECTORY_NAMES = {
    ".git",
    ".next",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
}


def verify_isolation() -> list[str]:
    problems: list[str] = []
    for target in PRODUCTION_TARGETS:
        for path in _files(target):
            text = path.read_text(encoding="utf-8", errors="ignore")
            for marker in FORBIDDEN_PRODUCTION_MARKERS:
                if marker.casefold() in text.casefold():
                    problems.append(f"Production target references evaluation marker: {path}")
                    break

    for root_name in ("src", "tests"):
        root = PROJECT_ROOT / root_name
        for path in _files(root):
            if path.resolve() == Path(__file__).resolve():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for marker in FORBIDDEN_EVALUATION_IMPORTS:
                if marker in text:
                    problems.append(
                        f"Evaluation code references forbidden production boundary: {path}"
                    )
                    break

    dockerignore_path = REPOSITORY_ROOT / ".dockerignore"
    if not dockerignore_path.is_file():
        if os.environ.get("DT_MATRAIX_CONTAINER") != "1":
            problems.append("Root .dockerignore is unavailable for isolation verification.")
        return problems

    dockerignore = dockerignore_path.read_text(encoding="utf-8")
    if "evaluation" not in {line.strip().rstrip("/") for line in dockerignore.splitlines()}:
        problems.append(
            "Root .dockerignore must exclude evaluation from the production build context."
        )
    return problems


def _files(target: Path) -> tuple[Path, ...]:
    if target.is_file():
        return (target,)
    if not target.exists():
        return ()
    files: list[Path] = []
    for path in target.rglob("*"):
        relative_parts = path.relative_to(target).parts
        if any(part in IGNORED_DIRECTORY_NAMES for part in relative_parts):
            continue
        if path.is_file() and path.suffix.casefold() in TEXT_SUFFIXES:
            files.append(path)
    return tuple(files)
