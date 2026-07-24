# Supplemental Stage D: Public site and Admin route boundary

Date: 2026-07-24

## Scope completed in this stage

The existing Next.js Admin application now owns two deliberately separate product surfaces:

| Surface            | Routes                                                                                                 | Runtime boundary                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Public website     | `/`, `/features`, `/privacy`, `/terms`, `/account-deletion`, `/support`, `/robots.txt`, `/sitemap.xml` | Static server-rendered pages; no Admin workspace import                        |
| Content operations | `/admin`                                                                                               | Dynamic server render with Supabase SSR cookies and content-team authorization |

The public website is written in Traditional Chinese and contains:

- product positioning and the B1-C2 learning loop;
- supported levels and implemented capabilities;
- an Android Demo/connected Preview status boundary;
- privacy and terms;
- support and security-reporting routes;
- an accurate account-deletion status page;
- page metadata, canonical site metadata base, favicon, Open Graph metadata and artwork;
- robots rules that exclude `/admin`, plus a public sitemap.

The site does not claim that connected Preview, production hosting, or whole-account self-service
deletion is already available. The GitHub offline Demo remains explicitly separate from the
connected Preview.

## Admin authorization sequence

1. Next.js `proxy.ts` runs only for `/admin/:path*`.
2. It refreshes an expired Supabase cookie using `getClaims()` and writes any updated cookies to the
   response.
3. Proxy is session maintenance only and does not grant access.
4. The `/admin` Server Component creates a request-scoped Supabase SSR client.
5. It calls `auth.getClaims()` and requires a signed `sub`.
6. It queries the authenticated user's `profiles` row through RLS and accepts only
   `content_editor`, `reviewer`, or `admin`.
7. Only then does the route import and render `AdminConsole`.
8. The existing client session/profile gate and all database RLS/privileged RPC checks remain in
   place.

Changing the browser client from local-storage auth to `@supabase/ssr` cookie auth makes the session
visible to the Server Component without exposing the service-role key.

## Security details

- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` remain API-only secrets.
- Public pages use only `NEXT_PUBLIC_*` configuration.
- `/admin` is excluded from search indexing and public sitemap entries.
- GitHub Private vulnerability reporting is enabled for the public repository.
- The protected content privilege migration revokes hosted PostgREST access to writing rules and
  listening transcripts from `anon` and `authenticated`; RLS remains a second boundary.

## Verification evidence

Completed locally on 2026-07-24:

- Admin TypeScript check passes.
- ESLint passes for `apps/admin`.
- Next.js 16.2.10 production build passes.
- Six public pages prerender as static content.
- `/admin` builds as a dynamic server route with Next.js Proxy.
- Desktop browser visual inspection passes for the homepage.
- Browser semantic inspection confirms the heading and navigation structure for all public pages.
- `/admin` without valid public environment configuration renders the closed setup state rather than
  loading the Admin workspace.
- The generated Open Graph asset is `1200 x 630`, contains the exact strings `DeutschTrainer` and
  `B1 · B2 · C1 · C2`, and is stored at `apps/admin/public/og.png`.

## Explicit follow-ups

This stage does not complete:

1. whole-account deletion API, destructive confirmation UI, storage cleanup, or device acceptance;
2. production website hosting and `NEXT_PUBLIC_SITE_URL`;
3. deployed HTTPS API and site/API CORS pairing;
4. connected EAS Preview APK and Android real-device matrix;
5. store distribution or a claim that the connected learner product is publicly available.
