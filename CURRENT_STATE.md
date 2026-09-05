# Virtual Classroom Current State

> Evidence snapshot for the Phase 0 virtual-classroom work as of 2026-08-31. This is an inventory,
> not a production-readiness claim. The existing learner product remains governed by
> [`docs/definition-of-done.md`](docs/definition-of-done.md).

## Evidence baseline

The classroom worktree was created from `main@b271329`. The successful GitHub CI and public Render
checks observed for that revision apply only to that committed baseline. They do not validate the
uncommitted Phase 0 changes in this worktree.

| Evidence layer      | Current status                                                    | Boundary                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository baseline | `PASS` at `main@b271329`                                          | Existing CI passed for the base revision only. Phase 0 requires its own local gates and future exact-head CI.                                                          |
| Database history    | 23 migrations                                                     | Phase 0 adds no migration and writes no learner data.                                                                                                                  |
| Connected staging   | Existing Web, `/health`, and `/courses` were reachable at handoff | The classroom is not deployed and inherits none of this evidence.                                                                                                      |
| Real AI             | `BLOCKED`                                                         | Public health reported AI disabled/unconfigured at handoff; no Realtime provider call is part of Phase 0 repository verification.                                      |
| Android             | Partial unrelated evidence                                        | Listening D1 has limited recorded device evidence. The current release-candidate Android Gate H remains `BLOCKED`; it is incorrect to say Android was never exercised. |
| Operations          | `BLOCKED`                                                         | No classroom-specific hard session cutoff, budget enforcement, monitoring, rollback drill, or incident exercise exists.                                                |
| Real users          | `NOT MEASURED`                                                    | No analytics or database measurement was performed for this inventory, so neither zero users nor adoption may be claimed.                                              |

## Phase 0 implementation

This worktree contains a single-developer, five-minute, non-persistent vertical slice:

- `apps/classroom`: Vite + React 19 login-only browser surface using shared UI tokens.
- Supabase authentication with verified-email, learner-role, and server-side profile allowlist
  checks before a Realtime call can start.
- `POST /classroom/realtime-call`: authenticated SDP exchange through the DeutschTrainer API; the
  standard provider key never reaches the browser.
- A versioned four-operation whiteboard protocol, validated with Zod and applied through an
  idempotent reducer.
- An Excalidraw adapter and a development-only deterministic milestone simulator that uses the same
  parser and reducer as the Realtime data channel.
- A versioned German tutor prompt and fixed model snapshot setting.
- Safe Traditional Chinese errors for disabled, unconfigured, restricted, microphone, network,
  timeout, and provider failures.

The simulator is synthetic local evidence. It is not a Realtime conversation and cannot satisfy
the real-AI, latency, German pedagogy, or human-acceptance gate.

## Authentication and origin boundary

The classroom uses the same Supabase project and account system as the learner Web app. Browser
storage is origin-scoped, so two different Render origins cannot directly share the Supabase
session stored in `localStorage`. A learner must sign in separately the first time they open the
classroom origin. The classroom intentionally provides no registration flow.

## Remaining blockers

- Confirm access to the pinned Realtime model with a server-only credential.
- Add an unbypassable server/provider-side session termination and budget control before any
  external tester is admitted. The five-minute browser timer is cleanup UX, not a hostile-client
  cost boundary.
- Conduct the milestone with a human German reviewer: spoken German response, all four board
  operations, barge-in, time to first audio below two seconds, and pedagogical correctness.
- Create exact-head CI, connected deployment, observability, security, and rollback evidence only
  after separate authorization to commit, push, and deploy.

Until those items pass, Phase 0 is a repository-local vertical slice with live acceptance
`BLOCKED`, not a public virtual classroom.
