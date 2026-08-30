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
- Mobile-first answer controls, play/pause/replay, 1×/0.75× playback, accessible labels, result
  summary, explanations, and transcript.
- The exercise sits above the connected listening/speaking workspace on `/audio-training` and does
  not wait on it. The workspace query can be slow or fail — the free-tier API sleeps — without
  hiding the one exercise that needs no server.
- Selecting C1 or C2 hides the D1 section and leaves the connected workspace intact.

The static sample is separate from the older connected listening/dictation path, which still uses
authenticated API endpoints, protected content, and provider-backed TTS. That path is the reason
the `聽說` tab is currently a dead end on the public preview: the Blueprint ships
`AI_PUBLIC_ENABLED=false` with no `OPENAI_API_KEY`, so its on-demand TTS is refused and no audio is
ever produced. D1 is the offline answer to that, not a replacement for the connected path.

### Reachability and capability boundary

D1 is reachable from `/audio-training` in connected, guest-trial, and offline Demo sessions. The
Mobile capability registry exposes the bundled listening exercise under `更多` in Demo without
exposing connected speaking or AI capabilities. `audioLearningAccess.ts` keeps the authenticated
workspace query disabled unless both the Supabase auth mode and a connected profile are present;
Demo therefore loads only the local D1 content and does not issue a protected audio-workspace
request.

The EAS profile split (`preview` offline-only, `staging` connected-only) also lives on that branch
and is not in effect here.

## Audio source and license

The bundled file is Wikimedia Commons' MP3 transcode of “365-Euro-Ticket für den Nahverkehr”,
spoken by Emil Linus Albrecht for German Wikinews.

- Source and attribution: <https://commons.wikimedia.org/wiki/File:DE-365-Euro-Ticket_f%C3%BCr_den_Nahverkehr.flac>
- Published transcript: <https://de.wikinews.org/wiki/365-Euro-Ticket_f%C3%BCr_den_Nahverkehr>
- License: [Creative Commons Attribution 2.5](https://creativecommons.org/licenses/by/2.5/)
- Audio modification: none

Repository attribution is also stored beside the asset in `apps/mobile/assets/audio/README.md`,
and rendered in the exercise UI itself. Attribution kept only in a repository file does not satisfy
CC BY — the end user has to be able to see it, so the credit line and the source link stay on the
practice screen.

## How to source the next recording

Listening audio is sourced as CC-licensed human recordings committed to the repository, not
synthesized per request. Human voices are what learners actually need to understand, the cost is
zero and recurring-zero, and the exercise keeps working when the AI surfaces are switched off — the
exact failure the connected listening path has today.

Permitted sources:

- Wikimedia Commons / German Wikinews (CC BY) — spoken news, has published transcripts.
- LibriVox (public domain) — literary and long-form.
- Tatoeba (CC BY) — single sentences, useful for short items.

For each new recording, record all of the following before it is committed:

1. Source URL of the audio file itself.
2. Speaker name, as the licence requires it to be credited.
3. Licence and version (e.g. CC BY 2.5), with a link.
4. Whether the audio was modified, and how. Prefer none.
5. URL of the published transcript, so the German text is not transcribed by hand or by a model.

Then: place the file in `apps/mobile/assets/audio/`, append the five fields to that directory's
`README.md`, register the asset in `listeningD1Audio.ts`, and render the credit line and source
link on the practice screen the way `ListeningD1Practice.tsx` already does.

The four TTS-backed `listening_assets` in `supabase/seed.sql` are a separate, paid, online path.
They are deliberately left untouched.

## Validation boundary

Automated tests cover schema validity, B1/B2 selection, all-correct scoring, partial credit,
invalid submissions, duplicate vocabulary rejection, and deterministic replay. Mobile typecheck
and Web/Android exports verify the bundle contract when run.

Browser validation was run against the real `expo export --platform web` output at 375 × 812: the
1.2 MB MP3 is emitted to `dist/assets/assets/audio/`, fetched over HTTP, and decoded — the player
reports the true 1:05 duration and the playhead advances during playback. Play, pause, replay,
0.75×, answering, and submission were exercised end to end; a deliberate 3-of-4 answer produced 75
points with per-question Traditional Chinese explanations, the revealed transcript, and the visible
CC BY credit. A non-D1 `assetId` still falls through to the connected screen.

The following still require separate evidence before public-release claims:

- qualified human confirmation of the CEFR level and Traditional Chinese teaching explanations;
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
