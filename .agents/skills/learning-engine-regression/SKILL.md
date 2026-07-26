---
name: learning-engine-regression
description: "Verify deterministic grading, mastery, review scheduling, attempt replay, timestamps, and learning-history behavior. Use for grading, mastery, spaced-review, idempotency, timezone, attempt, progress, error-history, or learning-engine regressions; do not use for AI rubric quality, content grammar review, or a full release audit."
---

# Learning Engine Regression

## Inputs

Collect:

- Changed files, suspected regression, or exact learner scenario.
- Baseline commit or expected behavior.
- Target level, exercise type, answer, hint use, duration, submission time, timezone, and idempotency key when relevant.
- Whether local Supabase and the local API are available.

If no specific scenario is supplied, cover the full deterministic grading and learning-state boundary.

## Trace the Implementation

1. Read `packages/grading/src/index.ts` and its tests.
2. Read `packages/learning-engine/src/index.ts` and its tests.
3. Read `apps/api/src/learning-data/`, attempt routes in `apps/api/src/app.ts`, and migrations defining fixed attempts and offline sync.
4. Read `apps/mobile/src/features/offline/offlineModel.ts`, `connectivityStore.ts`, `useOfflineStore.ts`, and `OfflineCoordinator.tsx`.
5. Compare TypeScript mastery/review semantics with the database RPC. Report divergence even if one side has passing tests.
6. Inspect the relevant diff before choosing a narrowed test set.

Do not modify production code during a regression check unless the user separately requests a fix.

## Run Deterministic Tests

Run focused existing tests from the repository root:

```powershell
pnpm test -- packages/grading/src/index.test.ts packages/learning-engine/src/index.test.ts apps/mobile/src/features/offline/offlineModel.test.ts apps/mobile/src/features/offline/connectivityStore.test.ts apps/mobile/src/features/progress/progressModel.test.ts apps/api/src/learning-data/learningDataService.test.ts
pnpm --filter @deutschtrainer/grading typecheck
pnpm --filter @deutschtrainer/learning-engine typecheck
pnpm --filter @deutschtrainer/api typecheck
pnpm --filter @deutschtrainer/mobile typecheck
```

If a listed test no longer exists, do not invent a replacement. Mark it `BLOCKED`, identify the drift, and locate the nearest real test before proceeding.

Repeat the smallest deterministic test or reproduction at least twice with identical inputs. Compare the complete result, not only the score.

## Run Persistence and Replay Checks

When disposable local Supabase and the local API are available:

```powershell
pnpm supabase:status
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:offline-sync:local
```

Verify:

- Same idempotency key and payload return the same logical result without duplicate state changes.
- Same key with conflicting exercise or payload is rejected.
- Mastery, review, progress, and error history update once.
- Original client submission timestamp is preserved.
- Invalid, stale, or future timestamps fail with documented validation behavior.
- Reconnect replay does not replace original attempt time with sync time.

Treat unavailable Docker, Supabase, API, or credentials as `BLOCKED` for persistence coverage. Unit tests alone cannot pass an end-to-end persistence claim.

## Exercise Boundary Cases

Cover:

- Normalization of case, whitespace, German umlauts, and `ß`.
- Empty, malformed, correct, partial, and incorrect answers.
- Hint and exact slow-answer thresholds.
- Values around implemented streak thresholds.
- Minimum and maximum mastery bounds.
- UTC/local date boundaries, timezone changes, and DST.
- Duplicate and conflicting idempotency replay.
- Offline reconnect order, identity, and original timestamp.
- Identical inputs rerun for complete output consistency.

Do not assert a boundary passes unless a test or direct observation covers it. Mark missing coverage `BLOCKED`.

## Build a Minimal Reproduction

For each failure:

1. Identify the first incorrect transition.
2. Reduce to one exercise, one learner, and one attempt where possible.
3. Record exact sanitized inputs.
4. Record expected and actual grading output, mastery, review, progress, error history, and timestamps.
5. Separate deterministic logic from persistence, timezone, validation, or sync effects.
6. Re-run twice to prove consistency or nondeterminism.

## Output and Pass Conditions

Return:

1. Scope and baseline.
2. Matrix with area, scenario, evidence, expected, actual, and status.
3. Minimal reproductions with exact repository command and sanitized inputs.
4. TypeScript/SQL parity findings.
5. Uncovered boundaries.
6. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when all in-scope deterministic, state-transition, replay, timestamp, and required persistence checks pass. Use `FAIL` for a reproduced mismatch. Use `BLOCKED` when required integration or boundary evidence cannot be obtained. Use `NOT APPLICABLE` only when the requested change cannot affect grading or learner state.
