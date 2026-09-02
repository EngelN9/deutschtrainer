# Classroom Architecture

> This document defines the target architecture for the AI-native virtual classroom. It covers the
> classroom surface only; [`docs/architecture.md`](docs/architecture.md) remains authoritative for
> the existing learner app, Admin console, and API. Read
> [`CURRENT_STATE.md`](CURRENT_STATE.md) first for what already exists.

## 1. Interaction model

```
Student ⇄ AI Tutor ⇄ Voice ⇄ Whiteboard ⇄ Learning memory
```

One student, one tutor, one shared board, one persistent record of what the student got wrong and
when. Everything below serves that sentence.

## 2. The MVP requires no new server infrastructure

Two conventional components are deliberately absent. This section exists so the omissions are
understood as decisions rather than gaps, and are not "corrected" later by someone adding
infrastructure the design does not need.

### No media server, SFU, or WebRTC gateway

The browser establishes a WebRTC connection **directly to the OpenAI Realtime API**. The API's only
involvement is minting an ephemeral client secret server-side via
`POST /v1/realtime/client_secrets`, so the provider key never reaches the browser.

A selective forwarding unit exists to fan one participant's audio out to N others. Here N = 1: the
tutor is the far end of a point-to-point connection, not a peer in a room. LiveKit, Daily, or a
self-hosted SFU would add a hop, a cost, and an operational surface to solve a problem that does not
occur.

Consequences worth stating: learner audio never transits our infrastructure, so there is no media
bandwidth cost, no added latency, and no voice data passing through Render.

This changes at genuine multi-party co-presence — a second human in the room. That is Phase 4, not
now.

### No CRDT

A single browser owns the canvas. The tutor's edits arrive as **tool calls over the WebRTC data
channel** and are applied to that same local scene. There is no second writer, therefore nothing to
converge. Yjs, Liveblocks, and PartyKit all solve concurrent-writer convergence.

Persistence is a debounced snapshot of the scene JSON posted to the API — a write, not a sync.

This changes when one student's board must be live on two devices at once, or when a second human
joins. Both are Phase 4.

### Resulting shape

The API remains a stateless request/response service, unchanged in kind, and gains three routes.
No WebSocket server, no room registry, no shared in-memory state, no Redis. The deployment topology
in [`render.yaml`](render.yaml) grows by one static site.

```
Browser — apps/classroom (Vite + React 19, static)
 │
 ├─ getUserMedia ⇄ WebRTC ⇄ OpenAI Realtime (gpt-realtime-mini)
 │    ├─ audio      : bidirectional, native barge-in
 │    ├─ data ch. IN : tool calls → whiteboard ops, corrections, expression
 │    └─ data ch. OUT: transcript deltas, turn boundaries
 │
 ├─ Excalidraw canvas — local scene, mutated via updateScene()
 │
 └─ fetch ⇄ DeutschTrainer API (existing Node handler)
      POST /classroom/sessions             authorize · reserve minutes · mint token
      POST /classroom/sessions/:id/events  persist turns + board snapshot (debounced)
      POST /classroom/sessions/:id/end     reconcile usage · analyse · roll up mastery
```

## 3. The whiteboard protocol is the tool schema

The Realtime API supports function calling during a live voice session. That mechanism _is_ the
whiteboard protocol — there is no separate channel and no separate command language.

| Tool                                                     | Purpose                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `write_line(textDe, textZhTw?)`                          | Place a sentence on the board                                            |
| `highlight_span(elementId, from, to, color, labelZhTw?)` | Mark a token — e.g. `gehe`                                               |
| `annotate(targetElementId, textZhTw, position)`          | Attach an explanation — e.g. `gestern → 過去式`                          |
| `replace_text(elementId, newTextDe)`                     | Substitute the corrected sentence                                        |
| `add_card(kind, payload)`                                | Add a movable vocabulary, grammar, or correction object                  |
| `record_correction(errors)`                              | Emit structured errors — **payload is `AiEvaluationFeedback["errors"]`** |
| `set_expression(state)`                                  | Drive avatar expression                                                  |

