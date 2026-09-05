# Virtual Classroom Phase 0 MVP Specification

## Claim under test

A learner can say a German sentence, hear a German correction, and see the correction applied to a
shared whiteboard in the same turn. Repository tests can verify the contract and reducer; only a
real provider session observed by a qualified human can verify this product claim.

## Fixed milestone

The learner says:

> Ich gehe gestern in die Schule.

The tutor should speak German first, then apply these board operations:

1. `write_line`: write the original sentence.
2. `highlight_span`: highlight `gehe`.
3. `annotate`: add the short Traditional Chinese note `gestern → 過去式`.
4. `replace_text`: replace it with `Ich bin gestern in die Schule gegangen.`
5. `annotate`: add `bin + gegangen → Perfekt`.

The first four operation types are the protocol contract; the second annotation is another valid
`annotate` operation. The prompt must not issue a CEFR certificate or an unvalidated pronunciation
score.

## Phase 0 boundaries

- One developer-controlled, email-verified learner profile in an explicit server allowlist.
- Maximum five minutes in the browser UI.
- No persistence, transcript, audio upload, mastery, review, attempt, migration, or public access.
- No fake mode or deterministic simulator may be presented as a real conversation.
- No external tester before an unbypassable server/provider-side session cutoff and budget control
  are proven.

## Backlog and evidence

| ID  | Deliverable                                                         | Repository-local completion         | Live completion                                                                 |
| --- | ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| B1  | Vite/React classroom shell, Supabase login, verified learner UI     | Build, typecheck, auth/config tests | Independent classroom-origin login works                                        |
| B2  | Authenticated SDP API, allowlist, safe config/error/health boundary | API tests and bundle checks         | Deployed API establishes a provider call                                        |
| B3  | Browser microphone, WebRTC, audio, timer, and resource shutdown     | Client tests and browser build      | Real bidirectional audio and safe stop                                          |
| B4  | Excalidraw adapter and pure board reducer                           | Deterministic reducer tests         | Operations visibly land on the live board                                       |
| B5  | Versioned tool schema, idempotency, superseded-turn handling        | Zod and reducer tests               | Barge-in cancels stale live operations                                          |
| B6  | Versioned German tutor prompt and fixed tools                       | Prompt/config review and tests      | Human confirms correct German pedagogy                                          |
| B7  | Complete milestone                                                  | Not satisfiable by tests            | Human run: German audio, board operations, barge-in, under-2-second first audio |

B1-B6 can be `PASS` only for repository implementation on the exact tested working tree. B7 remains
`BLOCKED` without a safe provider configuration and human execution.

## Live acceptance record

A future B7 record must include:

- exact Git commit and deployment/build identifiers;
- provider/model snapshot and fake mode disabled, without recording credentials;
- authenticated learner eligibility and classroom allowlist outcome;
- microphone allowed/denied behavior and cleanup after stop;
- time to first audio, measured from completed learner turn to first audible provider audio;
- German response and pedagogical correctness assessed by a qualified reviewer;
- all board operations in order and visible while the tutor speaks;
- successful barge-in with no late operation from the superseded turn;
- measured provider usage/cost metadata and proof of the hard termination/budget control.

Automated success, the deterministic milestone simulator, a generated bundle, or a WebRTC object
created in a test does not satisfy this record.

## Explicit non-goals

Persistence, migrations, learning-engine integration, public quotas, multi-user rooms, CRDT sync,
native Android classroom, conversation history, avatar, pronunciation scoring, monetization, and
public deployment are outside Phase 0.
