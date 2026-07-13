# Open Questions

## 1. 產品與內容

- MVP 的 B1 完整單元要優先選哪個主題：租屋、醫療、求職、正式/非正式電子郵件，或旅行交通？
- B2 示範單元應偏檢定寫作、職場溝通，還是新聞聽讀？
- C1/C2 示範課要選學術寫作、摘要改寫、修辭分析，或正式簡報？
- 繁體中文文法說明的語氣要偏補習班式、學術式，或簡潔任務式？
- 是否要在 MVP 提供 Goethe/telc/OSD 的標籤，但不宣稱官方授權？

## 2. AI 與成本

- TTS 聲音要先提供幾種？是否區分男聲/女聲或地區？
- AI 批改是否需要所有 C1/C2 輸出任務進入人工抽審？
- AI 生成補強題目是否在 MVP 啟用，或先只做內部管理功能？

## 3. 技術

- monorepo 使用 pnpm workspace、Turborepo，或先採 pnpm workspace 即可？
- 離線儲存使用 Expo SQLite、MMKV，或 React Query persistence？
- E2E 第一版選 Maestro 還是 Detox？
- 管理後台是否與 API 共用同一套 server package？

## 4. 法務與隱私

- 使用者作文、錄音與轉錄保存多久？
- 刪除帳號時是否立即刪除所有音訊，或先進入短期復原期？
- 示範內容的授權與來源欄位是否需在 UI 顯示？
- AI 可能出錯的提示文案應放在哪些頁面？

## 5. 商業與營運

- MVP 是否需要區分免費/付費額度，即使不做訂閱付款？
- 管理後台第一版是否需要完整匿名化學習統計，或先以種子資料與內部帳號測試？
- 是否需要建立內容審核 SLA 或審核優先級？

## 6. Phase 5 已決定

- 免費 AI 回答批改採 rolling 24 小時 20 次，可由 `AI_DAILY_FREE_LIMIT` 調整。
- 預設批改模型為可設定的 `gpt-5.6-luna`；模型與單價皆由 server-only 環境變數控制。
- Phase 5 採獨立 Node.js API，Supabase 負責 Auth、PostgreSQL、RLS 與 transaction RPC。
