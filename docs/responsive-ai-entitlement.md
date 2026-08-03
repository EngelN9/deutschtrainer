# Responsive layout and AI entitlement

## Scope

This document records the repository contract for cross-device layouts and the first public AI
entitlement stage. It does not claim real-AI, native-device, operational, or production readiness.

## Responsive layout

The learner App uses `useWindowDimensions`; it does not branch on device name or user agent.

| Size    | Width           | Learner layout                                                             |
| ------- | --------------- | -------------------------------------------------------------------------- |
| Compact | below 600 px    | 16 px gutter, single column, horizontally scrollable seven-item bottom nav |
| Medium  | 600–1023 px     | 24 px gutter, flexible cards, complete horizontal nav                      |
| Wide    | 1024 px or more | 184 px navigation rail and content grid up to approximately 1120 px        |

Detail reading and form screens remain approximately 760 px wide. Interactive targets are at
least 44×44 px. The public site exposes a Web learner entry. Admin navigation becomes a compact
horizontal scroll row at 900 px and below; forms and command rows wrap at 640 px and below. Tables
scroll only inside `.table-scroll`.

The manual viewport acceptance matrix is 360×800, 390×844, 768×1024, 820×1180, 1024×768 and
1440×900, plus 200% text scaling and phone landscape. Automated build/export evidence does not
replace visual or native-device acceptance.

## Platform free AI

`AI_PUBLIC_ENABLED` defaults to `false`. A public AI request requires an authenticated active
`learner` profile and a Supabase Auth user with confirmed Email. Demo sessions never call these
routes. In staging or production, enabling the switch without an API-only `OPENAI_API_KEY` fails
at process startup.

The rolling 24-hour limits are:

| Feature             | Limit |
| ------------------- | ----: |
| General evaluation  |     5 |
| Writing evaluation  |     2 |
| Text to speech      |     5 |
| Audio transcription |     2 |

The database atomically reserves `user_id + feature + idempotency_key`. Successful persisted
results consume a user reservation. Cache hits and idempotent replays do not reserve quota;
provider or schema failures release the user reservation. Every actual provider attempt is still
reserved separately and contributes to the default 100 calls per UTC day platform hard limit.
Account deletion removes the user-linked quota rows but retains provider-call count rows with a
null reference, so deleting an account cannot reopen the same UTC-day global capacity. These rows
contain no key or learner content; detailed cost evidence remains in the existing redacted usage log.

`GET /users/me/ai-entitlement` returns only `providerAvailable`, source `platform_free`, a 24-hour
window and each feature's `limit`, `used`, `remaining` and nullable `resetsAt`. It never returns a
provider key.

## BYOK boundary

Personal provider keys are intentionally absent from the current API, database and UI. They may be
added only after a reviewed threat model, managed KMS-backed envelope encryption, redaction,
backup/restore, export metadata and deletion tests exist. The client must never call OpenAI
directly, and exhaustion of platform quota must never automatically switch to a personal key.

## Rollout

1. Deploy and visually verify responsive changes while `AI_PUBLIC_ENABLED=false`.
2. Add the OpenAI Project Key only to the Render API secret store and configure provider billing
   alerts; do not treat alerts as a hard stop.
3. With fake mode disabled, validate general evaluation, writing, TTS and STT against staging.
4. Enable the public switch and verify entitlement, cost logs, error envelopes and the 100/day hard
   limit.
5. Keep BYOK hidden until its separate security gate passes.

Render free-tier cold starts, real provider quality/cost/latency, KMS-backed BYOK and native Android
device acceptance remain `BLOCKED` until separately evidenced.
