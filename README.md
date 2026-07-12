# DeutschTrainer Monorepo

DeutschTrainer is a cross-platform B1-C2 German self-study app for Traditional Chinese users. The current implementation covers the project foundation, authentication/onboarding, course navigation, deterministic exercise grading, and local lesson progress.

## Workspace

- `apps/mobile`: Expo + React Native learner app.
- `apps/admin`: Next.js admin console foundation.
- `apps/api`: backend boundary for local contracts and future Node/Edge handlers.
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
Copy-Item apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

Fill `apps/mobile/.env` with the local URL and anon key reported by `supabase status`. Never place a service-role key or OpenAI key in an `EXPO_PUBLIC_*` variable.

The mobile content source is controlled by:

```text
EXPO_PUBLIC_CONTENT_SOURCE=mock
EXPO_PUBLIC_CONTENT_SOURCE=supabase
```

Both sources return the same validated `CourseCatalog` ViewModel. `mock` runs without course-network calls; `supabase` reads the published B1-C2 seed through RLS.

## Commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:mobile
pnpm dev:admin
pnpm supabase:status
```

Local mobile web is available at `http://localhost:8081`. Supabase API, Studio, and Mailpit normally use ports `54321`, `54323`, and `54324`.

## Current Scope

- Phase 0: planning and architecture complete.
- Phase 1: monorepo and tooling foundation complete.
- Phase 2: auth, onboarding, and protected navigation complete.
- Phase 3: course map, lessons, six deterministic exercise types, source switching, and per-user local progress complete.
- Phase 4 onward: attempts, cross-device progress, mastery, review scheduling, AI evaluation, writing, audio, speaking, and admin workflows remain planned.

See `docs/phase-3-courses-exercises.md` for Phase 3 details and known limits.
