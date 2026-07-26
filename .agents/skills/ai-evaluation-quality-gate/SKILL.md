---
name: ai-evaluation-quality-gate
description: "Gate DeutschTrainer AI evaluation quality, schema safety, prompt versioning, retries, caching, cost controls, and answer protection. Use for AI grading, writing feedback, translation/free-response evaluation, listening/speaking AI, structured outputs, prompts, or fake-mode readiness; do not use for deterministic fixed-answer grading or general content proofreading."
---

# AI Evaluation Quality Gate

## Inputs

Collect:

- Feature scope: free response/translation, writing, listening, speaking, TTS/STT, or Admin draft generation.
- Target mode: deterministic local fake, preview/staging real provider, or production.
- Commit SHA, prompt/schema versions, model configuration source, and expected rubric.
- Evaluation set or sampling plan across CEFR levels.
- Available provider access and explicit authorization to incur external API cost.

Never display, log, commit, or copy provider keys, Supabase service-role keys, tokens, or private learner submissions. Sanitize report examples.

## Establish the Contract

1. Read `docs/ai-integration.md`, `docs/ai-output-schemas.md`, `docs/phase-5-ai-grading.md`, `docs/phase-6-writing.md`, and `docs/phase-7-audio-speaking.md`.
2. Read `packages/ai-prompts/src/index.ts` and record prompt IDs and versions.
3. Read `packages/ai-schemas/src/index.ts` and compare each Zod schema with its Structured Outputs JSON Schema.
4. Read applicable service, provider, repository, validation, route, and tests under `apps/api/src/evaluation/`, `writing/`, `audio/`, and `content-generation/`.
5. Trace prompt version, schema version, model, provider request ID, usage, estimated cost, cache/replay identity, and learner identity.
6. Confirm answer keys, trusted grading notes, transcripts, and reference content remain server-side.

Treat document claims as requirements until confirmed in code and tests.

## Run Structural Gates

```powershell
pnpm test -- packages/ai-schemas/src/index.test.ts apps/api/src/evaluation/evaluationService.test.ts apps/api/src/writing/writingService.test.ts apps/api/src/audio/audioService.test.ts apps/api/src/content-generation/contentGenerationService.test.ts
pnpm --filter @deutschtrainer/ai-schemas typecheck
pnpm --filter @deutschtrainer/ai-prompts typecheck
pnpm --filter @deutschtrainer/api typecheck
pnpm --filter @deutschtrainer/api build
```

Verify:

- Provider output is constrained by JSON Schema, parsed with Zod, and subjected to feature-specific business validation.
- Unknown fields and invalid enums, IDs, offsets, scores, or relationships fail closed.
- Invalid output is retried only within the implemented budget and never persisted as successful feedback.
- Timeout and provider unavailability produce controlled fallback/error behavior.
- Idempotent replay and caches are learner- and request-scoped.
- Usage/cost records distinguish cached, failed, and successful calls.
- Prompt and schema versions are stored with results.
- Answer keys and trusted task material do not leak into clients or learner-visible output.

Mark missing test coverage `BLOCKED`, even when implementation appears correct.

## Run Local Integration Evidence

When disposable local Supabase and the local API are available:

```powershell
pnpm --filter @deutschtrainer/api verify:local
pnpm --filter @deutschtrainer/api verify:writing:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:admin:local
```

Use fake mode only for deterministic wiring, schema enforcement, persistence, replay, authorization, and fallback UX. Label results `LOCAL FAKE EVIDENCE`. Never use fake mode as evidence of linguistic quality, provider reliability, latency, or production cost.

## Review Feature-Specific Quality

- Free response/translation: verify exercise-type scope, multiple valid answers, skill allowlisting, zh-TW feedback, ambiguity escalation, replay scope, and answer protection.
- Writing: verify all ten rubric dimensions, CEFR estimate, UTF-16 exclusive offsets, exact original matching, first/later version behavior, repeated errors, revision tasks, and deletion.
- Listening: separate deterministic dictation/comprehension scoring from AI generation; verify transcript reveal, protected content, TTS cache, and usage logging.
- Speaking: verify storage ownership, transcription idempotency, timings/comparison, deletable fallback records, and the explicit limitation that STT comparison is not precise pronunciation scoring.
- Admin drafts: verify authorized roles, draft-only persistence, `requiresHumanReview`, invalid-output rejection, and mandatory human publication review.

## Run Real-Provider Sampling

Run real-provider sampling only with authorized cost in the intended non-production environment. Never paste a key into a command or report.

Cover B1-C2 and include correct, incorrect, partial, ambiguous, empty, adversarial, prompt-injection-like, and multiple-valid-answer inputs. Exercise writing versions, provider failure, malformed output, timeout, retry, cache hit, and idempotent replay. Record false positives, false negatives, unstable judgments, latency, tokens, estimated cost, and human decisions.

Do not claim complete quality from a subjective sample. State sample size, selection method, limitations, and reviewer. If real-provider evidence is mandatory but unavailable, mark production quality `BLOCKED`.

## Output and Pass Conditions

Return:

1. Target, commit, model source, prompt/schema versions, and fake/real mode without secret values.
2. Feature matrix covering contract, validation, retry/timeout, cache scope, usage/cost, answer protection, evidence, and status.
3. Systematic schema/authorization/persistence/privacy findings.
4. Separate sanitized quality-sample findings.
5. Blocked production evidence.
6. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only when all structural gates and required real-provider/human evidence pass. Use `FAIL` for reproduced unsafe, invalid, leaking, cross-user, or materially wrong behavior. Use `BLOCKED` for missing provider, environment, dataset, or human-review evidence. Use `NOT APPLICABLE` only when the change cannot affect an AI path.
