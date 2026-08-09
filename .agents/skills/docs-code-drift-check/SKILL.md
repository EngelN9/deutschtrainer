---
name: docs-code-drift-check
description: >-
  Compare DeutschTrainer documentation and completion claims against package
  scripts, environment examples, API routes and schemas, migrations, tests,
  CI, and actual behavior. Use after behavior, architecture, deployment, phase,
  or release documentation changes, or when claims may be stale; do not use as
  a language-content review, general PR review, or authorization to edit docs.
---

# Docs Code Drift Check

## 目的

找出 README、AGENTS、docs、manifests、env examples、API/schema/migrations、tests/CI 與實際行為之間的雙向漂移，尤其防止 Phase/release 聲明超出可驗證能力。預設只讀。

## 適用範圍

- `AGENTS.md`、`README.md`、`docs/`
- root 與各 workspace `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`
- `.env.example`、`apps/mobile/.env.example`、`apps/admin/.env.example`
- `.github/workflows/ci.yml`、`apps/mobile/app.json`、`apps/mobile/eas.json`
- `apps/api/src/app.ts`、shared/validation/AI schemas、database repositories
- `supabase/migrations/`、`supabase/seed/`、existing tests/verification scripts

## 不適用情況

- 純文法校對、程式風格、單一 CI root cause 或 release execution。
- 文件沒有任何行為、架構、環境、API、資料庫、測試或完成聲明時。
- 未要求修正時，不編輯 docs 或程式。

## 前置檢查

1. 讀取 `AGENTS.md` 的指令優先序、文件規則、Definition of Done 與禁止不實聲明規則。
2. 建立變更或聲明清單，標記來源文件、行號、claim 類型與預期實作證據。
3. 以 `git status --short` 和 diff 確認範圍；若是歷史全面稽核，列出讀取的 docs。
4. 僅比對 env variable 名稱與 public/private 分類，不讀 `.env` 或任何值。

## 執行步驟

1. 驗證 repository 結構、Node/pnpm/Supabase 要求、workspace 名稱與 scripts 是否與 manifests/lockfile 一致。文件命令必須能在實際 `package.json` 找到。
2. 比對 README/AGENTS/docs 的 API endpoints 與 `apps/api/src/app.ts`、request/response Zod schemas、auth/authorization、rate limit、cache、idempotency 與 errors。
3. 比對 database tables/columns/RLS/functions/roles/status workflow 與按順序套用後的 `supabase/migrations/`；較新 migration 優先於舊文件敘述。
4. 比對 env examples 與 `apps/api/src/config.ts`、Mobile/Admin env readers、EAS/CI。檢查 secret 是否被誤列為 public，以及 required/optional/default/fail-fast 是否一致。
5. 比對 Mobile/Admin/API 行為、mock/api content source、Demo/connected 邊界、native limitations、bundle/container contract 與實際 code/config/tests。
6. 比對 testing docs 與現有 unit tests、API verification scripts、CI steps。文件寫「通過」時需要命令、時間/commit 與結果；僅列 command 不算執行證據。
7. 比對 Phase 0–15、acceptance、roadmap 與 README completion claims。connected staging、remote Supabase、real OpenAI、account deletion、monitoring/backup、EAS/store、Android device matrix 缺證據時標 drift 或 `BLOCKED`。
8. 檢查反向漂移：code/migration/config 已變更但 docs 未更新；也檢查 docs 宣稱尚無實作、placeholder/fake、或只有 local/demo。
9. 對每個差異判定權威來源，不自行猜測。安全與資料相容性優先；若證據衝突，標 `BLOCKED` 並列需確認的人或環境。
10. 必要時執行文件宣告且 manifests 確認存在的命令；只讀檢查可至少執行 `pnpm format:check`。其他 costly/connected commands 應依 claim 範圍執行或標 `BLOCKED`。

## 輸出格式

先列 Drift findings：文件位置/claim、實作證據、差異、風險、建議權威敘述、狀態。再列 Verified matches、Missing documentation、Unsupported claims、Commands、Blocked evidence。區分「文件錯」「實作錯」「尚無法判定」。

## 判定規則

- `PASS`：claim 與可重現 code/schema/migration/test evidence 一致，或文件精確標示限制。
- `FAIL`：命令/路徑不存在、API/schema/migration/env/行為不符，或 Phase/production claim 超出證據。
- `BLOCKED`：需要遠端部署、credential、裝置、營運紀錄或權威決策才能決定哪一方正確。
- `NOT APPLICABLE`：文件未聲明該面向或變更確實不影響，並給出 scope 證據。

## 完成條件

所有 in-scope claims 都有 code/schema/migration/test 對照，雙向漂移已列出，fake/demo/local 與 production 明確分離；無法驗證的完成聲明標 `BLOCKED`，不假裝一致。
