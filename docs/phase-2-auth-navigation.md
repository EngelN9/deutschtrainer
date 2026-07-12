# Phase 2 Auth and Navigation Report

## Scope

Phase 2 implements account and navigation foundations only. It does not implement courses, exercises, attempts, learning analytics, AI evaluation, audio, or admin workflows.

## Completed

- Verified Supabase CLI 2.109.1 through the local Scoop shim.
- Started local Supabase on Docker with `--exclude logflare --ignore-health-check` for Windows compatibility.
- Verified Phase 1 and Phase 2 migrations were applied.
- Verified `profiles.onboarding_completed` and auth/profile triggers exist in the local database.
- Added Supabase Auth client to the mobile app.
- Added React Native session persistence with AsyncStorage.
- Added shared Zod schemas for sign-in, sign-up, forgot password, and onboarding.
- Added mobile auth service, profile repository, onboarding repository, and Zustand auth store.
- Added protected route logic for guest, onboarding, and authenticated app screens.
- Added public screens:
  - `/welcome`
  - `/sign-in`
  - `/sign-up`
  - `/forgot-password`
- Added authenticated setup screens:
  - `/onboarding`
- Added protected app shell:
  - `/home`
- Added Supabase migration for auth onboarding:
  - signup profile trigger
  - onboarding completion flag
  - learning goals field
  - role escalation prevention trigger
- Added explicit authenticated table privileges after end-to-end browser verification showed that RLS policies do not replace PostgreSQL grants.
- Added root Supabase helper scripts:
  - `pnpm supabase:start`
  - `pnpm supabase:status`
  - `pnpm supabase:reset`

## Security Notes

- The mobile app uses only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- OpenAI keys and Supabase service role keys remain server-only.
- UI screens call store actions. Database reads/writes are isolated in repository modules.
- Profile role self-escalation is blocked at the database trigger level.
- User preferences and user levels remain protected by owner RLS policies.

## Manual Acceptance Steps

1. Start local Supabase:

   ```bash
   pnpm supabase:start
   pnpm supabase:reset
   ```

2. Copy local Supabase values into the mobile `.env`:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```

3. Start the mobile app:

   ```bash
   pnpm dev:mobile
   ```

4. Verify:

   - unauthenticated `/home` redirects to `/sign-in`
   - user can register
   - user can sign in
   - first login redirects to `/onboarding`
   - completing onboarding redirects to `/home`
   - sign out returns user to public flow
   - forgot password submits without exposing stack traces

## Known Limits

- Email confirmation behavior depends on the local Supabase Auth setting.
- Onboarding persistence currently uses sequential writes, not a dedicated backend transaction function.
- The home screen now uses Phase 3 course data; server attempts and learning analytics begin in Phase 4.
- On this Windows environment, Supabase analytics/logflare is excluded because the default analytics container requires Docker daemon TCP exposure.
