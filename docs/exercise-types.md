# Exercise Types

## 1. 共同設計

所有 Exercise 使用 TypeScript discriminated union，以 `type` 作為 discriminator。所有 request、response、database payload 與 AI schema 必須共用同一組型別名稱與 enum 值。

```ts
export type CefrLevel = "B1" | "B2" | "C1" | "C2";

export type ExerciseType =
  | "multiple_choice"
  | "multiple_select"
  | "fill_blank"
  | "sentence_order"
  | "matching"
  | "translation"
  | "dictation"
  | "error_correction"
  | "reading_comprehension"
  | "listening_comprehension"
  | "free_response"
  | "speaking"
  | "conversation"
  | "essay"
  | "summary"
  | "paraphrase"
  | "argumentation"
  | "mediation"
  | "oral_presentation";

export interface BaseExercise {
  id: string;
  level: CefrLevel;
  type: ExerciseType;
  title: string;
  instructionZhTw: string;
  promptDe: string;
  skillIds: string[];
  grammarTopicIds: string[];
  vocabularyIds: string[];
  estimatedSeconds: number;
  difficulty: number;
  sourceType: "human" | "ai_generated" | "ai_assisted";
  reviewStatus: "draft" | "pending_review" | "approved" | "rejected";
  version: number;
}
```

## 2. 第一階段固定題型

### multiple_choice

- 單一正確選項。
- 程式固定評分。
- DB 使用 exercise_options 與 exercise_answers。

必要 payload：

```ts
interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple_choice";
  options: ExerciseOption[];
  answer: { optionId: string };
}
```

### multiple_select

- 多個正確選項。
- 支援部分得分。
- 可設定必須全對或按權重給分。

### fill_blank

- 固定答案填空。
- 支援多個標準答案、大小寫容錯、德語字元正規化、忽略標點設定。

### sentence_order

- 使用者排序詞組或子句。
- 評分可為完全正確或部分順序得分。

### matching

- 左右配對。
- 支援詞彙、文法規則、句意配對。

### translation

- 翻譯題可先用規則檢查必要元素，完整評分交由 AI。
- AI 回饋需產生錯誤分類與繁體中文說明。

### dictation

- 聽寫題。
- 第一版使用精確文字比對與容錯規則。
- 須記錄播放次數、慢速、是否查看逐字稿。

### error_correction

- 使用者修正錯句。
- 可用固定答案或 AI 評分，視題目設定決定。

### reading_comprehension

- 閱讀理解題。
- 可包含主旨、細節、推論、態度、字義、結構、修辭、多來源比較。

### listening_comprehension

- 聽力理解題。
- 連結 listening_assets。
- 記錄播放行為與困難單字。

### free_response

- 自由造句或短答。
- AI 評分，不得自由文字回傳。

## 3. 第二階段輸出型題型

- speaking：錄音、STT、轉錄比較、語速、停頓與可理解度回饋。
- conversation：情境對話，依 scenario 定義角色、目標、回饋頻率與最大輪數。
- essay：作文。
- summary：摘要。
- paraphrase：改寫。
- argumentation：論證。
- mediation：轉述、簡化、整合資訊。
- oral_presentation：口頭簡報。

## 4. 固定評分規則

答案正規化需支援：

- trim 前後空白。
- Unicode normalize。
- 德語特殊字元正規化，可設定是否把 ae/oe/ue/ss 視為 ä/ö/ü/ß 的替代。
- 大小寫容錯。
- 可設定忽略標點。
- 多標準答案。
- 同義答案。
- 部分得分。
- 回傳 normalized answer 與 grading details。

固定評分函式不得依賴 UI。預期放在 `packages/grading`。

## 5. AI 評分規則

AI 適用 translation、free_response、essay、summary、paraphrase、argumentation、mediation、conversation、speaking transcript。AI 回傳必須符合 `docs/ai-output-schemas.md`，並經過：

1. JSON Schema 驗證。
2. Zod 驗證。
3. CEFR 程度限制檢查。
4. 禁止內容檢查。
5. 資料完整性檢查。
6. 失敗重試與降級處理。

## 6. Database 對應

- `exercises.type` 對應 discriminated union。
- `exercises.payload_json` 保存該題型專屬 payload。
- `exercise_options` 保存選項型題目。
- `exercise_answers.answer_json` 保存標準答案。
- `exercise_answers.grading_policy_json` 保存容錯、部分得分、同義答案設定。
- `attempt_answers.answer_json` 保存使用者原始答案。
- `attempt_answers.normalized_answer_json` 保存正規化結果。
- `attempt_answers.grading_result_json` 保存固定或 AI 評分結果。
