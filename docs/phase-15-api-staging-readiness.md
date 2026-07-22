# Phase 15 API Staging Readiness

## Scope

Phase 15 turns the existing development-only API entry point into a deployable staging artifact without placing Supabase service-role or OpenAI credentials in source control, a container layer, Mobile, or Admin.

## Production artifact

`pnpm --filter @deutschtrainer/api build` bundles the API and its workspace dependencies into `apps/api/dist/server.mjs`. The runtime starts with plain Node through `pnpm --filter @deutschtrainer/api start`; TypeScript and `tsx` are not required in the deployed image.

`pnpm --filter @deutschtrainer/api verify:bundle` starts that exact bundle with non-secret fixture configuration, waits for `GET /health`, validates the response contract, and terminates it through the production signal path.

## Container contract

Build from the monorepo root so workspace packages are available to the build stage:

```powershell
docker build --file apps/api/Dockerfile --tag deutschtrainer-api .
```

The final image:

- contains the bundled server and source map only;
- runs as the image's unprivileged `node` user;
- listens on `HOST=0.0.0.0` and `PORT=8787` by default;
- exposes `GET /health` through a Docker health check;
- handles `SIGINT` and `SIGTERM`, with a ten-second forced-shutdown bound;
- receives secrets only from the deployment runtime.

## Environment boundary

Required server-only values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for connected AI acceptance:

- `OPENAI_API_KEY`

Recommended deployment values:

- `APP_ENV=staging` for the first connected environment;
- `HOST=0.0.0.0`;
- platform-provided `PORT`;
- explicit AI limits, timeout, model, and cost metadata from `.env.example`.

Safety rules enforced at startup:

- every environment requires a non-placeholder service-role key;
- staging and production reject `AI_EVALUATION_FAKE_MODE=true`;
- staging and production require `SUPABASE_URL` to be an absolute HTTPS URL;
- local/test remain compatible with the local Supabase HTTP stack and deterministic fixtures.

The current `gpt-5.6-luna` evaluation default remains intentional for cost-sensitive, high-volume workloads. Its `$1` input／`$6` output cost metadata per million text tokens matches the current [official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna). Model quality, latency, and cost still require representative staging evaluation before production rollout.

## CI gates

GitHub CI now verifies:

- format, lint, strict typecheck, and repository tests;
- API production bundle creation;
- health smoke against the production bundle;
- API container build;
- Expo dependency compatibility and Doctor;
- Android and Web export;
- Admin production build.

## Credentialed handoff

The next phase requires external state and credentials and is not simulated in source control:

1. Create or select a remote Supabase staging project.
2. Link the Supabase CLI and apply all migrations plus the release seed.
3. Provision an OpenAI project key with spending and usage limits.
4. Deploy the API container and verify `/health` reports `aiConfigured: true`.
5. Configure Admin and EAS staging public variables with the remote Supabase URL, anon key, and API base URL.
6. Build a connected Android preview and run authenticated course, grading, writing, audio, offline-sync, and deletion acceptance.

No service-role key or OpenAI key belongs in GitHub source, a Mobile/Admin public variable, or a GitHub Release asset.
