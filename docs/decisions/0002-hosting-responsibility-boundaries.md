# ADR 0002: Hosting Responsibility Boundaries

## Status

Accepted

## Context

A draft ADR proposed moving the Next.js app to Vercel, putting DNS and media storage on Cloudflare
(R2), and keeping the API on Render, data on Supabase, and AI on OpenAI. Checked on 2026-09-16,
several of its premises do not match the current system:

- **Everything runs on Render.** The root `render.yaml` defines three free services on
  `*.onrender.com`: the API (`deutschtrainer-engeln9-api`, Docker), the Next.js public site and
  Admin console in one app (`deutschtrainer-engeln9-site`), and the learner web
  (`deutschtrainer-engeln9-web`, Expo static export that also ships `apps/classroom`).
- **The learner web is the product.** The beta is web-only; `apps/admin` is not the primary target.
- **No custom domain is planned.** Services are addressed by their Render hostnames, and the API's
  `CORS_ALLOWED_ORIGINS` names those origins.
- **Media already has a security model.** Audio lives in Supabase Storage (`listening-audio`,
  `speaking-audio`) with owner-scoped paths, RLS, signed URLs and account-deletion cleanup
  (`apps/api/src/audio/supabaseAudioRepository.ts`). Moving it means re-implementing that model.
- **Media volume is negligible.** Supabase Storage holds two objects, 51 kB in total, against the
  free plan's 1 GB.
- **There is no production traffic.** No request, bandwidth or cost data exists to justify a
  migration.
- **Cloudflare and Vercel accounts exist and are connected to AI assistants** (Claude and ChatGPT).
  The Cloudflare account has no Workers, KV namespaces or D1 databases, and R2 is not enabled.
  Connected assistants can create and delete resources there, and nothing in the repository records
  what those accounts should contain.

## Decision

Each capability has one primary provider. The current assignment stays until its trigger fires, and
each move is its own change backed by measured data.

| Capability                             | Primary now                    | Possible target | Trigger to move                                                         |
| -------------------------------------- | ------------------------------ | --------------- | ----------------------------------------------------------------------- |
| Learner web (Expo static + classroom)  | Render static                  | —               | —                                                                       |
| Public site + Admin (Next.js)          | Render web service             | Vercel          | Cold starts measurably hurt sign-ups and Render Starter does not fix it |
| Node.js API                            | Render                         | —               | A separate ADR; Cloudflare Workers is not a drop-in runtime             |
| PostgreSQL, Auth, RLS, structured data | Supabase                       | —               | —                                                                       |
| Media objects                          | Supabase Storage               | Cloudflare R2   | Storage above 800 MB, or storage egress above 4 GB a month              |
| Media metadata, ownership, lifecycle   | Supabase                       | —               | —                                                                       |
| Domain and DNS                         | Render-provided hostnames      | —               | — (buying a domain needs its own ADR)                                   |
| AI inference, STT, TTS, realtime       | OpenAI, called only by the API | —               | —                                                                       |

Rules that hold regardless of provider:

- **Hosting changes are made from the repository.** A resource on Render, Vercel or Cloudflare exists
  only if a repository file declares it (`render.yaml`, or a future `vercel.json` / `wrangler.jsonc`)
  or `docs/operations.md` records it. AI assistants may read these accounts. Creating or deleting a
  resource, or changing an environment variable, needs an explicit request from the maintainer in
  that session and a matching repository change.
- OpenAI and Supabase service-role credentials stay server-side. The API authorizes, validates,
  enforces quotas and records usage before every provider call.
- No second CDN or proxy layer in front of a host that already provides one.
- If media moves to R2, Supabase keeps the metadata row, owner-scoped object keys are preserved, and
  account deletion must still remove the object. R2 needs no custom domain: the API issues presigned
  URLs, as it issues Supabase signed URLs today.
- No custom domain. Render hostnames (or `*.vercel.app` if the site moves) are the public addresses.

## Consequences

- No infrastructure work is required now; effort stays on validating the beta.
- Render free-tier cold starts remain accepted. The first fix, if they matter, is Render Starter for
  the affected service; it stays on the same host.
- Moving the site to Vercel for a paid beta means Vercel Pro, because the Hobby plan is limited to
  non-commercial use.
- Renaming a Render service, or moving the site to Vercel, changes a public origin, so
  `CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_LEARNER_WEB_URL`, Supabase Auth redirect URLs and the
  `EXPO_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` values must change together.
- Importing the repository into Vercel before the trigger fires would auto-deploy a second, untracked
  copy of the site with its own copy of the Supabase settings; do not do it early.
- A later ADR supersedes a row of the table when its trigger fires.
