# Supabase Local Development

The local stack applies the repository's complete append-only migration history: identity, governed
course content, learning records, AI grading, writing, listening/speaking, administration, API
boundaries, notifications, offline sync, the vocabulary/grammar knowledge API, account-data rights,
explicit database-function execution allowlists, fixed function search paths, and least-privilege
client table grants/defaults.

Run locally after installing the Supabase CLI:

```bash
pnpm supabase:start
pnpm supabase:reset
```

Text-conversation sessions remain outside the implemented release boundary. Their planning model is
documented in `docs/database-schema.md`; no current migration or API claims that capability.
