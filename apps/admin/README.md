# Admin App

Next.js public information site and server-gated content operations console.

Phase 8 includes:

- Supabase email/password session and content-team role gate.
- Server-boundary protection for `/admin`; unauthenticated users are redirected to the admin login
  route and learners receive a forbidden response before console data is rendered.
- Course and exercise draft editing through transaction RPCs.
- Immutable content versions and review queue decisions.
- Structured, review-required AI exercise drafts.
- Admin-only publishing and audit log inspection.
- Public product, support, privacy, terms, and account-deletion pages that do not expose admin data.

Copy `.env.example` to `.env.local`, configure only the documented `NEXT_PUBLIC_*` values, then run
`pnpm dev:admin` from the repository root. Service-role and OpenAI keys belong only to `apps/api`
runtime configuration and must never be placed in this app.
