---
name: learning-engine-regression
description: >-
  Verify deterministic grading, mastery, spaced review, error history,
  idempotency, timestamps, timezone boundaries, and replay consistency. Use
  when grading, attempts, progress, mastery, reviews, errors, or submission-time
  behavior changes; do not use for AI qualitative scoring, general release
  readiness, or UI-only review.
---

# Learning Engine Regression

## 目的

確認相同可信輸入始終產生相同評分與學習狀態，server-authoritative attempt、mastery、review queue 與 error history 在 retry、離線重連與時間邊界下保持一致。

## 適用範圍

- `packages/grading/src/index.ts` 與 `packages/grading/src/index.test.ts`
- `packages/learning-engine/src/index.ts` 與 `packages/learning-engine/src/index.test.ts`
- `apps/api/src/learning-data/`、`apps/api/scripts/verify-learning-api-e2e.ts`
- `apps/mobile/src/features/learning-records/`、`apps/mobile/src/features/progress/`
- `supabase/migrations/` 中 attempt、mastery、review、error 與 offline sync transaction
- `docs/phase-4-learning-records.md`、`docs/phase-9-api-boundary.md`、`docs/phase-12-offline-sync.md`

## 不適用情況

- AI 作文／翻譯 rubric 品質、RLS 全面稽核、純內容校對。
- 只有視覺變更且未影響 answer、attempt 或 learning state。
- 預設只診斷；未要求修正時不改演算法或測試。

## 前置檢查

1. 讀取 `AGENTS.md` 的固定題評分、Learning Engine、Idempotency 與離線規則。
2. 追蹤原始答案從 Mobile 到 API regrading、transaction persistence、mastery/review/error 更新的完整資料流。
3. 比對 shared types、Zod schema、SQL function 與測試，確認 version/timestamp/idempotency contract。
4. 記錄基準測試與變更範圍；沒有可用 Supabase 時，將 integration 項目標 `BLOCKED`。

## 執行步驟

1. 對六種固定題型檢查正規化、accepted alternatives、partial credit、空值、無效 option/pair/order、Umlaut/ß 規則與輸入不可變性。
2. 對同一輸入重跑多次，確認 score、correctness、error classification 與 serialization 一致；不得依賴網路、UI、隨機值或 client score。
3. 檢查 API 只接受原始答案，重新載入 published exercise/version，使用可信 answer key 評分，再於一致 transaction 更新 attempt、progress、mastery、review 與 error history。
4. 檢查 idempotency：相同 key/same payload 重播原結果；同 key/different exercise 或 operation 拒絕；不得重複 attempt、mastery delta、review 或 error count。
5. 檢查 mastery 上下限、提示/部分正確/錯誤影響、band 邊界與演算法版本。
6. 檢查 review 排程：incorrect、correct、overdue、not-yet-due、完成、排序、重跑及 stale content conflict。
7. 檢查 `submittedAt` 合理範圍、server fallback、UTC/local conversion、timezone、DST、午夜、未來/過舊 client clock；offline reconnect 必須保存原始合理提交時間。
8. 檢查失敗 retry、duplicate submission、App reconnect 與同一 queue 重跑不造成狀態分歧。
9. 執行：

   ```powershell
   pnpm test
   pnpm typecheck
   pnpm --filter @deutschtrainer/api verify:learning-api:local
   pnpm --filter @deutschtrainer/api verify:offline-sync:local
   ```

10. 若 targeted tests 不足，列出缺少的具體邊界案例；不得以現有綠燈推論未測行為通過。

## 輸出格式

以 matrix 列 Scenario、Expected、Observed、Evidence、Status，至少分 grading、mastery、review、error history、idempotency、time/offline。再列 commands、findings、未覆蓋案例與最小修正範圍。

## 判定規則

- `PASS`：靜態 contract 與相關 unit/integration 證據一致，重跑無狀態漂移。
- `FAIL`：非 deterministic、信任 client score、重播重複寫入、timestamp/timezone 錯誤或 learning state 不一致。
- `BLOCKED`：需要本機 Supabase、時間／重連情境或缺失 fixture 才能判斷。
- `NOT APPLICABLE`：變更或題型確實未觸及該 learning dimension，且追蹤資料流後有證據。

## 完成條件

所有適用題型與 learning state 邊界均有證據，重跑與 offline replay 一致；任何缺少的 integration/timezone/device 驗證都明確標為 `BLOCKED`。
