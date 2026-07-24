# Admin App

Next.js content operations console.

Phase 8 includes:

- Supabase email/password session and content-team role gate.
- Course and exercise draft editing through transaction RPCs.
- Immutable content versions and review queue decisions.
- Structured, review-required AI exercise drafts.
- Admin-only publishing and audit log inspection.

Copy `.env.example` to `.env.local`, insert the local anon key, then run `pnpm dev:admin` from the repository root. Local builds may use HTTP. Staging and production require explicit non-local HTTPS Site/API/Supabase URLs, a valid anon key, and a release ID. Service-role and OpenAI keys belong only to `apps/api` runtime configuration.

The current console still renders at `/`. Moving it under a protected `/admin` route while adding
the minimal public product/legal/support website is tracked as Stage D; database RLS and privileged
RPCs remain the authoritative authorization boundary in the meantime.
