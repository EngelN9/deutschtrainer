# API

Node backend for authenticated AI evaluation. It is the only runtime allowed to use the Supabase service-role key or OpenAI API key.

## Endpoints

- `GET /health`: service and AI-provider readiness.
- `POST /ai/evaluate-response`: AI grading for published `translation` and `free_response` exercises.

The evaluation endpoint requires a Supabase bearer token. It resolves all trusted exercise context server-side, validates Structured Output, applies quota/cache/idempotency rules, and records accepted results through the service-only `record_ai_attempt` RPC.

## Run

Create the repository root `.env` from `.env.example`, provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `OPENAI_API_KEY`, then run:

```powershell
pnpm dev:api
```

The default URL is `http://localhost:8787`. Without an OpenAI key, evaluation returns a non-persisted fallback. `AI_EVALUATION_FAKE_MODE=true` selects a deterministic local fixture and must not be enabled in production.

## Verify

```powershell
pnpm --filter @deutschtrainer/api typecheck
pnpm test
pnpm --filter @deutschtrainer/api verify:local
```

`verify:local` requires a running local Supabase stack, a running API, and `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the current shell. It creates and removes temporary users while checking evaluation, replay, cache, persistence, RLS, protected answers, and RPC permissions.
