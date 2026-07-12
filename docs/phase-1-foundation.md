# Phase 1 Foundation Report

## Completed

- Created a pnpm monorepo workspace.
- Created a minimal Expo Router mobile app in `apps/mobile`.
- Created a minimal Next.js admin app in `apps/admin`.
- Created an API boundary package in `apps/api`.
- Created shared packages for domain types, validation, grading, learning engine, AI schemas, AI prompt metadata, database contracts, UI tokens, and config notes.
- Enabled TypeScript strict mode across workspace packages.
- Added ESLint, Prettier, Jest, lint-staged, Husky bootstrap, and GitHub Actions CI.
- Added `.env.example` with public versus server-only variables.
- Added Supabase local config, foundation migration, seed file, and function directory notes.
- Added initial unit tests for grading, learning-engine, validation, and AI schemas.
- Added ADR 0001 for pnpm workspace tooling.

## Verification

The following checks passed locally:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @deutschtrainer/mobile exec expo export --platform web --output-dir ../../work/mobile-export-check
pnpm --filter @deutschtrainer/admin build
```

Test result:

```text
Test Suites: 4 passed, 4 total
Tests: 8 passed, 8 total
```

## Security Check

- No OpenAI API key is present in mobile or admin code.
- `.env.example` separates `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` from server-only secrets.
- The mobile app imports shared types and UI tokens only; it does not call Supabase tables directly.
- Supabase foundation migration enables RLS for profiles, preferences, levels, feature flags, and audit logs.
- Admin-only policies are defined for feature flags and audit logs.

## Known Limits

- Supabase CLI was later verified with local Docker. The project starts with `supabase start --exclude logflare --ignore-health-check` on this Windows environment.
- The Supabase migration is a foundation migration only. The full course, exercise, review, AI, writing, listening, and speaking schema remains documented and will be implemented in later phases.
- The mobile app and admin app are shell screens only; auth, onboarding, course loading, and exercises are intentionally deferred.
- GitHub Actions was added but cannot be executed locally without a GitHub runner.

## Manual Acceptance Steps

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run quality checks:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

3. Start the mobile app:

   ```bash
   pnpm dev:mobile
   ```

4. Start the admin app:

   ```bash
   pnpm dev:admin
   ```

5. If Supabase CLI is installed, start local Supabase:

   ```bash
   pnpm supabase:start
   supabase db reset
   ```

## Next Recommended Task

Start Phase 2: implement authentication and navigation.

Suggested Codex task:

```text
請依照 Phase 2 實作帳號及導覽：Supabase Auth 註冊、登入、登出、忘記密碼、初次設定、程度選擇與 Expo Router protected navigation。請先建立必要 schema/migrations/tests，不要開始課程與題目功能。
```
