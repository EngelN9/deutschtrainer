---
name: deutschtrainer-release-audit
description: >-
  Audit DeutschTrainer release readiness and produce READY, NOT READY, or
  BLOCKED. Use before a connected preview, Android build, staging handoff, or
  production claim; do not use for a narrow code review, CI-only diagnosis, or
  to treat mock, demo, local-only, or fake-AI evidence as production acceptance.
---

# DeutschTrainer Release Audit

## 目的

以可重現證據檢查 repository、Mobile、Admin、API、Supabase、內容與外部發行條件。遵守 `AGENTS.md` 的安全、測試、Release、Definition of Done 與最終回報規則；預設只讀。

## 適用範圍

- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.github/workflows/ci.yml`
- `apps/mobile/package.json`、`apps/mobile/app.json`、`apps/mobile/eas.json`、`apps/mobile/.maestro/guest-smoke.yaml`
- `apps/admin/package.json`、`apps/api/package.json`、`apps/api/Dockerfile`
- `.env.example`、`apps/mobile/.env.example`、`apps/admin/.env.example` 的變數名稱與公開／私密邊界
- `supabase/config.toml`、`supabase/migrations/`、`supabase/seed/`
- `README.md`、`docs/acceptance-criteria.md`、`docs/testing-strategy.md`、`docs/phase-14-mvp-release-readiness.md`、`docs/phase-15-api-staging-readiness.md`

## 不適用情況

- 單一 regression、RLS、AI、離線、內容、CI、PR 或文件漂移問題；改用對應 Skill。
- 使用者只要求實作功能而未要求 release 判定。
- 不得用此 Skill 建立 credential、部署、commit 或 push。

## 前置檢查

1. 讀取 `AGENTS.md`、`README.md`、上述 manifests、CI 與 release 文件。
2. 執行 `git status --short`，記錄既有變更；不得修改稽核範圍。
3. 從 manifests 或 `AGENTS.md` 確認每個命令後才執行。
4. 只檢查 env example 的名稱與分類。不得讀取 `.env`、輸出值或列印完整環境。
5. 將缺少 Docker、Supabase、遠端環境、EAS、裝置或授權標成 `BLOCKED`，不得降級為通過。

## 執行步驟

1. 檢查版本與依賴一致性：Node/pnpm 要求、lockfile、workspace、Expo/EAS config、app version、Android `versionCode`、iOS `buildNumber`、package/bundle identifier 與 Build ID 證據。
2. 執行 repository gates：

   ```powershell
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

3. 驗證正式 artifacts：

   ```powershell
   pnpm --filter @deutschtrainer/api build
   pnpm --filter @deutschtrainer/api verify:bundle
   docker build --file apps/api/Dockerfile --tag deutschtrainer-api .
   pnpm --filter @deutschtrainer/mobile export:android
   pnpm --filter @deutschtrainer/mobile export:web
   pnpm --filter @deutschtrainer/admin build
   ```

4. 在 `apps/mobile` 執行 CI 已宣告的 Expo checks：`pnpm exec expo install --check` 與 `pnpm dlx expo-doctor@1.20.1`。
5. 啟動本機 Supabase 後執行 `pnpm supabase:status`、`pnpm supabase:reset`，確認 migrations 可從零重播。再依 `AGENTS.md` 執行列出的 API local verification，至少包含 learning API、workspaces、audio、admin、settings、offline sync、knowledge 與 content readiness。
6. 檢查 API bundle/container：正式 bundle、plain Node 啟動、`/health`、非 root、health check、graceful shutdown、runtime secrets、staging/production 拒絕 fake mode 與非 HTTPS Supabase。
7. 檢查環境變數：Mobile/Admin public 變數不得含 service-role/OpenAI secret；Connected Preview 不得使用 localhost、mock content、placeholder credential 或 fake AI。
8. 檢查 Mobile/Admin/API readiness、EAS preview/production profiles、100 題 human/approved/published content readiness、release identifiers、APK/checksum/release notes/rollback/support 證據。
9. 將 `apps/mobile/.maestro/guest-smoke.yaml` 僅視為 guest/demo smoke。原生通知、麥克風、錄音、重啟、飛航模式、reconnect 與安裝必須列出實機型號、Android 版本、app version、Build ID、流程、結果與附件。
10. 逐項對照 `AGENTS.md` 的 A–J Definition of Done。任何必要 gate 無可重現證據即不得判定 READY。

## 輸出格式

先列結論 `READY`、`NOT READY` 或 `BLOCKED`，再用表格列：Gate、狀態、證據／命令、缺口、責任邊界。附上版本識別、已執行命令及 exit code、未執行項目與原因、實機／遠端證據、風險與下一個最小行動。不得輸出 secret。

## 判定規則

- `PASS`：單一 gate 的必要自動化與人工證據都成功且可重現。
- `FAIL`：已執行驗證證明要求不成立、artifact 無效、設定不安全或必要 gate 失敗。
- `BLOCKED`：必要驗證因外部環境、credential、裝置、部署、權限或缺少證據而無法完成。
- `NOT APPLICABLE`：release 類型確實不涉及該項，且說明理由；不得用來排除 production 必要 gate。
- `READY`：所有必要 gate 都是 `PASS`。
- `NOT READY`：至少一個必要 gate 是 `FAIL`。
- `BLOCKED`：沒有已知 `FAIL`，但至少一個必要 gate 是 `BLOCKED`。

## 完成條件

完成所有適用 gate、保存命令與人工證據、明確列出未驗證項目，並確認 fake/demo/local 結果未被當成 connected production readiness。未部署或未實機驗收時，只能描述為 Preview／Demo 或受阻狀態。
