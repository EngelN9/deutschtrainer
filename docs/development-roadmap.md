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
