# DeutschTrainer Product and Technical Specification

> 本文件定義 DeutschTrainer 的穩定產品邊界與技術原則。它是規格索引，
> 不是應整份提交給 Codex 的單一提示詞。

## 1. 文件角色與權威順序

實作工作必須依序遵循：

1. 使用者在目前工作階段中的明確要求
2. 安全、隱私與資料完整性要求
3. [`AGENTS.md`](AGENTS.md)
4. 適用的 [`.agents/skills/`](.agents/skills/) 指引
5. [`docs/definition-of-done.md`](docs/definition-of-done.md)
6. [`docs/security.md`](docs/security.md)
7. [`docs/architecture.md`](docs/architecture.md)
8. 相關資料庫、AI、測試、驗收與 Phase 文件
9. 本文件
10. [`README.md`](README.md)

本文件提供長期產品方向；實際完成狀態必須以程式碼、測試、migration、
部署證據、裝置證據與 Definition of Done 為準。文件與實作衝突時，不得只依
本文件推測系統已完成。

## 2. 產品使命

DeutschTrainer 是面向繁體中文使用者的德語 B1–C2 自學系統。產品重點是：

- 結構化的 B1、B2、C1、C2 學習路徑
- 針對中文母語者的德語錯誤診斷與繁體中文解釋
- 單字、文法、閱讀、聽力、寫作與口說訓練
- 固定題型的確定性評分與伺服器權威驗證
- AI 輔助的寫作、翻譯、摘要、改寫、論證與口說回饋
- 技能掌握度、錯誤歷史、間隔複習與學習趨勢
- 可下載課程、離線作答與可恢復的同步流程
- 內容草稿、人工審核、版本控制與發布治理

第一版不提供 A1、A2 完整課程，也不以排行榜、社交系統、虛擬貨幣、
訂閱付款或即時多人功能為核心範圍。

## 3. 主要使用者

- 已完成 A2、準備進入 B1 的學習者
- 準備 Goethe、telc、ÖSD 等德語能力檢定的學習者
- 需要繁體中文文法說明與錯誤分析的學習者
- 為工作、留學、移民或學術用途提升德語能力的學習者
- 已達 B2 或 C1、希望改善正式寫作、論證、摘要、語域與高階閱讀者

## 4. 產品表面與優先順序

### 4.1 Android 學習 App

`apps/mobile` 是現階段主要學習者產品：

- Expo、React Native、TypeScript 與 Expo Router
- Android 為第一發布與實機驗收優先
- iOS 保留支援，但不應在沒有實機證據時宣稱已完成
- 學習流程、離線課程、固定題型、AI 題型、寫作、聽力、口說、進度與複習
- 完整處理 loading、empty、error、retry、offline、unauthorized 與 conflict 狀態

原生通知、麥克風、錄音、安裝、App restart、飛航模式與 background reconnect
必須以實體裝置驗證；Expo Web、Expo Go、模擬器或單元測試不能取代此證據。

### 4.2 管理員與公開網站

`apps/admin` 同時承擔：

- 公開產品介紹、支援、隱私權政策、服務條款與帳號刪除說明
- 受伺服器端身分與角色保護的 `/admin` 管理區
- 課程、題目、版本、審核、AI 草稿與發布管理

公開頁面不得載入管理員秘密或暴露內部管理 API。管理權限不能只靠前端隱藏
按鈕，必須由伺服器與資料庫權限共同執行。

### 4.3 學習者 Web

Expo Web 可作為次要學習者介面與 connected preview，但不應為追求所有平台
完全一致而破壞 Android 體驗。原生檔案、通知、錄音與背景行為可維持平台專屬
實作。

### 4.4 API 與 Supabase

`apps/api` 是唯一可持有 Supabase service-role key 與 OpenAI API key 的 runtime。
Supabase 統一提供 PostgreSQL、Auth、Storage、RLS 與必要基礎設施。

Mobile、Web 與 Admin 只能取得經核准的公開設定，不得持有：

- Supabase service-role key
- OpenAI API key
- database password
- 私密 signing material
- 其他伺服器端 credential

## 5. 共用架構原則

下列內容應由 `packages/` 或其他明確的共用層維持單一來源：

- domain types 與 discriminated unions
- request／response 與 exercise schemas
- deterministic grading
- mastery calculation 與 spaced review scheduling
- API error、pagination 與 release metadata contracts
- AI Structured Output schemas 與版本化 prompt metadata
- database repository contracts

高度依賴平台的通知、檔案系統、錄音、瀏覽器儲存、Next.js server component
與原生 navigation 不應勉強塞進同一實作；應使用 interface、adapter 或
platform-specific file。

## 6. 學習與內容模型

所有正式內容必須標示 CEFR 程度：`B1`、`B2`、`C1` 或 `C2`。

系統應支援：

- 課程、單元、課堂、技能、文法主題、單字與題目
- 單選、複選、填空、排序、配對、翻譯、聽寫、改錯、閱讀、聽力與自由回答
- 後續的 speaking、conversation、essay、summary、paraphrase、argumentation、
  mediation 與 oral presentation
