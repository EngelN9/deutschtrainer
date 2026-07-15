# Development Roadmap

## Phase 0：文件及架構

交付：

- docs/product-requirements.md
- docs/user-stories.md
- docs/architecture.md
- docs/database-schema.md
- docs/security.md
- docs/exercise-types.md
- docs/ai-integration.md
- docs/ai-output-schemas.md
- docs/content-model.md
- docs/testing-strategy.md
- docs/development-roadmap.md
- docs/acceptance-criteria.md
- docs/open-questions.md
- docs/risks.md

驗收：

- 文件之間沒有矛盾。
- B1、B2、C1、C2 均被資料模型支援。
- 所有主要資料表已定義。
- 所有主要 API 已列出。
- 所有 AI 輸出已定義 JSON Schema 或 TypeScript schema contract。
- 已列出主要技術風險。

## Phase 1：專案基礎

交付：

- Expo 專案。
- Next.js 管理後台。
- Supabase 本地開發環境。
- TypeScript strict。
- ESLint。
- Prettier。
- Jest。
- GitHub Actions。
- 環境變數範例。
- 基本資料夾結構。

目前狀態：

- 已完成 Phase 1 foundation scaffold。
- 詳見 `docs/phase-1-foundation.md`。

驗收：

- App 可啟動。
- Web 後台可啟動。
- lint 通過。
- typecheck 通過。
- 測試通過。
- CI 通過。

## Phase 2：帳號及導覽

交付：

- 註冊、登入、登出、忘記密碼。
- 初次設定。
- 程度選擇。
- Expo Router 導覽。

目前狀態：

- 已完成 Phase 2 mobile auth/navigation foundation。
- 詳見 `docs/phase-2-auth-navigation.md`。

驗收：

- 使用者只能查看自己的資料。
- 未登入使用者不可進入主要 App。
- 登入狀態可保存。

## Phase 3：課程及題目

交付：

- 課程地圖。
- 單元列表。
- 課堂頁。
- 題目播放器。
- 固定題型。
- 假資料及 Supabase 資料切換。

目前狀態：

- 已完成 Phase 3 course/exercise foundation。
- 詳見 `docs/phase-3-courses-exercises.md`。

驗收：

- B1、B2、C1、C2 資料均可正確顯示。
- 不同題型可正常提交。
- 重新開啟 App 後進度仍存在。

## Phase 4：學習紀錄

交付：

- Attempt。
- SkillMastery。
- LessonProgress。
- ReviewQueue。
- 錯題頁。
- 學習分析。

目前狀態：

- 已完成 Phase 4 learning-record foundation。
- 詳見 `docs/phase-4-learning-records.md`。

驗收：

- 答題後自動更新技能掌握度。
- 答錯後建立複習項目。
- 到期複習可正確顯示。

驗收結果：Pass。

## Phase 5：AI 批改

交付：

- 自由回答批改。
- 翻譯批改。
- 錯誤分類。
- Structured Outputs。
- 失敗重試。
- 快取。
- 成本紀錄。

驗收：

- AI 回傳格式永遠經過驗證。
- 錯誤時 App 不崩潰。
- 使用者看到繁體中文解釋。
- AI 金鑰不出現在前端。

驗收結果：Pass。

- `translation` 與 `free_response` 共用受保護的 `POST /ai/evaluate-response` 流程。
- Structured Outputs 後仍執行 Zod、技能關聯、CEFR、一致性及禁止內容檢查，失敗最多重試一次。
- learner-scoped cache、24 小時 20 次額度、token、latency 與估算成本均由後端處理。
- AI 回饋、Attempt、ErrorRecord、Mastery、ReviewQueue 與 LessonProgress 由 service-role-only RPC 原子寫入。
- Playwright 已驗證斷線保留回答、重試成功、繁中回饋，以及 390 px 手機版無水平溢出。

## Phase 6：作文

交付：

- 作文提交。
- 版本保存。
- 行內錯誤標示。
- 分項評分。
- 重寫流程。

驗收：

- 原文不被覆蓋。
- 每次修改都有版本。
- 使用者可比較兩個版本。

目前狀態：Pass。