`record_correction` is the load-bearing reuse. The tutor emits the existing 32-value taxonomy
described in [`CURRENT_STATE.md`](CURRENT_STATE.md) §2, so a mistake made aloud and the same mistake
made in a writing exercise land in one comparable store, keyed to the same `grammar_topic_id`.

### Ordering discipline

**Speak first, draw second.** If the model must complete a tool call before emitting audio, turn
latency rises visibly and the conversation stops feeling live. The system prompt must establish that
the tutor responds by voice immediately and annotates during or after speaking.

### Barge-in consistency

The student can interrupt mid-annotation. Whiteboard operations are therefore idempotent and
addressed by element id, never by "the last element". Operations belonging to a superseded turn are
discarded rather than applied late.

## 4. Learner memory

### Principle: add siblings, do not loosen what works

`error_records` and `attempts` carry `NOT NULL` foreign keys to published content and a
`unique (attempt_id, skill_id)` constraint. Those constraints are correct for the exercise path and
are actively enforcing integrity there. Relaxing them to accommodate free conversation would weaken
a working system to serve a new one.

Instead, the classroom gets parallel tables sharing the same enums, added by append-only migrations
per repository rules.

| Table                  | Contents                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tutor_sessions`       | `user_id`, `scenario_id?`, `level`, `status`, `started_at`, `ended_at`, `planned_minutes`, `consumed_seconds`, `model`, `estimated_cost`                         |
| `tutor_turns`          | `session_id`, `seq`, `role (learner\|tutor)`, `transcript_de`, `started_at_ms`, `duration_ms`, `audio_path?`                                                     |
| `tutor_corrections`    | Per-**turn** error log. Same `error_type` / `error_severity` enums; nullable `skill_id`, `grammar_topic_id`, `vocabulary_id`; **no** unique-per-skill constraint |
| `whiteboard_snapshots` | `session_id`, `seq`, `scene_json`, `created_at`                                                                                                                  |
| `cefr_level_evidence`  | Per-session level estimate, accumulated rather than applied                                                                                                      |

All follow the repository's existing security posture: RLS enabled, privileges revoked from `anon`
and `authenticated`, service-role writes only, `security definer` functions with fixed
`search_path`. See [`docs/security.md`](docs/security.md).

### Mastery rollup

`tutor_corrections` folds into `skill_mastery` through the **existing**
[`packages/learning-engine`](packages/learning-engine/src/index.ts) functions. This is also the point
at which the duplicated mastery formula is addressed: the tutor path calls the TypeScript engine,
and the PL/pgSQL copy in `record_fixed_attempt` is treated as legacy serving the exercise path only.
A third implementation must not be written.

### CEFR level

The tutor already produces `cefrLevelEstimate` as part of `AiEvaluationFeedback`. Write it to
`cefr_level_evidence`; move `user_levels.current_level` only after N consistent signals. A single
session must never overwrite a learner's level. This activates `placement_status` and
`placement_result_json`, which currently exist but are written by nothing.

## 5. Cost control

Real-time voice is billed per minute, and this obligation is new: the existing `AiQuotaGate` in
[`apps/api/src/ai-quota/supabaseAiQuotaGate.ts`](apps/api/src/ai-quota/supabaseAiQuotaGate.ts)
reserves per _request_. It needs a sibling method, not a rewrite:

```
reserveSessionMinutes(userId, minutes)   → reserve up front
                                         → reconcile actual usage on /end
