# Supplemental product strategy and Stage A execution

This document records the repository audit against the supplemental product strategy received on
2026-07-24. It extends the existing product and technical specifications; it does not replace the
phase documents, API contracts, data model, learning logic, security controls, or completed work.

## Current state

| Product surface     | Current implementation                                                                                                                                                                                                     | Product boundary                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Android learner App | Expo/React Native App with Supabase Auth, onboarding, published course delivery, deterministic and AI exercises, writing, audio, progress, review, notifications, durable offline downloads, and idempotent reconnect sync | Primary learner product                                                               |
| Offline Demo        | Versioned internal APK with local Demo identity, bundled course content, fixed exercises, and persisted on-device progress                                                                                                 | Credential-free product demonstration; not connected staging                          |
| Admin               | Next.js content operations console with content-team role checks plus database-enforced RLS/RPC permissions, immutable versions, review, publishing, AI drafts, and audit history                                          | Content operations only; public website and protected `/admin` routing remain Stage D |
| API                 | Node API with validated request/response contracts, safe error envelopes, bearer authentication, service-only database boundaries, rate limiting, AI providers, Docker bundle, and health endpoint                         | Only runtime allowed to hold Supabase service-role and OpenAI credentials             |
| Supabase            | Fourteen append-only migrations, RLS, Storage policies, role-protected RPCs, release seed, and local development configuration                                                                                             | Shared Auth, Postgres, and private Storage                                            |
| Public website      | Not implemented                                                                                                                                                                                                            | Stage D: product/support/download/privacy/terms/account deletion/contact              |
| Learner web         | Expo Web export succeeds, but it is not a released learner product                                                                                                                                                         | Stage E after connected Android acceptance                                            |

The current GitHub pre-release APK is a usable offline Demo. It must not be described as connected
staging or production. No remote Supabase project, remote API, public website, admin deployment, or
account-deletion flow is verified by this repository audit.

## Preserved implementation

- Existing migrations remain unchanged. Future database changes must use a new migration.
- Existing shared types, Zod request/response contracts, grading rules, mastery calculation, review
  scheduling, offline envelope, idempotency keys, conflict handling, and API paths remain intact.
- Mobile and Admin continue to use the public Supabase anon key only. Service-role and OpenAI
  credentials remain server-only.
- The offline Demo remains an explicit EAS build profile instead of being confused with connected
  preview.

## Gaps found

1. Mobile and Admin previously allowed localhost fallbacks without an explicit deployment
   environment.
2. API CORS previously returned `Access-Control-Allow-Origin: *`.
3. EAS `preview` previously built the mock Demo rather than connected staging.
4. App diagnostics did not expose App version/build/environment/release identifiers.
5. Generic mobile errors could expose provider or platform messages.
6. The public website, protected `/admin` route boundary, legal/support pages, and account deletion
   flow do not yet exist.
7. Connected staging still requires remote provider projects, credentials, domains, and a written
   physical-device acceptance run; local build and integration success cannot substitute for that
   deployment evidence.

## Stage A implementation

Stage A introduces only deployment configuration and diagnostics:

- typed Mobile, Admin, and API environment readers;
- local-only defaults and Android cleartext traffic;
- fail-fast connected preview/production validation;
- explicit API browser-origin allowlist;
- `demo`, connected `preview`, and `production` EAS profile boundaries;
- user-safe mobile error translation;
- App/API/content release diagnostics;
- Expo SDK 57 patch compatibility updates;
- local physical-device and environment documentation.

### Environment matrix

| Environment               | Mobile content  | URLs                         | Secrets and release identifiers                                         |
| ------------------------- | --------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `local`                   | `mock` or `api` | HTTP loopback/LAN is allowed | Local placeholders are allowed; Android cleartext is enabled            |
| `preview` / API `staging` | `api` only      | Non-local HTTPS only         | Valid anon key, server secrets, allowlist, and release IDs are required |
| `production`              | `api` only      | Non-local HTTPS only         | Valid anon key, server secrets, allowlist, and release IDs are required |

All `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` values are public bundle configuration. Never store a
service-role key or OpenAI key in them.

### EAS profile boundary

