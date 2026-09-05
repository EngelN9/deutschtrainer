# Definition of Done

## Status vocabulary

- `PASS`: the required behavior was executed successfully and has reproducible evidence.
- `FAIL`: the required check was executed and did not satisfy the acceptance criteria.
- `BLOCKED`: a required check cannot currently be executed safely because an external environment,
  credential, service, device, or decision is unavailable.
- `NOT APPLICABLE`: the criterion does not apply, with a recorded reason.
- `NOT MEASURED`: a product or user outcome has not been measured and no numerical claim may be
  inferred from its absence.

Repository implementation, a mock/demo, local Supabase, fake AI, CI configuration, a generated
bundle, and a versioned device flow are different evidence layers. None substitutes for the others.
Synthetic persona evidence is supplementary evaluation evidence only and cannot satisfy any gate
requiring real learners, qualified human-language review, real AI, device evidence, or production
evidence. A MatrAIx result can therefore never change an A–J gate to `PASS` by itself.
DeutschTrainer may be called complete, publicly available, production-ready, or released only when
all required A-J gates are `PASS`.

## A-J gates

| Gate                    | PASS criteria                                                                                                                                                                                                | Minimum evidence                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| A. Product boundary     | Mobile is the learning product; the public site is informational; `/admin` is role-gated; demo, connected, and experimental classroom modes are explicit.                                                    | Route/config review plus public, demo, connected, experimental, and unauthorized behavior checks.             |
| B. Core learning flow   | Authenticated learner can complete published fixed and supported AI exercises; server-authoritative attempt, progress, mastery, review and error state remain consistent across retry and offline reconnect. | Unit tests plus clean local integration, connected staging, and required device flows.                        |
| C. Content quality      | Release content meets the documented B1-C2 count and schema; answers and explanations are coherent; every published AI-assisted item has recorded qualified human review.                                    | Content-readiness automation and signed human-language review evidence.                                       |
| D. Data rights          | Learner can export account data and permanently delete private database rows, Storage objects, Auth account and on-device state without affecting another user.                                              | Two-user local and remote deletion/export tests, old-token denial, and device cache verification.             |
| E. Security             | Private tables and Storage use RLS/owner isolation; admin and service-role boundaries hold; no secret enters a public variable or client artifact.                                                           | Clean migration replay, anonymous/two-user/role matrix, remote RLS checks, bundle inspection and secret scan. |
| F. Code quality         | Frozen install, format, lint, strict typecheck, tests, API build/bundle, Admin build and applicable exports pass without hiding failures.                                                                    | Commands, exit codes, suite/test counts and artifact results from the same revision.                          |
| G. Connected deployment | Remote Supabase migrations and seed, HTTPS API, configured Admin/Mobile clients and real AI run with fake mode disabled.                                                                                     | Deployment identifiers, `/health`, remote API/security suites and connected user journeys.                    |
| H. Android device       | Install, auth, notifications, microphone/audio, restart, flight mode, reconnect, background behavior and deletion/cache flows pass on a recorded Android build/device.                                       | Device model, Android version, app version/build ID, steps, logs/screenshots and results.                     |
| I. Operability          | Monitoring/alerts, distributed abuse controls, backup/restore, rollback, incident response and privacy deletion operations are deployed and rehearsed.                                                       | Provider configuration plus dated alert, restore, rollback and incident/deletion drill records.               |
| J. Public delivery      | Public support/privacy/terms/deletion URLs and release assets are deployed; identifiers/checksums and any store review are complete.                                                                         | Public URLs, release/build IDs, checksum, install evidence and store status when applicable.                  |

## Current release classification

The committed baseline `main@b271329` had successful GitHub CI and the existing public Render Web,
`/health`, and `/courses` endpoints were reachable at the 2026-08-31 classroom handoff. Those facts
do not validate later uncommitted worktrees. The repository contains 23 append-only migrations;
any older 21-migration count is stale.

Listening D1 has limited recorded Android-device evidence, but the current release candidate has
not completed installation, authentication, microphone/audio, restart, flight-mode, reconnect,
background, and deletion/cache acceptance as one recorded build. Gate H therefore remains
`BLOCKED`; it is also inaccurate to classify all Android behavior as never executed.

Real-AI quality, cost, and latency remain `BLOCKED` while provider configuration/public access are
disabled. Operations, backup/restore, rollback, hard distributed abuse controls, and complete
public delivery also remain `BLOCKED`. Real-user adoption is `NOT MEASURED`; the absence of an
analytics result is not evidence of zero users. Overall release readiness remains `BLOCKED`, not
`READY`.

## Virtual classroom Phase 0 evidence

The isolated `codex/classroom-phase0` worktree adds a repository-local, five-minute,
single-developer virtual-classroom slice with no persistence or migration. B1-B6 may be marked
`PASS` only for the exact locally tested worktree: browser shell/auth eligibility, safe SDP API,
WebRTC lifecycle, whiteboard reducer, tool schemas, and versioned tutor prompt. The development
simulator is deterministic synthetic evidence only.

B7 remains `BLOCKED` until a real provider session with fake mode disabled demonstrates spoken
German, all four whiteboard operations, barge-in, under-two-second time to first audio, and
qualified human pedagogical review. Before any external tester, the project must also demonstrate
an unbypassable server/provider-side hangup and budget control. A five-minute browser timer or a
client-secret TTL cannot satisfy that security/operability requirement. Phase 0 does not lower or
replace any A-J gate.
