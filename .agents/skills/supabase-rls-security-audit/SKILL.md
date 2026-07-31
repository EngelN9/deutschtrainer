---
name: supabase-rls-security-audit
description: >-
  Audit DeutschTrainer Supabase RLS, database privileges, owner isolation,
  service-role boundaries, Storage, deletion, and replayable migrations. Use
  for schema, policy, RPC, Storage, admin-boundary, or private-data security
  reviews; do not use as a general release audit or to make schema changes
  unless the user explicitly requests remediation.
---

# Supabase RLS Security Audit

## 目的

驗證資料庫是安全與資料完整性的最後防線，涵蓋匿名、learner、內容角色、admin、owner 與 service role 邊界。遵守 `AGENTS.md` 的 Supabase、RLS、Secrets、Owner isolation 與刪除規則；預設只讀。

## 適用範圍

- `supabase/config.toml`、`supabase/migrations/`、`supabase/seed/`
- `docs/security.md`、`docs/database-schema.md`、`docs/testing-strategy.md`
- `apps/api/src/**/supabase*Repository.ts`、`apps/api/src/app.ts`、`apps/api/src/config.ts`
- `apps/mobile/src/lib/supabase.ts`、`apps/mobile/src/lib/database.types.ts`
- `apps/api/scripts/verify-*-e2e.ts` 中的雙使用者、RLS、Storage 與刪除證據

## 不適用情況

- 純演算法、內容語言品質或 CI root-cause 分析。
- 只檢查一般 TypeScript security。
- 未明確要求修正時，不建立 migration、不改 policy、不使用 service role 寫資料。

## 前置檢查

1. 讀取 `AGENTS.md`、`docs/security.md`、`docs/database-schema.md` 與所有 migrations，按時間順序建立實際 schema/policy/privilege 清單。
2. 檢查 `git status --short`，確認 migrations 是否為 append-only。
3. 只讀 env examples 的變數名稱；不得讀取 `.env` 或輸出 token/key。
4. 需要動態驗證時，先以 `pnpm supabase:status` 確認本機服務。缺少 Docker/CLI 時標 `BLOCKED`。

## 執行步驟

1. 列出含私人資料的 tables、views、functions 與 Storage buckets，確認 RLS、owner 欄位、foreign key、unique/idempotency constraints。
2. 對 profiles/preferences、attempt/progress/mastery/review/error history、AI feedback/usage、writing、recording/audio/listening/speaking 逐表檢查 `SELECT/INSERT/UPDATE/DELETE` policy；缺少不應有的 operation 也要記錄。
3. 檢查匿名與使用者 A/B 隔離：B 不可讀、改、刪 A 的資料，回應不得洩漏資料是否存在。檢查 learner 不可執行 admin/content 操作。
4. 檢查 content_editor/reviewer/admin 工作流、後端 role 驗證、受保護 RPC 與 audit log；前端隱藏按鈕不算授權。
5. 檢查每個 privileged function：`SECURITY DEFINER` 必要性、固定 `search_path`、caller/role/owner/input 驗證、transaction/replay、`EXECUTE` allowlist 與 `PUBLIC`/`anon`/`authenticated` 撤權。
6. 檢查 `SUPABASE_SERVICE_ROLE_KEY` 僅由 API runtime 使用；Mobile/Admin public env、bundle、log、source map 與 examples 不得暴露。不得搜尋或顯示 secret 值。
7. 檢查 Storage owner path、MIME/duration/object existence、signed URL、逐字稿/答案/評分規則保護，以及作文、錄音、AI 評量資料隔離。
8. 檢查單筆作文／錄音刪除與完整帳號刪除的 cascading/explicit 流程、private binary、versions、feedback、learning data、session、local queue 及舊 token 拒絕。只有 UI 不算完成。
9. 執行：

   ```powershell
   pnpm supabase:reset
   pnpm --filter @deutschtrainer/api verify:local
   pnpm --filter @deutschtrainer/api verify:workspaces:local
   pnpm --filter @deutschtrainer/api verify:audio:local
   pnpm --filter @deutschtrainer/api verify:admin:local
   pnpm --filter @deutschtrainer/api verify:learning-api:local
   pnpm --filter @deutschtrainer/api verify:offline-sync:local
   ```

10. 檢查 clean reset 可重播、seed 不含真實私人資料/secret、舊 migrations 未被改寫。遠端 RLS 或 migration 驗證若未提供安全環境即標 `BLOCKED`。

## 輸出格式

先按 Critical/High/Medium/Low 列 findings：資產、角色、操作、實際行為、預期行為、證據路徑、風險與最小修正方向。再列 policy matrix、命令結果、未驗證項目與整體狀態。不得複製 SQL 中的任何真實 credential 或私人內容。

## 判定規則

- `PASS`：適用資產具正確 RLS/privilege/owner 邊界，且靜態與動態證據成功。
- `FAIL`：存在越權、跨使用者存取、public secret、危險 function privilege、不可重播 migration 或不完整刪除。
- `BLOCKED`：需要本機／遠端 Supabase、第二使用者、Storage 或 credentialed 驗證但無法安全執行。
- `NOT APPLICABLE`：資產或 operation 不存在，並以 schema/migration 證據證明。

## 完成條件

所有私人資料類別、CRUD、角色、Storage、service role、migration 與刪除流程都有判定；所有無法驗證項目明列 `BLOCKED`，且稽核未修改資料庫或應用程式碼。
