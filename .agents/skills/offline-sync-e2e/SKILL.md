---
name: offline-sync-e2e
description: "Validate DeutschTrainer offline lesson access, durable attempts, restart persistence, reconnect sync, duplicate handling, conflicts, timestamps, and learning-state consistency. Use for offline, airplane-mode, pending queue, reconnect, sync, duplicate submission, or device persistence requests; do not use for generic API testing or online-only AI evaluation."
---

# Offline Sync E2E

## Inputs

Collect:

- Commit SHA, build identifier, EAS profile, app environment, platform, OS, and device model.
- Disposable test learner without placing credentials in the report.
- Lesson and fixed exercise IDs selected for offline testing.
- Local or preview API/Supabase target and permission to inspect resulting rows.
- Available network controls, physical devices, simulators, and storage-pressure controls.

If no physical device is available, continue with automation but mark native scenarios and the overall end-to-end verdict `BLOCKED`.

## Inspect the Offline Contract

1. Read `docs/phase-12-offline-sync.md`, `docs/testing-strategy.md`, and `docs/definition-of-done.md`.
2. Read `apps/mobile/src/features/offline/offlineModel.ts`, `connectivityStore.ts`, `useOfflineStore.ts`, `OfflineCoordinator.tsx`, and tests.
3. Trace lesson download/cache and fixed grading through Mobile learning flows.
4. Trace API sync validation in `apps/api/src/app.ts`, `apps/api/src/learning-data/`, and offline-sync migrations.
5. Confirm queue capacity, profile partitioning, persisted states, idempotency, original submission time, conflicts, and restart recovery.
6. Confirm writing and AI/audio features remain explicitly online-only when outside the fixed offline contract.

Do not infer persistence from a store declaration alone. Require restart or storage evidence.

## Run Automated Checks

```powershell
pnpm test -- apps/mobile/src/features/offline/offlineModel.test.ts apps/mobile/src/features/offline/connectivityStore.test.ts apps/mobile/src/features/progress/progressModel.test.ts apps/api/src/learning-data/learningDataService.test.ts packages/grading/src/index.test.ts
pnpm --filter @deutschtrainer/mobile typecheck
pnpm --filter @deutschtrainer/api typecheck
```

When local Supabase and API are available:

```powershell
pnpm supabase:status
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:learning-api:local
```

Verify the integration covers idempotent replay, conflicting duplicate payloads, stale exercise/version behavior, timestamp validation, service-mediated RPC access, and resulting learning records. Mark uncovered requirements `BLOCKED`.

## Execute the Native Device Scenario

Use a real preview build for release evidence.

1. Sign in and download a lesson online.
2. Confirm selected lesson and fixed exercise data are present.
3. Enable airplane mode and confirm offline state.
4. Complete multiple fixed exercise types and verify immediate deterministic scoring without API access.
5. Confirm durable pending attempts retain original submission time.
6. Force-close and relaunch offline; confirm lessons, attempts, and visible progress remain.
7. Complete another attempt after relaunch.
8. Restore connectivity and observe sync.
9. Retry the same idempotency key; confirm one logical attempt and one state transition.
10. Exercise an authorized stale-version or conflicting-payload scenario; confirm recoverable feedback without silent loss.
11. Background during sync, interrupt network, and retry.
12. Compare device and server state after convergence.

Never alter production data to create conflicts. Use local or authorized preview data.

## Verify Convergence

Compare:

- Attempt identity, learner/profile, idempotency key, and original timestamp.
- Score, correctness, duration, hints, answer detail, and exercise/content version.
- Progress counters and last activity.
- Mastery changes and bounds.
- Error-history creation or resolution.
- Review scheduling and due dates.
- Queue removal only after accepted synchronization.

Confirm retries never double-count state and fatal/conflicting records remain observable and recoverable.

## Exercise Failure Boundaries

Cover app kill before and after persistence, network loss during upload, duplicate taps, repeated reconnect, invalid timestamps, stale content, queue capacity, backgrounding, low storage/local-write failure, account switch, and sign-out with pending work.

Use `NOT APPLICABLE` only when a boundary does not exist on the platform. Use `BLOCKED` when it exists but cannot be exercised.

## Output and Pass Conditions

Return:

1. Commit, build, environment, platform, device, and anonymized learner.
2. Automated matrix with command, covered requirement, exit code, and status.
3. Manual device matrix with step, expected, observed, evidence, and status.
4. Convergence matrix for attempt, progress, mastery, errors, review, and timestamp.
5. Failures and minimal reproductions.
6. Manual device follow-up.
7. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when automated and all mandatory physical-device, restart, reconnect, duplicate, conflict, timestamp, and convergence scenarios pass. Use `FAIL` for data loss, duplication, wrong state, cross-user leakage, or reproduced contract violation. Use `BLOCKED` when device, build, network control, or server evidence is unavailable. Simulator-only or fake-mode success is not production readiness.
