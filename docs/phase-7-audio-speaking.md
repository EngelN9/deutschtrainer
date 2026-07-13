# Phase 7 Audio And Speaking

## Scope

Phase 7 delivers a private B1-C2 listening and speaking loop for Traditional Chinese learners:

- Four approved listening assets and four speaking prompts, one per CEFR level.
- Server-side TTS from a trusted listening asset ID, with private Storage caching and short-lived signed URLs.
- Playback, replay, normal and 0.75x speed, keyword hints, protected transcript reveal, dictation, and comprehension questions.
- Playback count, slow-speed usage, transcript view, dictation score, comprehension result, and difficult-word telemetry.
- Microphone permission handling, timed recording, local preview, explicit upload, STT, word comparison, pace, long pauses, and retry advice.
- Owner-only recording metadata and Storage objects, plus permanent recording/submission deletion.
- Listening accuracy, comprehension accuracy, speaking activity count, and speaking content summaries in learning analytics.

Speech feedback is deliberately described as STT-assisted text comparison. It is not a phoneme-level or precise pronunciation score.

## Request Flow

### Listening

1. Mobile reads only approved public metadata from `listening_assets`.
2. `POST /audio/text-to-speech` accepts an asset ID, voice, and idempotency key. Arbitrary client text is not accepted.
3. API loads the protected transcript and TTS instructions, enforces quota, and stores generated WAV audio in the private `listening-audio` bucket.
4. Repeated requests use a content/version/model/voice cache key and return a 15-minute signed URL.
5. Mobile records each play through `record_listening_activity`; slow speed and transcript reveal are sticky telemetry flags.
6. `POST /listening/reveal-transcript` returns the protected transcript only to an authenticated learner and records the reveal.
7. `POST /listening/submit-dictation` performs server-side normalized word comparison and comprehension scoring, then stores an idempotent attempt result.

### Speaking

1. Mobile asks for microphone permission. A denied permission switches to a manual read-aloud checklist and system-settings action.
2. Recording remains local until the learner previews and explicitly submits it.
3. Mobile uploads to `speaking-audio/{auth_user_id}/...`; Storage RLS limits select and delete to that folder owner.
4. `POST /audio/transcribe` verifies the access token, owner path, published prompt, duration, object existence, MIME type, and rolling quota.
5. API downloads the private object and sends it to the configured transcription provider. Local deterministic mode returns the trusted target with word timings.
6. API stores the transcript, word timings, missing/extra word diff, WPM, pace band, long pauses, and separated feedback dimensions.
7. `DELETE /speaking/submissions/:id` verifies ownership, deletes the Storage object, and removes the audio metadata; the submission cascades with it.

## Data Model

Migration `202607130004_phase7_audio_speaking.sql` adds:

- `listening_assets`: public-safe level, kind, hints, question, options, voice, and skill metadata.
- `listening_asset_content`: service-only transcript, correct option, and synthesis instructions.
- `audio_assets`: source, license, private bucket/path, owner or listening reference, MIME type, model, voice, and cache key.
- `listening_attempts`: session telemetry and completed dictation/comprehension result.
- `speaking_prompts`: approved target text, Traditional Chinese instruction/translation, skills, and duration limit.
- `speaking_submissions`: private audio reference, status, transcript, timings, comparison, feedback, model, and idempotency key.

The migration also creates private `listening-audio` and `speaking-audio` buckets, owner-folder Storage policies, and service-only result RPCs.

## Privacy And Failure Handling

- Protected transcripts and correct answers have no anon/authenticated grant or policy.
- Generated listening audio has no client Storage policy; authenticated playback uses only an API-issued signed URL.
- Learners can read only their own listening attempts, speaking submissions, and uploaded audio metadata.
- A learner cannot sign, read, transcribe, or delete another learner's recording.
- Failed or unavailable transcription returns a persisted, deletable fallback submission without fabricated scores.
- Usage logs keep request, model, status, and latency metadata, not recording bytes or complete transcripts.
- TTS and STT credentials remain server-only.

## Configuration

```text
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TRANSCRIPTION_MODEL=whisper-1
AI_AUDIO_TTS_DAILY_FREE_LIMIT=20
AI_AUDIO_TRANSCRIPTION_DAILY_FREE_LIMIT=10
```

`AI_EVALUATION_FAKE_MODE=true` also enables deterministic local audio fixtures. It must remain disabled in production.

## Local Verification

Start Supabase and the API in deterministic mode, export the local Supabase keys, then run:

```powershell
pnpm --filter @deutschtrainer/api verify:audio:local
```

The script creates two temporary users and deletes them afterward. It checks protected transcripts, public metadata, TTS generation/cache/signed playback, listening telemetry, dictation replay, private upload, cross-user Storage and table RLS, transcription feedback disclaimer, cross-user delete denial, and owner hard deletion.

## Verification Evidence

Completed on 2026-07-13:

- Full local database reset applied all migrations and seeded approved B1-C2 listening/speaking content.
- Monorepo TypeScript passed for all 12 projects.
- Ten Jest suites passed with 55 tests, including Phase 7 schemas, word comparison, pause detection, private TTS cache behavior, unavailable-STT fallback, and idempotent recording-path conflicts.
- Expo Doctor passed all 20 configuration, dependency, and native-module checks.
- ESLint and repository-wide Prettier checks passed.
- Local integration returned protected transcript status `401`, a valid `32044`-byte WAV, a TTS cache hit, dictation score `100`, and idempotent replay.
- The second user received no signed URL, saw zero submission/audio rows, and received `404` when attempting deletion.
- Owner deletion removed both the database records and private Storage object.

## Known Limits

- Current speaking work is target-sentence read-aloud comparison, not open-ended oral production grading.
- STT can miss valid speech because of accent, noise, microphone quality, or provider behavior; suspected words are prompts for retry, not pronunciation diagnoses.
- Real-device iOS and Android microphone checks remain necessary before store release; browser and TypeScript validation cannot replace device permission testing.
- Long-form lectures, multi-speaker diarization, phoneme scoring, and free conversation belong to later phases.
