# Mobile App

Expo + React Native learner app for Traditional Chinese German learners at B1-C2.

## Implemented

- Supabase email/password auth and persisted sessions.
- First-run CEFR level, study-time, goal, and notification setup.
- Personal notification settings with master and per-event switches, reminder time, inactivity interval, timezone, permission state, and system-settings recovery.
- Timezone-aware local daily, due-review, inactivity, writing-complete, new-course, and goal-complete notifications with per-day/event deduplication.
- Protected Expo Router navigation.
- Home dashboard and B1-C2 course map.
- Unit and lesson details.
- Multiple choice, multiple select, fill blank, sentence order, matching, and error correction.
- Deterministic grading with partial credit where applicable.
- Per-user lesson progress persisted with AsyncStorage.
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

Remote courses, progress, review, fixed grading, writing, listening/speaking workspaces, and AI exercises require the root API server (`pnpm dev:api`) and `EXPO_PUBLIC_CONTENT_SOURCE=api`. The mobile bundle contains only the Supabase anon key and API URL; OpenAI and service-role keys remain server-only.

Supabase remains in Mobile only for authentication and owner-scoped recording uploads/removal. Profile, onboarding, preferences, learning records, writing, and audio-learning structured data use the backend API.
