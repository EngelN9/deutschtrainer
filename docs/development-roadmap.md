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

驗收：

- 答題後自動更新技能掌握度。
- 答錯後建立複習項目。
- 到期複習可正確顯示。

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
