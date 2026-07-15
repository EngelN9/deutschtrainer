# Acceptance Criteria

## 1. Phase 0 驗收

- 15 份指定規劃文件已建立。
- 建議 monorepo 骨架已建立。
- B1、B2、C1、C2 均出現在產品需求、內容模型、資料庫 schema、exercise type 與 AI schema 契約中。
- 課程結構 Level -> Course -> Unit -> Lesson -> Activity -> Exercise 與 database schema 一致。
- Exercise 型別與資料表 `exercises.type`、`exercises.payload_json`、`exercise_options`、`exercise_answers` 一致。
- AI JSON Schema/TypeScript 型別與 `ai_feedback.feedback_json`、`attempt_answers.grading_result_json` 對齊。
- Mobile 與 backend API 契約列出 request schema、response schema、權限、rate limit、cache、idempotency。
- 權限規則與 learner、content_editor、reviewer、admin 角色一致。
- 每個開發階段都有可測量的驗收條件。
- MVP 未加入排行榜、付款、好友、公會、虛擬貨幣或即時多人功能。

## 2. 一致性檢查結果

| 檢查項目                 | 結果                | 備註                                                                     |
| ------------------------ | ------------------- | ------------------------------------------------------------------------ |
| B1-B2-C1-C2 支援         | Pass                | Level enum、內容主題、課程資料表、AI schema 均含四個程度                 |
| 課程結構與 DB 一致       | Pass                | courses、units、lessons、activities、exercises 對應階層                  |
| Exercise 型別與 DB 一致  | Pass                | exercise_type enum、payload_json、options、answers、attempt_answers 對應 |
| AI schema 與 TS 型別一致 | Pass with follow-up | Phase 0 定義 contract；Phase 1/5 需落地到 `packages/ai-schemas`          |
| Mobile 與後端 API 一致   | Pass with follow-up | API contract 已列；Phase 1/2 需建立 schema package                       |
| 權限與角色一致           | Pass                | RLS 文件與角色故事對齊                                                   |
| Phase 驗收可測量         | Pass                | Roadmap 每階段均列驗收                                                   |
| MVP 排除非目標           | Pass                | PRD 明列排除排行榜、付款、社交等                                         |

## 3. Phase 1 驗收

- `apps/mobile` Expo App 可啟動。
- `apps/admin` Next.js App 可啟動。
- Supabase local 可啟動並套用初始 migration。
- `pnpm lint` 通過。
- `pnpm typecheck` 通過。
- `pnpm test` 通過。
- GitHub Actions 執行上述檢查。
- `.env.example` 明確區分 public 與 server-only secret。

## 4. Phase 2 驗收

- 未登入不可進入主要 App。
- 登入狀態可保存。
- 初次設定完成前導向 onboarding。
- 使用者只能讀寫自己的 profile、preferences、levels。
- 表單有前端與後端驗證。

## 5. Phase 3 驗收

- B1、B2、C1、C2 課程資料可顯示。
- Lesson 顯示標題、程度、技能分類、時間、先備技能、目標、單字、文法、CEFR 描述、版本與發布狀態。
- 第一階段固定題型可作答與提交。
- loading、empty、error、retry 狀態完整。
- 重新開啟 App 後進度仍存在。

目前結果：Pass。

- Supabase seed 已實際驗證 B1、B2、C1、C2 共 4 門課、9 堂課及 50 題。
- Lesson 必要欄位已在課堂頁顯示。
- 六種固定題型共用 discriminated union、Zod contract 與 deterministic grading。
- mock/Supabase adapter 均輸出同一個 `CourseCatalog` ViewModel。
- 進度依使用者分區寫入 AsyncStorage，且寫入完成後才顯示提交結果。

## 6. Phase 4 驗收

- Attempt 寫入後自動更新 SkillMastery。
- 錯誤建立 ErrorRecord。
- 錯誤或低掌握技能建立 ReviewQueue。
- 到期複習能正確顯示與完成。
- 學習分析顯示技能掌握度與弱項。

目前結果：Pass。

- `record_fixed_attempt` 以單一交易寫入 Attempt、AttemptAnswer、SkillMastery、ErrorRecord、ReviewQueue 與 LessonProgress。
- 相同 idempotency key 實際重送後仍只有一筆 Attempt。
- 答錯後同日複習可見；完成複習後舊項目結案並建立下一個間隔。
- RLS 實測第二位使用者無法讀取第一位使用者的 Attempt。
- 錯題頁按 Attempt 合併相關技能，並將答案 ID 還原成可讀德語內容。
- Playwright 已驗證桌面流程及 390 px 手機版面無水平溢出。

## 7. Phase 5 驗收

- AI key 不出現在 mobile bundle。
- AI 回傳必須通過 JSON Schema 與 Zod。
- AI 失敗時 App 不崩潰。
- AI 成本寫入 ai_usage_logs。
- 使用者看到繁體中文錯誤解釋。

