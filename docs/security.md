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

- profiles/preferences/levels：Mobile 經 API 讀取；onboarding 與通知偏好只透過 service-role-only RPC 原子寫入，authenticated 沒有 table insert/update 權限；admin 仍可管理角色。
- course content：published 可公開讀；draft/pending_review/approved 僅內容角色。
- attempts/progress/reviews：API 先驗證 access token 並以 profile ID 篩選；寫入集中於 service-role-only transaction RPC。
- AI feedback/usage：只允許 owner 讀取；`record_ai_attempt` 僅 service role 可執行，learner 不可繞過 API 寫入分數。
- exercise_answers：固定題的已發布答案可供 client grading；translation/free_response 參考答案僅後端可讀。
- writing：published prompt 公開讀；prompt rules 僅 service role；Mobile 由 API 讀取 owner submission/version，準備、批改、失敗與刪除只經 service-role RPC。
- listening：published metadata 公開讀；Mobile 由 API 讀取 owner attempt 並寫入遙測；逐字稿、正解與 TTS 指令僅 service role；生成音訊只能透過後端短效 signed URL 讀取。
- speaking：結構化 metadata/submission 由 API 讀取與刪除；錄音 binary 只能上傳到 `speaking-audio/{auth.uid()}/...`，Storage object 仍只允許 folder owner 操作。
- content governance：learner 不可讀取版本／審核／AI job；課程與題目沒有 authenticated 直接 mutation policy，只能經角色驗證 RPC 寫入。
- publishing：content_editor 送審、reviewer 核准、admin 發布；相同版本沒有 approved review 時，RPC 與資料庫 trigger 都拒絕發布。
- function execution：identity/content-role helpers 與管理 RPC 先撤銷預設
  `PUBLIC/anon/authenticated EXECUTE`，再只對 `authenticated` 回授必要入口；trigger
  functions 不提供 client 直接執行權。service-only functions 維持明確
  `service_role` allowlist。所有 `SECURITY DEFINER` functions 與共用
  `set_updated_at` trigger function 都固定 `search_path`，避免 caller-controlled schema
  影響名稱解析。
- conversation：目前沒有 API 或 database tables；未來實作時必須採 owner isolation，
  必要審核只可使用去識別化內容。
- ai_usage_logs：使用者只能讀取自己的摘要；admin 可看聚合成本。
- ai_quota_reservations / ai_provider_call_reservations：無 anon/authenticated table grant 或
  policy；只由 service role 呼叫固定 `search_path` 的 reservation/finalization RPC。帳號刪除
  透過 profile FK cascade 移除個人 quota rows；不含 key／內容的 provider-call 全域計數將
  FK 設為 null 後保留，避免刪帳繞過 UTC-day 硬上限。
- audit_logs：admin only。

## 4. Secrets

