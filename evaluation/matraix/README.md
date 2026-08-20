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
```

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

## Provider selection

Run the personas on a **different model family than the one that produced the feedback under
test**. The simulated learner is itself a language model: when it shares a family with the grader,
it also shares that grader's priors and vocabulary, and it will report understanding an
explanation that a real zh-TW learner at the same CEFR level would not. Same-family evaluation
systematically overstates every comprehension metric in `metrics.v1`.

With DeutschTrainer's writing evaluation on OpenAI, run the matrix on Anthropic:

```powershell
uv run --frozen dt-matraix run-live --run-id <id> --provider anthropic --model anthropic/<model-id>
```

Both providers are already supported; each requires its own separately reviewed evaluation
credential (`MATRAIX_EVAL_OPENAI_API_KEY`, `MATRAIX_EVAL_ANTHROPIC_API_KEY`), and neither may be
the production key.

Cross-family personas reduce the correlation between grader and judge. They do not remove it. The
36-cell two-reviewer calibration is what bounds the remaining gap between simulated comprehension
and a real learner's, and it is a measurement, not a formality — an uncalibrated run reports
numbers whose distance from reality is unknown.

Record the grader/persona pairing alongside the run: results produced under different pairings are
not comparable, and a prompt regression compared across a provider change measures the change of
provider.
