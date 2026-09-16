# ADR 0002: Hosting Responsibility Boundaries

## Status

Accepted

## Context

A draft ADR proposed moving the Next.js app to Vercel, putting DNS and media storage on Cloudflare
(R2), and keeping the API on Render, data on Supabase, and AI on OpenAI. Several of its premises do
not match the current system:

- **Everything runs on Render.** The root `render.yaml` defines three free services on
  `*.onrender.com`: the API (`deutschtrainer-engeln9-api`, Docker), the Next.js public site and
  Admin console in one app (`deutschtrainer-engeln9-site`), and the learner web
  (`deutschtrainer-engeln9-web`, Expo static export that also ships `apps/classroom`).
- **The learner web is the product.** The beta is web-only; `apps/admin` is not the primary target.
- **No domain is owned.** `deutschtrainer.com` is parked and listed for sale. The API's
  `CORS_ALLOWED_ORIGINS` names the `onrender.com` origins.
- **Media already has a security model.** Audio lives in Supabase Storage (`listening-audio`,
  `speaking-audio`) with owner-scoped paths, RLS, signed URLs and account-deletion cleanup
  (`apps/api/src/audio/supabaseAudioRepository.ts`). Moving it means re-implementing that model.
- **There is no production traffic.** No request, bandwidth, storage or cost data exists to justify a
  migration.

## Decision

Each capability has one primary provider. The current assignment stays until a trigger below fires,
and each move is its own change backed by measured data.

| Capability                                  | Primary now                     | Possible target         | Trigger to move                                                               |
| ------------------------------------------- | ------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| Learner web (Expo static + classroom)       | Render static                   | —                       | —                                                                             |
| Public site + Admin (Next.js)               | Render web service              | Vercel                  | Render cold starts measurably hurt the public site, or Render is abandoned    |
| Node.js API                                 | Render                          | —                       | A separate ADR; Cloudflare Workers is not a drop-in runtime                   |
| PostgreSQL, Auth, RLS, structured data      | Supabase                        | —                       | —                                                                             |
| Media objects                               | Supabase Storage                | Cloudflare R2           | Storage or egress cost exceeds the Supabase plan allowance                    |
| Media metadata, ownership, lifecycle        | Supabase                        | —                       | —                                                                             |
| Domain and DNS                              | None (`onrender.com` hostnames) | Cloudflare DNS          | A domain is bought, before beta invites go out                                |
| AI inference, STT, TTS, realtime            | OpenAI, called only by the API  | —                       | —                                                                             |

Rules that hold regardless of provider:

- OpenAI and Supabase service-role credentials stay server-side. The API authorizes, validates,
  enforces quotas and records usage before every provider call.
- No second CDN or proxy layer in front of a host that already provides one. If Cloudflare DNS
  fronts Vercel or Render, records are DNS-only by default.
- If media moves to R2, Supabase keeps the metadata row, owner-scoped object keys are preserved, and
  account deletion must still remove the object.
- Hostnames are chosen once a domain is owned; none are reserved by this ADR.

## Consequences

- No infrastructure work is required now; effort stays on validating the beta.
- One billing surface (Render) plus Supabase and OpenAI until a trigger fires.
- Free-tier Render limits remain accepted for staging and the beta: cold starts and no custom domain.
- Buying a domain changes `CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_LEARNER_WEB_URL`, Supabase Auth
  redirect URLs and the `EXPO_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` values together.
- A later ADR supersedes a row of the table when its trigger fires.