- B1-C2 各有一個已審核題目，公開欄位與後端評分規則分表保存。
- 第一稿先保存再批改，僅提供行內錯誤、十項評分與修改任務，不顯示完整範文。
- 第二稿起顯示受保護的可信範文，並記錄重複錯誤與字詞 diff。
- 最多十版、current-version 衝突、字數、idempotency 與 first/second pass 規則由 service-only RPC 強制執行。
- App 支援任選兩版比較、失敗版本重試、作文錯誤分析與 owner hard delete。
- 詳見 `docs/phase-6-writing.md`。

## Phase 7：音訊及口說

交付：

- TTS。
- 音訊播放器。
- 錄音。
- Speech-to-Text。
- 聽寫。
- 基本口說回饋。

驗收：

- 音訊權限處理完整。
- 拒絕權限時有替代流程。
- 錄音可刪除。
- 音訊不會被其他使用者讀取。

目前狀態：Pass。

- TTS 僅接受受信任素材 ID，生成音檔保存於 private bucket 並以短效 signed URL 播放。
- 聽力支援正常／慢速、重播、關鍵詞、受保護逐字稿、聽寫與理解題，結果與操作遙測皆保存。
- 口說支援完整麥克風權限流程、本機預聽、私有上傳、STT、缺漏詞、語速、長停頓及重錄建議。
- 回饋明確標示為 STT 輔助文字比對，不宣稱精確發音評分。
- 跨使用者 Storage、資料列與刪除均經本機雙帳號整合測試驗證。
- 詳見 `docs/phase-7-audio-speaking.md`。

## Phase 8：管理後台

交付：

- 課程管理。
- 題目管理。
- 審核流程。
- 內容版本。
- AI 生成草稿。
- 發布流程。

驗收：

- AI 內容不得直接發布。
- 非管理員不可進入管理功能。
- 所有發布操作寫入 audit log。

目前狀態：Pass。

- `content_editor` 可建立／修改草稿及送審，`reviewer` 可核准／退回，只有 `admin` 可發布。
- 課程與題目寫入集中於 security-definer RPC，每次保存建立不可變 `content_versions` 快照。
- AI 題目只支援受約束的單選、填空與改錯草稿；Structured Output、Zod 與語意檢查後仍固定為 `ai_generated + draft`。
- 發布前必須存在同版本的 approved review；資料庫 trigger 對所有核心內容發布寫入 `audit_logs`。
- Next.js 後台完成總覽、課程、題目、審核、AI 工作與操作紀錄六個工作區。
- 四角色本機整合測試驗證 learner/editor/reviewer/admin 的拒絕與允許路徑、冪等 AI 草稿及 audit actor。
- 詳見 `docs/phase-8-admin-console.md`。

## Phase 9：核心 API 資料邊界

交付：

- 已發布課程、課程明細與課堂明細 API。
- 固定題後端權威評分與 transaction 寫入。
- 私人進度與複習 API。
- Mobile 課程與學習紀錄 repository API 化。
- learner 直接作答 RPC 撤權。

驗收：

- Client 不可傳入 score 或 isCorrect。
- 相同 idempotency key 必須回放第一次結果。
- 第二位使用者不可讀取進度或完成他人複習。
- 公開內容只包含 published 資料並具有快取標頭。
- 舊 `record_fixed_attempt` 不可由 authenticated 直接執行。

目前狀態：Pass。

- 七個規格端點均有獨立 Zod request/response schema。
- API 依已發布固定題重新評分，再呼叫 service-role-only RPC 原子更新學習紀錄。
- Mobile 不再直接查詢課程、attempt、mastery、review 或 lesson progress table。
- 雙帳號整合測試驗證後端 0 分、冪等回放、`401`、跨帳號 `404`、下一次複習及舊 RPC `404`。
- 詳見 `docs/phase-9-api-boundary.md`。

## Phase 10：寫作與聽說工作區 API

交付：

- 私人作文與聽說 workspace API。
- 作文 owner deletion API。
- 聽力播放遙測 API 與原子 service wrapper。
- Mobile 寫作／聽說結構化 repository API 化。
- 共用私人請求 rate limiter。

驗收：

- 第二位使用者不可讀取或刪除第一位使用者的作文、聽力、口說或 audio metadata。
- authenticated 不可直接執行作文刪除或聽力遙測 RPC。
- Mobile 僅以 Supabase Storage RLS 處理 owner binary，上層結構化資料均經 API。

目前狀態：Pass。

- 四個受保護端點具有獨立 Zod response contract、統一錯誤與 `no-store`。
- 雙帳號整合測試驗證作文兩版、聽力／口說 workspace 隔離、跨帳號 `404`、舊 RPC 撤權及 owner deletion。
- 詳見 `docs/phase-10-workspace-api.md`。

