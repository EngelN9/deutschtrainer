# MVP Specification

> The classroom MVP proves one claim: **a student can talk naturally with an AI German tutor while
> both manipulate the same whiteboard in real time.** Everything not required by that sentence is
> out of scope. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design and
> [`ROADMAP.md`](ROADMAP.md) for what comes after.

## 1. First milestone — "One sentence, corrected on the board"

Deliberately hard-coded wherever hard-coding is possible. One scenario, one developer account, a
five-minute session cap, no persistence.

The student says aloud:

> „Ich gehe gestern in die Schule."

In one continuous exchange the tutor:

1. Replies **by voice in German**, naming the mistake
2. `write_line` — the sentence appears on the board
3. `highlight_span` — `gehe` is marked
4. `annotate` — `gestern → 過去式` appears beside it
5. `replace_text` — the board now reads „Ich bin gestern in die Schule gegangen."
6. `annotate` — `bin + gegangen → Perfekt`

### Acceptance

| Criterion               | Threshold                                                           |
| ----------------------- | ------------------------------------------------------------------- |
| Time to first audio     | Under 2 seconds                                                     |
| Reply language          | German, spoken                                                      |
| Pedagogical correctness | The tense error is identified correctly and the correction is right |
| Board operations landed | All four, in order, visible while the tutor speaks                  |
| Interruption            | Student can speak over the tutor and the tutor yields               |

The milestone passes when a person who speaks German does this once and it feels like being taught.
It does not pass on a green test run.

### Explicitly out of scope for this milestone

Persistence, minute budgeting, authentication polish, the avatar, mastery updates, CEFR estimation,
lesson planning, multi-user, homework integration, and every A–J gate.

## 2. MVP scope beyond the first milestone

The MVP is complete when the milestone runs inside a real session loop:

- **Authenticated sessions.** Existing Supabase session, reused by the classroom app. Learner role
  and verified email required, matching `assertEligible` on the existing quota gate.
- **Minute budget enforced end to end.** All five layers in [`ARCHITECTURE.md`](ARCHITECTURE.md) §5,
  including the maximum session duration on the ephemeral token.
- **Transcript and board persistence.** `tutor_sessions`, `tutor_turns`, `whiteboard_snapshots`.
- **Structured corrections stored.** `record_correction` writes `tutor_corrections` using the
  existing `AiEvaluationFeedback["errors"]` shape.
- **Session summary.** What was practised, what was corrected, board snapshot retained.
- **Real cost visible.** Consumed minutes and `estimated_cost` per session, reconciled against the
  provider dashboard.

## 3. Tool schema

The whiteboard protocol. Names and payloads are the contract between the system prompt and the
canvas adapter, and both sides must be versioned together.

```ts
write_line     ({ textDe: string; textZhTw?: string })
highlight_span ({ elementId: string; from: number; to: number;
                  color: "warn" | "error" | "focus"; labelZhTw?: string })
annotate       ({ targetElementId: string; textZhTw: string;
                  position: "above" | "below" | "right" })
replace_text   ({ elementId: string; newTextDe: string })
add_card       ({ kind: "vocab" | "grammar" | "correction"; payload: unknown })
record_correction ({ errors: AiEvaluationFeedback["errors"] })
set_expression ({ state: "neutral" | "thinking" | "encouraging" | "concerned" })
```

Constraints:

- Every operation is **idempotent** and addressed by `elementId`, never by position or recency.
- Operations belonging to a superseded turn are discarded, not applied late.
- `record_correction` reuses the existing 32-value `error_type` enum. It must not introduce new
  error categories; if a category is genuinely missing, add it to `ERROR_TYPES` and the PostgreSQL
  enum together.

## 4. Session limits

| Limit                    | Value                                          | Enforced by                     |
| ------------------------ | ---------------------------------------------- | ------------------------------- |
| Maximum session duration | 25 minutes                                     | Ephemeral token (provider-side) |
| Per-user weekly budget   | ~100 minutes                                   | `reserveSessionMinutes`         |
| Global monthly ceiling   | Set from the $50 budget                        | Kill switch                     |
| Provider daily call cap  | Existing `AI_GLOBAL_DAILY_PROVIDER_CALL_LIMIT` | Existing quota gate             |

The token-level cap is the only one that holds when the client crashes or never calls `/end`. It is
not optional and must land before any external tester uses the classroom.

## 5. Non-goals

Deliberately absent from the MVP, with the condition that would change each:

| Not building                              | Revisit when                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| VTuber avatar (rigged, VRM)               | The audio-reactive placeholder proves presence matters                        |
| Multi-device or multi-user board sync     | A real need for two live clients exists — this is when Yjs enters             |
| Lesson planning and curriculum sequencing | The single-session experience is proven good                                  |
| Pronunciation scoring                     | Phase 3; the existing `whisper-1` word-timing path can serve this out-of-band |
| Homework integration with the Expo app    | The classroom retains a user across two sessions                              |
| Any monetization                          | Explicitly on hold                                                            |
| Native mobile classroom                   | Web works and demand is proven                                                |
| A conversation-specific error taxonomy    | The existing 32 values prove insufficient in practice                         |

## 6. What the MVP does not prove

Stated plainly so it is not overclaimed later:

- **Pedagogical quality.** Whether the tutor teaches German _well_ is unevidenced until a qualified
  German reviewer assesses real sessions. This is the same reviewer already blocking Gate C, and it
  is now blocking twice.
- **Retention or demand.** One person enjoying a demo is not a signal about learners.
- **Cost at scale.** The budget arithmetic uses third-party per-minute measurements. Only real
  `ai_usage_logs` rows settle it.
- **Any A–J gate.** The classroom's gates start `BLOCKED` and move only on their own evidence. See
  [`CURRENT_STATE.md`](CURRENT_STATE.md) §5.

## 7. Verification

The milestone is verified by conducting a German lesson, not by running a suite.

1. `pnpm --filter @deutschtrainer/classroom dev`; open the app; grant microphone access.
2. Speak the sentence. Confirm the audio reply is German and pedagogically correct, all four board
   operations land, and time to first audio is under two seconds.
3. Interrupt the tutor mid-sentence. Confirm it yields and no stale board operation is applied.
4. Compare the provider dashboard against `ai_usage_logs`. **The recorded cost must match reality** —
   every budget control depends on that number being true.
5. Once persistence and budgeting land: run two sessions, confirm the second session's context
   contains errors from the first, and confirm an exhausted budget refuses a new session.

Automated coverage is intentionally thin at this stage and targets exactly two things:

- The tool-call → Excalidraw operation mapping — a pure function, cheaply and usefully tested.
- `reserveSessionMinutes` — it governs money, so it gets a test.

The conversation itself is validated by a human who speaks German. There is no substitute, and
asserting that a test suite covers it would repeat precisely the fake-mode error the repository
already documents in [`docs/definition-of-done.md`](docs/definition-of-done.md).
