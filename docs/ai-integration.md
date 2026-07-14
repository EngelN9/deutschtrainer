# AI Integration

## 1. 原則

- AI 功能只能由後端呼叫，App 前端不得直接呼叫 OpenAI API。
- 使用 OpenAI Responses API 與 Structured Outputs。
- AI 不得只回傳自由文字，必須符合 JSON Schema。
- Prompt 存放於 `packages/ai-prompts`，並具版本號。
- Schema 存放於 `packages/ai-schemas`，與 Zod schema 同步。
- 所有 AI 結果保存 schema_version。

## 2. AI 功能

| 功能         | API                              | 輸出 Schema              | 是否可快取                       |
| ------------ | -------------------------------- | ------------------------ | -------------------------------- |
| 自由回答批改 | POST /ai/evaluate-response       | AiEvaluationFeedback     | learner+exercise+answer+versions |
| 作文批改     | POST /ai/evaluate-writing        | WritingFeedback          | no, but versioned                |
| 生成題目草稿 | POST /admin/ai/exercise-drafts   | GeneratedExerciseDraft   | idempotent replay only           |
| 德語 TTS     | POST /audio/text-to-speech       | TextToSpeechResult       | yes by text+voice hash           |
| STT          | POST /audio/transcribe           | TranscriptionResult      | no                               |
| 對話         | POST /conversations/:id/messages | ConversationTurnFeedback | no                               |

## 3. 驗證管線

每次 AI 回傳後依序執行：

1. Responses API Structured Outputs (`text.format`) JSON Schema 約束。
2. JSON parse。
3. Zod 驗證。
4. CEFR level 檢查。
5. 禁止內容檢查。
6. 資料完整性檢查，例如 error.relatedSkillId 必須存在。
7. 成本與 latency 紀錄。
8. 由 service-role-only transaction RPC 寫入 ai_feedback 或對應 domain table。

驗證失敗時：

- 可重試一次，提示模型修正 schema。
- 仍失敗則回傳通過 schema 的 fallback；不建立 Attempt、不更新 mastery。
- App 顯示可理解錯誤訊息與 retry。
- 不可顯示 stack trace。

## 4. Prompt 安全

- System prompt 明確禁止讀取其他使用者資料。
- User content 永遠包在資料欄位，不與系統指令拼接。
- 後端只提供完成任務所需的最小上下文。
- 不把 service role key、JWT、OpenAI key、內部 prompt secret 傳入模型。
- 對作文與對話文字做敏感內容最小化紀錄。

## 5. CEFR 控制

AI prompt 的可信上下文由後端依 `exerciseId` 讀取，不接受 client 自行指定：

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
- 相同 learner、exercise/version、正規化回答、prompt/version 與 schema/version 才能共用快取。
- `logical_request=true` 的 rolling 24 小時紀錄用於額度計算；idempotent replay 不重複計數。

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

- AI timeout：重試一次，仍失敗回傳可重試 fallback，且不寫入學習分數。
- Schema invalid：重試後仍失敗則保存 debug-safe 狀態，不保存完整敏感內容於 logs。
- Rate limited：告知今日額度或稍後再試。
- TTS 失敗：顯示文字稿並允許稍後重試。
- STT 失敗：允許重新錄音或改用文字作答。

## 9. Phase 5-8 實作狀態

- `translation` 與 `free_response` 已完成。
- 預設模型為 server-configurable `gpt-5.6-luna`。
- 每次 provider attempt 記錄 tokens、latency、success、errorCode 與估算成本。
- AI 題參考答案只允許 service role 讀取。
- 作文已完成 save-before-provider、十項 rubric、UTF-16 行內錯誤、first/second pass reference、版本 diff、10/day rolling quota、重試與 owner delete。
- TTS 已完成受信任 listening asset 輸入、private cache、短效 signed URL、idempotency 與 rolling quota。
- STT 已完成 owner 錄音驗證、逐字稿、時間點、文字差異、語速、停頓、繁中回饋、免責聲明、失敗降級與 owner delete。
- AI 題目草稿已完成內容角色驗證、三種受約束題型、Structured Output、Zod／語意重驗、retry、rolling quota、usage log 與冪等重播。
- 生成結果不接受模型提供 UUID、status 或 review decision；成功後由 service-only RPC 固定寫成 `ai_generated + draft`。
- 自由口說與多輪 AI 對話仍屬後續階段。
