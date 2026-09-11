# DeutschTrainer session handoff — 2026-09-11

> This is a preservation record for the next maintainer or Codex session. It is
> a snapshot, not a release approval. Do not infer deployment, real-AI, device,
> human-language-review, or production evidence from a commit, a green CI run,
> a Demo, or this document.

## 1. Purpose and safe starting point

This handoff was created because the active agent session may be deleted. It
records the repository, remote, worktree, pull-request, and documentation state
observed on 2026-09-11 (Asia/Taipei). No application code, migration, secret,
environment setting, remote branch, pull request, deployment, or service was
modified while creating it.

Before continuing any work:

1. Read `AGENTS.md`, the relevant skill under `.agents/skills/`, and the
   relevant architecture, security, testing, and phase documentation.
2. Run `git fetch --prune origin`, `git status --short`, `git worktree list
--porcelain`, and explicit ahead/behind checks. Do not use a clean status in
   one worktree as evidence about another worktree.
3. Preserve every worktree below. Do not reset, stash, delete, move, or merge
   one merely to make the working directory look clean.
4. Treat `origin/main` as the current remote implementation baseline, not this
   checkout's local `main` branch.
5. Re-run tests and any environment-dependent verification at the exact commit
   you intend to change. Historic CI evidence is not evidence for later heads.

## 2. Snapshot of Git and GitHub state

### Remote source of truth

- `origin/main`: `67e3995611c2b75c856052377e37f27544e44566`
  (`fix: harden scoped AI provider recovery (#45)`).
