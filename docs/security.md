# Security

## 1. 安全原則

- 前端不得保存 OpenAI API key。
- 前端不得保存 Supabase service role key。
- 所有使用者輸入需前端與後端驗證。
- 啟用 RLS。
- 最小權限存取。
- 日誌不得記錄密碼、token 或完整敏感內容。
- 使用者可刪除帳號、刪除個人資料與匯出資料。

## 2. 角色與權限

| 角色           | 權限摘要                                                     |
| -------------- | ------------------------------------------------------------ |
| learner        | 讀取 published 內容；讀寫自己的學習資料、作文、錄音、對話    |
| content_editor | 建立與編輯草稿；上傳音訊；送審                               |
| reviewer       | 審核內容、核准或拒絕；檢查 CEFR 與 AI 草稿                   |
| admin          | 管理角色、發布、feature flags、audit logs、AI 成本、系統狀態 |

管理 API 必須同時檢查 Supabase session、profile.role 與 RLS。

## 3. RLS 規則

- profiles：使用者可讀寫自己的 profile；admin 可管理角色。
- course content：published 可公開讀；draft/pending_review/approved 僅內容角色。
- attempts/progress/reviews：只允許 owner 讀取，寫入集中於驗證身分與內容關聯的 transaction RPC。
- AI feedback/usage：只允許 owner 讀取；`record_ai_attempt` 僅 service role 可執行，learner 不可繞過 API 寫入分數。
- exercise_answers：固定題的已發布答案可供 client grading；translation/free_response 參考答案僅後端可讀。
- writing：published prompt 公開讀；prompt rules 僅 service role；submission/version 只允許 owner 讀取，準備、批改與失敗狀態只經 service-role RPC 寫入。
- listening：published metadata 公開讀；逐字稿、正解與 TTS 指令僅 service role；生成音訊只能透過後端短效 signed URL 讀取。
- speaking：錄音只能上傳到 `speaking-audio/{auth.uid()}/...`；metadata、submission 與 Storage object 只允許 owner 讀取及刪除。
- conversation：只允許 owner；必要審核需使用去識別化內容。
- ai_usage_logs：使用者只能讀取自己的摘要；admin 可看聚合成本。
- audit_logs：admin only。

## 4. Secrets

- `OPENAI_API_KEY` 只存在 backend runtime。
- `SUPABASE_SERVICE_ROLE_KEY` 只存在 backend runtime。
- Mobile 只允許 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY` 與 `EXPO_PUBLIC_API_BASE_URL`。
- CI secrets 不輸出到 logs。

## 5. AI 安全

- 防止 prompt injection 影響系統指令。
- User content 作為資料欄位傳入，不拼接成未隔離指令。
- 後端不把其他使用者資料傳入模型。
- AI 輸出需通過 schema、Zod、程度與禁止內容檢查。
- AI 回饋頁需說明 AI 可能出錯。
- 後端依 `exerciseId` 讀取 target level、allowed skills 與參考答案，不信任 client 傳入的評分上下文。
- 作文後端依 `promptId` 讀取 level、writing type、allowed skills、grading notes 與 reference；不信任 client 傳入評分上下文。
- 作文行內 offset、原文字串、skill、rubric 一致性、first/second pass reference 與 repeated errors 均經業務驗證。
- TTS 後端依 `listeningAssetId` 讀取逐字稿，不接受 client 任意文字；cache key 包含素材版本、voice、model 與內容。
- STT 後端驗證 prompt、owner Storage path、MIME、duration 與實際 object；回饋必須包含非精確發音評分聲明。
- 快取 key 包含 learner、exercise/version、正規化回答、prompt/version 與 schema/version，避免跨使用者回饋洩漏。

## 6. Rate Limit

- 固定題型提交：60/min。
- 課程讀取：120/min。
- AI 自由回答：依方案限制，例如免費 20/day。
- AI 作文：依方案限制，例如免費 10/day。
- TTS：依受信任內容 hash 快取，預設免費 20/day；cache hit 不占新生成額度。
- STT：預設免費 10/day。
- 對話：受 scenario maximumTurns 與 daily limit 限制。

## 7. 隱私與資料保留

- 作文、錄音、轉錄與對話屬於使用者內容。
- 使用者可刪除錄音與作文。
- `delete_own_writing_submission` hard-delete 作文原文、版本與 AI feedback；不含原文的 cost/usage metadata 依稽核需求保留。
- `DELETE /speaking/submissions/:id` hard-delete owner 錄音、audio metadata 與轉錄回饋；不含錄音或逐字稿的 usage metadata可依稽核需求保留。
- 帳號刪除需刪除或匿名化個人資料、學習紀錄與使用者上傳內容。
- AI logs 保存成本與狀態，避免保存完整敏感內容。
- audio_assets 需記錄來源與授權。

## 8. Audit

以下操作必須寫入 audit_logs：

- 角色變更。
- 課程發布或撤回。
- 內容核准或拒絕。
- feature flag 修改。
- 管理員查看敏感系統狀態。
- AI 生成草稿核准。

## 9. 前端錯誤顯示

前端不得顯示伺服器 stack trace。錯誤需顯示清楚、不羞辱使用者的繁體中文訊息，並提供可用的 retry 或下一步。
