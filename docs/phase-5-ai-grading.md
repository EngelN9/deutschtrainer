# Phase 5 AI Grading

## Scope

Phase 5 adds authenticated AI grading for `translation` and `free_response` exercises. The mobile app sends only the exercise ID, learner answer, timing, hint state, mode, and idempotency key. The backend loads the trusted CEFR level, allowed skills, prompt, references, and grading notes from Supabase.

Delivered:

- Versioned prompt in `packages/ai-prompts`.
- Strict Zod and JSON Schema in `packages/ai-schemas`.
- OpenAI Responses API Structured Outputs using `text.format`.
- One retry for provider, timeout, or invalid-feedback failures.
- Learner-scoped response cache and rolling 24-hour quota.
- Per-provider-attempt token, latency, status, and estimated-cost records.
- Atomic attempt, feedback, linguistic error, mastery, review, and lesson-progress writes.
- Traditional Chinese mobile feedback with correction, natural alternative, strengths, suggestions, retry, and AI disclaimer.

The implementation follows the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs). The default model is configurable and follows the current [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model).

## Request Flow

1. Mobile obtains the current Supabase access token and calls `POST /ai/evaluate-response`.
2. API authenticates the token and resolves the learner profile.
3. API checks idempotency before quota or model work.
4. API loads a published, approved AI exercise and protected answer rules server-side.
5. API checks the 20-request rolling quota and learner-scoped cache.
6. Provider returns strict Structured Output; backend also validates with Zod and business rules.
7. A service-role-only PostgreSQL RPC records the accepted result in one transaction.
8. Mobile validates the API response again and renders Traditional Chinese feedback.

The backend rejects unrelated skill IDs, inconsistent score/correctness combinations, missing Traditional Chinese explanations, unsafe secret-like output, and large CEFR deviations without `requiresHumanReview`.

## Failure Behavior

- A provider error or invalid output is retried once.
- If both attempts fail, the API returns a validated fallback response.
- Fallback results do not create attempts, change mastery, or consume lesson completion.
- The mobile app preserves the learner answer and offers retry.
- Missing bearer tokens, invalid requests, rate limits, and database failures use the shared API error envelope without stack traces.

## Data And Security

Migration `202607130002_phase5_ai_grading.sql` adds `ai_feedback`, `ai_usage_logs`, and `record_ai_attempt`.

- Learners can read only their own feedback and usage records.
- `record_ai_attempt` is executable only by `service_role`.
- Published fixed-exercise answers remain client-readable; AI reference answers are filtered from anon/authenticated RLS.
- Cache keys include learner ID, exercise ID/version, normalized response, prompt version, and schema version.
- Usage logs store request metadata and cost signals, not the complete learner answer or prompt.

## Local Run

Create the root `.env` from `.env.example`, then copy the local `API_URL`, `SERVICE_ROLE_KEY`, anon key, and public URL values from `supabase status --output env`. Set `OPENAI_API_KEY` for real evaluation.

For deterministic local verification only:

```powershell
$env:AI_EVALUATION_FAKE_MODE = "true"
pnpm dev:api
```

With Supabase, the API, and mobile web already running, the database/API integration script is:

```powershell
$status = @{}
supabase status --output env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="(.*)"$') { $status[$matches[1]] = $matches[2] }
}
$env:SUPABASE_URL = $status.API_URL
$env:SUPABASE_ANON_KEY = $status.ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
pnpm --filter @deutschtrainer/api verify:local
```

## Verification

Completed on 2026-07-13:

- Full Supabase reset applied all Phase 1-5 migrations and four AI exercise seeds across B1-C2.
- Local integration verified first evaluation, idempotent replay, learner-scoped cache, persisted feedback/usage/attempt/error/review rows, protected AI answers, cross-user RLS, and denied authenticated RPC execution.
- Provider unit tests cover valid results, invalid-skill retry, cache, quota, missing configuration, and repeated timeout fallback.
- Jest passed 8 suites and 37 tests; Prettier, ESLint, every workspace TypeScript check, Expo dependency check, and peer dependency check passed.
- Supabase schema lint returned no findings, and a shadow-database diff found no migration drift.
- Expo production web export and Next.js admin production build passed; the mobile source and production bundle contained no server-secret markers.
- Playwright completed registration, onboarding, all six fixed B1 exercise types, one forced AI network failure, preserved-answer retry, real local API grading, desktop screenshot, and 390 px overflow check.

## Known Limits

- Long-form versioned writing and inline offsets are Phase 6 work.
- `requiresHumanReview` is shown to the learner, but the reviewer queue and admin review workflow are not yet implemented.
- The deterministic provider is a test fixture, not a production grading model.
- Model name and pricing defaults can change; deployment configuration must be reviewed before production cost reporting is treated as authoritative.
- AI feedback is advisory and can be wrong; the app states this directly in the result panel.
