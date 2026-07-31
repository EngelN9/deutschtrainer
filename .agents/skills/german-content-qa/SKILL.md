---
name: german-content-qa
description: >-
  Review DeutschTrainer German learning content for language accuracy, CEFR
  fit, Traditional Chinese explanations, answer integrity, morphology,
  government, ambiguity, and human-review status. Use for seed, catalog,
  exercises, prompts, rubrics, translations, or AI drafts; do not use for
  runtime code correctness, RLS, CI diagnosis, or automated counts alone.
---

# German Content QA

## 目的

以語言、教學與發布狀態三個層面審查 B1–C2 內容，避免錯誤、歧義、答案洩漏或未經人工核准的 AI draft 進入 published catalog。

## 適用範圍

- `supabase/seed.sql`、`supabase/seed/seed.sql`
- `packages/validation/`、`packages/shared-types/` 中的 content/exercise schemas
- `apps/mobile/src/features/courses/mockCourseCatalog.ts`
- `docs/content-model.md`、`docs/exercise-types.md`、`docs/product-requirements.md`
- Admin AI draft、review、approved/published workflow 的內容證據

## 不適用情況

- 只檢查程式執行、RLS、API transport、CI root cause 或 release artifact。
- 自動 content-readiness count 通過不等於語言品質通過。
- 不具備足夠德語能力或缺少 human reviewer 證據時，不得自行判定正式內容已通過人工審核。

## 前置檢查

1. 讀取 `AGENTS.md` 的德語內容品質、內容管理與發布規則。
2. 確認實際 content schema、exercise union、狀態名稱與答案保護邊界。
3. 建立抽樣清單：CEFR B1/B2/C1/C2、各題型、writing/listening/speaking、繁中解釋、AI draft 與 published seed。
4. 不得在輸出中複製受保護 answer key、完整 transcript 或內部 grading rules；僅描述問題與安全定位。

## 執行步驟

1. 檢查德文拼字、大小寫、Umlaut、`ß`、標點、自然度、語序、搭配詞與情境文化合理性。
2. 名詞檢查冠詞、性別、複數與格變化；動詞檢查現在/過去/完成式、可分/不可分、反身、助動詞與不規則變化。
3. 檢查介系詞與動詞支配格、固定搭配、Konjunktiv、被動、從句與 C1/C2 複雜結構。
4. 依 CEFR descriptor 判斷 vocabulary、syntax、推論負荷、task complexity 與 distractor 是否符合 B1–C2；不要只依標籤。
5. 檢查繁體中文翻譯與解釋是否準確、自然、無簡體字、能說明華語學習者常見錯誤，且未洩漏受保護答案。
6. 逐題比對 instruction、prompt、payload、correct answer、accepted alternatives、explanation、skills 與 rubric。找出無正解、多正解、合理替代答案未收錄、distractor 重疊或解析矛盾。
7. 對 writing 檢查 prompt、requirements、字數、rubric、reference 範圍一致；對 listening/speaking 檢查 target/transcript 與公開資訊邊界。
8. 確認 `source_type`、review status、content version、approved/published 關係與 audit evidence。AI 只能產生 draft，不得自行核准或發布。
9. 執行 schema/內容自動檢查：

   ```powershell
   pnpm test
   pnpm --filter @deutschtrainer/api verify:content-readiness:local
   ```

10. 將自動檢查與人工逐項語言審核分開回報。未取得具能力人員的審核紀錄時，human-review gate 標 `BLOCKED`。

## 輸出格式

先列阻擋發布的 findings，再列 Content ID/level/type、問題類別、最小安全摘錄、建議修正、是否影響答案、review status、證據與狀態。最後彙整 CEFR/題型覆蓋、人工審核狀態與自動命令結果。

## 判定規則

- `PASS`：語言、CEFR、繁中、答案/解析、rubric 與人工審核證據均符合要求。
- `FAIL`：有語言錯誤、程度不符、答案歧義/洩漏、解析矛盾、簡體中文、或 AI draft 未經人工流程即 published。
- `BLOCKED`：缺少完整內容、受權 reviewer、聽力素材、語境或人工審核紀錄。
- `NOT APPLICABLE`：該語言面向不適用於內容類型，並說明理由。

## 完成條件

抽樣與高風險內容覆蓋所有適用 CEFR/題型，阻擋性錯誤已列出，automation 與 human review 分離，且未把題數或 AI 產出當成品質證明。
