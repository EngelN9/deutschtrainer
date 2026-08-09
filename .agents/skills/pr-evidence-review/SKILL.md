---
name: pr-evidence-review
description: >-
  Review a DeutschTrainer pull request for regressions, security, data
  integrity, migrations, API contracts, tests, documentation, placeholders,
  fake implementations, and completion claims, with findings first. Use when a
  PR, branch diff, or merge-readiness evidence is under review; do not use to
  implement changes, publish, merge, commit, or push unless separately requested.
---

# PR Evidence Review

## 目的

以 diff 與可重現證據判斷 PR 是否安全、完整且與聲明一致。先列 findings，再列摘要；預設只讀，不以作者敘述取代程式、migration、測試與實際執行結果。

## 適用範圍

- PR base/head diff、提交、review comments、changed files 與 CI checks
- 受影響的 apps、packages、`supabase/migrations/`、tests、docs、env examples、CI/release config
- PR 說明中的 Summary、Why、Scope、Architecture、Migration、Security、Validation、Manual acceptance、Risks、Deployment、Rollback、Remaining work

## 不適用情況

- 沒有 diff/PR/branch 變更可審查的一般架構諮詢。
- 單一 CI failure root cause 改用 `ci-failure-triage`。
- 不得自行 approve、merge、commit、push、部署或修改程式。

## 前置檢查

1. 讀取 `AGENTS.md`、PR 說明、完整 diff、相關測試、architecture/security/phase 文件。
2. 確認 base/head SHA 與 review scope；記錄工作樹既有變更。
3. 若涉及 migration、API、AI、offline、Mobile native 或內容，讀取對應 repository Skill。
4. 不讀取或轉貼 secret；diff 若疑似含 credential，僅記位置、類型與立即輪替建議。

## 執行步驟

1. 由資料流與 trust boundary 審查 regression：正常、空值、錯誤、retry、auth、跨使用者、timeout、duplicate、conflict、timezone、restart。
2. 審查安全與隱私：RLS、server auth/role、service role、public env、logs、answer/transcript/rubric、prompt injection、Storage owner、刪除流程。
3. 審查資料完整性：idempotency、transaction、constraints、server-authoritative grading、mastery/review/error 更新與 backward compatibility。
4. 若有 migration，確認 append-only、clean rebuild、升級路徑、RLS/privilege/function hardening、generated types、seed/backfill、rollback/forward-fix 與驗證。
5. 若有 API 變更，檢查 method/path、request/response Zod、auth/authorization、rate limit、cache、idempotency、errors、logging、sensitive-data policy 與 client compatibility。
6. 比對測試證據：實際命令、exit code、suite/test 數、build/export、Supabase rebuild、remote/device evidence。fake AI、mock、Demo、Web export 不得冒充 connected/native acceptance。
7. 比對文件與實作；檢查 PR 說明的 Not applicable 是否合理，deployment/rollback/remaining work 是否完整。
8. 搜尋 changed lines 的 `TODO`、`FIXME`、placeholder、mock、fake、hard-coded role/key、空 handler、永遠成功、`.skip`、過寬 catch、`continue-on-error`。語意判斷，不能只靠關鍵字。
9. 每個 finding 必須能指出受影響行為、可重現情境、證據路徑/行號、嚴重性與最小修正；避免純風格評論。
10. 只有 required checks、security、migration、docs、manual/remote/device evidence 與完成聲明一致時，才建議 merge。

## 輸出格式

先列 Findings，依 Critical/High/Medium/Low 排序；每項包含標題、檔案/行號、情境、影響、證據與修正方向。若無 finding，明確寫無已確認 finding，但列 residual risks。之後才列 Scope summary、Evidence reviewed、Commands、Missing evidence、Merge assessment。

## 判定規則

- `PASS`：PR scope 的程式、資料、安全、測試與文件證據足夠，沒有未處理阻擋 finding。
- `FAIL`：存在 regression、安全/資料問題、錯誤 migration/API contract、fake/placeholder 完成聲明或必要測試失敗。
- `BLOCKED`：無完整 diff、required check/log、remote migration、credentialed integration 或 device evidence。
- `NOT APPLICABLE`：特定 PR 面向確實未受影響，且由 diff/資料流證明。

## 完成條件

完整 diff 與適用 contracts 已審查，findings 先於摘要，所有完成聲明都有證據；未執行或外部驗證項目明列 `BLOCKED`，不替使用者合併或發布。
