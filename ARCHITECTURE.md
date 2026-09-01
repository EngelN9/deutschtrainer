# Virtual Classroom Phase 0 Architecture

> This document covers only the isolated Phase 0 classroom. The existing learner app, Admin, API,
> Supabase, offline, and release architecture remains authoritative in
> [`docs/architecture.md`](docs/architecture.md).

## Scope

Phase 0 proves one narrow interaction for one developer account: a five-minute browser voice
session can produce validated, ordered whiteboard operations. It deliberately has no persistence,
learning-engine update, transcript storage, migration, public quota, or external tester access.

## Topology

```text
apps/classroom (browser)
  |-- Supabase Auth (public URL + anon key; login only)
  |-- POST application/sdp + bearer session
  v
DeutschTrainer API
  |-- validates session, verified email, learner role, and profile allowlist
  |-- derives an opaque HMAC safety identifier
  |-- adds fixed model, prompt, voice, and tool schema
  |-- POST /v1/realtime/calls with the server-only OpenAI key
  v
OpenAI Realtime WebRTC
  |-- SDP answer returned through the API
  |-- audio track to the browser
  `-- data-channel function calls -> validated whiteboard reducer -> Excalidraw
```

The implementation uses the official unified WebRTC call interface. The browser sends its SDP
offer to `POST /classroom/realtime-call`; the API sends the server-controlled session configuration
and offer to `/v1/realtime/calls` and returns only the SDP answer. No standard or ephemeral OpenAI
credential is exposed to browser code.

References:

- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Realtime client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets)
- [Realtime pricing](https://developers.openai.com/api/docs/pricing)
- [GPT-Realtime Mini](https://developers.openai.com/api/docs/models/gpt-realtime-mini)

## Server boundary

The API accepts only:

```text
POST /classroom/realtime-call
Authorization: Bearer <Supabase access token>
Content-Type: application/sdp
Body: non-empty SDP offer, maximum 64 KiB
```

All API bodies also have a one-MiB streaming limit. Classroom access fails closed unless the
feature is enabled, the provider is configured, the authenticated profile is an email-verified
learner, and its profile ID is in the server-side allowlist. The provider receives an HMAC-derived
`OpenAI-Safety-Identifier`, not the profile ID or email.

The response is `application/sdp` with `Cache-Control: no-store`. Provider status, raw error body,
credentials, profile ID, email, prompt body, and stack traces are never returned to the client.
`/health` exposes only `classroomEnabled` and `classroomConfigured`.

Required server-only settings:

- `CLASSROOM_ENABLED=false`
- `CLASSROOM_ALLOWED_PROFILE_IDS`
- `OPENAI_REALTIME_MODEL=gpt-realtime-mini-2025-12-15`
- `OPENAI_SAFETY_IDENTIFIER_SALT`
- `OPENAI_API_KEY`

Enabling the classroom without the key, allowlist, salt, or model configuration fails at startup.
The three `VITE_*` variables are public browser settings and contain only the approved API URL,
Supabase URL, and Supabase anon key.

## Browser lifecycle

1. The learner signs in on the classroom origin. The client verifies the profile only to render an
   early message; the API repeats all authorization and is authoritative.
2. The browser requests microphone permission and creates an `RTCPeerConnection` plus data channel.
3. The browser posts its SDP offer and receives an SDP answer from the API.
4. The provider audio track is played by the browser. Tool arguments arriving on the data channel
   are parsed through the production Zod schema before reducer dispatch.
5. On stop, timeout, or failure, microphone tracks, data channel, and peer connection are closed.

The five-minute countdown is a client cleanup mechanism. It cannot protect cost against a modified,
crashed, or malicious client. Client-secret TTL documentation constrains creating a session; it
must not be treated as proof that an already-started session is forcibly terminated. External use
therefore remains blocked until an unbypassable server/provider-side hangup and budget control are
demonstrated. Cost planning must use current token-based provider pricing and measured usage, not a
fixed per-minute estimate.

## Whiteboard protocol

Every operation contains `operationId`, `turnId`, and stable element identifiers:

- `write_line`
- `highlight_span`
- `annotate`
- `replace_text`

The versioned discriminated union rejects unknown tools, raw HTML, oversized text, missing targets,
and invalid UTF-16 spans. Reducer invariants are:

- a repeated `operationId` is a no-op;
- operations from superseded turns are discarded;
- targets must already exist;
- replacing text removes span overlays that no longer refer to valid text;
- provider strings remain data and never become raw HTML.

When the learner interrupts, the client sends `response.cancel`, marks that turn superseded, and
rejects its late board operations. Each function call receives a success or safe failure result so
the provider does not silently assume an operation landed.

## Deliberate omissions

Phase 0 introduces no conversation tables, transcript storage, Storage object, quota reservation,
usage log, mastery update, review entry, admin editor, migration, WebSocket service, media server,
CRDT, native classroom, or multi-user room. Those require separate architecture, RLS, deletion,
cost, and operational reviews after the vertical slice is accepted by a human.
