# Phase 12 Offline Courses and Attempt Sync

## Scope

Phase 12 implements the first offline learning boundary from the specification: explicitly downloaded course content, deterministic fixed-exercise grading, durable local attempts, and automatic reconnect synchronization. It does not claim offline AI or audio processing.

## Mobile Storage

- Downloads and pending attempts are isolated by authenticated profile ID in the versioned `deutschtrainer-phase12-offline` AsyncStorage item.
- Every persisted course, answer, grading result, timestamp, and queue state is parsed with Zod before use.
- Course fingerprints include course, unit, lesson, and exercise versions so the course map can expose an update action.
- A persisted settings snapshot is keyed by Supabase auth user ID. It is used only after a network failure and never masks HTTP/auth errors.
- Interrupted `syncing` attempts recover as `pending` after restart. A profile may retain at most 200 pending attempts; records are never silently evicted.
- AsyncStorage is appropriate for the current bounded catalog. Move to SQLite when one profile approaches 5 MB of downloaded JSON, requires indexed cross-course queries, or needs a materially larger queue.

## Learning Behavior

- Downloaded lessons and six deterministic fixed exercise types work without connectivity.
- Local grading and progress persistence complete before feedback is shown.
- A request that starts online and fails at the network boundary is placed into the same queue without losing the answer.
- Home and course screens expose offline/pending status. The management screen supports sync now, retry, discard, course removal, and per-attempt conflict details.
- AI exercise grading and scheduled-review completion are disabled offline. Writing evaluation, AI dialogue/generation, TTS/STT, and speaking analysis remain online-only.

## Synchronization Contract

- Pending attempts are submitted oldest-first to `POST /attempts` with their stable idempotency key, downloaded exercise version, and original `submittedAt`.
- The API reloads the trusted published exercise and grades the raw answer. Client-authored scores remain untrusted.
- `submittedAt` may be omitted by online clients. Offline replay accepts timestamps from the last 30 days and at most five minutes in the future.
- Success removes the local queue item. A changed exercise version returns `409`; network, auth, invalid-response, and rate-limit failures remain retryable, while other client-side `4xx` outcomes become explicit conflicts.
- A server result that differs from the local deterministic result is counted as adjusted; the server remains authoritative.

## Database Boundary

- `record_fixed_attempt_sync_service` requires `auth.role() = service_role` and delegates the atomic learning-record update to the existing fixed-attempt function.
- A new attempt's `attempts.submitted_at`, error timestamp, active review schedule, mastery practice time, and lesson practice/completion time are corrected to the bounded original event time.
- Authenticated and anonymous roles have no execute privilege. Direct authenticated PostgREST discovery/call returns `404`.
- Existing online clients continue to work because `submittedAt` is optional and defaults to server time.

## Verification

- Clean `supabase db reset` applies Phase 1-12 migrations and seed data in order.
- Unit tests cover profile-isolated downloads, nested version fingerprints, idempotent queue insertion, interrupted-sync recovery, conflict lifecycle, connectivity mapping, offline/remote progress merge, request validation, and server timestamp bounds.
- `verify:offline-sync:local` confirms exact millisecond submission-time persistence, every generated review scheduled from that time, idempotent replay, stale exercise `409`, stale timestamp `400`, and authenticated direct RPC `404`.
- Mobile and API strict TypeScript checks, repository-wide tests, lint, formatting, and Expo web export are release gates.

## Remaining Device Work

Before release, test Android and iOS physical devices across airplane mode, process termination/relaunch, session restoration, multiple queued answers, reconnect during submission, app backgrounding, low storage, and course update/removal. Web verification cannot prove native reachability transitions or OS storage behavior.
