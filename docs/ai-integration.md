# AI Integration

## 1. 原則

- AI 功能只能由後端呼叫，App 前端不得直接呼叫 OpenAI API。
- 使用 OpenAI Responses API 與 Structured Outputs。
- AI 不得只回傳自由文字，必須符合 JSON Schema。
- Prompt 存放於 `packages/ai-prompts`，並具版本號。
- Schema 存放於 `packages/ai-schemas`，與 Zod schema 同步。
- 所有 AI 結果保存 schema_version。

## 2. AI 功能

| 功能         | API                              | 輸出 Schema              | 是否可快取              |
| ------------ | -------------------------------- | ------------------------ | ----------------------- |
| 自由回答批改 | POST /ai/evaluate-response       | AiEvaluationFeedback     | by exercise+answer hash |
| 作文批改     | POST /ai/evaluate-writing        | WritingFeedback          | no, but versioned       |
| 生成補強練習 | POST /ai/generate-practice       | GeneratedPracticeSet     | no until approved       |
| 德語 TTS     | POST /audio/text-to-speech       | TextToSpeechResult       | yes by text+voice hash  |
| STT          | POST /audio/transcribe           | TranscriptionResult      | no                      |
| 對話         | POST /conversations/:id/messages | ConversationTurnFeedback | no                      |

## 3. 驗證管線

每次 AI 回傳後依序執行：

1. JSON parse。
2. JSON Schema 驗證。
3. Zod 驗證。
4. CEFR level 檢查。
5. 禁止內容檢查。
6. 資料完整性檢查，例如 error.relatedSkillId 必須存在。
7. 成本與 latency 紀錄。
8. 寫入 ai_feedback 或對應 domain table。

驗證失敗時：

- 可重試一次，提示模型修正 schema。
- 仍失敗則回傳統一錯誤格式。
- App 顯示可理解錯誤訊息與 retry。
- 不可顯示 stack trace。

## 4. Prompt 安全

- System prompt 明確禁止讀取其他使用者資料。
- User content 永遠包在資料欄位，不與系統指令拼接。
- 後端只提供完成任務所需的最小上下文。
- 不把 service role key、JWT、OpenAI key、內部 prompt secret 傳入模型。
- 對作文與對話文字做敏感內容最小化紀錄。

## 5. CEFR 控制

AI request 需包含：

- targetLevel
- allowedSkills
- allowedGrammarTopics
- allowedVocabularyRange
- taskType
- correctionDepth
- outputLanguage: zh-TW for explanations

AI output 需包含 cefrLevelEstimate。後端需檢查估計程度與 targetLevel 是否偏離；偏離時需標記 requiresHumanReview 或要求重試。

## 6. 成本控制

每次 AI 呼叫記錄：

- userId
- feature
- model
- inputTokens
- outputTokens
- estimatedCost
- latency
- success
- errorCode
- createdAt

策略：

- 固定題型不使用 AI。
- 相同題目解釋可快取。
- 對話限制最大輪數。
- 作文限制字數。
- 免費使用者限制每日 AI 次數。
- 重複請求使用 idempotency key。
- AI 失敗時使用預設錯誤說明。

## 7. TTS 與 STT

TTS：

- 文字必須為德語或審核過的教學內容。
- 產生音訊需寫入 audio_assets。
- 保存來源、模型、授權與生成時間。

STT：

- 用於 dictation、speaking 與 conversation。
- STT 結果不得宣稱為精確發音評分。
- 口說回饋需區分內容、文法、流暢度、語速、停頓、可理解度、疑似發音問題。

## 8. 降級策略

- AI timeout：回傳 retryable error。
- Schema invalid：重試後仍失敗則保存 debug-safe 摘要，不保存完整敏感內容於 logs。
- Rate limited：告知今日額度或稍後再試。
- TTS 失敗：顯示文字稿並允許稍後重試。
- STT 失敗：允許重新錄音或改用文字作答。
