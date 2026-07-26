---
name: docs-code-drift-check
description: "Find mismatches between DeutschTrainer documentation, package scripts, environment examples, API routes, Zod schemas, migrations, runtime behavior, and phase-completion claims. Use for docs drift, stale README, inaccurate deployment instructions, undocumented contracts, or completion-claim verification; do not use for prose style editing or implementation refactoring."
---

# Docs-Code Drift Check

## Inputs

Collect:

- Documentation scope: README, named docs, phase claims, deployment instructions, or full repository.
- Code scope or changed refs for a pull request.
- Whether external deployment, Supabase, EAS, or device state is in scope and accessible.
- Whether the user wants diagnosis only. Default to diagnosis only.

Do not edit documentation or code unless explicitly asked after the drift report.

## Build the Claim Inventory

Read:

- `README.md`.
- `docs/architecture.md`, `docs/security.md`, `docs/testing-strategy.md`, `docs/definition-of-done.md`, and `docs/acceptance-criteria.md`.
- Relevant phase and supplemental strategy/deployment documents under `docs/`.
- Root and workspace `package.json` files and `pnpm-workspace.yaml`.
- `.github/workflows/ci.yml`.
- Committed environment example files without opening local environment files or secret values.
- `apps/mobile/app.json`, `apps/mobile/app.config.ts`, and `apps/mobile/eas.json`.
- `apps/api/Dockerfile`.

Extract falsifiable claims: command/path existence, routes, schema fields, table/policy behavior, migration state, variable semantics, deployment status, test coverage, phase completion, release identity, or manual acceptance.

## Compare Commands and Paths

1. Resolve every documented repository path.
2. Resolve each documented `pnpm`, Expo, EAS, Docker, Supabase, or verification command against package scripts, workflow, or checked-in instructions.
3. Confirm working directory.
4. Confirm removed or renamed scripts are not still presented as runnable.
5. Mark documented missing commands/paths `FAIL`.
6. Mark external commands `BLOCKED` only when their existence is confirmed but service/login is unavailable.

Do not invent a replacement command. Suggest the nearest actual command only after confirming it exists.

## Compare Environment Contracts

1. Enumerate variable names only from committed examples.
2. Trace each name to configuration access in Mobile, Admin, and API.
3. Compare required/optional behavior, defaults, validation, and public/server classification.
4. Verify no server secret is documented for a public browser or Expo channel.
5. Report variables used but absent from examples, documented but unused, or conflicting.

Never read or output actual secret values.

## Compare API and Schemas

1. Inventory methods and paths from `apps/api/src/app.ts`.
2. Trace each documented route to validation, shared types/Zod, service behavior, status/errors, and tests.
3. Compare AI output docs with `packages/ai-schemas/src/index.ts`.
4. Compare prompt/schema version claims with `packages/ai-prompts/src/index.ts`.
5. Compare Mobile/Admin callers with actual routes and responses.
6. Report undocumented routes, missing documented routes, field/type drift, and status-code drift.

Do not treat a type declaration alone as runtime behavior; require route/service or test evidence.

## Compare Database Claims

1. Read all migrations in order.
2. Trace documented tables, columns, RLS, policies, RPCs, storage, grants, and deletion behavior to migrations.
3. Compare migration-count/latest claims with filenames.
4. Use `pnpm exec supabase migration list --local` or `--linked` only when the target is available.
5. Distinguish files present in Git from migrations applied to an environment.
6. Report account deletion, storage cleanup, or isolation claims exceeding implementation/evidence.

A local reset does not prove a linked deployment is current.

## Compare Runtime and Completion Claims

Require appropriate evidence:

- Implementation exists and is not a placeholder.
- Tests cover happy and negative paths.
- Migration is replayable and applied to the target.
- Claimed API/site/Admin deployment is reachable.
- Preview/production EAS resolves correctly.
- Real provider behavior exists for AI readiness.
- Physical-device acceptance exists for mobile readiness.
- Content counts, approval, publication, and human review exist for content readiness.

Never decide completion solely from README or a phase document. Fake mode, fixtures, mocks, screenshots without build/commit identity, and local-only success are limited evidence.

## Classify Drift

Use:

- `DOCS STALE`: docs describe old behavior.
- `CODE MISSING`: required behavior is absent.
- `CONTRACT CONFLICT`: executable surfaces disagree.
- `ENVIRONMENT UNVERIFIED`: repository state exists but deployment cannot be confirmed.
- `CLAIM OVERSTATED`: readiness language exceeds evidence.
- `AMBIGUOUS`: sources conflict and authority is unclear.

Assign severity by user harm, security, data risk, release impact, and likelihood of following wrong instructions.

## Output and Pass Conditions

Return:

1. Scope and commit.
2. Drift table with claim, document, actual source, reality, classification, severity, and status.
3. Command/path drift.
4. Environment-variable drift.
5. API/Zod contract drift.
6. Migration/security drift.
7. Phase/deployment claim drift.
8. Recommended owner: docs, code, deployment, content, or product decision.
9. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when all in-scope falsifiable claims agree with verified repository and external state. Use `FAIL` for contradictions, missing implementation, unsafe instructions, or overstated completion. Use `BLOCKED` when required external evidence is inaccessible. Use `NOT APPLICABLE` only when no documentation-to-implementation claim exists in scope.
