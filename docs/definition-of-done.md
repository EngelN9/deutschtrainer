# DeutschTrainer 完成標準（Definition of Done）

更新日期：2026-07-26

本文件補充既有產品與技術規格，不取代原有 Phase 0–15 驗收條件。只有所有「必要」
門檻均有可重現的通過證據，才可稱為可公開使用的成品。能在本機啟動、能開啟離線 Demo，
或單次雲端建置成功，均不等於整體完成。

## 判定方式

- `Pass`：已有可重現的自動化或人工驗收證據。
- `Partial`：主要功能已存在，但仍缺部署、實機、外部服務或完整驗收證據。
- `Not started`：必要功能或證據尚未建立。
- `Blocked externally`：已完成所有 repository 內工作，只缺擁有者帳號、付費方案、
  商店審核、DNS 或實體裝置等外部操作。
- 所有必要門檻必須為 `Pass`。非必要項目若延期，必須在 Release Notes 明列影響、
  替代方式與預定處理版本。

## 完成門檻與目前狀態

| Gate            | 必要完成標準                                                                                                                                                                                                                           | 可接受證據                                                         | 目前狀態                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| A. 產品邊界     | Android App 是學習產品；網站提供產品、支援與法務資訊；`/admin` 只供內容團隊；API 是唯一持有 service-role／AI secret 的執行環境；離線 Demo 不宣稱為正式連線版                                                                           | 架構與產品邊界文件、頁面文案、bundle/import 檢查                   | Pass                                                                                   |
| B. 核心學習流程 | 註冊／登入、onboarding、B1–C2 課程、固定題與 AI 題、作文、聽力、口說、複習、分析、通知、離線與重新同步均可完成，且 loading／empty／error／retry 狀態完整                                                                               | 單元、整合、UI 與實機測試                                          | Partial：程式與本機整合通過；實機仍未完整驗收                                          |
| C. 內容品質     | 正式 seed 精確含 100 題 human／approved／published Exercise（B1 50、B2 25、C1 13、C2 12），每題有答案；另有 50 個單字及 10 個文法主題；逐字稿、翻譯、評分規則及答案不得公開洩漏                                                        | content-readiness 測試、匿名存取測試、人工抽查                     | Pass                                                                                   |
| D. 資料權利     | 使用者可刪除單篇作文與錄音，也能以明確破壞性確認刪除完整帳號；刪除順序涵蓋 private Storage、學習資料、Profile、Auth user、sessions 及裝置快取；隱私與帳號刪除頁說明一致                                                                | 雙使用者整合測試、Storage/DB/Auth 清除查核、Android UI 驗收        | Not started：完整帳號刪除尚未實作                                                      |
| E. 安全         | 所有個人資料有 RLS／owner isolation；管理操作有角色與版本審核；匿名不可執行 privileged SECURITY DEFINER functions；server secrets 不進 public bundle；正式 CORS 僅允許核准 origin；資料庫及 dependency advisors 無未審核的 Error／Warn | migrations、權限查詢、兩使用者測試、advisor/secret/dependency scan | Partial：核心 RLS 通過；函式權限與 advisor 警告待收尾                                  |
| F. 程式品質     | formatting、lint、workspace typecheck、全部單元／整合測試、Admin build、API production bundle smoke、Expo Doctor、Android/Web export 與 API container build 全數通過                                                                   | 本機指令及 GitHub Actions logs                                     | Pass（目前基線）；每次變更後須重跑                                                     |
| G. 連線部署     | 遠端 Supabase migrations 無 drift 且 seed／權限驗證通過；公開網站及 API 均為 HTTPS；Admin server authorization 可用；環境與 release IDs 正確；site origin 與 API CORS 配對                                                             | 部署 URL、health check、遠端整合測試、環境矩陣                     | Partial：遠端 Supabase 通過；網站與 API 尚未部署                                       |
| H. Android 實機 | Connected Preview APK 可安裝；完成 Auth、課程、固定／AI 題、作文、播放、麥克風允許與拒絕、通知、飛航模式、關閉重開、恢復連線、錯誤處理與完整帳號刪除                                                                                   | 記載裝置／Android 版本／build ID／結果的 device matrix             | Partial：離線 Demo smoke 通過；Connected Preview 尚未驗收                              |
| I. 可營運性     | API 有 health、結構化 logs、request/correlation ID、敏感資料遮罩、rate limits、AI 成本與 quota；具有監控、告警、備份／還原演練、資料庫與 API rollback runbook                                                                          | logs、告警測試、restore drill、runbook                             | Partial：health/rate limits/usage logs 已有；部署監控與還原演練未完成                  |
| J. 公開交付     | GitHub 預設分支包含可重建來源、無 secrets、CI 綠燈；PR 已 review／merge；建立版本 tag、Release Notes、APK、SHA-256、安裝與使用說明、已知限制及支援方式                                                                                 | GitHub PR／Actions／Release assets                                 | Partial：公開 repository 與 Draft PR 已有；尚未 merge 或建立 Connected Preview Release |

