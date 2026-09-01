# DeutschTrainer MatrAIx evaluation harness

This Python 3.12 project is an isolated, synthetic-only development dependency. It is not part of
the DeutschTrainer pnpm workspace, API image, Mobile/Admin bundles, grading path, database, or
release process.

Every artifact must carry this label:

> SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE

## Deterministic commands

```powershell
uv sync --frozen --no-extra live
uv run --frozen ruff check .
uv run --frozen pytest
uv run --frozen dt-matraix validate
uv run --frozen dt-matraix plan --run-id preflight-v1
uv run --frozen dt-matraix materialize --run-id preflight-v1
uv run --frozen dt-matraix verify-isolation
uv run --frozen dt-matraix export-huggingface
```

The Hugging Face export is a private, synthetic-only registry layer. It performs no model inference
and does not change DeutschTrainer's production provider, API contracts, quotas, Mobile app,
Supabase schema, or deployment configuration.

`generate-checked-artifacts` is a maintainer command. Run it only after intentional cohort or
scenario edits, then review the complete generated diff and rerun the TypeScript writing-feedback
contract check.

## Live boundary

`run-live` fails closed unless it runs inside the isolated image built from a clean committed
DeutschTrainer revision, all scenarios are human-approved, a two-reviewer calibration approval
exists, provider terms are approved, and a separate evaluation-only credential is supplied. No
live run is part of the initial repository implementation.

The formal runner never reads DeutschTrainer's production provider key. It does not grade learners,
write to Supabase, update prompts, publish content, or promote a release.
