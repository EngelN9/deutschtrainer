# Classroom Roadmap

> Phases, entry and exit criteria, and the ordered implementation backlog. Read
> [`MVP_SPEC.md`](MVP_SPEC.md) for what Phase 0 delivers and
> [`ARCHITECTURE.md`](ARCHITECTURE.md) for why the design is shaped this way.

## Status of prior plans

The 2026-08-30 validation plan is **on hold** at the user's direction: the paywall, plan column,
manual payment grants, and price test are parked, not cancelled. Three items from it survive and
become more urgent here rather than less:

1. **The qualified German reviewer.** Now blocking twice — Gate C for content, and pedagogical
   quality for the tutor.
2. **Real-AI validation.** The classroom's first real conversation is also this project's first real
   provider call.
3. **Hard cost control.** Profit on hold means the developer is spending their own money, and
   real-time voice bills per minute.

## Phases

### Phase 0 — Vertical slice

**Goal.** Prove voice and whiteboard work together in one exchange.

**Entry.** None. This is the starting point.

**Exit.** The first milestone in [`MVP_SPEC.md`](MVP_SPEC.md) §1 runs end to end: a spoken German
error is corrected aloud and on the board in one turn, under two seconds to first audio.

**Backlog.** B1 – B7.

### Phase 1 — Real session loop

**Goal.** Turn the slice into something a person can actually use for a lesson.

**Entry.** Phase 0 exit.

**Exit.** A real 25-minute German lesson can be conducted and is stored: authenticated session,
minute budget enforced at all five layers, transcript and board persisted, session summary produced,
and real cost visible and reconciled against the provider dashboard.

**Backlog.** B8 – B13.

**Gate.** Do not let an external tester near the classroom before B10 lands. The token-level
duration cap is the only control that survives a client crash.

### Phase 2 — Learner memory closes the loop

**Goal.** Make the tutor remember. This is the difference between a voice demo and a tutor.

**Entry.** Phase 1 exit.

**Exit.** Session two demonstrably knows what session one got wrong: `tutor_corrections` roll into
`skill_mastery` through the existing engine, CEFR evidence accumulates, and prior weaknesses appear
in the session prompt.

**Backlog.** B14 – B16.

### Phase 3 — Presence and pedagogy

**Goal.** Make it feel like a tutor rather than a voice bot.

**Entry.** Phase 2 exit, **and** a qualified German reviewer has assessed real session transcripts.
Do not invest in presence before knowing the teaching is good.

**Exit.** VRM avatar with lip-sync and expression; lesson planning driven by mastery gaps;
pronunciation feedback reusing the existing `whisper-1` word-timing path out-of-band.

### Phase 4 — Only if Phases 0–3 hold

Multi-device and multi-user board sync — **this is where Yjs enters, and not before**. Homework
integration with the existing Expo learner app. The parked monetization track resumes here if it
resumes at all.

## Ordered backlog

Dependencies are hard: a task cannot start before the tasks it lists.

| #      | Task                                                                                                                    | Depends on | Size |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ---------- | ---- |
| **B1** | `apps/classroom` scaffold — Vite + React 19, Supabase session reuse, `packages/ui` tokens, Render static service        | —          | S    |
| **B2** | `POST /classroom/sessions` mints an OpenAI ephemeral token; request and response schemas added to `packages/validation` | —          | S    |
| **B3** | Browser WebRTC connect, microphone capture, audio playback. Talk to the tutor in German; no whiteboard yet              | B1, B2     | M    |
| **B4** | Excalidraw mounted; `updateScene` driven by a hand-fired local test operation                                           | B1         | S    |
| **B5** | Tool schema defined; `write_line` / `highlight_span` / `annotate` / `replace_text` wired from data channel to canvas    | B3, B4     | M    |
| **B6** | German tutor system prompt in `packages/ai-prompts`, versioned to match existing prompt conventions                     | B5         | M    |
| **B7** | **Phase 0 gate — the milestone runs end to end**                                                                        | B6         | —    |
| B8     | Migrations: `tutor_sessions`, `tutor_turns`, `tutor_corrections`, `whiteboard_snapshots`                                | B7         | M    |
| B9     | `POST /classroom/sessions/:id/events` and `/end`; transcript and board snapshot persistence                             | B8         | M    |
| B10    | `reserveSessionMinutes` on the quota gate, max-duration ephemeral token, global kill switch                             | B2, B8     | M    |
| B11    | `record_correction` tool → `tutor_corrections`, reusing `AiEvaluationFeedback["errors"]`                                | B5, B8     | S    |
| B12    | Real-cost readout from `ai_usage_logs` for realtime minutes                                                             | B9         | S    |
| B13    | Audio-reactive avatar placeholder and `set_expression`                                                                  | B5         | S    |
| B14    | Mastery rollup `tutor_corrections` → `skill_mastery` via `packages/learning-engine`                                     | B11        | M    |
| B15    | Prior-weakness context injected into the session prompt                                                                 | B14        | M    |
| B16    | `cefr_level_evidence` and N-signal level movement                                                                       | B14        | M    |

## Risks

| Risk                                         | Severity | Mitigation                                                                                                                         |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Tutor pedagogical quality is unvalidated** | High     | The German reviewer. This blocks knowing whether any of the rest is worth building.                                                |
| **Cost overrun**                             | High     | The five-layer chain in [`ARCHITECTURE.md`](ARCHITECTURE.md) §5. B10 is not deferrable past the first external tester.             |
| Tool-call latency degrading conversation     | Medium   | Speak-first-draw-second prompt discipline; measure time to first audio from B7 onward                                              |
| Barge-in versus board consistency            | Medium   | Idempotent, element-id-addressed operations; discard operations from superseded turns                                              |
| Knowledge base too thin to ground a tutor    | Medium   | 50 words and 10 grammar topics. Conversation is less content-bound than exercises; expand only if the tutor visibly repeats itself |
| Render free-tier API cold start              | Low      | The classroom is a static site with no cold start; only session creation touches the API. Move to a paid plan when testers arrive. |
| Two products under one Definition of Done    | Medium   | Do not widen the existing A–J gates. The classroom gets its own, starting `BLOCKED`.                                               |

## What is deliberately not being built

Restated from [`MVP_SPEC.md`](MVP_SPEC.md) §5 because scope creep here is the main delivery risk:

- Rigged VTuber avatar — until the placeholder proves presence matters
- Multi-user or multi-device sync, and therefore Yjs — until two live clients are genuinely needed
- Lesson planning and curriculum sequencing — until one session is proven good
- Pronunciation scoring — Phase 3
- Homework integration — until the classroom retains a user across two sessions
- Any monetization — on hold
- A native mobile classroom — web works
- A conversation-specific error taxonomy — the existing 32 values have not been shown insufficient
- Additional languages — unchanged from prior decisions
