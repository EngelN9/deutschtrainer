# Phase 10 Writing And Audio Workspace API

## Scope

Phase 10 moves Mobile's structured writing and listening/speaking data access behind the Node API while keeping owner recording bytes on Supabase Storage's JWT/RLS data plane.

New protected endpoints:

- `GET /users/me/writing`
- `DELETE /writing/submissions/:submissionId`
- `GET /users/me/audio-learning`
- `POST /listening/activity`

## Boundary

- Every endpoint authenticates the Supabase access token and resolves an active profile.
- Service-role queries include an explicit learner profile filter before Zod response validation.
- Private responses use `Cache-Control: no-store`.
- Core, writing, and audio services share a per-runtime 60 requests/minute sliding window.
- `delete_own_writing_submission` and `record_listening_activity` are no longer executable by `authenticated`.
- New wrappers require `service_role`, validate an active learner, set the transaction profile, and invoke the existing owner-aware database functions.

Direct Storage upload/removal remains in Mobile only for `speaking-audio/{auth.uid()}/...`. The anon JWT and Storage RLS enforce folder ownership; no service-role credential enters the bundle.

## Mobile

The writing and audio-learning repositories now use the shared authenticated `requestApi` client for workspaces, evaluation, telemetry, transcript/dictation operations, transcription, and owner deletion. Database row mapping and direct table/RPC calls were removed from these repositories.

## Verification

Run:

```powershell
pnpm --filter @deutschtrainer/api verify:workspaces:local
```

The deterministic two-user integration verifies:

- learner A sees two immutable writing versions while learner B sees no submissions;
- cross-user writing deletion returns `404`, owner deletion succeeds, and usage metadata remains;
- learner A sees one listening attempt, speaking submission, and owner audio asset while learner B sees none;
- private Storage signing, structured rows, and deletion remain owner-scoped;
- the legacy authenticated mutation RPCs return `403/404`;
- generated TTS, dictation replay, transcription feedback, and recording cleanup still pass.

Migration `202607140003_phase10_workspace_api.sql` contains the two service-only wrappers and privilege changes.
