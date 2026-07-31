---
name: offline-sync-e2e
description: >-
  Verify DeutschTrainer course downloads, offline fixed grading, durable
  pending attempts, restart recovery, reconnect synchronization, duplicate and
  conflict handling, original timestamps, and learning-state consistency. Use
  for offline storage, queue, reconnect, or sync changes; do not use for
  online-only AI features or general release readiness.
---

# Offline Sync E2E

## 目的

端到端驗證已下載課程與固定題可離線使用，pending attempts 在 process restart 後仍可恢復，重連時由 server authoritative regrading 安全同步且不重複更新學習狀態。

## 適用範圍

- `apps/mobile/src/features/offline/`
- `apps/mobile/src/features/courses/`、`apps/mobile/src/features/learning-records/`
- `apps/api/src/learning-data/`、`apps/api/scripts/verify-offline-sync-e2e.ts`
- `supabase/migrations/202607150002_phase12_offline_sync.sql`
- `docs/phase-12-offline-sync.md`、`docs/testing-strategy.md`

## 不適用情況

- AI 自由回答、AI 作文、TTS 新生成、STT、AI 對話或即時生成；這些離線不支援。
- 純 online API、一般 learning algorithm 或 release audit。
- Web/unit smoke 不可取代原生 App restart、飛航模式與 reconnect 驗收。

## 前置檢查

1. 讀取 `AGENTS.md` 的離線與同步、server authority、儲存限制及 Mobile device 規則。
2. 確認 content source、profile/session、download envelope、queue schema、idempotency key、`submittedAt` 與 conflict contract。
3. 記錄裝置／模擬器、OS、app version、Build ID、content version、profile 與網路狀態；不得記錄 token。
4. 沒有可用 Supabase 或原生裝置時，仍執行 unit/static checks，但對相應 E2E 標 `BLOCKED`。

## 執行步驟

1. 下載 published 課程，確認 snapshot 含版本且依 profile 隔離；切換 profile 不可看到另一人的下載或 queue。
2. 關閉網路，重啟 App，驗證下載內容可讀、只允許固定題、本機 deterministic feedback 正常，AI 功能清楚停用。
3. 連續建立多筆 pending attempts，確認保存原始答案、exercise/content version、原始 `submittedAt`、idempotency key，並依 oldest-first 排序。
4. 在 `syncing` 狀態強制停止 App，再啟動；確認項目恢復為可處理狀態，資料未遺失。
5. 重連後確認 client 只送原始答案；API 重新載入 published exercise、重新評分並保存 server result。
6. 重送相同 idempotency key，確認不重複 attempt、progress、mastery、review 或 error history；同 key/different payload 必須拒絕。
7. 測試 content version stale、deleted/unpublished、session expired、network interruption、部分成功與 reconnect race。Conflict 必須保留並提供 retry/discard，不可偽裝成功。
8. 確認合理原始 submission time 被保存；異常未來/過舊時間依 server contract 處理。檢查 timezone/DST 與同步後 review schedule。
9. 比對同步前本機預覽與同步後 server progress/mastery/error history；server 結果為正式來源。
10. 檢查 queue 上限、版本化 Zod validation、壞 snapshot fail-safe、logout/account deletion cleanup 與 AsyncStorage 規模。
11. 執行：

```powershell
pnpm test
pnpm typecheck
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:learning-api:local
```

12. 在 Android 實機執行飛航模式、process kill/relaunch、背景 reconnect、低儲存、多筆 queue 與兩 profile 流程。`apps/mobile/.maestro/guest-smoke.yaml` 只補充 guest smoke，不代表 connected sync。

## 輸出格式

列出 Device/Build、Scenario、Queue before/after、Server result、Learning-state comparison、Evidence、Status。另列命令、conflicts、未測裝置情境與資料完整性風險；遮罩 identifiers。

## 判定規則

- `PASS`：unit/local integration 與適用原生流程均證明 durability、idempotency、timestamp、conflict 與 state consistency。
- `FAIL`：queue 遺失、跨 profile 洩漏、重複提交、client score 被信任、conflict 被吞掉、timestamp 或 learning state 漂移。
- `BLOCKED`：缺少 Supabase、connected API、原生裝置、build 或可控網路情境。
- `NOT APPLICABLE`：情境不屬於支援的離線範圍，並明確說明。

## 完成條件

下載、離線作答、durable queue、restart、reconnect、duplicate、conflict、timestamp 與 learning-state 一致性均有證據；原生情境未測不得宣稱 E2E 通過。
