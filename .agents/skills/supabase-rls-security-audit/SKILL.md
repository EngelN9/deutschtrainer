---
name: supabase-rls-security-audit
description: "Audit Supabase RLS, policies, storage, grants, service-role use, and cross-user isolation. Use for Supabase security, RLS, authorization, privacy, storage-policy, migration-security, or data-isolation reviews; do not use to implement policies or edit migrations unless the user explicitly requests a separate fix."
---

# Supabase RLS Security Audit

## Operating Mode

Default to a read-only audit. Inspect repository files, local schemas, linked-project metadata, and test evidence without changing migrations, policies, grants, users, buckets, or production data.

Use a local reset only after confirming the target is the disposable local Supabase stack. Never run destructive commands against a linked or remote database. Never expose the service-role key, OpenAI key, access tokens, database password, signed URLs, or user content.

## Inputs

Collect:

- Audit target: repository-only, local Supabase, or linked project.
- Scope: full schema or named tables/functions/buckets.
- Available Supabase login/link status and Docker runtime.
- Permission to create and delete local temporary test users.
- Requested evidence depth: static, local integration, or linked-project advisory review.

Mark a target-specific check `BLOCKED` when its required access is unavailable. Do not use `NOT APPLICABLE` merely because a check is inconvenient.

## Build the Security Inventory

1. Read every file under `supabase/migrations/` in timestamp order, plus `supabase/config.toml` and `supabase/seed.sql`.
2. Inventory application access paths in `apps/api/src/`, `apps/mobile/src/`, and `apps/admin/src/`.
3. List tables, views, RPCs, trigger functions, `SECURITY DEFINER` functions, grants, RLS enablement, policies, storage buckets, and storage-object policies.
4. Identify server-only tables and functions, authenticated Admin RPCs, public published-content reads, and owner-scoped private data.
5. Search only committed source and environment examples for secret names. Report file locations and variable names only; never inspect or print values from local environment files.

## Inspect Database State

When the disposable local stack is available, run:

```powershell
pnpm supabase:status
pnpm exec supabase migration list --local
pnpm exec supabase db lint --local --level warning
```

Replay migrations with `pnpm supabase:reset` only after establishing that local data may be discarded. A successful replay is evidence for local reproducibility, not linked production state.

When a linked project is in scope and the CLI is authenticated, run:

```powershell
pnpm exec supabase migration list --linked
pnpm exec supabase db lint --linked --level warning
```

Do not pass passwords on a command line captured in output. If linked access is unavailable, mark linked migration/advisor evidence `BLOCKED`.

## Evaluate RLS and Policy Boundaries

Create a matrix for every private or sensitive table. At minimum, include:

- Profiles, preferences, onboarding state, selected level, and notification settings.
- Attempts, attempt answers, errors, mastery, reviews, progress, and offline sync state.
- AI feedback and usage/cost records.
- Writing submissions, versions, feedback, and deletion paths.
- Listening attempts, transcript access state, speaking submissions, and audio assets.
- Content versions, reviews, generation jobs, Admin-managed content, and protected answer-key tables.

For each table, verify:

1. RLS is enabled where direct client access is possible.
2. `SELECT`, `INSERT`, `UPDATE`, and `DELETE` are independently bounded.
3. Owner checks derive identity from the authenticated user, not client-supplied profile IDs.
4. Missing operations are intentionally denied rather than accidentally public.
5. Public reads expose only intended published content and never answer keys, transcripts, drafts, or learner data.
6. Admin policies or RPCs enforce the actual role boundary and do not trust a client claim.
7. Multiple permissive policies do not widen access unexpectedly.

Use `NOT APPLICABLE` for an operation the product intentionally never permits, and cite evidence.

## Review Functions, Grants, Service Role, and Storage

1. Review every `SECURITY DEFINER` function for safe `search_path`, authenticated ownership or role checks, input validation, and minimal grants.
2. Confirm trigger-only and service-only functions are not executable by `PUBLIC`, `anon`, or `authenticated`.
3. Confirm authenticated Admin RPC grants match repository role checks.
4. Trace service-role creation and use through API repositories. Confirm it remains server-side and is never referenced by Mobile, Admin browser code, Expo public configuration, or committed values.
5. Separate intentional service-role bypass from accidental RLS bypass. Require an owner or role check inside service-mediated learner operations.
6. For each storage bucket, verify privacy, object-path ownership, signed access, transcript/answer protection, and deletion of both object and metadata.

## Exercise Cross-User Isolation

Use existing integration scripts against the local stack only. Start the local API as documented, then run applicable commands:

```powershell
pnpm --filter @deutschtrainer/api verify:local
pnpm --filter @deutschtrainer/api verify:writing:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:workspaces:local
pnpm --filter @deutschtrainer/api verify:admin:local
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:settings:local
```

Confirm scripts actually exercise separate users, forbidden direct RPC access, ownership conflicts, or deletion boundaries before counting them as isolation evidence. Mark non-covered boundaries `BLOCKED`.

## Review Replay and Deletion

1. Confirm migrations remain ordered and replayable from a clean local database.
2. Inspect foreign keys, cascades, RPC deletion flows, and storage cleanup for orphan risk.
3. Distinguish writing/speaking deletion from whole-account deletion.
4. If whole-account deletion is absent or unverified, report it explicitly; do not infer it from profile cascades.
5. Never edit an old migration during an audit.

## Output and Pass Conditions

Return:

1. Audit target, commit, access, and blocked prerequisites.
2. Findings sorted `CRITICAL`, `HIGH`, `MEDIUM`, then `LOW`, with object, boundary, evidence, impact, and remediation.
3. RLS matrix with table, sensitivity, RLS, operation boundaries, and status.
4. Storage/function matrix with intended caller, actual grants/policy, and status.
5. Deletion and orphan analysis.
6. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when every in-scope sensitive object and operation has evidence and no critical/high issue remains. Use `FAIL` for a demonstrated unsafe boundary. Use `BLOCKED` when mandatory database or cross-user behavior cannot be observed. Use `NOT APPLICABLE` only when the entire requested scope contains no Supabase security boundary.
