# 閱讀中心（ReadingComprehensionExercise.v1）

## 目的與範圍

閱讀中心提供已發布的 B1–C2 德文文章與固定四題理解練習。它使用既有的固定題提交與學習引擎，不建立新的 API endpoint、資料庫 migration、AI provider call 或 demo 身分。

本文記錄的是 repository-local 的閱讀題 contract；不代表任何文章已通過內容審核或可公開發布。

## 資料與評分契約

`ReadingComprehensionExercise.v1` 包含：

- `articleTitleDe`、`passageDe` 與 `estimatedReadingMinutes`；
- 恰好四個題目，每題有德文問題、2–6 個選項、可選 `supportZhTw` 與必填 `explanationZhTw`；
- 每個選項以 `exercise_options.metadata_json.questionId` 連到一個題目；
- `answer.optionIdsByQuestion` 只接受該題自己的選項 ID。

`@deutschtrainer/validation` 對 payload、答案、題目 ID、選項數量與選項歸屬進行 Zod 驗證。Admin 儲存草稿也使用同一個 contract；閱讀題的 JSON editor 會提示 required keys，但它不是內容審核的替代品。

`@deutschtrainer/grading` 對四個 raw option IDs 產生 0、25、50、75 或 100 分的 deterministic 結果。`POST /attempts` 不採信 client score：它依 exercise ID 重新載入 server-side exercise，再把 raw answer 交給固定評分器，最後由既有 service-role-only persistence 寫入 attempt、mastery、review queue 與 error history。既有 idempotency key 的 replay 保留第一次結果，不重複寫入或重複排程。

沒有新增 migration。`reading_comprehension` 已在既有 exercise enum，而 `exercises`、`exercise_options`、`exercise_answers` 的通用 payload／選項／答案欄位已支援上述表示法；本功能不得修改已存在的 migration。

## 可見性與模式邊界

- `/reading` 是 connected learner navigation 的「閱讀」入口，只從已發布 catalog 收集 `reading_comprehension` 題目。
- Demo navigation 不顯示「閱讀」。即使直接進入 `/reading`，Demo 也只顯示說明，並以 disabled query 避免載入或呼叫 authenticated catalog API。
- 尚無 published 題目時，connected 畫面明確顯示空狀態；不得以 draft、mock 或 AI 生成內容假裝成可使用的閱讀課。
- 題目提交、學習紀錄與跨使用者隔離仍遵循既有 API／RLS contract。閱讀中心不建立 client 直寫資料庫的例外。

## 初始內容與人工審核

seed 內準備四篇原創初稿（B1、B2、C1、C2 各一篇）與四題理解題。它們標為 `draft` 與 `ai_assisted`，不會出現在 published catalog；不得手動把 exercise row 改成 published 來略過工作流。

每篇在送審前至少要由具足夠德語能力的人工審核者確認：

1. CEFR 目標難度、字數與閱讀任務相稱；
2. 德語文法、拼字、大小寫、標點、Umlaut／ß、語域與自然度；
3. 四題均有唯一合理正解，干擾選項與解析均受本文支持；
4. 繁中支架與解析自然、無簡體字、不洩漏未作答題目的答案；
5. 文章為原創或有可驗證的使用權，不含未授權教材或真實 learner 內容。

審核者完成 review、核准同一版本後，才可依既有 Admin workflow 發布。缺少這份人類內容證據時，四篇初稿的發布判定為 **BLOCKED**。

## 驗證範圍

repository-local 驗證至少涵蓋：shared discriminated union、Zod contract、Admin draft contract、固定評分、以及 API authoritative regrading。local Supabase reset 可驗證 seed 的 migration replay 與 draft 不洩漏；connected browser、雙使用者隔離與人工內容 QA 則需要各自的獨立證據。

閱讀中心不滿足 `docs/definition-of-done.md` 中任何要求真實使用者、合格語言審核、connected deployment 或 Android 實機驗收的 gate。只有上述證據完整時，才可稱為 Connected Web 公測的一部分。
