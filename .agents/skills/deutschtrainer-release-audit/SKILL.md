---
name: deutschtrainer-release-audit
description: "Use when deciding whether DeutschTrainer is ready for an offline Demo, connected Preview, staging, production, store, tag, or GitHub Release by auditing quality gates, builds, Supabase, configuration, content, release identifiers, and native-device evidence; do not use to implement fixes, debug one CI failure, or review only one feature."
---

# Deutschtrainer Release Audit

## 目的

以可重現證據判定指定 release target 是否 `READY`、`NOT READY` 或 `BLOCKED`。區分本機實作、離線 Demo、connected Preview、staging 與 production，不以較低環境的成功替代較高環境的驗收。

## 適用範圍

- Root、Mobile、Admin、API 的 format、lint、typecheck、test 與 build。
- API production bundle、實際 bundle health smoke 與 container build。
- Supabase migration 重建、local verification、remote migration drift 與權限證據。
- `.env.example`、`apps/mobile/.env.example`、`apps/admin/.env.example` 所描述的 public/server-only 邊界；只檢查變數名稱、來源與設定狀態。
- `apps/mobile/app.json`、`apps/mobile/app.config.ts`、`apps/mobile/eas.json` 的版本、build number/code、application identifiers、EAS profiles 與 connected environment 限制。
- `supabase/seed.sql` 與 content-readiness verification。
- Mobile、Admin、API、public site、資料刪除、營運與原生裝置 release readiness。
- `docs/definition-of-done.md`、`docs/phase-14-mvp-release-readiness.md`、`docs/phase-15-api-staging-readiness.md` 與 `docs/supplemental-stage-d-public-site.md` 的 release claims。

## 不適用情況

- 只需定位單一 CI root cause：改用 `ci-failure-triage`。
- 只需檢查 RLS 或 service-role 邊界：改用 `supabase-rls-security-audit`。
- 要求直接修正應用程式碼、建立 deployment、EAS build、tag、release、commit 或 push。
- 只驗證離線同步、AI 品質或德文內容；使用各自的專責 Skill。

## 共通強制規則

- 預設只讀。除非使用者明確要求修正，否則不得修改 application、migration、content 或設定。
- 執行時先讀 repository-level instructions。此 Skill 建立時根目錄 `AGENTS.md` 不存在；若執行時仍不存在，記錄 `BLOCKED`，不得捏造其規則。若之後出現，必須先遵守。
- 每次執行重新從 `package.json`、三個 app package、`README.md`、`.github/workflows/ci.yml` 與相關 docs 確認命令，不沿用過期指令。
- 不讀取或輸出 `.env`、`.env.local`、Supabase `.temp`、token、JWT、service-role key、OpenAI key 或其他 secret。只可檢查 example 檔與「是否已設定」。
- `AI_EVALUATION_FAKE_MODE=true`、bundle smoke 的 fixture configuration、mock content、離線 Demo 與未連線 export 都不是 production readiness 證據。
- 無法取得外部帳號、遠端服務、裝置或可信 log 時標記 `BLOCKED`；不得以文件中的歷史 Pass 取代本次證據。

## 前置檢查

1. 記錄 release target、commit SHA、branch、App/API/content release IDs、執行日期與環境。
2. 記錄工作樹狀態；若含未納入 target 的修改，將結果標示為不對應 release artifact。
3. 確認 Node 與 pnpm 符合 `README.md`，並注意 CI 實際使用 Node 24 與 pnpm 11.7.0。
4. 確認 Docker、Supabase CLI、Android/iOS 裝置、EAS/remote Supabase/API access 是否為本 target 必要條件。
5. 讀取 `docs/definition-of-done.md` 的 Gate A-J；不得只採用 `README.md` 的 Phase completion 摘要。
6. 對破壞性的 `pnpm supabase:reset`，先確認目標是可丟棄的 local database 並取得使用者明確同意。

## 執行步驟

### 1. 建立 release target gate

先分類 target：

- `offline-demo`：允許 `demo` profile、mock content；必須明示沒有連線服務。
- `connected-preview`：必須為 `preview` profile、API content、remote HTTPS API/Supabase 與 release identifiers。
- `staging`：必須有部署 artifact、remote migrations、real provider configuration 與 connected acceptance。
- `production/store`：除 staging 證據外，必須完成 required device matrix、資料刪除、營運、release asset 與重建證據。

任何 target 描述與實際 profile 不一致都判定 `FAIL`。

### 2. 執行 repository 與 CI 品質門檻