目前結果：Pass。

- 本機整合測試驗證首次批改、相同 idempotency key 重播與 learner-scoped cache。
- 兩位使用者 RLS 測試確認回饋不可跨帳號讀取；匿名使用者看不到 AI 參考答案。
- authenticated 使用者不可直接執行 `record_ai_attempt`，所有 AI 寫入只經後端 service role。
- 固定 provider 測試涵蓋 schema 不合法後重試、timeout、未設定 AI、快取及 24 小時額度。
- Playwright 強制中斷一次網路請求後，App 保留原回答、顯示繁中錯誤並可成功重試。

## 8. Phase 6 驗收

- 作文原文不得被後續修改覆蓋。
- 每次修改建立獨立、依序且最多十個版本。
- 行內錯誤位置必須精確對應原文 UTF-16 offset。
- 第一稿不得顯示完整參考版本；第二稿起必須顯示可信參考版本。
- 回饋包含十項分數、繁中說明、修改任務與重複錯誤。
- 使用者可任選兩版比較，並可刪除自己的作文資料。
- 其他使用者與匿名使用者不可讀取作文、版本或評分規則。

目前結果：Pass。

- 本機整合實測第一稿 62 分、第二稿 88 分、idempotent replay、兩版原文與 add/remove diff。
- 匿名可讀已發布題目但評分規則回傳 401；第二位使用者讀到零筆 submission/version。
- authenticated 直接執行 service-only RPC 回傳 404。
- owner delete 後原文、版本與 AI feedback 為零筆，只保留不含原文的兩筆用量 metadata。
- 瀏覽器完成第一稿、行內錯誤、重寫、第二稿範文與版本比較；桌面及 390 px 無水平頁面溢出。

## 9. Phase 7 驗收

- 聽力教材的德語逐字稿、繁中翻譯與理解題不得隨公開 metadata 洩漏。
- TTS 只能以已發布的受信任教材 ID 產生，並以 private storage、短效 signed URL 與 cache 提供。
- 使用者可完成播放、慢速播放、dictation、理解題及主動揭示逐字稿。
- 口說錄音必須取得權限；拒絕或失敗時仍可使用文字 fallback。
- STT 回饋須包含逐字稿、目標文字差異、內容分數、語速、停頓與繁中建議，且不得宣稱是精確發音評分。
- 錄音、signed URL、逐字稿、回饋與刪除操作必須限制為 owner；刪除後 storage 與資料庫不得保留原始錄音。
- TTS/STT 必須納入 idempotency、rolling quota、usage log、provider retry 與安全降級。

目前結果：Pass with device follow-up。

- 本機整合實測匿名逐字稿存取為 401、TTS cache hit、dictation 100 分及 idempotent replay。
- 第二位使用者無法取得 signed URL、submission、audio metadata 或刪除錄音；owner delete 後 storage 物件已移除。
- deterministic STT 已驗證 completed 狀態、文字差異、語速、停頓、繁中建議及「不是精確發音評分」免責聲明。
- Phase 5、Phase 6 整合測試回歸通過；Expo Doctor 20/20，production web export 與 HTTP smoke test 通過。
- iOS/Android 實機的麥克風權限、錄音品質、背景切換與裝置播放仍需在發行前完成 device matrix 驗證。

## 10. Phase 8 驗收

- learner 不可讀取草稿、版本、審核工作或進入管理工作區。
- content_editor 只能建立、修改及送審，不可核准或發布。
- reviewer 可核准或退回，但不可發布。
- admin 發布前必須有相同內容版本的 approved review。
- 每次課程或題目保存都建立不可變版本快照。
- AI 產物必須通過 Structured Output、Zod 與題型語意驗證，且只能保存為 `ai_generated + draft`。
- 所有核心內容的發布狀態轉換都必須寫入 `audit_logs`，並保存 admin actor 與版本。

目前結果：Pass。

- `supabase db reset` 已驗證 Phase 1-8 migrations 與完整 seed 可共同重建。
- 四角色整合實測 learner save、editor approve/direct publish、reviewer publish 皆被拒絕。
- 課程及 AI 題目均完成 draft、pending review、approved、published 流程。
- AI 草稿在核准前發布被拒絕；相同 idempotency key 重播回傳同一題目且不增加 logical usage。
- 兩次發布各產生一筆 `content.published` audit，actor 均為 admin profile。
- Next.js production build 與 Admin TypeScript 檢查通過。

## 11. Phase 9 驗收

- `GET /courses`、`GET /courses/:id` 與 `GET /lessons/:id` 只回傳 published 內容。
- `POST /attempts` 只接受原始答案；score、isCorrect 與 grading result 由後端建立。
- `GET /users/me/progress` 與 `GET /users/me/reviews` 只能回傳登入者資料。
- `POST /reviews/:id/complete` 必須驗證 review owner 並原子完成作答與複習排程。
- 相同 learner + idempotency key 回傳第一次保存的評分，不得以不同答案覆蓋。
- authenticated 不可直接執行 `record_fixed_attempt`。
- Mobile 核心課程與學習紀錄不得直接操作 Supabase table/RPC。

