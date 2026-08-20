# Definition of Done

## Status vocabulary

- `PASS`: the required behavior was executed successfully and has reproducible evidence.
- `FAIL`: the required check was executed and did not satisfy the acceptance criteria.
- `BLOCKED`: a required check cannot currently be executed safely because an external environment,
  credential, service, device, or decision is unavailable.
- `NOT APPLICABLE`: the criterion does not apply, with a recorded reason.

Repository implementation, a mock/demo, local Supabase, fake AI, CI configuration, a generated
bundle, and a versioned device flow are different evidence layers. None substitutes for the others.
Synthetic persona evidence is supplementary evaluation evidence only and cannot satisfy any gate
requiring real learners, qualified human-language review, real AI, device evidence, or production
evidence. A MatrAIx result can therefore never change an A–J gate to `PASS` by itself.
DeutschTrainer may be called complete, publicly available, production-ready, or released only when
all required A–J gates are `PASS`.

## A–J gates

| Gate                    | PASS criteria                                                                                                                                                                                                | Minimum evidence                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| A. Product boundary     | Mobile is the learning product; the public site is informational; `/admin` is role-gated; demo and connected modes are explicit.                                                                             | Route/config review plus public, demo, connected, and unauthorized behavior checks.                           |
| B. Core learning flow   | Authenticated learner can complete published fixed and supported AI exercises; server-authoritative attempt, progress, mastery, review and error state remain consistent across retry and offline reconnect. | Unit tests plus clean local integration, connected staging, and required device flows.                        |
| C. Content quality      | Release content meets the documented B1–C2 count and schema; answers and explanations are coherent; every published AI-assisted item has recorded qualified human review.                                    | Content-readiness automation and signed human-language review evidence.                                       |
| D. Data rights          | Learner can export account data and permanently delete private database rows, Storage objects, Auth account and on-device state without affecting another user.                                              | Two-user local and remote deletion/export tests, old-token denial, and device cache verification.             |
| E. Security             | Private tables and Storage use RLS/owner isolation; admin and service-role boundaries hold; no secret enters a public variable or client artifact.                                                           | Clean migration replay, anonymous/two-user/role matrix, remote RLS checks, bundle inspection and secret scan. |
| F. Code quality         | Frozen install, format, lint, strict typecheck, tests, API build/bundle, Admin build and applicable exports pass without hiding failures.                                                                    | Commands, exit codes, suite/test counts and artifact results from the same revision.                          |
| G. Connected deployment | Remote Supabase migrations and seed, HTTPS API, configured Admin/Mobile clients and real AI run with fake mode disabled.                                                                                     | Deployment identifiers, `/health`, remote API/security suites and connected user journeys.                    |
| H. Android device       | Install, auth, notifications, microphone/audio, restart, flight mode, reconnect, background behavior and deletion/cache flows pass on a recorded Android build/device.                                       | Device model, Android version, app version/build ID, steps, logs/screenshots and results.                     |
| I. Operability          | Monitoring/alerts, distributed abuse controls, backup/restore, rollback, incident response and privacy deletion operations are deployed and rehearsed.                                                       | Provider configuration plus dated alert, restore, rollback and incident/deletion drill records.               |
| J. Public delivery      | Public support/privacy/terms/deletion URLs and release assets are deployed; identifiers/checksums and any store review are complete.                                                                         | Public URLs, release/build IDs, checksum, install evidence and store status when applicable.                  |

## Current release classification

The repository contains substantial implementation and automated verification. The 2026-07-31
local audit passed format, lint, strict typecheck, 25 Jest suites/142 tests, API build/bundle,
Admin build, Android/Web exports, frozen install, peer dependency check, Expo dependency
compatibility, and Expo Doctor 20/20. The compatibility repair aligned Expo 57.0.9,
Expo Router 57.0.9, React Native 0.86.2, the required Expo modules, React Native Metro config, and
Supabase JS 2.110.5. Gate F is therefore `PASS` for this working tree.

Docker Desktop 29.6.2 is installed and its engine was verified. The same audit built the API image
successfully and confirmed its non-root user, health check, plain-Node command, bundle-only runtime
layout, and fail-fast behavior without the required service-role key. A credentialed
`APP_ENV=local` container smoke then reached the host Supabase stack through
`host.docker.internal`, returned `200` from `/health`, and reached Docker health `healthy`; the
image's production default separately rejected local fake AI as required. A clean local Supabase
reset replayed all 21 migrations and the release seed; security advisors reported no security
findings, all 36 public tables had RLS, all 33 `SECURITY DEFINER` functions had fixed `search_path`,
and none retained default `PUBLIC EXECUTE`. The seed contained 100 approved human published
exercises with the required B1–C2 distribution, answer rows, and minimum type coverage.

The root `.env` now safely supplies the local Supabase runtime variables without copying their
values into source, logs, or documentation. Against the same clean local database and production
API bundle, the 2026-07-31 audit passed all ten credentialed verification scripts: account data,
admin/content workflow, learning API, offline sync, settings, deterministic AI evaluation,
writing, audio, knowledge library, and content readiness. The evidence includes anonymous denial,
two-user isolation, role enforcement, server-authoritative grading, idempotent replay, original
submission timestamps, owner deletion, old-token denial, and the 100-exercise release-seed checks.
AI-dependent local suites used process-scoped `AI_EVALUATION_FAKE_MODE=true`; those results prove
deterministic integration behavior only and do not establish real-AI quality, cost, or latency.

Gate 3 applied the same 21 migrations to the linked remote Supabase project and verified 36/36
public tables with RLS, zero protected-content client grants, zero `PUBLIC` function execute
privileges, fixed `search_path` on all `SECURITY DEFINER` functions, service-role-only account
deletion, zero anon/authenticated mutation or `MAINTAIN` grants on existing public tables and
repository-owned future-table defaults, three active owner-scoped Storage policies, and the
100-exercise release seed. Remote
anonymous checks returned `200` for Auth health and published courses, and `401` for writing rules,
listening content, an Admin RPC, and a direct table write. Supabase advisors still report the eight intentionally
authenticated identity/Admin `SECURITY DEFINER` entry points plus two policy-free service-only
tables; their remote role behavior still requires the two-user deployed-API suite. Supabase's
platform-owned `supabase_admin` table defaults remain outside repository-migration authority, so
application tables must continue to be created only by reviewed append-only migrations that
explicitly verify effective client privileges.

The public GitHub repository and Render staging Blueprint now exist, but the HTTPS API has not been
deployed or supplied its protected runtime values. The remote service-role runtime, real AI,
two-user remote owner/role matrix, EAS staging
environment/build, Android device, operations drills and public delivery remain `BLOCKED`. With no
currently reproduced repository gate failure but required evidence unavailable, the overall
classification is `BLOCKED`, not `READY`. A gate may move to `PASS` only when its own complete
evidence is recorded; a Phase completion note, Doctor result, compatibility result, or successful
export does not replace any external gate.
