# Mobile App

Expo + React Native learner app for Traditional Chinese German learners at B1-C2.

## Implemented

- Supabase email/password auth and persisted sessions.
- First-run CEFR level, study-time, goal, and notification setup.
- Protected Expo Router navigation.
- Home dashboard and B1-C2 course map.
- Unit and lesson details.
- Multiple choice, multiple select, fill blank, sentence order, matching, and error correction.
- Deterministic grading with partial credit where applicable.
- Per-user lesson progress persisted with AsyncStorage.
- `mock` and `supabase` content-source adapters with Zod validation.
- Transactional Supabase attempts with idempotent retries.
- Cross-device lesson progress and skill mastery.
- Deterministic spaced-review queue and review-mode exercises.
- Traditional Chinese error history and learning analytics.
- AI-graded translation and free-response exercises.
- Traditional Chinese linguistic error diagnosis, corrections, strengths, and next steps.
- Preserved answers and retry UI when AI evaluation is unavailable.

## Run

```powershell
Copy-Item .env.example .env
pnpm start
```

Use `EXPO_PUBLIC_CONTENT_SOURCE=mock` for standalone UI development or `supabase` after starting and seeding the local Supabase stack.

AI exercises require the root API server (`pnpm dev:api`) and `EXPO_PUBLIC_CONTENT_SOURCE=supabase`. The mobile bundle contains only the Supabase anon key and API URL; OpenAI and service-role keys remain server-only.

Versioned long-form writing, audio, and speaking are intentionally deferred to later phases.
