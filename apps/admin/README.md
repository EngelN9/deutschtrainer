# Admin App

Next.js content operations console.

Phase 8 includes:

- Supabase email/password session and content-team role gate.
- Course and exercise draft editing through transaction RPCs.
- Immutable content versions and review queue decisions.
- Structured, review-required AI exercise drafts.
- Admin-only publishing and audit log inspection.

Copy `.env.example` to `.env.local`, insert the local anon key, then run `pnpm dev:admin` from the repository root. Service-role and OpenAI keys belong only to `apps/api` runtime configuration.
