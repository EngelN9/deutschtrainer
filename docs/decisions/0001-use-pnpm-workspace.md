# ADR 0001: Use pnpm Workspace for Phase 1 Monorepo

## Status

Accepted

## Context

The product needs a monorepo containing Expo mobile, Next.js admin, backend boundaries, shared types, validation, grading, learning-engine, AI schemas, prompts, database contracts, and tooling config.

Phase 1 must establish a runnable foundation with TypeScript strict mode, ESLint, Prettier, Jest, GitHub Actions, environment examples, and Supabase local configuration.

## Decision

Use pnpm workspace as the Phase 1 monorepo layer.

Do not add Turborepo in Phase 1. The current project is small enough that pnpm recursive scripts provide the needed lint, typecheck, and test orchestration without introducing another cache/config layer.

## Consequences

- Workspace packages can use `workspace:*` dependencies.
- CI can run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- A future ADR can add Turborepo if build times or task graph complexity justify it.
- pnpm 11 build-script approval is configured through `pnpm-workspace.yaml` with `allowBuilds.sharp = true` for Next.js image tooling.