目前結果：Pass。

- 公開 API 實測 4 門 B1-C2 課程、C2 篩選、course/lesson detail 與 cache header。
- 錯誤答案由後端保存為 0 分；以正確答案重送相同 key 仍回放原始 0 分。
- learner A 有一筆 attempt，learner B 為零；learner B 完成 A 的 review 回傳 404。
- learner A 完成複習後舊項目為 completed 且建立下一次 scheduled review。
- 直接 PostgREST 呼叫舊 RPC 回傳 404。

## 12. Phase 10 驗收

- `GET /users/me/writing` 只回傳登入者的作文 submissions、versions 與 feedback。
- `DELETE /writing/submissions/:id` 驗證 owner；其他使用者收到 `404`。
- `GET /users/me/audio-learning` 只回傳登入者的 listening attempts、speaking submissions 與 uploaded audio metadata。
- `POST /listening/activity` 透過 service-role wrapper 原子累加播放次數及 sticky flags。
- authenticated 不可直接執行 `delete_own_writing_submission` 或 `record_listening_activity`。
- Mobile 寫作與聽說結構化 repository 不得直接操作 Supabase table/RPC。
- 錄音 binary 可保留 owner JWT + Storage RLS 直傳，不得包含 service-role key。

目前結果：Pass。

- learner A 的作文 workspace 有 2 個版本，learner B submissions 為 0；跨帳號刪除回傳 404。
- learner A 的 audio workspace 有 1 筆 listening attempt、1 筆 speaking submission 與 1 筆 owner audio metadata，learner B 均為 0。
- 舊 authenticated 作文刪除與聽力遙測 RPC 實測回傳 `403`；service wrappers 僅 service role 有 execute privilege。

## 13. Phase 11 驗收

- `GET /users/me/settings` 只回傳登入者的 profile、程度、每日目標與通知偏好。
- `PUT /users/me/onboarding` 原子保存 current/target level、每日分鐘、學習目標與 onboarding 狀態。
- `PUT /users/me/notification-preferences` 驗證 HH:mm、IANA timezone、2-14 天未學習區間與各事件開關。
- authenticated 不可直接 update profile、insert/update preferences 或 levels，也不可執行兩個 service wrappers。
- 每日、複習與未學習排程在同一時區日期最多一筆；關閉 master switch 時排程為空。
- 作文完成、新課程與每日目標事件具有穩定 dedupe key。
- Web 必須安全降級；iOS/Android 必須建立權限流程、Android channel 與通知 deep link。

目前結果：Pass with device follow-up。

- learner A 完成 C1-C2 onboarding 並保存 45 分鐘目標、21:30、7 天與 Europe/Berlin；learner B 保持未 onboarding 與預設設定。
- learner B 直接查詢 learner A preferences 得到 0 rows；learner A 直接 PATCH preferences 回傳 `403`。
- authenticated 直接呼叫 settings service wrapper 回傳 `404`；service role 的兩個 wrapper execute privilege 均為 true。
- Notification plan 單元測試驗證 Asia/Taipei 絕對時間、每日唯一、review/inactivity precedence 與 master disable。
- iOS/Android 實機的 permission prompt、OS delivery、重開機保留與 deep link 仍需 device matrix 驗證。

## 14. Phase 12 驗收

- 課程下載、更新、移除與 pending attempts 必須依 profile 隔離並通過 schema 驗證。
- 已下載課程可離線閱讀，六種固定題可離線評分並保存；AI、到期複習完成、作文及音訊 AI 流程不得假裝離線成功。
- 重啟後中斷的同步恢復為 pending；連線恢復後依 `submittedAt` 由舊到新自動同步。
- 相同 idempotency key 不可重複 attempt；`400/404/409` 衝突保留到使用者重試或捨棄。
- API 必須重新評分原始答案，回補時間限最近 30 天且不可超過未來 5 分鐘。
- authenticated 不可執行 `record_fixed_attempt_sync_service`。

目前結果：Pass with device follow-up。

- Profile 隔離、nested version update、queue idempotency、restart recovery、conflict lifecycle 與 connectivity mapping 單元測試通過。
- API service 驗證合法 `submittedAt` 原樣傳遞，過舊與未來 timestamp 回傳 `VALIDATION_ERROR 400`。
- 本機 E2E 驗證 attempt timestamp 毫秒一致、所有技能 review 從原始時間排程、replay 為同一 attempt、stale exercise `409`、stale timestamp `400`、authenticated RPC `404`。
- Android/iOS 實機的飛航模式、關閉重開、背景 reconnect、低儲存與多筆 queue 尚待 device matrix 驗證。
