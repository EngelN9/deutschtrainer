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

- AsyncStorage 接近 5 MB、pending queue 超過目前每 profile 200 筆上限，或需要跨課程索引
  查詢時，SQLite 遷移的門檻與資料轉換策略為何？
- Connected device E2E 在 Maestro guest smoke 之外，哪些 authenticated flows 應優先自動化？

## 4. 法務與隱私

- 使用者作文、錄音與轉錄保存多久？
- 刪除帳號時是否立即刪除所有音訊，或先進入短期復原期？
- 示範內容的授權與來源欄位是否需在 UI 顯示？
- AI 可能出錯的提示文案應放在哪些頁面？

## 5. 商業與營運

- 第二階段 BYOK 的 managed KMS 供應商、key rotation 與復原程序何時完成 threat model？
- 管理後台第一版是否需要完整匿名化學習統計，或先以種子資料與內部帳號測試？
- 是否需要建立內容審核 SLA 或審核優先級？

## 6. AI entitlement 已決定

- 第一階段只提供已驗證 learner 的平台免費額度：一般批改 5、作文 2、TTS 5、STT 2，
  均採 rolling 24 小時並由 server-only 環境變數調整。
- 平台 provider attempt 採 100/UTC day 資料庫原子硬上限；OpenAI budget 只作告警，
  不取代硬上限。
- BYOK 不與第一階段同時推出；完成正式 threat model 與 KMS-backed envelope encryption
  前不得顯示或宣稱可用。
- 預設批改模型為可設定的 `gpt-5.6-luna`；模型與單價皆由 server-only 環境變數控制。
- Phase 5 採獨立 Node.js API，Supabase 負責 Auth、PostgreSQL、RLS 與 transaction RPC。

## 7. Repository 已決定

- Monorepo 使用 pnpm workspace，未加入 Turborepo。
- 目前 bounded offline snapshot 使用 AsyncStorage；達到文件化容量／查詢門檻時再評估
  SQLite，不以擴大單一 JSON item 迴避遷移。
- 第一條版本化 native smoke 使用 Maestro；Web 行為另由既有 Playwright/Jest 證據覆蓋。
- Admin 與 API 是不同 workspace/runtime，只共用 validation、types 等穩定 package。
- 目前 release 不含付款；AI 額度存在，但不是訂閱或付費 entitlement。
- 帳號刪除採立即、不可逆的 owner Storage 與 Auth 刪除。正式資料保留與法務核准仍是
  deployment 前的外部決策，不由 repository 實作取代。
