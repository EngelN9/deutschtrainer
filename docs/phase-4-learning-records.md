# Phase 4 Learning Records

## Scope

Phase 4 turns a graded fixed exercise into a durable learning event. The mobile app now records attempts, updates skill mastery, creates error records, schedules reviews, persists lesson progress, and exposes review and analytics workflows.

Implemented learner routes:

- `/reviews`: due-review queue grouped by exercise.
- `/errors`: attempt-level error history with resolved German answer text.
- `/analytics`: accuracy, learning time, seven-day activity, and weakest skills.

## Database

Migration `202607130001_phase4_learning_records.sql` adds:

- `attempts`
- `attempt_answers`
- `error_records`
- `skill_mastery`
- `review_queue`
- `lesson_progress`

Learners receive read-only table grants and can only select rows owned by `current_profile_id()`. Writes go through the authenticated `record_fixed_attempt` security-definer RPC. The function validates the published exercise relationship and performs the following work in one PostgreSQL transaction:

1. Rejects invalid input and resolves the authenticated profile.
2. Returns an existing attempt when the user/idempotency key already exists.
3. Inserts the attempt and normalized answer payload.
4. Completes all due skill reviews covered by a review-mode exercise.
5. Updates every skill mapped to the exercise.
6. Creates generic fixed-exercise error records for an incorrect answer.
7. Creates or reschedules one active review per user, skill, and exercise.
8. Updates the lesson completion snapshot.

## Learning Rules

Mastery remains in the `0-100` range. Updates consider correctness, hint use, response time, exercise difficulty, streaks, and recent errors.

Initial review intervals follow the specification:

| Result                      | Interval | Priority |
| --------------------------- | -------: | -------: |
| Incorrect                   | Same day |      100 |
| Correct with hint           |    1 day |       80 |
| Correct but slow            |   3 days |       60 |
| Correct and stable          |   7 days |       40 |
| Stable at least three times |  14 days |       30 |
| Stable at least six times   |  30 days |       20 |

Review time is deterministic application logic; AI does not control scheduling.

## Mobile Data Flow

- `api` content mode treats PostgreSQL learning records behind the backend API as the cross-device source of truth。
- `mock` content mode applies the same learning-engine rules and persists the snapshot in AsyncStorage.
- The exercise player measures response time, records hint use, and preserves one idempotency key across a failed retry.
- TanStack Query invalidates the learning snapshot after a successful submission.
- Home, exercise resume, lesson result, review, error, and analytics screens consume the synchronized snapshot.

## Verification

Completed on 2026-07-13:

- Full Supabase reset applied all five migrations and the B1-C2 seed.
- REST/RPC integration test used two authenticated users.
- Replaying one idempotency key retained one attempt.
- One incorrect multi-skill answer created two error, mastery, and same-day review records.
- Completing the review closed both due skill items and scheduled both next intervals.
- The second user saw zero attempts belonging to the first user.
- Jest: 7 suites and 29 tests passed.
- ESLint and all workspace TypeScript checks passed.
- Expo production web export and Next.js admin production build passed.
- Playwright with system Chrome completed registration, onboarding, incorrect answer, due review, correct review, error history, analytics, desktop screenshots, and a 390 px overflow check.

## Known Limits

- Phase 9 已解決 client grading 信任問題：Client 只送原始答案，後端重新評分並透過 service-role-only RPC 保存。
- Phase 4 uses `task_completion` as the generic fixed-exercise error type. Detailed linguistic classification starts in Phase 5.
- Push notifications for scheduled reviews are not part of this phase.
- Review intervals are the specified deterministic first version, not full SM-2.
