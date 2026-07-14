# API

Node backend for learner data, AI evaluation, audio processing, and content-governance operations. It is the only runtime allowed to use the Supabase service-role key or OpenAI API key.

## Endpoints

- `GET /health`: service and AI-provider readiness.
- `/courses`, `/lessons`, `/attempts`, `/users/me/progress`, and `/users/me/reviews`: published course delivery and owner-scoped learning records.
- `GET /users/me/writing` and `DELETE /writing/submissions/:id`: owner-scoped writing workspace and deletion.
- `POST /ai/evaluate-response`: AI grading for published `translation` and `free_response` exercises.
- `POST /ai/evaluate-writing`: versioned long-form writing evaluation with inline feedback.
- `GET /users/me/audio-learning`, `/listening/*`, `/audio/*`, and `DELETE /speaking/submissions/:id`: private listening/speaking workspace, telemetry, scoring, TTS, STT, and deletion.
- `/admin/*`: role-gated content generation and governance operations.

Private endpoints require a Supabase bearer token and resolve the active profile server-side. Writing saves an immutable version before model work, validates UTF-16 inline offsets and ten rubric dimensions, and records accepted feedback through service-only RPCs.

## Run

Create the repository root `.env` from `.env.example`, provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `OPENAI_API_KEY`, then run:

```powershell
pnpm dev:api
```

The default URL is `http://localhost:8787`. Without an OpenAI key, exercise evaluation returns a non-persisted fallback; writing returns a fallback while retaining the submitted version for retry. `AI_EVALUATION_FAKE_MODE=true` selects deterministic local fixtures and must not be enabled in production.

## Verify

```powershell
pnpm --filter @deutschtrainer/api typecheck
pnpm test
pnpm --filter @deutschtrainer/api verify:local
pnpm --filter @deutschtrainer/api verify:writing:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:workspaces:local
```

`verify:local` requires a running local Supabase stack, a running API, and `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the current shell. It creates and removes temporary users while checking evaluation, replay, cache, persistence, RLS, protected answers, and RPC permissions.

`verify:writing:local` additionally checks first- and second-pass feedback, immutable text versions, stored diffs, protected prompt rules, cross-user RLS, direct-RPC denial, and user deletion behavior.

`verify:workspaces:local` runs the writing and audio two-user suites together, including API workspace isolation, owner deletion, listening telemetry, Storage RLS, and legacy authenticated-RPC denial.