## Phase 11：通知偏好與本機提醒

交付：

- 個人設定、onboarding 與通知偏好 API。
- 每日學習、到期複習與多日未學習本機排程。
- 作文完成、新課程發布與每日目標完成事件通知。
- master/per-event 開關、提醒時間、未學習天數、時區與系統權限狀態。
- 同日排程合併與事件 ledger 去重。

驗收：

- 第二位使用者不可讀取或修改第一位使用者偏好。
- authenticated 不可直接 insert/update profile、preferences 或 levels，也不可執行 service wrappers。
- 關閉 master switch 後不保留任何排程提醒。
- 同一時區日期最多一筆排程提醒；事件通知以穩定 key 去重。
- Web 不載入 native notification module；Android/iOS 使用明確 channel、權限與 deep link。

目前狀態：Pass with device follow-up。

- 三個受保護設定端點具有獨立 Zod contract、統一錯誤與 `no-store`。
- Mobile profile/onboarding/preferences 不再直接操作 Supabase table。
- 雙帳號整合測試驗證 C1-C2 onboarding、Europe/Berlin 時區、21:30 提醒、跨帳號零資料、table write `403` 與 service RPC `404`。
- 純函式測試驗證 timezone conversion、每日去重、review/inactivity precedence 與 master switch。
- iOS/Android 實機通知權限、排程送達及 deep link 仍需發行前 device matrix 驗證。
- 詳見 `docs/phase-11-notifications.md`。

## Phase 12：離線課程與作答同步

交付：

- 每位 learner 隔離的課程下載、更新與移除。
- 已下載課程離線閱讀及六種固定題本機評分。
- durable pending attempts、重啟恢復、連線恢復自動同步。
- 同步失敗、衝突、重試、捨棄與手動同步介面。
- 原始作答時間回補、30 天界線與 service-role-only RPC。

驗收：

- 未下載內容在離線重啟後不可用；已下載內容可讀並可完成固定題。
- AI 批改、到期複習完成、作文、TTS/STT 與即時生成在離線時明確停用。
- 相同 idempotency key 不重複寫入，pending queue 依原始時間由舊到新同步。
- API 必須重新評分原始答案，並以實際作答時間計算 activity 與 review schedule。
- authenticated 不可直接執行 offline sync RPC；衝突不得被靜默刪除。

目前狀態：Pass with device follow-up。

- AsyncStorage snapshot 與 settings cache 均經 Zod 驗證並依 profile/auth user 隔離，pending 上限 200。
- NetInfo、typed API errors、離線 catalog adapter、reconnect coordinator 與管理介面已完成。
- 本機 migration reset、毫秒級 timestamp、兩技能 review schedule、冪等 replay、stale `400` 與 direct RPC `404` 實測通過。
- Android/iOS 飛航模式、process kill/relaunch、背景切換、低儲存與 reconnect race 仍需 device matrix 驗證。
- 詳見 `docs/phase-12-offline-sync.md`。

## Phase 13：單字與文法知識庫

交付：

- B1-C2 單字與文法公開搜尋 API。
- 德語／繁中搜尋、CEFR 篩選、分頁與 published-only 邊界。
- 單字詞形、搭配、語域、地區、例句及近反義資訊。
- 文法繁中詳解、規則、例句、常見錯誤、先備主題與相關技能。
- Mobile 知識庫、單字詳情、文法詳情與精確相關練習導覽。

驗收：

- 所有 request/response 具有獨立 Zod schema，無效篩選回傳 `400`。
- draft/rejected/archived 內容不可由 API 取得；不存在或未發布 detail 回傳 `404`。
- 10 個 seed 文法主題均有規則、翻譯例句與中文母語者常見錯誤對照。
- 德語與繁中搜尋、分頁、CEFR 篩選及相關練習均可操作。
- 390 px 與桌面寬度無文字遮擋或水平溢出。

目前狀態：Pass。

- 本機 E2E 實測 50 筆單字、published status、分頁、`die Miete` 繁中搜尋、`B1.nebensatz` 文法搜尋、詳細內容與各 6 筆相關練習。
- invalid difficulty 回傳 `400`，未知 UUID 回傳 `404`。
- 詳見 `docs/phase-13-knowledge-library.md`。
