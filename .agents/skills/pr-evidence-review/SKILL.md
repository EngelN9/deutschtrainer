---
name: pr-evidence-review
description: "Review DeutschTrainer pull requests or diffs for correctness, regression risk, security, migrations, API contracts, documentation, placeholders, and completion evidence. Use for PR review, change review, merge readiness, evidence review, or completion claims; do not implement changes, post comments, approve, merge, commit, or push unless separately authorized."
---

# PR Evidence Review

## Inputs

Collect:

- Pull request URL/number, or base and head refs.
- Stated purpose, acceptance criteria, linked issue/specification, and claimed phase.
- Expected test, migration, deployment, or device evidence.
- Whether the task is review-only. Default to review-only.

If no base is supplied, derive the merge base from repository/GitHub metadata. Do not guess when the base could change the review.

## Establish the Change Set

1. Record branch, commit, and worktree status.
2. Use connected GitHub tooling for PR metadata and changed-file context when available; use `gh pr view` and `gh pr diff` as read-only fallbacks.
3. For local review, inspect diff stat, name status, and full relevant diff between base and head.
4. Read `README.md`, `docs/definition-of-done.md`, `docs/testing-strategy.md`, and domain documents implicated by the change.
5. Read package scripts and CI before evaluating command evidence.
6. Separate working-tree changes from PR changes.

Never modify files or external PR state during review.

## Map Impact and Risk

Classify every changed file:

- Mobile UI, storage, or offline sync.
- Admin authorization or content workflow.
- API route, validation, service, repository, or response.
- Shared type, Zod schema, prompt, grading, or learning engine.
- Supabase migration, RLS, RPC, storage, seed, or deletion.
- CI, container, Expo/EAS, environment example, deployment, or docs.

Identify direct consumers and persisted-data effects. Raise risk for shared schemas, migrations, auth boundaries, idempotency, timestamps, or release configuration.

## Review Correctness and Evidence

Verify:

1. Implementation matches purpose and acceptance criteria without unrelated scope.
2. Error, retry, timeout, offline, and idempotency paths remain coherent.
3. Tests cover changed behavior and meaningful negative cases.
4. Test evidence belongs to the reviewed commit and uses repository commands.
5. Security preserves user isolation, Admin roles, answer protection, storage ownership, and server-only secrets.
6. Migrations are append-only, ordered, replayable, and safe for existing data.
7. API behavior agrees across routes, Zod, shared types, callers, tests, and docs.
8. Environment/deployment docs change when configuration contracts change.
9. Completion claims have code, test, migration, deployment, and device evidence as applicable.
10. Fake mode, mocks, local fixtures, and placeholders are not presented as production completion.

Search changed files and adjacent implementation for `TODO`, `FIXME`, `HACK`, placeholders, “not implemented,” fake, and mock markers. Interpret matches in context; tests and intentional fake providers are not automatically defects.

## Run Proportional Verification

- Use focused Jest paths for isolated logic.
- Run affected workspace typecheck.
- Use existing API `verify:*:local` scripts for changed integration contracts.
- Use `pnpm supabase:reset` only on a disposable local stack for migration replay.
- Use `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` for broad changes.
- Use exact CI build/export/container commands for release-surface changes.

Do not invent commands. Mark evidence `BLOCKED` when runtime, credentials, linked environment, build, or physical device is unavailable.

## Write Findings First

Sort findings:

- `P0`: immediate breach, destructive loss, or unusable release.
- `P1`: likely correctness failure, authorization bypass, migration break, corruption, or API break.
- `P2`: meaningful regression risk, missing required validation/test, misleading completion, or operational failure.
- `P3`: localized maintainability, docs, or low-impact quality.

For each, give concise title, priority, tight file/line range, triggering scenario, impact, evidence, expected behavior, and smallest correction direction. Do not dilute findings with praise.

## Output and Pass Conditions

Return:

1. Findings first, P0 through P3.
2. If none, state `No actionable findings found`.
3. Change purpose and affected scope.
4. Evidence matrix with requirement, expected evidence, observed evidence, and status.
5. Security, migration, API, docs, and placeholder assessment.
6. Residual risks and unverified checks.
7. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when no actionable finding remains and mandatory evidence is available. Use `FAIL` when a correctness, safety, data, or completion issue is confirmed. Use `BLOCKED` when diff, base, logs, environment, migration state, deployment, or device evidence is unavailable. Use `NOT APPLICABLE` only when there is no change set.
