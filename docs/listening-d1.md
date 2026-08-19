# Listening D1 — Minimum Deterministic Listening Exercise

## Status and product boundary

Listening D1 adds one small, complete listening journey to the learner App:

```text
open listening training
→ choose the fixed exercise
→ play/replay prerecorded audio
→ answer four fixed questions
→ submit
→ see a deterministic score, explanations, and transcript
```

The exercise is primarily B1 and is also available to B2 learners as a foundation review. It is a
public sample exercise: its audio, transcript, questions, and answer key are bundled with the App.
It does not write an official attempt, mastery change, review item, error record, or analytics event.
The existing authenticated listening workspace and its protected server-side transcript/answer
boundary remain unchanged.

## Current capability

### Writing

The existing Writing journey remains the primary output path: first draft, up to three focused
issues, immutable rewrite, and first/latest comparison. Listening D1 does not replace or redesign
that flow.

### Listening D1

- One 66-second human-spoken German news recording stored under `apps/mobile/assets/audio/`.
- Four pre-listening vocabulary supports keep the dense news register usable as a scaffolded B1
  exercise; B2 learners may use it as a foundation review.
- Four fixed multiple-choice questions covering the main idea, key information, and details.
- Zod-validated content and submissions.
- Deterministic per-question scoring with no AI provider, TTS, STT, or network dependency.
- The same fixed journey is available in Demo and connected sessions.
- Demo navigation exposes exactly Home, Courses, Listening, and Review; its Listening entry contains
  this fixed sample without enabling the authenticated listening/speaking workspace.
- Mobile-first answer controls, play/pause/replay, 1×/0.75× playback, accessible labels, result
  summary, explanations, and transcript.

The static sample is separate from the older connected listening/dictation path, which still uses
authenticated API endpoints, protected content, and provider-backed TTS. A Demo session does not
call those authenticated endpoints.

The EAS `preview` profile is offline-only and does not offer connected account forms. The EAS
`staging` profile is connected-only and does not offer Demo. Both internal APK profiles use the same
package identifier and are installed one at a time.

## Audio source and license

The bundled file is Wikimedia Commons' MP3 transcode of “365-Euro-Ticket für den Nahverkehr”,
spoken by Emil Linus Albrecht for German Wikinews.

- Source and attribution: <https://commons.wikimedia.org/wiki/File:DE-365-Euro-Ticket_f%C3%BCr_den_Nahverkehr.flac>
- Published transcript: <https://de.wikinews.org/wiki/365-Euro-Ticket_f%C3%BCr_den_Nahverkehr>
- License: [Creative Commons Attribution 2.5](https://creativecommons.org/licenses/by/2.5/)
- Audio modification: none

Repository attribution is also stored beside the asset in `apps/mobile/assets/audio/README.md`.

## Validation boundary

Automated tests cover schema validity, B1/B2 selection, all-correct scoring, partial credit,
invalid submissions, duplicate vocabulary rejection, and deterministic replay. Mobile typecheck
and Web/Android exports verify the bundle contract when run.

The following still require separate evidence before public-release claims:

- qualified human confirmation of the CEFR level and Traditional Chinese teaching explanations;
- browser validation at approximately 390 × 844, including actual audio playback;
- Android physical-device playback, pause, replay, slow speed, accessibility, and installation;
- connected staging and remote security checks for the older protected listening path.

Until a German B2+ human reviewer signs the language, transcript, CEFR, question, and explanation
checklist, the human-content gate remains `BLOCKED` even when automated tests pass.

## Not yet implemented

### Listening D2 — Focused Feedback + Retry

D2 may later add first-attempt insights, a second listening/answer attempt, and first-versus-second
comparison. D1 does not contain a feedback engine, attempt comparison, AI analysis, or a generic
attempt-history platform.

### Conversation roadmap (documentation only)

- E1: a small set of bounded text missions with roles, learner goals, required communicative acts,
  maximum turns, completion conditions, and a feedback rubric.
- E2: focused feedback, retry, and improvement comparison.
- E3: push-to-talk STT while keeping the conversation engine unchanged.
- E4: TTS voice responses.
- E5: realtime voice only if real user evidence justifies it.

No Conversation API, table, voice provider, realtime infrastructure, or UI is implemented by D1.

## Stable stop point

If Listening development stops after D1, the repository still contains a maintainable public sample
that can be opened, heard, answered, and scored without AI. It is not a complete listening
curriculum and does not claim production readiness for the connected or native audio systems.
