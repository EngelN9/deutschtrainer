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
pnpm --filter @deutschtrainer/api verify:account-data:local
```

Local mobile web is available at `http://localhost:8081`; the admin console uses `http://localhost:3000`. Supabase API, Studio, and Mailpit normally use ports `54321`, `54323`, and `54324`.

## Connected Staging Blueprint

The public source repository is
[EngelN9/deutschtrainer](https://github.com/EngelN9/deutschtrainer). The root `render.yaml`
describes a free Render staging web service that builds `apps/api/Dockerfile`, binds
`0.0.0.0:$PORT`, checks `/health`, and deploys only after GitHub checks pass.

[Deploy to Render](https://render.com/deploy?repo=https://github.com/EngelN9/deutschtrainer)

Render must prompt for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY`; their
values never belong in this repository. The free service can sleep after inactivity and is staging
evidence only, not production or operational readiness. Do not configure Mobile/Admin until the
deployed `/health` endpoint reports `aiConfigured: true` and the remote security suites pass.

## Current Scope

Phases 0–15 describe the repository implementation baseline, not production readiness. The
repository contains the planned architecture and tooling; authentication and onboarding; courses,
fixed grading, learning records and offline synchronization; AI-assisted evaluation, writing and
audio flows; the content-admin workflow; knowledge libraries; release configuration; and an API
bundle/container contract. It also includes authenticated account-data export and account deletion.

These layers must be reported separately:

- Repository implementation and automated unit/build evidence: verifiable from this checkout.
- Local integration: requires Docker and a clean local Supabase reset before the local verification
  commands are evidence.
- Connected staging and remote security: require a remote Supabase project, deployed HTTPS API,
  configured public clients, and two-user verification.
- Real AI quality, cost, and latency: require a real provider credential with fake mode disabled.
- Native device: requires an installed Android build for notifications, microphone, recording,
  restart, flight mode, background reconnect, and deletion/cache acceptance.
- Operations and public delivery: require deployed monitoring, backup/restore and rollback drills,
  public URLs, release artifacts, and any applicable store review.

Until every required A–J gate in `docs/definition-of-done.md` has reproducible evidence, this project
must be described as a feature-rich preview whose deployment and device acceptance remain blocked,
not as complete, publicly available, production-ready, or formally released.

See `docs/phase-15-api-staging-readiness.md` for the production bundle, container contract, staging environment boundary, and credentialed deployment handoff.
