# Current State

> This document records what the repository actually contains as of 2026-08-31, assessed against
> the requirements of an AI-native virtual classroom. It is an inventory, not a plan. See
> [`ARCHITECTURE.md`](ARCHITECTURE.md) for the target design and [`ROADMAP.md`](ROADMAP.md) for
> sequencing.

## 1. Evidence discipline

[`docs/definition-of-done.md`](docs/definition-of-done.md) establishes that repository
implementation, local integration, connected staging, real AI, native device, operations, and
real-user evidence are seven distinct layers and that none substitutes for another. That rule
applies unchanged to the classroom work. Nothing in this document claims a layer it has not
reached.

Current position of the existing product, measured rather than asserted:

| Layer             | Status                     | Evidence                                                                                                                                                       |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository + CI   | Solid                      | Format, lint, typecheck, test, API build, bundle smoke, Docker build, Android/Web export, Admin build. Gate F `PASS`.                                          |
| Local integration | Solid                      | Ten credentialed `verify:*:local` scripts; 21 migrations replay clean.                                                                                         |
| Connected staging | Partial                    | Public services are reachable, but `/courses` has also returned `DATABASE_ERROR` during later validation. Credentialed endpoint revalidation remains required. |
| Real AI           | Never executed             | `/health` reports `aiConfigured:false`. No provider key is set in Render. Every AI result in the repository came from `AI_EVALUATION_FAKE_MODE`.               |
| Android device    | Partial unrelated evidence | Listening D1 has limited recorded device evidence, but the release-candidate Gate H matrix remains `BLOCKED`.                                                  |
| Operations        | Not configured             | No monitoring, backups, restore or rollback drill.                                                                                                             |
| Real users        | Not measured               | No reliable product-analytics or adoption dataset is available; absence of measurement is not evidence of zero users.                                          |

The classroom inherits the unvalidated real-AI position. It does not inherit any of the gates as
`PASS`; see §5.

## 2. Directly reusable

These assets require no modification to serve a conversational tutor.

### `error_type` — a 32-value German error taxonomy

Defined as `ERROR_TYPES` in [`packages/shared-types/src/index.ts`](packages/shared-types/src/index.ts)
and mirrored as a PostgreSQL enum in
[`202607130002_phase5_ai_grading.sql`](supabase/migrations/202607130002_phase5_ai_grading.sql):

```
spelling, capitalization, punctuation, article, gender, case, declension,
adjective_ending, verb_conjugation, tense, auxiliary, word_order,
subordinate_clause, preposition, verb_preposition, pronoun, relative_clause,
passive_voice, subjunctive, collocation, word_choice, register, coherence,
cohesion, argumentation, task_completion, style, idiomaticity, redundancy,
ambiguity, pronunciation, fluency
```

It is German-specific rather than generic, already links each error to `grammar_topic_id` and
`vocabulary_id`, carries a four-level `error_severity`, and **already includes `pronunciation` and
`fluency`** — the two categories a speech tutor needs and a writing tool does not. This is the most
valuable single asset in the repository for the classroom.

### `AiEvaluationFeedback`

[`packages/ai-schemas/src/index.ts`](packages/ai-schemas/src/index.ts) defines both a Zod schema and
a strict JSON Schema for:

```
{ isCorrect, score, cefrLevelEstimate, correctedText, errors[],
  strengths, suggestions, naturalAlternative, requiresHumanReview }
```

The tutor emits this shape verbatim as a tool-call payload. No conversation-specific taxonomy is
needed, and corrections from speech become directly comparable with corrections from writing.

### Provider-interface pattern

[`apps/api/src/evaluation/types.ts`](apps/api/src/evaluation/types.ts) and
[`apps/api/src/audio/types.ts`](apps/api/src/audio/types.ts) each define a narrow provider interface
with three implementations: OpenAI, `Deterministic*` (fixtures), and `Unavailable*` (fails fast).
`AI_EVALUATION_FAKE_MODE` swaps the implementation rather than branching inside call sites — a clean
seam. The realtime path should copy this shape and inherit offline development for free.

### Pure packages

