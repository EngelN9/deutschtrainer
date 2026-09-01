# Operations

## Scope and current boundary

This runbook defines the production acceptance contract. Three free Render Preview services are
publicly reachable, but this does not claim that monitoring, backups, restore drills, distributed
private-request limiting, real AI, paid capacity, or rollback rehearsal have been configured.
Until provider-backed evidence exists, those items remain `BLOCKED`.

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

## Auto-deploy, and how it failed silently

All three services deploy from `main` on `autoDeployTrigger: checksPass`: Render waits for the
commit's GitHub checks and deploys when they pass. Confirmed working on 2026-08-27 — the `quality`
check completed at 04:44:07Z and all three deploys were created at 04:44:11Z with
`trigger: new_commit`.

It was broken from at least 2026-08-24 until 2026-08-27. The cause was the **Render GitHub App's
repository access not covering this repository**. Restoring it at
<https://github.com/apps/render/installations/new> under **Repository access** fixed it with no
change to `render.yaml`.

The failure mode is worth recognising because nothing reports it:

- The merge succeeds, CI is green, the pull request shows as merged.
- No deploy is created at all — not a failed one, so no notification fires.
- The preview keeps serving the previous build indefinitely. The #26 merge sat undeployed for
  three days.
- Render can still clone the repository, so a manual trigger builds the correct commit. Read
  access and event handling fail independently, and only the second one was broken.

Render does not deploy when it detects zero checks for a commit. Without access to the repository
it cannot see the checks, so this is the documented behaviour rather than an error — which is why
it is silent.

If it recurs, check repository access first. Service ids for a manual trigger in the meantime:

| Service                       | Id                         |
| ----------------------------- | -------------------------- |
| `deutschtrainer-engeln9-web`  | `srv-d9m51k3m8hqs739tsa60` |
| `deutschtrainer-engeln9-site` | `srv-d9m51k3m8hqs739tsa7g` |
| `deutschtrainer-engeln9-api`  | `srv-d9m51k3m8hqs739tsa70` |

Because a deploy can be absent rather than failed, confirm what the preview actually serves after
a merge that matters, using the check below.

## Confirming what is actually deployed

A merged pull request and a green pipeline say nothing about what the preview serves. Check the
build itself.

For the learner web service, read the current bundle name from the document, then search that
bundle for a marker only the new build contains:

```bash
js=$(curl -s https://deutschtrainer-engeln9-web.onrender.com/ | grep -oE '_expo/static/js/web/entry-[a-f0-9]+\.js' | head -1)
curl -s "https://deutschtrainer-engeln9-web.onrender.com/$js" | grep -c '<marker>'
```

**Use an ASCII marker** — an id, an asset filename, a licence or attribution string. Traditional
Chinese UI strings did not match reliably through the shell during this check: grepping the live
bundle for a zh-TW heading returned zero on a build that did contain it, while `7bdc1dd6-…`,
`365-euro-ticket` and `Emil Linus Albrecht` all matched. A CJK marker can report a correct
deployment as a failed one.

A changed `entry-<hash>.js` filename alone shows that something was rebuilt, not that the intended
change is present, so check a marker as well. For a bundled binary asset, request it directly and
compare `Content-Length` against the file in the repository.

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
