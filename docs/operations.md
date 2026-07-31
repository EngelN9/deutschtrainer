# Operations

## Scope and current boundary

This runbook defines the production acceptance contract. It does not claim that monitoring,
backups, restore drills, distributed rate limiting, deployment, or rollback have already been
configured. Until provider-backed evidence exists, those items remain `BLOCKED`.

## Runtime health and request tracing

- `GET /health` is the container health endpoint.
- The Node adapter accepts a safe `x-request-id` or creates one, returns it on every response, and
  uses the same value in API error envelopes.
- Each request produces one JSON event containing only level, event, request ID, method, pathname,
  status and duration. Query strings, headers, tokens, request/response bodies, writing text,
  transcripts and audio content must not be logged.
- Startup and shutdown emit bounded JSON lifecycle events. Raw exception objects and environment
  dumps must not be emitted.

A deployment must collect these events centrally and alert at least on sustained health failures,
5xx rate, latency, restart loops, AI/provider failures, quota/rate-limit exhaustion and database
connection failures. Thresholds and on-call destinations are provider-specific external decisions,
so repository defaults are not presented as deployed alerts.

## Rate limiting

The current private-request limiter is process-local. It is useful for local development and a
single runtime, but is not a global distributed control. A multi-instance staging or production
deployment must add a gateway or shared store, define the key/window/limit and replay behavior, and
verify behavior across at least two instances before Gate I can pass.

## Deployment checklist

1. Build and verify `apps/api/dist/server.mjs`; build the root-context Docker image.
2. Import the root `render.yaml` from the public GitHub repository. The Blueprint creates the API,
   the Next.js public/Admin site, and the Expo Web learner preview.
3. Enter `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` only in Render's
   protected `sync: false` environment prompt; never print values.
4. Confirm `APP_ENV=staging`, `HOST=0.0.0.0`, the platform `PORT`, and fake mode off.
5. Apply append-only migrations to staging and run remote owner/role/security verification.
6. Confirm the public HTTPS `/health`, request IDs, structured log ingestion and alert delivery.
7. Configure the Admin and learner Web services with public-only remote URLs/publishable keys.
   Confirm `/admin` remains server-gated and the learner build uses the API content source.
8. Verify direct SPA routes on the learner Web URL and the public support, privacy, terms, and
   account-deletion routes on the Next.js URL.
9. Record all three Render service/deploy IDs and URLs, the API image digest, migration head,
   source commit and rollback target.

This URL deployment does not publish an Android or iOS package. Store submission, signing, native
installation, notifications, microphone permissions, restart, and background behavior remain
outside this preview.

The selected free Render service is limited to staging: it can sleep after inactivity, uses an
ephemeral filesystem, and does not prove production availability or operations. Gate I remains
`BLOCKED` until paid-capacity behavior, monitoring, distributed rate limiting, backup/restore and
rollback drills are verified.

## Backup, restore and rollback

- Configure provider-managed database backups and document retention outside source control.
- Before destructive schema work, capture a restore point and validate the rollback strategy.
- Rehearse restore into an isolated project; verify schema, representative owner-scoped records and
  private Storage metadata without copying sensitive content into logs.
- Application rollback uses the previous immutable image/build. Database rollback uses a new
  forward migration when data compatibility permits; never edit an applied migration or use a
  production reset.
- Record date, operator, source backup identifier, target, duration, validation and limitations.
  A written procedure without a successful drill is `BLOCKED`, not `PASS`.

## Incident and privacy operations

1. Triage by request ID, safe status/category and deployment version.
2. Do not paste JWTs, credentials, writing text, transcripts or recordings into tickets or chat.
3. Contain with the smallest reversible action; preserve audit evidence.
4. For deletion incidents, verify database, private Storage, Auth and old-token denial separately.
5. Document root cause, affected data classes, remediation, user/legal notification decision and
   prevention tests.

## Release evidence

Operational evidence must include deployment URL/environment, image/build ID, migration head,
health and alert results, distributed-rate-limit test, backup/restore drill, rollback drill,
incident owner, known limitations and timestamp. Secrets and raw private user data are excluded.