- `OPENAI_API_KEY` 只存在 backend runtime。
- `SUPABASE_SERVICE_ROLE_KEY` 只存在 backend runtime。
- Mobile 只允許 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY` 與 `EXPO_PUBLIC_API_BASE_URL`。
- CI secrets 不輸出到 logs。
- `AI_PUBLIC_ENABLED` 是 server-only emergency switch；staging/production 啟用時若缺少
  `OPENAI_API_KEY`，API 必須在啟動時 fail fast。健康檢查只回傳 boolean 狀態，不回傳 key。
- BYOK 尚未實作。完成 KMS-backed envelope encryption、threat model、刪除與備份驗證前，
  Mobile、Admin、API contract 與資料庫都不得接受或保存使用者 OpenAI Key。
- staging／production 的 `CORS_ALLOWED_ORIGINS` 必須是精確 HTTPS origin allowlist；API 不得
  回傳 wildcard，也不得對未允許的 browser origin 回傳 CORS header。

Gate 3 remote evidence verifies zero `PUBLIC` function execute privileges, service-role-only
account deletion, protected writing/listening tables without client grants, 36/36 public tables
with RLS, and zero anon/authenticated mutation or `MAINTAIN` grants on current public tables and
the `postgres` defaults used by repository migrations. Supabase advisors still flag the eight intentionally authenticated identity/Admin
`SECURITY DEFINER` entry points; they remain an explicit allowlist whose remote role behavior must
be rechecked by the deployed two-user suite rather than suppressed or treated as automatically
safe. The platform-owned `supabase_admin` default ACL is outside repository-migration authority;
application tables must not be created through an unreviewed dashboard path and every new table
migration must verify its effective client privileges.

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
- AI 題目生成只接受 activity、level、題型、可信 skill code 與編輯 brief；模型不得提供 UUID、status 或 review decision。
- AI 題目輸出經 Structured Output、Zod、題型一致性、德文／繁中及禁止內容檢查，成功後仍固定寫成 `ai_generated + draft`。
- 快取 key 包含 learner、exercise/version、正規化回答、prompt/version 與 schema/version，避免跨使用者回饋洩漏。
- 固定題 API 只接受原始答案，不接受 client 傳入 score、isCorrect 或 grading result；後端依已發布題目重新評分。

## 6. Rate Limit

- 固定題型提交：60/min。
- 課程讀取：120/min。
- AI 自由回答：已驗證 learner 預設 5/rolling 24h。
- AI 作文：已驗證 learner 預設 2/rolling 24h。
- TTS：依受信任內容 hash 快取，預設 5/rolling 24h；cache hit 不占額度。
- STT：已驗證 learner 預設 2/rolling 24h。
- 平台所有 learner AI provider attempts 合計預設 100/UTC day；資料庫 advisory lock 與
  unique constraints 防止並行穿透。provider 失敗釋放個人額度，但已發生的 provider attempt
  仍保留在全域硬上限與 usage/cost log。
- AI 題目草稿：內容編輯與 admin 預設 20/rolling 24h；idempotent replay 不重複計數。
- 對話：尚未實作；未來必須同時受 scenario maximumTurns、daily limit 與 owner
  isolation 限制。

Phase 9 至 Phase 11 的私人學習／工作區／設定 API 在單一 runtime 內採每位 profile 60/min sliding window；正式多執行個體部署仍需由 gateway 或共享 rate-limit store 提供全域限制。

## 7. 隱私與資料保留

- 作文、錄音、轉錄與對話屬於使用者內容。
- 使用者可刪除錄音與作文。
- `DELETE /writing/submissions/:id` 經 service-only wrapper hard-delete owner 作文原文、版本與 AI feedback；不含原文的 cost/usage metadata 依稽核需求保留。
- `DELETE /speaking/submissions/:id` hard-delete owner 錄音、audio metadata 與轉錄回饋；不含錄音或逐字稿的 usage metadata可依稽核需求保留。
- `GET /users/me/export` 匯出 owner profile、設定、學習／AI／作文／聽說與內容工作紀錄；
  私人錄音只提供一小時 signed URL，不輸出 secret、受保護答案或其他使用者資料。
- `DELETE /users/me` 必須收到精確確認詞。API 先用 service-only transaction 將 profile
  標記為刪除中並取得 owner 錄音路徑，成功刪除 Storage 後才 hard-delete Auth user；
  profile 相關私人 rows 由 FK cascade 清除，治理紀錄的 requester 以 null 匿名化。
- Mobile 在 server deletion 成功後清除 profile-scoped settings、通知、下載／pending
  attempts、progress 與 Auth session。遠端雙使用者、舊 token 與實機 cache 驗證完成前，
  不得宣稱完整資料刪除已 production-ready。
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
- 課程或題目保存、送審及所有 published 狀態轉換。

## 9. 前端錯誤顯示

前端不得顯示伺服器 stack trace。錯誤需顯示清楚、不羞辱使用者的繁體中文訊息，並提供可用的 retry 或下一步。

## 10. Request tracing 與 logs

- API adapter 驗證或產生 bounded `x-request-id`，在 response header 與錯誤 envelope 使用同一值。
- HTTP log 只含 request ID、method、pathname、status 與 duration；不記錄 query string、
  headers、token、body、作文、逐字稿或錄音。
- process-local rate limiter 不是多執行個體的全域限制；部署前須使用 gateway 或共享
  store 並驗證。完整營運邊界見 `docs/operations.md`。

## 11. Synthetic evaluation isolation

- `evaluation/matraix` 只允許完全虛構、年滿 18 歲、無姓名、email、地點、敏感屬性或
  production identifier 的 cohort；不得由真實 learner submission 匿名化或改寫而來。
- 不下載或抽樣 Persona 1M，也不掛載 repository `.env`、production data、Docker socket 或
  完整工作目錄。
- Live provider 只接受獨立 `MATRAIX_EVAL_*` key；禁止讀取 production `OPENAI_API_KEY`、
  public client variables 或 learner BYOK。Provider terms、retention 與 OpenAI `store:false`
  adapter 未核准前一律 fail closed。
- `.runs/` 保存 ignored 原始結果；checked report 不含 provider 原文。輸出須限制大小並拒絕
  raw HTML、secret、JWT、private key 與直接聯絡 PII。
- Synthetic 結果不得改變 grading、CEFR、content status、prompt、quota、migration、PR、
  deployment、release 或 Definition of Done 判定。
