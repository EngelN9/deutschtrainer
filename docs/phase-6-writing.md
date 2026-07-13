# Phase 6 Versioned Writing

## Scope

Phase 6 delivers a complete B1-C2 writing loop for Traditional Chinese learners:

- Four human-authored seed prompts with level-appropriate writing types and skill links.
- Authenticated first drafts and rewrites through `POST /ai/evaluate-writing`.
- Append-only submissions with at most ten immutable versions.
- Exact UTF-16 inline error spans, Traditional Chinese explanations, and corrections.
- Ten rubric scores: task completion, grammar, vocabulary, coherence, cohesion, register, argumentation, style, accuracy, and idiomaticity.
- First-pass revision tasks without a full rewrite; second and later passes reveal the protected trusted reference text.
- Repeated-error classification, writing analytics, failed-evaluation retry, arbitrary two-version comparison, and owner deletion.

## Request Flow

1. Mobile reads only published prompt data through Supabase RLS.
2. Mobile sends `promptId`, optional `submissionId`, German text, duration, and idempotency key.
3. API authenticates the Supabase access token and loads protected prompt rules with the service role.
4. API computes the same whitespace word count enforced by PostgreSQL.
5. `prepare_writing_version` saves the original text and word diff before any provider request.
6. The 10-request rolling 24-hour quota, provider call, one retry, token usage, latency, and estimated cost are handled server-side.
7. JSON Schema, Zod, and business validation check all scores, spans, skills, language, reference policy, repeated errors, CEFR deviation, and unsafe output.
8. `record_writing_feedback` attaches accepted feedback and updates the submission status atomically.
9. Mobile invalidates the writing workspace query and renders the stored version and feedback.

An idempotent replay returns the existing version. Reusing a key with different text, prompt, or submission returns a conflict response.

## Data Model

Migration `202607130003_phase6_writing.sql` adds:

- `writing_prompts`: public-safe task text, word limits, level, type, and skill IDs.
- `writing_prompt_rules`: service-only grading notes, outline, and complete reference text.
- `writing_submissions`: owner, prompt, level/type snapshot, current version, and workflow status.
- `writing_versions`: original text, word count, previous version, word diff, feedback link, and idempotency key.

`ai_feedback` now supports either an exercise attempt or writing version target. Every accepted writing feedback row has `feature=evaluate_writing`, `target_type=writing_version`, and a null exercise attempt.

The database rejects edits to a stale current version, rewrites before current feedback exists, identical rewrites, more than ten versions, out-of-range word counts, first-pass reference text, and later feedback without a reference text.

## Failure And Retry

- The text version is committed before quota/provider work.
- Provider timeout, network failure, missing configuration, quota exhaustion, or two invalid outputs sets the submission to `evaluation_failed` without deleting text.
- The mobile app reads the stored idempotency key only for that owner and can retry the exact version after a restart.
- A failed version must be evaluated before another rewrite can be appended.
- Usage logs contain request metadata and cost signals, never the complete learner text.

## Privacy And Security

- Anonymous and authenticated clients can read only approved, published prompt fields.
- `writing_prompt_rules` has RLS enabled and no anon/authenticated policy or grant.
- Learners can read only their own submissions, versions, feedback, and usage rows.
- Preparation, feedback attachment, and failure-state RPCs are executable only by `service_role`.
- `delete_own_writing_submission` verifies ownership and hard-deletes text, versions, and AI feedback. Usage metadata remains for cost/audit accounting and contains no essay text.
- OpenAI and Supabase service-role credentials remain backend-only.

## Local Verification

Start Supabase and the API with `AI_EVALUATION_FAKE_MODE=true`, export the local values from `supabase status -o json`, then run:

```powershell
pnpm --filter @deutschtrainer/api verify:writing:local
```

The script creates temporary users and removes them after checking first pass, idempotent replay, second pass, version immutability, diff persistence, prompt-rule protection, cross-user RLS, RPC permissions, and deletion behavior.

## Verification Evidence

Completed on 2026-07-13:

- Full local database reset applied the Phase 6 migration and seeded one approved prompt for each B1-C2 level.
- Seven writing-service unit tests passed, covering save-before-feedback, invalid-offset retry, unavailable-provider persistence, trusted second-pass reference, idempotent replay, word counting, and diff reconstruction.
- Database/API integration passed with scores `62 -> 88`, hidden first-pass reference, shown second-pass reference, two immutable texts, persisted add/remove diff, zero cross-user rows, denied direct RPC, and retained metadata-only usage after deletion.
- The existing Phase 5 integration suite passed after the writing migration.
- Browser E2E completed login, first draft, inline correction, rewrite, second-pass reference, and two-version comparison.
- Desktop and 390 px checks found no horizontal page overflow; mobile top controls remained inside the viewport.

## Known Limits

- The deterministic provider is only a local fixture; real deployment quality depends on model evaluation and content-review sampling.
- Human-review queue screens are not yet implemented even though feedback can set `requiresHumanReview`.
- Writing prompts are seeded in SQL; authoring and review UI belongs to Phase 8.