## 必要驗收明細

### 1. App 與學習邏輯

- B1、B2、C1、C2 皆能從課程目錄進入 lesson、作答並留下持久進度。
- 六種固定評分類型由後端重新評分原始答案，不信任 client score。
- AI structured output 必須通過 schema；timeout、quota、provider 錯誤時保留輸入並提供繁中安全錯誤。
- 作文版本不可變、最多十版、第二稿起才顯示可信參考版本。
- 口說結果只描述轉錄、語速、停頓與文字差異，不宣稱為精確發音評分。
- Offline queue 依 profile 隔離、保留 idempotency、按時間同步並讓使用者處理衝突。

### 2. Auth、隱私與安全

- 未登入不可存取個人資料，learner 不可進入內容後台。
- content_editor、reviewer、admin 的儲存、送審、核准、發布權限各自符合既有 contract。
- anon、authenticated、service-role 的 table／function／Storage privileges 均有明確 allowlist。
- SECURITY DEFINER functions 設定固定 `search_path`，且不依賴預設 `PUBLIC EXECUTE`。
- 使用者 A 永遠無法讀取、修改或刪除使用者 B 的資料與 private assets。
- 正式環境只使用 HTTPS、受限 CORS 與 provider secret store；log 不記錄 JWT、原文作文、
  錄音內容、service-role key 或 OpenAI key。
- 完整帳號刪除需再次確認；成功後本機 session/cache 清除，舊 token 不能再透過 API 存取資料。

### 3. 部署與實機

- Supabase migration 必須 append-only，乾淨資料庫可重建，remote/local migration history 一致。
- API 的 `/health` 由實際 production artifact 與部署 URL 驗證，不只測 TypeScript dev server。
- 網站 legal/support/account-deletion 文案須與實際功能一致，不可宣稱尚未部署的能力。
- Connected Preview 只使用遠端 HTTPS API/Supabase；不得使用 mock、localhost 或 placeholder。
- Device matrix 至少記錄一台實體 Android 裝置；麥克風、通知、離線及 app restart 是強制項。

### 4. GitHub 發行

- Pull Request 說明包含範圍、migration、風險、測試證據、部署步驟與 rollback。
- 所有 required checks 通過後才合併。
- Connected Preview pre-release 至少包含 APK、SHA-256、版本/build ID、安裝步驟、
  測試帳號建立方式、環境邊界及已知限制。
- README 必須讓新電腦可從零完成安裝、環境設定、migration、開發、測試、build 與部署。

## 目前到正式完成的順序

1. 收斂 database function privileges、`search_path` 與安全顧問結果。
2. 實作完整帳號刪除 API、App 確認流程、Storage／DB／Auth／cache 清除及測試。
3. 部署公開網站與 HTTPS API，設定正確 secrets、release IDs 與 CORS。
4. 建立 Connected Preview APK 並完成 Android device matrix。
5. 補齊監控、備份還原／rollback 演練與營運文件。
6. 重跑全套品質與遠端安全驗證，合併 PR，建立 GitHub pre-release。

## Release 判定

只有 Gate A–J 全部為 `Pass`，README、網站與 Release Notes 沒有超出實際能力的宣稱，
且 GitHub Release 可由乾淨環境重建，DeutschTrainer 才能標記為「已完成、可公開使用」。
在此之前，最準確的描述是「功能完整度高的 Preview／Demo，仍在部署與實機驗收階段」。
