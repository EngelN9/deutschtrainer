# Phase 3 Courses and Exercises Report

## Scope

Phase 3 implements course discovery, lesson details, deterministic fixed exercises, interchangeable content sources, and durable local lesson progress. It does not implement server attempts, skill mastery, review queues, AI grading, writing workflows, audio, or speaking.

## Completed

- Added Supabase course-content schema and indexes for:
  - courses
  - units
  - lessons
  - activities
  - exercises
  - exercise options and answers
  - skills
  - grammar topics
  - vocabulary
- Added published-content RLS and content-team management policies.
- Added explicit anon/authenticated table privileges so PostgreSQL grants and RLS work together.
- Added repeatable B1-C2 seed content:
  - 4 courses
  - 4 units
  - 9 lessons
  - 50 approved exercises
  - 20 skills
  - 10 grammar topics
  - 50 vocabulary items
- Added six deterministic exercise types:
  - multiple choice
  - multiple select
  - fill blank
  - sentence order
  - matching
  - error correction
- Added exact and partial-credit grading tests.
- Added a Zod-validated `CourseCatalog` boundary. Database rows are mapped to ViewModels before reaching UI components.
- Added content-source switching; Phase 9 standardized the remote value as `api` while retaining legacy `supabase` compatibility.
- Added per-user AsyncStorage progress with an awaited write before feedback or navigation.
- Added routes:
  - `/home`
  - `/courses`
  - `/unit/[unitId]`
  - `/lesson/[lessonId]`
  - `/exercise/[lessonId]`
  - `/lesson-result/[lessonId]`
- Added loading, empty, error, and retry states for course views.

## Acceptance Evidence

- Local PostgreSQL counts verified 4 courses, 9 lessons, 50 exercises, 20 skills, 10 grammar topics, and 50 vocabulary items.
- Exercise distribution verified across all six Phase 3 types.
- Browser flow verified registration, onboarding, home, B1/B2/C1/C2 catalog display, the five-lesson B1 unit, lesson metadata, exercise submission, and progress restoration after reload.
- The browser flow also exposed and led to a fix for missing table privileges that RLS policies alone do not provide.
- Mock catalog tests verify all four CEFR levels and all six fixed exercise types.

## Content Source

The repository returns one UI contract from both adapters:

```text
Database rows or mock fixture
  -> repository mapping
  -> Zod CourseCatalog validation
  -> React Query
  -> screens and exercise player
```

Use `mock` for UI work without course-network calls. Phase 9 起使用 `api` 讀取已發布 seed；舊 `supabase` 設定值會相容轉成 `api`。

## Progress Semantics

- Progress is namespaced by profile ID on the device.
- Re-submitting an exercise updates its result without duplicating completion.
- Completing every exercise marks the lesson complete.
- Resetting one lesson leaves other lessons untouched.
- The write is awaited before showing final feedback, preventing fast reload or app-close races.

## Known Limits

- Progress is local to the device in Phase 3. Server attempts and cross-device synchronization begin in Phase 4.
- Seed answers are readable by the client because deterministic exercises must support offline grading.
- Dictation, listening comprehension, and listening assets begin with the audio phase.
- Translation and free response require the AI grading phase.
- Onboarding still uses sequential writes rather than a database transaction/RPC.
- On this Windows environment, `supabase db reset` may report an unhealthy Storage container after migrations and seed have completed. Course/auth/PostgREST services remain independently verifiable.
