# Admin App

Next.js content operations console.

Phase 8 includes:

- Supabase email/password session and content-team role gate.
- Course and exercise draft editing through transaction RPCs.
- Immutable content versions and review queue decisions.
- Structured, review-required AI exercise drafts.
- Admin-only publishing and audit log inspection.

Supplemental Stage D now adds:

- A public Traditional Chinese product website at `/`.
- Product capability and Android delivery status at `/features`.
- Privacy, terms, support, and account-deletion status pages.
- Search metadata, Open Graph artwork, favicon, robots, and sitemap.
- A dedicated dynamic `/admin` route with Supabase SSR cookies.
- Server-side signed-claim and `profiles.role` checks before the Admin workspace loads.
- A Next.js 16 `proxy.ts` that refreshes auth cookies without treating proxy as authorization.

Copy `.env.example` to `.env.local`, insert the local anon key, then run `pnpm dev:admin` from the repository root. Local builds may use HTTP. Staging and production require explicit non-local HTTPS Site/API/Supabase URLs, a valid anon key, and a release ID. Service-role and OpenAI keys belong only to `apps/api` runtime configuration.

Public routes do not import `AdminConsole`. `/admin` refreshes the session in proxy, verifies signed
claims and the content-team role during the server render, and then retains the existing client
session/profile check. Database RLS and privileged RPCs remain the authoritative authorization
boundary.

The account-deletion page intentionally states that whole-account self-service is not deployed yet.
Individual writing and speaking deletion remains available. The account-deletion API, connected site
deployment, and real-device acceptance are separate follow-up stages.