| Package                                                             | Size             | Character                                                                                                                                                |
| ------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/learning-engine`](packages/learning-engine/src/index.ts) | 179 lines        | Mastery scoring and review scheduling. No I/O, injectable clock. Importable as-is.                                                                       |
| [`packages/grading`](packages/grading/src/index.ts)                 | 219 lines        | Deterministic fixed-exercise grading over a closed union.                                                                                                |
| [`packages/shared-types`](packages/shared-types/src/index.ts)       | 795 lines        | Types and const arrays only, zero runtime logic.                                                                                                         |
| [`packages/validation`](packages/validation/src/index.ts)           | ~180 Zod schemas | The API contract layer, shared by API, mobile, and admin.                                                                                                |
| [`packages/ui`](packages/ui/src/index.ts)                           | 1 file           | `colorTokens`, `typographyTokens`, `spacingTokens`, `radiusTokens`, `elevationTokens`, `motionTokens` — plain objects, consumable by any React renderer. |

### Learner state tables

`skill_mastery`, `review_queue`, and `lesson_progress` hold per-skill longitudinal state with correct
constraints. `ai_usage_logs` already records `model`, `input_tokens`, `output_tokens`,
`estimated_cost`, `latency_ms`, `success`, and `cached` per call — the cost-accounting spine the
classroom's per-minute billing extends.

## 3. Orphaned scaffolding

[`packages/shared-types/src/index.ts`](packages/shared-types/src/index.ts) already declares:

```ts
export interface ConversationScenario {
  id: string;
  level: CefrLevel;
  scenario: string;
  userRole: string;
  aiRole: string;
  maximumTurns: number;
  correctionStyle: "immediate" | "after_three_turns" | "after_conversation" | "user_requested";
}
export interface ConversationSession {
  id: string;
  userId: string;
  scenarioId: string;
  status: "active" | "completed" | "cancelled";
  startedAt: string;
}
```

[`packages/validation/src/index.ts`](packages/validation/src/index.ts) adds
`createConversationRequestSchema` and `sendConversationMessageRequestSchema`.

There is **no table, no migration, no API route, and no turn or message type**. The conversational
tutor was designed to the type level and then abandoned. `correctionStyle` in particular encodes a
real pedagogical decision that should be honored rather than re-litigated. Build on these
declarations; do not introduce parallel ones.

## 4. What blocks a conversational tutor

| Blocker                                                                              | Detail                                                                                                                                                                                                                                           | Disposition                                                                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| No conversation storage of any kind                                                  | No `create table` across all 23 migrations matches conversation, session, transcript, utterance, or turn.                                                                                                                                        | New sibling tables — see [`ARCHITECTURE.md`](ARCHITECTURE.md) §4                                                                       |
| `attempts.exercise_id` and `.lesson_id` are `NOT NULL` with FKs to published content | Free conversation has neither.                                                                                                                                                                                                                   | Do not loosen. Parallel `tutor_*` tables.                                                                                              |
| `error_records` is `unique (attempt_id, skill_id)`                                   | A single spoken utterance routinely contains several distinct error types against one skill. The constraint cannot hold for speech.                                                                                                              | Do not loosen. `tutor_corrections` carries no such constraint.                                                                         |
| CEFR level never updates from evidence                                               | `user_levels.current_level` is self-declared at onboarding. `placement_status` is hardcoded `'not_started'`; nothing writes `placement_result_json`; `attempt_mode = 'placement'` is produced by nothing. The placement system is a schema stub. | Activate the stubs via `cefr_level_evidence`                                                                                           |
| Mastery formula exists twice                                                         | Once in TypeScript (`learning-engine`), once in PL/pgSQL (`record_fixed_attempt`, `202607130001`). A naive tutor path would make a third copy.                                                                                                   | Tutor path calls the TypeScript engine; treat the SQL copy as legacy for the exercise path                                             |
| Knowledge base is a demo fixture                                                     | 50 vocabulary rows, 10 grammar topics, 28 skills in `supabase/seed.sql`.                                                                                                                                                                         | Acceptable for conversation, which is less content-bound than exercises. Revisit if the tutor visibly repeats itself.                  |
| Audio pipeline is batch, not live                                                    | `audio.speech.create` returns complete WAV bytes into Supabase Storage; `audio.transcriptions.create` is upload-then-process with `whisper-1`. Multi-second round trip.                                                                          | Correct for homework, unusable for conversation. Keep both paths; they serve different jobs.                                           |
| No realtime anything                                                                 | `WebSocket`, `EventSource`, `text/event-stream`, and `realtime` return zero hits across `apps/api/src`, `apps/mobile/src`, and `apps/admin/src`. Supabase Realtime is bundled but unused.                                                        | The classroom needs none of it — see [`ARCHITECTURE.md`](ARCHITECTURE.md) §2                                                           |
| API auth costs a network round trip per request                                      | `auth.getUser(accessToken)` is duplicated across seven repositories, each constructing its own service-role Supabase client, followed by a second query to `profiles`.                                                                           | A latency problem, not a blocker at pilot scale. Extract one shared helper when adding classroom routes; defer local JWT verification. |
| Expo/React-Native-Web cannot host a whiteboard                                       | The only graphics dependency is `react-native-svg`. There is no `<canvas>`, no WebGL, no Skia, no `three`. Every whiteboard library — Excalidraw, tldraw, Fabric, Konva — is DOM-only.                                                           | New `apps/classroom` React web app; the Expo app is left untouched.                                                                    |

### On the client decision

The learner app is already a web app in every material sense: Render deploys it as `runtime: static`
with an SPA rewrite, and the entire codebase contains one `.native.ts` file and four `Platform.OS`
branches. The React Native abstraction is currently buying very little. It is nonetheless retained,
because `apps/mobile/app/` holds 24 route files of working learning features and the project has
shipped native build numbers. Rewriting those to reach a whiteboard would be a large diff that ships
no learning value.

The decision recorded on 2026-08-31 is therefore: **build the classroom as a separate surface, keep
the existing app.** If the classroom succeeds, screens migrate gradually. If it does not, one app is
discarded rather than the product.

## 5. Gate position for the classroom

The classroom does not inherit any A–J gate from the existing product. Its gates start `BLOCKED` and
move only on their own evidence. In particular:

- Gate C (content quality) does not cover tutor output. Conversational pedagogical quality is
  unevidenced and requires the same qualified German reviewer already identified as blocking.
- Gate G (connected deployment) requires real AI with fake mode disabled. Real AI has never run in
  this project at all, so the classroom's first real conversation is also the project's first real
  provider call.
- Gate I (operability) gains a new obligation the existing product does not have: per-minute cost
  control. See [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.

Do not widen the existing gates to absorb the classroom. Two products, two evidence sets.
