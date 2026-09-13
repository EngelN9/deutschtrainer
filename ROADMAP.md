# Virtual Classroom Roadmap

## Phase 0 - isolated vertical slice

**Goal:** prove a five-minute, single-developer browser exchange where spoken German correction and
validated whiteboard operations work together.

**Current implementation:** B1-B6 are implemented locally in `codex/classroom-phase0` and require
the final repository gates from this exact worktree. B7 is `BLOCKED` pending provider configuration,
hard cost/session controls, and qualified human execution.

**Exit:** the live acceptance record in [`MVP_SPEC.md`](MVP_SPEC.md) is complete. A deterministic
simulator or green CI cannot advance this phase.

## Ordered next work

1. Review and commit Phase 0 only after exact-head gates and code review are clean.
2. Configure an evaluation-only server credential and verify access to the pinned Realtime model.
3. Implement an unbypassable server/provider-side maximum duration and budget reservation. Do not
   invite an external tester before this is demonstrated.
4. Run B7 with the developer and a qualified German reviewer; measure latency, tool behavior,
   interruption, pedagogy, usage, and cost.
5. Decide whether the slice is valuable enough to justify persistence. A failed B7 ends the track
   without database rollback because Phase 0 added no migration.

## Later phases, conditional on B7

### Phase 1 - controlled internal session

- server-authoritative session reservation, hard termination, distributed abuse protection;
- safe observability for latency, usage, and tool failures without transcript/audio logs;
- append-only migrations for owner-scoped session data only after RLS, export, and deletion design;
- two-user isolation, account deletion, backup/restore, and rollback evidence.

### Phase 2 - learning memory

- qualified-reviewer-approved correction taxonomy mapping;
- explicit, versioned integration with mastery and review scheduling;
- idempotent replay and deletion behavior;
- prior-session context without leaking another learner's data.

### Phase 3 - broader product evaluation

- more scenarios and CEFR levels after human content review;
- measured learner research rather than synthetic or developer-only claims;
- accessibility, responsive browser, and operational acceptance;
- native support only if browser demand and safety justify it.

Multi-user rooms, CRDT, avatars, monetization, and store release remain unplanned until earlier
evidence makes them necessary.

## Risks and stop conditions

| Risk                                  | Status | Stop condition                                                                             |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Unbounded provider cost               | High   | No external access until hard termination and budget controls pass.                        |
| Incorrect German teaching             | High   | No pedagogical claim without qualified human review.                                       |
| Browser timer mistaken for security   | High   | Documentation and reviews must treat it only as client cleanup.                            |
| Stale board operations after barge-in | Medium | Reject superseded turns and fail B7 if any late operation lands.                           |
| Separate-origin login confusion       | Medium | Explain that the same account requires an independent first login on the classroom origin. |
| Scope creep into learner persistence  | Medium | Any persistence requires a new append-only migration and security plan; not Phase 0.       |
