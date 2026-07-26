---
name: ci-failure-triage
description: "Diagnose the first actionable root cause in DeutschTrainer CI or local validation failures. Use for failing GitHub Actions, red checks, broken builds, lint/type/test/container/Expo failures, or cascading CI errors; do not implement a fix unless the user explicitly asks, and do not use for a proactive full release audit."
---

# CI Failure Triage

## Operating Mode

Diagnose by default. Do not edit source, tests, workflows, lockfiles, or configuration unless the user explicitly requests a fix after diagnosis.

Find the earliest causal failure, reproduce it with the repository's exact command, and separate it from downstream noise. Do not label the last or loudest failure root cause without evidence.

## Inputs

Collect a GitHub Actions run, pull request, supplied CI log, or exact local command and sanitized output. Record commit, branch, runner OS, Node/pnpm versions, lockfile install mode, and repeatability when visible.

Never print secrets from logs. Redact tokens, authorization headers, signed URLs, user data, Supabase keys, and OpenAI keys.

## Read the Actual Pipeline

1. Read `.github/workflows/ci.yml`.
2. Read root/workspace package scripts, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/api/Dockerfile`, `apps/mobile/app.config.ts`, and `apps/mobile/eas.json` when relevant.
3. Map the failed step to its exact working directory, environment, and command.
4. Check whether an earlier step produced required state or artifacts.
5. Do not invent a script from a display label; use the workflow or package command.

## Acquire Failure Evidence

If GitHub CLI access is available, use read-only commands:

```powershell
gh auth status
gh pr checks <pr-number>
gh run view <run-id> --log-failed
```

Use connected GitHub tooling when available for PR metadata and check summaries. If logs or access cannot be obtained, mark diagnosis `BLOCKED` and list the exact missing input.

Record the first failing step chronologically with enough surrounding output to prove cause. Do not paste entire noisy logs.

## Classify and Reproduce

Classify as dependency/lockfile, format, ESLint, TypeScript, Jest, API build/bundle, Docker, Expo dependency/Doctor, Android/Web export, Admin build, environment/service, or workflow/runner infrastructure.

1. Start from the same commit.
2. Preserve the workflow working directory and environment classification without copying secret values.
3. Run the exact failed command first.
4. Narrow only after exact reproduction, retaining the same tool/configuration.
5. Repeat the minimal reproduction to distinguish deterministic failure from flakiness.
6. Compare tool versions when local and CI outcomes differ.

Current CI gates include:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @deutschtrainer/api build
pnpm --filter @deutschtrainer/api verify:bundle
docker build --file apps/api/Dockerfile --tag deutschtrainer-api:ci .
pnpm --filter @deutschtrainer/mobile export:android
pnpm --filter @deutschtrainer/mobile export:web
pnpm --filter @deutschtrainer/admin build
```

The Mobile CI step also runs `pnpm exec expo install --check` and `pnpm dlx expo-doctor@1.20.1` from `apps/mobile`. Use only relevant commands during initial triage.

## Identify Root Cause and Cascades

For each error, determine:

1. Which prerequisite or invariant failed first.
2. Which file, input, configuration, dependency, or service caused it.
3. Whether it reproduces independently.
4. Which later failures disappear when the prerequisite is restored.
5. Whether it is deterministic, flaky, environment-specific, or externally blocked.
6. The smallest safe correction scope.

Do not propose suppressing tests, weakening types, disabling security checks, or broad upgrades unless evidence proves that is the minimal correct fix.

## Fix Only When Authorized

If explicitly asked to fix:

1. Change only files needed for the root cause.
2. Preserve unrelated work.
3. Run the minimal reproduction, adjacent package check, and original failed CI command.
4. Broaden validation in proportion to risk.
5. Report unrun checks `BLOCKED`; do not imply full CI success.

## Output and Pass Conditions

Return:

1. Run identity: run/PR, commit, job, step, runner, and command.
2. Root cause statement with evidence.
3. Cascading and independent errors.
4. Minimal reproduction and repeatability.
5. Minimal fix scope without applying it unless authorized.
6. Validation evidence.
7. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when the requested failing check and required adjacent verification pass. In diagnosis-only mode use `FAIL` when a confirmed root cause remains unfixed. Use `BLOCKED` when logs, access, tooling, services, or reproducible state are missing. Use `NOT APPLICABLE` only when there is no DeutschTrainer CI or local validation failure.
