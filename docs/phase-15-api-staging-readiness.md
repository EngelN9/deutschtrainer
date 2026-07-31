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

The Node adapter returns a bounded `x-request-id` on every response and emits JSON request events
containing method, pathname, status and duration without query strings, headers, bodies or private
learning content. Central collection and provider-backed alerts remain deployment work described in
`docs/operations.md`.

## Render staging target

The repository-selected connected staging target is a Render Docker web service defined by the
root `render.yaml`:

- service: `deutschtrainer-api-staging`;
- region: Singapore;
- Dockerfile: `apps/api/Dockerfile`;
- health check: `/health`;
- public listener: `HOST=0.0.0.0`, platform `PORT=10000`;
- deploy trigger: only after GitHub checks pass;
- plan: free staging instance.

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` use `sync: false` and must be
entered through Render's protected environment prompt. The Blueprint contains names and non-secret
limits only. The Dockerfile does not declare secret build arguments, so these values are runtime
configuration rather than image contents.

The free plan sleeps after inactivity, has an ephemeral filesystem, and does not provide
production operability evidence. It is accepted only for connected staging and two-user/real-AI
verification. Production requires an explicit paid-capacity, monitoring, distributed rate-limit,
backup/restore, and rollback decision.

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

Gate 3 has selected the repository-linked remote Supabase project, restored the two previously
applied migration files to append-only source history, and aligned local/remote history at 21
migrations. Remote checks confirmed:

- 36/36 public tables have RLS;
- protected writing/listening tables have no anon/authenticated grants;
- no public function retains `PUBLIC EXECUTE`;
- all `SECURITY DEFINER` functions have a fixed `search_path`;
- account deletion is service-role-only and active-learner Storage policies replaced the legacy
  policies;
- anon/authenticated have zero mutation or `MAINTAIN` grants on every existing public table and on
  the `postgres` defaults used by repository migrations;
- Auth health and published course reads return `200`, while anonymous protected-content and Admin
  RPC calls return `401`;
- the release seed contains 100 human/approved/published exercises with the required level/type
  distribution and answer coverage.

Supabase advisors still surface the eight intentionally authenticated identity/Admin
`SECURITY DEFINER` entry points and two RLS-without-policy service-only tables. Local role E2E and
remote anonymous checks support the design, but the remote two-user/role suite remains required.
The platform-owned `supabase_admin` default ACL cannot be changed by the repository migration
runner and still carries client defaults. Application tables must therefore be created only by
reviewed append-only migrations, with an effective-privilege assertion such as the current
hardening migrations; dashboard-created application tables are outside the accepted workflow.

The remaining connected handoff requires external runtime credentials and deployment:

1. Provision an OpenAI project key with spending and usage limits.
2. Import `render.yaml` from the public GitHub repository and enter the three `sync: false` runtime
   values in Render without copying them into source or build arguments.
3. Deploy the Render service and verify the public HTTPS `/health` reports `aiConfigured: true`.
4. Run remote two-user learning, role, Storage, writing/audio and account-deletion suites.
5. Configure Admin and the EAS `preview` environment with the remote Supabase URL, publishable key,
   and API base URL.
6. Build the `staging` Android profile and run authenticated course, grading, writing, audio,
   offline-sync and deletion acceptance.

No service-role key or OpenAI key belongs in GitHub source, a Mobile/Admin public variable, or a GitHub Release asset.
The process-local private-request limiter is not a distributed production control; a gateway or
shared store and multi-instance verification are required before operational readiness can pass.
