# Mobile App

Expo + React Native learner app for Traditional Chinese German learners at B1-C2.

## Implemented

- Supabase email/password auth and persisted sessions.
- First-run CEFR level, study-time, goal, and notification setup.
- Personal notification settings with master and per-event switches, reminder time, inactivity interval, timezone, permission state, and system-settings recovery.
- Timezone-aware local daily, due-review, inactivity, writing-complete, new-course, and goal-complete notifications with per-day/event deduplication.
- Protected Expo Router navigation.
- Home dashboard and B1-C2 course map.
- Searchable B1-C2 vocabulary and grammar libraries with Traditional Chinese details, CEFR filters, pagination, and related-exercise links.
- Unit and lesson details.
- Multiple choice, multiple select, fill blank, sentence order, matching, and error correction.
- Deterministic grading with partial credit where applicable.
- Per-user lesson progress persisted with AsyncStorage.
- Per-user B1-C2 course downloads with validated, versioned offline snapshots.
- Offline fixed-exercise grading, durable pending attempts, reconnect sync, and conflict controls.
- Cached owner settings allow a persisted Supabase session to reopen downloaded content without a network request.
- `mock` and backend `api` content-source adapters with Zod validation.
- Server-authoritative fixed grading and transactional attempts with idempotent retries.
- Cross-device lesson progress and skill mastery.
- Deterministic spaced-review queue and review-mode exercises.
- Traditional Chinese error history and learning analytics.
- AI-graded translation and free-response exercises.
- Traditional Chinese linguistic error diagnosis, corrections, strengths, and next steps.
- Preserved answers and retry UI when AI evaluation is unavailable.
- B1-C2 writing center with published prompts and word limits.
- Immutable writing versions, UTF-16 inline error highlights, ten rubric scores, and revision tasks.
- First-pass self-revision, second-pass reference text, arbitrary two-version comparison, and recoverable failed evaluations.
- Common writing-error counts in learning analytics and owner-only writing deletion.

## Run

```powershell
Copy-Item .env.example .env
pnpm start
```

Use `EXPO_PUBLIC_CONTENT_SOURCE=mock` for standalone UI development or `api` after starting the local API and Supabase stack.

Remote courses, vocabulary, grammar, progress, review, fixed grading, writing, listening/speaking workspaces, and AI exercises require the root API server (`pnpm dev:api`) and `EXPO_PUBLIC_CONTENT_SOURCE=api`. The mobile bundle contains only the Supabase anon key and API URL; OpenAI and service-role keys remain server-only.

After a course is downloaded, its reading content and deterministic fixed exercises remain available offline. AI evaluation, scheduled-review completion, TTS/STT, writing evaluation, and real-time generation remain online-only. Pending fixed attempts are capped at 200 per profile and sync oldest-first when connectivity returns.

Supabase remains in Mobile only for authentication and owner-scoped recording uploads/removal. Profile, onboarding, preferences, learning records, vocabulary, grammar, writing, and audio-learning structured data use the backend API.

## Native release preview

EAS configuration lives beside this app because the repository is a monorepo:

```powershell
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest config --platform android --profile preview --non-interactive
pnpm dlx eas-cli@latest build --platform android --profile preview
```

The `preview` profile creates an internally distributed Android APK. The `production` profile keeps the store-distribution defaults. Configure the four `EXPO_PUBLIC_*` values from `.env.example` in the matching EAS environment; never add an OpenAI or Supabase service-role key to a Mobile build.

The first Phase 14 preview is explicitly built with `EXPO_PUBLIC_CONTENT_SOURCE=mock`. After the APK passes the versioned device smoke flow, publish it as a GitHub pre-release asset with its SHA-256 checksum. Connected preview and production builds remain blocked until remote API and Supabase environments are available.

After installing a preview build on a connected device, run the credential-free guest flow:

```powershell
maestro test .maestro/guest-smoke.yaml
```
