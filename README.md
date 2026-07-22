# DeutschTrainer Monorepo

DeutschTrainer is a cross-platform B1-C2 German self-study app for Traditional Chinese users. The current implementation covers authentication/onboarding, API-backed course navigation, downloadable offline courses and fixed exercises, server-authoritative deterministic and AI-assisted grading, cross-device learning records, skill mastery, spaced review, error history, versioned writing, private listening/speaking practice, learning analytics, and timezone-aware local learning reminders.

## Workspace

- `apps/mobile`: Expo + React Native learner app.
- `apps/admin`: role-gated Next.js course, exercise, review, version, AI draft, and publishing console.
- `apps/api`: authenticated Node API for AI evaluation, audio, content generation, and protected database writes.
- `packages/shared-types`: shared domain models and discriminated unions.
- `packages/validation`: Zod request, response, catalog, and exercise schemas.
- `packages/grading`: deterministic fixed-exercise grading.
- `packages/learning-engine`: mastery and review scheduling logic.
- `packages/ai-schemas`: AI structured-output validation.
- `packages/ai-prompts`: versioned prompt metadata.
- `packages/database`: repository contracts and database-facing types.
- `supabase`: local configuration, migrations, seed content, and functions.
- `docs`: product, architecture, security, testing, and phase reports.

## Requirements

- Node.js 20 or newer.
- pnpm 11.
- Docker Desktop.
- Supabase CLI 2.109 or newer.

## Local Setup

```powershell
pnpm install
pnpm supabase:start
pnpm supabase:reset
Copy-Item .env.example .env
Copy-Item apps/mobile/.env.example apps/mobile/.env
Copy-Item apps/admin/.env.example apps/admin/.env.local
pnpm dev:api
pnpm dev:mobile
pnpm dev:admin
```

Fill the root `.env`, `apps/mobile/.env`, and `apps/admin/.env.local` with values reported by `supabase status --output env`. The service-role key and OpenAI key belong only in the root `.env`; never place either key in an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable. Set `OPENAI_API_KEY` for real evaluation and content generation. `AI_EVALUATION_FAKE_MODE=true` enables deterministic local fixtures and must never be used in production.

The mobile content source is controlled by:

```text
EXPO_PUBLIC_CONTENT_SOURCE=mock
EXPO_PUBLIC_CONTENT_SOURCE=api
```

Both sources return the same validated `CourseCatalog` ViewModel. `mock` runs without course-network calls; `api` reads published B1-C2 content through the backend. The legacy `supabase` value is treated as `api` for local configuration compatibility.

## Commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:api
pnpm --filter @deutschtrainer/api build
pnpm --filter @deutschtrainer/api verify:bundle
pnpm dev:mobile
pnpm dev:admin
pnpm supabase:status
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:workspaces:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:admin:local
pnpm --filter @deutschtrainer/api verify:settings:local
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:knowledge:local
pnpm --filter @deutschtrainer/api verify:content-readiness:local
```

Local mobile web is available at `http://localhost:8081`; the admin console uses `http://localhost:3000`. Supabase API, Studio, and Mailpit normally use ports `54321`, `54323`, and `54324`.

## Current Scope

- Phase 0: planning and architecture complete.
- Phase 1: monorepo and tooling foundation complete.
- Phase 2: auth, onboarding, and protected navigation complete.
- Phase 3: course map, lessons, six deterministic exercise types, source switching, and per-user local progress complete.
- Phase 4: attempts, cross-device lesson progress, mastery, review scheduling, error history, and learning analytics complete.
- Phase 5: authenticated translation/free-response AI evaluation, Structured Outputs, detailed error classification, retry, learner-scoped cache, usage/cost logging, and protected answer keys complete.
- Phase 6: B1-C2 writing prompts, immutable versions, AI inline diagnosis, ten-dimension rubrics, rewrite/reference flow, version comparison, retry, analytics, RLS, and deletion complete.
- Phase 7: private TTS playback, listening telemetry, protected transcripts, server-scored dictation, microphone fallback, recording/STT, assisted speaking feedback, analytics, cross-user isolation, and deletion complete.
- Phase 8: role-gated course and exercise editing, immutable content versions, review decisions, review-required AI drafts, admin-only publishing, and audit trails complete.
- Phase 9: published course APIs, server-authoritative fixed grading, private progress/review APIs, per-user rate limiting, idempotent replay, and Mobile core-data API migration complete.
- Phase 10: private writing/audio workspaces, API-backed writing deletion and listening telemetry, shared learner rate limiting, and Mobile structured-data API migration complete.
- Phase 11: API-backed onboarding and notification preferences, timezone-aware local reminders, event deduplication, and personal notification settings complete with native-device follow-up.
- Phase 12: per-user course downloads, offline fixed-exercise grading, durable pending attempts, reconnect sync, conflict recovery, and original submission-time preservation complete with native-device follow-up.
- Phase 13: searchable B1-C2 vocabulary and grammar libraries, structured Traditional Chinese explanations, published-only APIs, pagination, and related-exercise deep links complete.
- Phase 14: 100 approved human exercises, release identifiers and artwork, EAS preview/production profiles, content-readiness verification, and a versioned native guest smoke flow complete with device follow-up.
- Phase 15: deployment-safe API configuration, a self-contained Node production bundle, container packaging, graceful shutdown, and CI bundle/container verification complete.

See `docs/phase-15-api-staging-readiness.md` for the production bundle, container contract, staging environment boundary, and credentialed deployment handoff.