- `demo`: internal APK, local environment, mock content, no connected service claim.
- `preview`: internal APK, connected preview environment, API content only. Its public API/Supabase
  URLs, anon key, and release IDs must exist in the EAS `preview` environment.
- `production`: store build defaults, connected production environment, API content only.

The connected profiles fail during bundling if required public configuration is missing or uses
localhost, HTTP, or placeholders.

## Local Android device workflow

Start Supabase and the API, then connect the Android device with USB debugging:

```powershell
pnpm supabase:start
$env:HOST = "0.0.0.0"
pnpm dev:api
adb devices
adb reverse tcp:8787 tcp:8787
adb reverse tcp:54321 tcp:54321
```

In `apps/mobile/.env`, keep `EXPO_PUBLIC_APP_ENV=local` and use
`http://127.0.0.1:8787` / `http://127.0.0.1:54321`. Then:

```powershell
pnpm --filter @deutschtrainer/mobile start
```

`adb reverse` avoids opening the API and local Supabase ports to the LAN. If USB reverse is not
available, use the computer's private LAN IP and a narrowly scoped Windows Firewall rule. Never
enable cleartext traffic in preview or production.

In a headless Windows runner where Supabase CLI waits indefinitely without printing output, close
its standard input explicitly:

```powershell
'' | supabase start --exclude logflare --ignore-health-check --yes
'' | supabase db reset --local --yes
```

This is a terminal compatibility workaround only. Interactive PowerShell users can continue using
the root `pnpm supabase:start` and `pnpm supabase:reset` scripts.

## Risk assessment

- **Authentication:** configuration changes do not alter session persistence or Auth contracts.
  Connected builds now fail instead of silently talking to localhost.
- **RLS and roles:** no migration or privilege changes are included.
- **Offline data:** cache envelopes, queue size, idempotency, ordering, and conflicts are unchanged.
- **Android/Web:** local Android retains cleartext support; preview/production are HTTPS-only. Web
  access requires an explicitly allowed origin.
- **AI and secrets:** staging/production API startup requires a real OpenAI key and rejects fake mode
  and placeholder server credentials.
- **Deployment:** Stage A prepares configuration but does not create external projects, domains, or
  credentials. Those are Stage B actions and require deployment-provider state.

## Verification record

Before Stage A, formatting, lint, typecheck, 117 tests, API bundle smoke, Admin build, and Android/Web
exports passed. The latest GitHub `main` CI also passed all 17 steps.

After Stage A, formatting, lint, workspace typecheck, 24 suites / 135 tests, API production bundle
smoke, Admin production build, Expo dependency compatibility, Expo Doctor 20/20, Android export,
and Web export pass locally. Public Expo config inspection confirms Android cleartext is `true` only
for local and `false` for preview.

On 2026-07-24, Docker Desktop 4.83.0 / Engine 29.6.2 and Supabase CLI 2.109.1 completed a clean local
database reset. All fourteen migrations and the release seed applied successfully. With the API
running in deterministic local AI mode, all nine database/API integration suites passed:

- core AI evaluation, writing, audio, Admin authorization/publishing, and learning API;
- offline sync/conflict handling, knowledge library, content readiness, and settings isolation.

The content-readiness suite verified 100 approved human-reviewed exercises across B1–C2. The
integration suites also exercised two-user RLS boundaries, denied direct RPC/table access,
idempotent replay, immutable writing versions, private audio deletion, role-protected publishing,
offline timestamp preservation, and owner-scoped preferences. Local verification is complete, but
it is not evidence that connected staging has been deployed or accepted on a physical device.

## Next stages

1. **Stage B:** provision separate remote Supabase and API staging, apply migrations from a clean
   database, load reviewed seed content, configure restricted secrets/origins, and run connected
   integration tests.
2. **Stage C:** create a connected EAS preview APK and perform a written real-device acceptance
   matrix for Auth, courses, fixed/AI work, writing, audio, offline/reconnect, and error handling.
3. **Stage D:** add the minimal public website, legal/support/account-deletion pages, and place the
   content console under a protected `/admin` boundary with server-aware authorization.
4. **Stage E:** release the learner web experience from the same Expo codebase after Android
   acceptance, without a second API, Auth system, or database.
