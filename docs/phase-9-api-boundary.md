# Phase 9 Core API Boundary

## Scope

Phase 9 moves the learner app's course, fixed-attempt, progress, and review data path behind the Node API. Supabase remains the identity, database, and storage platform, but the Mobile UI no longer constructs database rows or calls the fixed-attempt RPC directly.

## Endpoints

| Method | Path                    | Access           | Cache                         | Idempotency |
| ------ | ----------------------- | ---------------- | ----------------------------- | ----------- |
| GET    | `/courses`              | public published | 60s + 300s stale revalidation | no          |
| GET    | `/courses/:courseId`    | public published | 60s + 300s stale revalidation | no          |
| GET    | `/lessons/:lessonId`    | public published | 60s + 300s stale revalidation | no          |
| POST   | `/attempts`             | learner self     | no-store                      | required    |
| GET    | `/users/me/progress`    | learner self     | no-store                      | no          |
| GET    | `/users/me/reviews`     | learner self     | no-store                      | no          |
| POST   | `/reviews/:id/complete` | review owner     | no-store                      | required    |

## Trust Boundary

- `SubmitAttemptRequest` accepts only exercise ID, raw answer, duration, hint usage, mode, and idempotency key.
- The API loads the published, approved exercise and protected grading row, then calls `@deutschtrainer/grading` itself.
- `record_fixed_attempt_service` is executable only by `service_role`; authenticated users can no longer call `record_fixed_attempt`.
- Existing transaction logic remains the source of truth for Attempt, ErrorRecord, SkillMastery, ReviewQueue, and LessonProgress.
- Replay reads the original `attempt_answers.grading_result_json`; a changed answer cannot replace the first result.

## Mobile Boundary

- `courseRepository` calls `GET /courses` and validates the API DTO before producing `CourseCatalog`.
- `learningRecordsRepository` calls progress, attempt, and review endpoints.
- Mock mode retains local deterministic grading for standalone UI development.
- Phase 10 subsequently moved writing/audio structured repositories behind the API, and Phase 11 moved profile/onboarding/preferences. Supabase client remains only for Auth and owner Storage uploads.

## Verification

```powershell
pnpm --filter @deutschtrainer/api verify:learning-api:local
```

The integration creates two learners and verifies published content, level filtering, cache headers, unauthenticated denial, server grading, idempotent replay, owner-scoped progress, cross-user review denial, completed review scheduling, and direct-RPC revocation. Temporary users are deleted in `finally` cleanup.

## Deployment Note

Private learning endpoints use a per-runtime 60 requests/minute sliding window. A production deployment with multiple API instances must add a gateway or shared rate-limit store. Public course reads should be placed behind a CDN that enforces the documented 120 requests/minute policy.
