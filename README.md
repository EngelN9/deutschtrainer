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
- `evaluation/matraix`: isolated, synthetic-only writing-feedback evaluation; never a production dependency or release gate.

## Important Documentation

- [`AGENTS.md`](AGENTS.md): repository-wide instructions for Codex, AI agents, and contributors.
- [`SPECIFICATION.md`](SPECIFICATION.md): stable product scope, platform boundaries, and technical principles.
- [`DELIVERY_PLAN.md`](DELIVERY_PLAN.md): connected-release Gate sequence and instructions for assigning one Gate at a time.
- [`docs/definition-of-done.md`](docs/definition-of-done.md): authoritative A-J completion and release evidence gates.
- [`docs/architecture.md`](docs/architecture.md): current system architecture and component boundaries.
- [`docs/security.md`](docs/security.md): security, privacy, authorization, and data-protection requirements.
- [`docs/testing-strategy.md`](docs/testing-strategy.md): automated, local integration, connected, and device testing strategy.
- [`docs/matraix-synthetic-evaluation.md`](docs/matraix-synthetic-evaluation.md): optional synthetic writing-feedback preflight, isolation, governance, and evidence limits.
- [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md): measurable product and phase acceptance criteria.

The virtual-classroom work (real-time AI German tutor, voice, collaborative whiteboard) is specified
separately. These four documents cover that surface only; the documents above remain authoritative
for the existing learner app, Admin console, and API.

- [`CURRENT_STATE.md`](CURRENT_STATE.md): what the repository actually contains, assessed for classroom reuse.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): classroom architecture, tool protocol, learner memory, and cost control.
- [`MVP_SPEC.md`](MVP_SPEC.md): the MVP, its acceptance criteria, session limits, and non-goals.
- [`ROADMAP.md`](ROADMAP.md): phases, entry/exit criteria, and the ordered implementation backlog.

`SPECIFICATION.md` and `DELIVERY_PLAN.md` are reference documents. Do not submit either file to Codex as one monolithic implementation prompt; assign one small, independently reviewable task or Gate.

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

Fill the root `.env`, `apps/mobile/.env`, and `apps/admin/.env.local` with values reported by `supabase status --output env`. The service-role key and OpenAI key belong only in the root `.env`; never place either key in an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable. `AI_PUBLIC_ENABLED` defaults to `false`; enabling it without an API-only `OPENAI_API_KEY` fails fast. `AI_EVALUATION_FAKE_MODE=true` enables deterministic local fixtures and must never be used in staging or production. To exercise learner AI endpoints locally with deterministic fixtures, enable both flags only for that local API process; this remains test evidence, not real-AI acceptance.

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
pnpm --filter @deutschtrainer/api verify:ai-quota:local
```

Local mobile web is available at `http://localhost:8081`; the admin console uses `http://localhost:3000`. Supabase API, Studio, and Mailpit normally use ports `54321`, `54323`, and `54324`.

## Connected Staging Blueprint

The public source repository is
[EngelN9/deutschtrainer](https://github.com/EngelN9/deutschtrainer). The root `render.yaml`
describes three free Render preview services that deploy only after GitHub checks pass:

- [deutschtrainer-engeln9-api](https://deutschtrainer-engeln9-api.onrender.com/health): Docker API with `/health`;
- [deutschtrainer-engeln9-site](https://deutschtrainer-engeln9-site.onrender.com): Next.js public information site and role-gated `/admin`;
- [deutschtrainer-engeln9-web](https://deutschtrainer-engeln9-web.onrender.com): Expo Web learner preview with SPA route rewrites.

[Deploy to Render](https://render.com/deploy?repo=https://github.com/EngelN9/deutschtrainer)

Render must prompt for the API's server-only values, an exact HTTPS-only
`CORS_ALLOWED_ORIGINS` list for the two browser surfaces, and the two frontends' approved public
Supabase/API settings; their values never belong in this repository. Keep
`AI_PUBLIC_ENABLED=false` for the responsive-preview rollout. The learner web surface is a
connected preview, not evidence for native notifications, microphone permissions, installation,
background reconnect, or app restart. The free services can sleep after inactivity and are staging
evidence only, not production or operational readiness. No Google Play or Apple App Store
publication is part of this deployment. `/health` exposes `aiConfigured` and `aiPublicEnabled`
without exposing credentials; both provider configuration and the public switch must be true before
real learner AI acceptance begins.

The learner App uses width-based responsive breakpoints rather than device names: compact below
600 px, medium from 600–1023 px, and wide from 1024 px. The public site and Admin console provide
their corresponding mobile/tablet/desktop layouts. The quota and viewport contracts are documented
in `docs/responsive-ai-entitlement.md`.

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
must be described as a publicly reachable, feature-rich Preview whose real-AI, operations and
device acceptance remain blocked, not as complete, production-ready or formally released.

See `docs/phase-15-api-staging-readiness.md` for the production bundle, container contract, staging environment boundary, and credentialed deployment handoff.