依 `.github/workflows/ci.yml` 的順序執行或取得同 commit 的可信 CI logs：

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @deutschtrainer/api build
pnpm --filter @deutschtrainer/api verify:bundle
docker build --file apps/api/Dockerfile --tag deutschtrainer-api:ci .
pnpm --filter @deutschtrainer/mobile export:android
pnpm --filter @deutschtrainer/mobile export:web
pnpm --filter @deutschtrainer/admin build
```

在 `apps/mobile` 依 CI 另驗證：

```powershell
pnpm exec expo install --check
pnpm dlx expo-doctor@1.20.1
```

每項記錄 command、commit、exit code、關鍵摘要與 log/artifact reference。不得把較早 commit 的綠燈算入本次。

### 3. 驗證 API artifact 與 runtime boundary

- 從 `apps/api/package.json` 確認 build 的輸出位置與檔名，執行 build 後驗證產物存在，並確認 `verify:bundle` 測的是該 artifact。
- 確認 `apps/api/Dockerfile` final stage 只帶 bundle/source map、以 `node` user 執行、包含 health check 與 production environment。
- 將 bundle fixture smoke 標為「artifact smoke」，不是 connected staging。
- connected target 必須另有部署 URL 的 `/health`、release ID、HTTPS、CORS allowlist、AI configured 狀態與 graceful shutdown 證據；缺一即 `BLOCKED`。

### 4. 驗證 Supabase 與 migration

- 檢查 `supabase/migrations/` 為 append-only、有序且 target commit 包含預期 migration。
- 經核准後，使用 `pnpm supabase:start` 與 `pnpm supabase:reset` 驗證乾淨 local rebuild；保留 migration/seed 成功摘要，不複製任何 key。
- 執行與 target 相關的現有 local scripts：

```powershell
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:workspaces:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:admin:local
pnpm --filter @deutschtrainer/api verify:settings:local
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:knowledge:local
pnpm --filter @deutschtrainer/api verify:content-readiness:local
```

- connected target 必須另驗證 remote/local migration history、remote permissions 與 release seed；只有 local reset 時標記 remote gate `BLOCKED`。

### 5. 驗證環境與 secret 邊界

- 比對三個 env example、Mobile/Admin env readers、API config 與 EAS profiles 的 required variables。
- `EXPO_PUBLIC_*`、`NEXT_PUBLIC_*` 只可包含 public-safe URL、anon key、environment 與 release ID。
- server-only key 只能存在 API runtime；若出現在 public variable、source、image layer、bundle、logs 或 release asset，判定 `FAIL`。
- preview/production 必須拒絕 localhost、HTTP、placeholder、mock content 與 fake AI。
- 只回報變數名稱與 `SET`/`MISSING`/`INVALID`；不回報值。

### 6. 驗證 Mobile/Admin/API readiness

- Mobile：application IDs、App version、iOS build number、Android version code、icon/splash/favicon、content source、release diagnostics、download/offline boundaries。
- Admin/public site：production build、public routes、server-side `/admin` authorization、site URL、API/CORS pairing、account-deletion文案與實際功能一致。
- API：production bundle/container、HTTPS、CORS、rate-limit deployment boundary、logs、request IDs、AI quota/cost、health。
- 若版本或 build identifier 彼此不一致，列出實際來源與 target 期望。

### 7. 驗證 EAS profiles 與原生裝置

- 確認 `demo` 是 internal mock APK，`preview` 是 connected API APK，`production` 是 store distribution。
- EAS config/build log 必須對應 target profile 與 commit；沒有 EAS/Expo 外部狀態時標記 `BLOCKED`。
- 原生 device matrix 至少記錄 device、OS、build ID、environment、結果與證據。
- connected release 強制覆蓋 Auth、課程、固定/AI 題、作文、播放、麥克風允許/拒絕、通知、飛航模式、process restart、reconnect、錯誤處理與必要刪除流程。
- `apps/mobile/.maestro/guest-smoke.yaml` 的成功只證明 versioned offline Demo learning smoke，不證明 connected、通知、錄音、完整離線重連或 production。

### 8. 驗證 content 與完成宣稱

- `verify:content-readiness:local` 只驗證 100 題、CEFR 分布、八種題型下限與 answer row；另需 `german-content-qa` 的人工語言與答案審核證據。
- AI draft 必須保有人工 review；fake provider 或 schema pass 不等於語言品質。
- 將 `README.md` Current Scope、phase reports 與 `docs/definition-of-done.md` 的最新狀態逐一比對。
- 對完整帳號刪除、connected deployment、monitoring/restore、real-device acceptance、GitHub release 等尚未驗證的門檻，不得標為通過。

## 輸出格式

先輸出 metadata，再輸出 gate table：

```text
Release target:
Commit:
Environment:
Audit time:

| Gate | Status | Evidence | Gap / next action |
| Quality and CI | PASS/FAIL/BLOCKED/NOT APPLICABLE | ... | ... |
| API bundle/container | ... | ... | ... |
| Supabase migrations/security | ... | ... | ... |
| Environment/secrets | ... | ... | ... |
| Mobile/Admin/API | ... | ... | ... |
| EAS/device matrix | ... | ... | ... |
| Content | ... | ... | ... |
| DoD A-J / delivery | ... | ... | ... |

Overall: READY / NOT READY / BLOCKED
Blocking items:
Failing items:
Evidence limitations:
```

不要輸出 secret、完整敏感 log、作文原文、逐字稿或錄音資訊。

## 判定規則

- `PASS`：本次 target 與 commit 有可重現且足夠的證據。
- `FAIL`：已執行的檢查失敗、設定違反邊界、實作缺少必要能力，或 claim 明確超過事實。
- `BLOCKED`：必要檢查因憑證、remote state、裝置、權限、缺失 repository instruction 或不可取得證據而無法執行。
- `NOT APPLICABLE`：該項不屬於明確 release target；必須寫理由，不能用來迴避 production gate。
- `READY`：所有 target 必要 gate 為 `PASS`，沒有 `FAIL` 或 `BLOCKED`。
- `NOT READY`：至少一個必要 gate 為 `FAIL`；即使另有 `BLOCKED` 仍使用此結果。
- `BLOCKED`：沒有已知 `FAIL`，但至少一個必要 gate 無法驗證。

## 完成條件

- 所有 target 必要 gate 都有狀態、當次證據與缺口。
- 明確區分 local、fake、Demo、connected staging 與 production evidence。
- environment、migration、content、release IDs、EAS 與 device matrix 均未被略過。
- overall 判定可由表格機械推導，沒有「假定通過」。
- 預設沒有修改 application code，且沒有 commit 或 push。