- The preceding merged remote commits include:
  - `65ae802` — `feat(classroom): add controlled AI tutor beta (#36)`
  - `8671c6b` — `feat: scope writing and speaking AI beta (#44)`
  - `67e3995` — hardening for that scoped beta (#45)
- GitHub CI for `origin/main@67e3995` completed successfully on 2026-09-11:
  [quality run](https://github.com/EngelN9/deutschtrainer/actions/runs/34549607584)
  and a Pages build/deployment run. This confirms those workflows at that exact
  revision only; it does not prove that Render, Supabase, real AI, or a device
  journey currently works.

### Local checkout used to write this document

- Path: `C:\Users\User\Documents\GitHub\deutschtrainer`
- Branch: `fix/hinted-mastery-delta-sql`
- HEAD: `029d12e4146aafc85be3106bcee83e7a7ea654c1`
- Relation to `origin/main` at the snapshot: 2 commits ahead, 4 commits behind.
- This is Draft PR [#43](https://github.com/EngelN9/deutschtrainer/pull/43),
  titled `fix(learning-engine): align SQL hinted mastery gains`. It was `CLEAN`
  when inspected, but its base was still `06fcb90`; update/retest it before
  proposing a merge.
- Local-only, untracked file: `.claude/launch.json`. It is a local launcher
  configuration for the Mobile web command; no credential-pattern match was
  found in a filename-only sensitive-pattern scan. It has not been committed.

### Open draft pull requests at the snapshot

| PR                                                       | Branch / local worktree                                       | State at snapshot                                   | Required next action                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [#33](https://github.com/EngelN9/deutschtrainer/pull/33) | `feat/gamified-motion` / `work/pr33-motion`                   | Draft, `CLEAN`; checks passed for its old head/base | Rebase or merge current `origin/main`, resolve/retest, then conduct a normal review.          |
| [#34](https://github.com/EngelN9/deutschtrainer/pull/34) | `codex/ui-ux-refresh-v2` / `work/pr34-ui`                     | Draft, `DIRTY`; checks are from 2026-09-07          | Resolve conflicts against current `origin/main`, then rerun responsive and repository checks. |
| [#35](https://github.com/EngelN9/deutschtrainer/pull/35) | `docs/classroom-architecture` / `work/classroom-architecture` | Draft, `DIRTY`; old checks from 2026-09-02          | Reconcile it with the already merged Classroom implementation; do not merge it as-is.         |
| [#43](https://github.com/EngelN9/deutschtrainer/pull/43) | `fix/hinted-mastery-delta-sql` / repository root              | Draft, `CLEAN`; checks from 2026-09-07              | Update/retest against current `origin/main` before any merge decision.                        |

No merge, force-push, branch deletion, deployment, or migration application was
performed for this handoff.

## 3. Worktree preservation inventory

All entries below are intentional. `ahead` and `behind` are relative to the
remote baseline above at the time of inspection.

| Worktree                                        | Branch / HEAD                                 | Divergence                   | Preservation status                                                                                                                |
| ----------------------------------------------- | --------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `C:\Users\User\Documents\GitHub\deutschtrainer` | `fix/hinted-mastery-delta-sql` / `029d12e`    | 2 ahead / 4 behind           | Draft #43; includes an append-only hinted-mastery migration and parity test. Keep separate.                                        |
| `.claude\worktrees\inspiring-booth-d46b07`      | detached / `b271329`                          | historical detached baseline | Clean. Do not delete until its creator confirms it is disposable.                                                                  |
| `work\classroom-architecture`                   | `docs/classroom-architecture` / `7d68019`     | 2 ahead / 4 behind           | Draft #35 documentation slice. Clean, but technically stale; see §5.                                                               |
| `work\classroom-phase0`                         | `codex/classroom-phase0` / `a1225d4`          | 20 ahead / 3 behind          | Local Classoom implementation history. It contains untracked device/Wi-Fi helper files; preserve them.                             |
| `work\hf-eval-registry`                         | `codex/hf-eval-registry` / `ea71119`          | 7 ahead / 5 behind           | Synthetic-only MatrAIx/Hugging Face registry work. Preserve the untracked test-temp directory until a maintainer confirms cleanup. |
| `work\pr33-motion`                              | `feat/gamified-motion` / `2ec7818`            | 3 ahead / 3 behind           | Draft #33. Clean.                                                                                                                  |
| `work\pr34-ui`                                  | `codex/ui-ux-refresh-v2` / `4af0cde`          | 3 ahead / 3 behind           | Draft #34. Clean.                                                                                                                  |
| `work\scoped-ai-beta`                           | `codex/ai-beta-provider-recovery` / `2fafae2` | 1 ahead / 1 behind           | The remote tracking branch is gone because its contents were merged through #45. Preserve until its creator elects cleanup.        |

### Uncommitted artifacts requiring an explicit disposition

1. `work/classroom-phase0` has five untracked files:
   - `docs/classroom-device-input.md`
   - `scripts/allow-ipad-wifi.ps1`
   - `scripts/classroom-wifi-certificate.mjs`
   - `scripts/classroom-wifi-server.mjs`
   - `serve.local.json`

   These appear to support local device/Wi-Fi testing. They were not committed,
   executed, deployed, or copied. A filename-only sensitive-pattern scan found
   no credential-pattern match. Review their permissions, certificate behavior,
   and documentation before deciding whether they belong in a future PR.

2. `work/hf-eval-registry` has an untracked
   `evaluation/matraix/.test-tmp-codex-20260902/` directory. It consists of
   generated test material. It must not be treated as release evidence or
   committed blindly. Preserve it for now; an explicit maintainer decision is
   required before cleanup.

## 4. Current implemented capabilities and evidence boundaries

### Remote Classroom beta — implementation exists, release proof does not

`origin/main@67e3995` contains the merged Classroom implementation from #36:

- `apps/classroom` is a Vite/React app with a deterministic simulator and a
  whiteboard reducer.
- `apps/api` exposes authenticated `POST /classroom/realtime-call`, accepts an
  SDP request, and has Classroom service/provider/authenticator/repository
  modules.
- The API contains configuration/health fields for Classroom and uses an HMAC
  safety identifier rather than sending a profile ID or email to the provider.
- `apps/mobile/app/classroom.tsx`, `packages/ai-prompts`, and
  `20260903094500_add_classroom_session_controls.sql` are part of the merged
  source tree.

This proves repository implementation only. It does **not** prove that the
remote migration is applied, that Classroom is configured/enabled, that the
provider model is accessible, that server-side expiry/sweeping works in the
deployed environment, or that a qualified reviewer approved the pedagogical
experience. Do not represent the simulator as real AI.

### Real AI and public access

The committed Definition of Done still classifies real-AI quality, cost, and
latency as `BLOCKED` while public provider configuration/access are disabled.
This snapshot did not read any environment values, call a provider, or change
an enable switch. The user-facing product must remain honest about this boundary.

### Synthetic evaluation

The MatrAIx harness and Hugging Face export are evaluation-only. Do not use
synthetic personas, fixtures, or green `matraix-evaluation` CI as learner,
human-language-review, real-AI, production, or release evidence. Do not
download Persona 1M or provide production learner data/keys to the harness.

## 5. Documentation reconciliation required

The following are known documentation issues, not permission to rewrite history
or lower a gate.

| Status         | Finding                                                                                                                                                                                                                                                        | Safe resolution                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `FAIL`         | `work/classroom-architecture/ARCHITECTURE.md` describes a browser-direct connection using an ephemeral client secret minted through `/v1/realtime/client_secrets`. The merged code instead uses the authenticated API SDP endpoint `/classroom/realtime-call`. | Reconcile the document with `origin/main` implementation, security model, and tests before resolving or merging Draft #35. |
| `FAIL`         | `origin/main:docs/definition-of-done.md` says the repository contains 23 append-only migrations, while `git ls-tree -r --name-only origin/main supabase/migrations` returned 24 migration paths in this snapshot.                                              | Count actual SQL migrations and update the claim at the commit being documented; do not edit an existing migration.        |
| `BLOCKED`      | Existing Definition of Done is intentionally honest that overall release readiness is `BLOCKED`. The snapshot did not repeat remote deployment, real-AI, human content, two-user security, backup/restore, or full Android acceptance.                         | Keep each external gate blocked until fresh reproducible evidence exists.                                                  |
| `NOT MEASURED` | Real-user adoption has no verified analytics evidence.                                                                                                                                                                                                         | Do not state that there are zero users or that adoption has been measured.                                                 |

The reference documents for a future reconciliation are:

- `AGENTS.md`
- `docs/definition-of-done.md`
- `docs/operations.md`
- `docs/security.md`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `work/classroom-architecture/{CURRENT_STATE,ARCHITECTURE,MVP_SPEC,ROADMAP}.md`
- source and tests under `apps/api/src/classroom/` and `apps/classroom/`

## 6. Release and Definition of Done status

The authoritative committed release classification remains **`BLOCKED`**. The
current A-J framework requires reproducible evidence, and no source-level
change, CI result, mock, or local Demo independently satisfies it.

| Gate                    | Status for public production release | Reason preserved for next session                                                                                  |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A. Product boundary     | `PARTIAL` / not releasable           | Modes and Classroom boundaries require current route/config verification.                                          |
| B. Core learning flow   | `PARTIAL` / not releasable           | Requires connected staging and device evidence in addition to repository tests.                                    |
| C. Content quality      | `BLOCKED`                            | Qualified human-language review evidence remains required.                                                         |
| D. Data rights          | `BLOCKED`                            | Requires two-user local/remote export/deletion and device-cache evidence.                                          |
| E. Security             | `BLOCKED`                            | Requires migration replay, RLS/Storage matrix, remote checks, and bundle/secret evidence for the current revision. |
| F. Code quality         | `PARTIAL`                            | CI passed at `origin/main@67e3995`; this handoff did not re-run all gates for each divergent worktree.             |
| G. Connected deployment | `BLOCKED`                            | A green CI run does not prove active remote migration, configured real AI, or connected journeys.                  |
| H. Android device       | `BLOCKED`                            | Limited Listening D1 evidence exists, but not one release-candidate build covering all required flows.             |
| I. Operability          | `BLOCKED`                            | Monitoring, distributed limiting, backup/restore, rollback, and incident drills require real evidence.             |
| J. Public delivery      | `BLOCKED`                            | Complete public delivery/release assets and all supporting gates are not proven.                                   |

`PARTIAL` above is an explanatory status only. It is not one of the formal
pass states and must never be reported as `PASS`.

## 7. Recommended resumption order

1. Start in a **new clean worktree from `origin/main@67e3995`** for new work.
   Do not fast-forward or reset an existing worktree merely to obtain it.
2. Decide one scope only: reconcile Draft #35 documentation, update/retest Draft
   #43, resolve the UI/motion drafts, or run a separately authorized Classroom
   validation. Do not combine them.
3. For any Classroom work, treat the merged `/classroom/realtime-call` design as
   the implementation reference and update supporting docs/tests together.
4. For any migration work, add a new append-only migration only after confirming
   the remote schema state and migration history. Never modify an applied file.
5. For real AI or Classroom validation, obtain explicit user authorization for
   external configuration and run with fake mode disabled. Record only safe
   metadata, not account credentials, tokens, SDP bodies, audio, or learner data.
6. Before proposing a merge, use the relevant repository Skill, re-run targeted
   tests and repository-wide gates at the final head, verify the exact PR checks,
   and keep Draft status until all findings are resolved.

## 8. Commands run for this handoff

Read-only inspection was performed on 2026-09-11:

```powershell
git status --short
git worktree list --porcelain
git branch -vv
git fetch --prune origin
git log --oneline --decorate -n 12 origin/main
gh pr list --repo EngelN9/deutschtrainer --state open
gh run list --repo EngelN9/deutschtrainer --branch main
git diff --check
```

No repository-wide test suite, build, deployment, device flow, Supabase command,
provider call, or Docker command was executed in this handoff. The only file
created is this documentation record. No secret values were read, recorded, or
printed.

## 9. Completion state of this preservation task

- Handoff inventory: `PASS`
- GitHub/PR/CI snapshot: `PASS` as of the timestamp above
- Secret-safe documentation review: `PASS` (names/status only)
- Documentation drift identification: `PASS`; remediation remains outstanding
- Release readiness: `BLOCKED`
- Remote deployment/current live behavior: `NOT VERIFIED`
- Commit, push, merge, deploy, migration application, or destructive cleanup:
  `NOT PERFORMED`