- 人工、AI 輔助與 AI 生成來源標記
- `draft`、`pending_review`、`approved`、`published`、`rejected`、`archived`
- 版本、審核者、發布者與 audit trail

AI 生成內容不得自動核准或發布。C1、C2 高階內容與公開內容必須保留人工審核
證據。

## 7. 評分與 AI 邊界

固定答案題型優先使用確定性程式評分。固定評分須支援必要的正規化、可接受答案、
部分得分與題型專屬規則，且以伺服器權威結果為準。

AI 評分與內容生成必須：

- 只由後端呼叫 provider
- 使用 Structured Outputs／JSON Schema
- 經 runtime schema 與 Zod 驗證
- 檢查 CEFR、內容安全與資料完整性
- 有 timeout、重試、降級、成本與 latency 紀錄
- 明確標示 AI 可能出錯
- 不把模型輸出的自由文字當成未驗證權威資料

`AI_EVALUATION_FAKE_MODE=true` 只可用於 local/test 的 deterministic fixtures；
staging、production、真實品質、成本或 latency 驗收必須拒絕 fake mode。

## 8. 資料、安全與隱私

- 所有外部輸入必須 runtime validation；TypeScript 型別不足以構成安全驗證
- 私人資料表與 Storage 必須有 RLS、owner isolation 與 server-side authorization
- 已套用 migration 不得重寫；資料庫變更使用 append-only migration
- 草稿、答案、grading rules、作文、錄音、transcript 與私人學習紀錄不得意外公開
- mutation 必須考慮 idempotency、重複提交、partial failure 與 retry
- logs、metrics、traces 與 errors 不得包含 token、key、密碼或完整私人內容
- 帳號資料匯出與完整刪除必須涵蓋 Auth、database、Storage、session、裝置 cache
  與 pending offline queue
- 舊 token、跨使用者存取與部分刪除失敗必須有測試與可恢復行為

詳細規則以 [`docs/security.md`](docs/security.md) 與相關 migration、測試為準。

## 9. 環境與連線策略

支援清楚分離的 `local`、`preview`／`staging`、`production` 環境。

Local 可以在明確的開發設定下使用 localhost、Android emulator 的 `10.0.2.2`、
`adb reverse` 或受限 cleartext。Staging 與 production 必須：

- 使用實機可存取的 HTTPS API 與遠端 Supabase
- 拒絕 localhost、`127.0.0.1`、`10.0.2.2`、開發者電腦 IP 與靜默 fallback
- 拒絕 HTTP API、placeholder credential 與 fake AI mode
- 在 build 或 startup 階段對缺少或不安全設定 fail fast
- 將 CORS 限制於核准 origin
- 不在 client bundle、source map、APK 或公開環境變數中放入 server secrets

`EXPO_PUBLIC_*` 與 `NEXT_PUBLIC_*` 一律視為公開資訊。

## 10. 離線與同步

第一階段至少支援已下載課程、固定題型離線作答、本機紀錄與重新連線同步。
AI 評分、即時生成與需要伺服器的音訊處理在離線時可以不可用，但 UI 必須說明。

同步必須處理：

- duplicate 與 idempotency
- stale conflict
- retry／discard
- 多筆 pending queue
- process kill／restart
- profile isolation
- 進度不得倒退或重複計入

## 11. 測試與完成證據

「程式碼存在」或「build 成功」不足以代表功能完成。證據層級必須分開：

- repository unit／integration／build evidence
- clean local Supabase integration
- connected remote staging 與雙使用者安全驗證
- real AI 品質、成本與 latency
- Android native device matrix
- monitoring、alerts、backup／restore 與 rollback drills
- public delivery、release artifact 與 store review（若在範圍內）

完成判定以 [`docs/definition-of-done.md`](docs/definition-of-done.md) 的 A–J gates
為準。未執行的必要驗證是 `BLOCKED`，已證明不符合要求的是 `FAIL`；兩者都不得
宣稱為 `PASS`。

## 12. 目前發布邊界

本 repository 已具有豐富的本機／repository implementation，但 connected staging、
real AI、原生裝置、operations 與 public delivery 必須各自取得證據。

離線 Demo、mock、Web export、本機 Supabase、單元測試或內部 preview 不能單獨
證明 production readiness。任何公開說明都必須符合 [`README.md`](README.md)、
Definition of Done 與最新 Phase readiness 文件。

## 13. 規格維護

詳細功能、schema、資料表、測試、驗收與已完成 Phase 應維護在 `docs/`、原始碼、
migrations 與測試中，而不是重複維護於另一份巨型提示詞。

本文件僅保留穩定產品方向與不可破壞的技術邊界。大型變更應建立 GitHub Issue、
ADR 或獨立計畫，並依 [`DELIVERY_PLAN.md`](DELIVERY_PLAN.md) 一次執行一個 Gate。

早期的完整建置提示詞與補充提示詞仍可從 Git 歷史查閱，但不應直接對目前 repository
重新執行。