```

Because a client that crashes or never calls `/end` must not be able to run indefinitely, control is
layered:

1. **Ephemeral token minted with a maximum session duration** — enforced by OpenAI, survives any
   client failure
2. **Per-session cap** — 25 minutes
3. **Per-user weekly budget** — approximately 100 minutes
4. **Global monthly minute ceiling** — kill switch
5. The existing `AI_GLOBAL_DAILY_PROVIDER_CALL_LIMIT` continues to apply

Layer 1 is the only one that holds when the client misbehaves. It is not optional.

### Budget arithmetic

At `gpt-realtime-mini` rates of roughly USD $0.02–0.05 per minute, a $50 monthly ceiling is
approximately **1,400 minutes ≈ 23 hours ≈ 56 lessons of 25 minutes**. That supports the developer
and a small number of testers. It does not support a cohort.

These figures are third-party measurements of other people's agents. The number that governs is the
first real session's row in `ai_usage_logs`, checked against the provider dashboard. Every control
above depends on that recorded cost being true.

## 6. Avatar

MVP ships **audio-reactive presence**, not a rigged character: an SVG or CSS figure whose mouth is
driven by an `AnalyserNode` attached to the WebRTC output stream, with three or four expression
states set by `set_expression`. Approximately 100 lines.

Phase 3 upgrades to VRM via `@pixiv/three-vrm` (MIT, Three.js). Live2D Cubism is rejected for this
stage: its Web SDK requires a Publication License Agreement above a small-business exemption
threshold, and taking a licensing dependency on the least-validated part of the vision is a poor
trade.

## 7. Technology choices

| Choice                                                     | Reason                                                                                                                                                                                                                  | Rejected                                                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`apps/classroom`, Vite + React 19**                      | The whiteboard ecosystem is DOM-only and React Native Web exposes no canvas primitive. Deploys as a static Render site, so no cold start. Shares `packages/{validation,shared-types,ui}` and the same Supabase session. | Expo (no canvas; two WebRTC implementations); Next.js (no SSR requirement for an authenticated app shell)                            |
| **OpenAI Realtime, WebRTC transport, `gpt-realtime-mini`** | Browser-direct, tool calling mid-session, native barge-in. Mini is roughly one-third the flagship cost, which is decisive at a $50 ceiling.                                                                             | Cascaded Whisper → LLM → TTS: materially cheaper but 1.5–3 s turn latency, which destroys the single property the MVP exists to test |
| **Excalidraw (MIT)**                                       | `updateScene`, `onChange`, and `convertToExcalidrawElements` are sufficient to write, highlight, annotate, and replace. Free, self-hostable, no licence risk.                                                           | tldraw: better SDK, but source-available and USD $6,000/year for commercial use                                                      |
| **No media server**                                        | N = 1 human per session                                                                                                                                                                                                 | LiveKit, Daily                                                                                                                       |
| **No CRDT**                                                | One writer                                                                                                                                                                                                              | Yjs, Liveblocks, PartyKit                                                                                                            |
| **Reuse `AiEvaluationFeedback` and the 32-value taxonomy** | Already German-specific; already covers `pronunciation` and `fluency`                                                                                                                                                   | A conversation-specific taxonomy                                                                                                     |
| **Retain `auth.getUser()` for now**                        | Works. A latency problem, not a correctness one, at pilot scale.                                                                                                                                                        | The `jose` local-verification refactor — worth doing, but not before it hurts                                                        |

## 8. Security and privacy

- The provider key is server-only and never reaches the browser; the client receives an ephemeral
  secret with a bounded lifetime and a maximum session duration.
- Learner audio streams browser-to-provider and is not persisted by default. Storing session audio
  is a separate decision requiring a retention period, an export path, and inclusion in the existing
  account-deletion flow before it is enabled.
- Transcripts are learner content. They fall under the existing account export and deletion
  guarantees in [`docs/security.md`](docs/security.md) and must be covered by the same two-user
  isolation tests before any external tester uses the classroom.
- New tables follow the established posture: RLS on, client privileges revoked, service-role writes,
  fixed `search_path` on `security definer` functions.
- WebSocket upgrades bypass CORS. This matters only if a WebSocket is ever added; the current design
  has none.

## 9. Observability

The existing per-request JSON log line and request-id propagation in
[`apps/api/src/observability.ts`](apps/api/src/observability.ts) carry over unchanged. The classroom
adds three measurements that the existing product has no equivalent for:

- **Time to first audio** per turn — the property the MVP is testing; measure it from the first
  milestone onward, not after
- **Tool-call latency and failure rate** — a dropped whiteboard operation is a silent pedagogical
  failure
- **Consumed minutes versus reserved minutes** — reconciliation drift is the early warning for a
  cost problem

Transcripts, audio, and learner text must not enter logs, consistent with the existing rule.
