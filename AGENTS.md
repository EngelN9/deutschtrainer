# AGENTS.md

## 1. 文件目的

本文件定義所有在 DeutschTrainer repository 中工作的 AI agent、Codex、程式助理與自動化工具必須遵守的開發規則。

本文件適用於：

- 新功能開發
- Bug 修正
- 架構調整
- 程式碼審查
- 測試與驗收
- Supabase migration
- API 開發
- Expo／React Native 開發
- Next.js 管理後台開發
- AI 評分與內容生成功能
- 德語學習內容建立
- CI、Docker、EAS 與部署工作
- 文件與實作一致性檢查
- Release readiness 評估

所有 agent 必須把正確性、安全性、可驗證性、使用者資料保護與可維護性置於開發速度之前。

不得為了讓任務看似完成，而：

- 跳過必要測試
- 隱藏錯誤
- 偽造執行結果
- 使用 placeholder 冒充正式實作
- 降低既有安全限制
- 繞過 API、RLS、角色權限或內容審核流程
- 宣稱尚未驗證的功能已可正式上線

---

## 2. 專案定位

DeutschTrainer 是一套面向繁體中文使用者的跨平台德語 B1–C2 自學系統。

主要產品為：

- Android／React Native 學習 App
- Next.js 內容管理後台
- Node.js API
- Supabase PostgreSQL、Auth 與 Storage
- OpenAI 輔助評分、寫作、聽力與口說功能
- 可下載的離線課程與固定題型
- 學習進度、熟練度、間隔複習及錯誤分析

產品邊界如下：

1. Mobile App 是主要學習產品。
2. 公開網站只負責產品介紹、支援、隱私、服務條款與帳號刪除說明。
3. `/admin` 僅供授權的內容工作人員使用。
4. API 是唯一可以持有 Supabase service-role key 與 OpenAI API key 的執行環境。
5. 離線 Demo 不等同於正式連線版，不得暗示 Demo 具有雲端同步或 AI 功能。
6. 尚未完成部署與實機驗收的功能，不得被描述為 production-ready。

---

## 3. 指令優先順序

執行任務時，依照以下優先順序處理規範：

1. 使用者在目前任務中的明確要求
2. 安全、隱私及資料完整性要求
3. 本 `AGENTS.md`
4. 與目前任務直接相關的 `.agents/skills/**/SKILL.md`
5. `docs/definition-of-done.md`
6. `docs/security.md`
7. `docs/architecture.md`
8. 各 Phase 規格、驗收與測試文件
9. `README.md`
10. 原始碼、測試與既有慣例

若文件與實作不一致：

- 不得自行猜測哪一方正確。
- 應檢查最新 migration、schema、測試、API contract 與相關 Phase 文件。
- 優先維持安全與資料相容性。
- 在結果中明確指出文件漂移。
- 若修改實作，同步更新受影響的文件與測試。

---

## 4. Repository 結構

```text
apps/
  mobile/              Expo + React Native 學習者 App
  admin/               Next.js 管理後台與公開網站
  api/                 Node.js API

packages/
  shared-types/        跨 workspace 共用的 domain types
  validation/          Zod request、response、catalog 與 exercise schemas
  ui/                  共用 UI primitives
  grading/             固定題型評分與答案正規化
  learning-engine/     熟練度、錯誤與複習排程
  ai-schemas/          AI Structured Output schemas 與解析
  ai-prompts/          版本化 AI prompt metadata
  database/            Repository contracts 與 database-facing types
  config/              共用工具設定

supabase/
  migrations/          Append-only database migrations
  seed/                本機與 release seed
  functions/           資料庫或 Supabase functions

docs/                  產品、架構、安全、測試、Phase 與發布文件
scripts/               Repository automation scripts
.maestro/              Android 實機流程
.agents/skills/        Repository-scoped Codex Skills
```

不得把只屬於特定 app 的業務邏輯任意放入共用 package。

共用 package 應具備清楚、穩定且可測試的職責。

---

## 5. 開發環境

最低需求：

- Node.js 20 或更新版本
- pnpm 11
- Docker Desktop
- Supabase CLI 2.109 或更新版本
- Git
- Android 實機或 Android Emulator，用於原生驗收

安裝依賴：

```powershell
pnpm install
```

啟動本機 Supabase：

```powershell
pnpm supabase:start
pnpm supabase:reset
```

建立環境檔案：

```powershell
Copy-Item .env.example .env
Copy-Item apps/mobile/.env.example apps/mobile/.env
Copy-Item apps/admin/.env.example apps/admin/.env.local
```

啟動服務：

```powershell
pnpm dev:api
pnpm dev:mobile
pnpm dev:admin
```

常用本機位置：

```text
Mobile Web:      http://localhost:8081
Admin:           http://localhost:3000
Supabase API:    http://localhost:54321
Supabase Studio: http://localhost:54323
Mailpit:         http://localhost:54324
```

不得假設使用者已經設定任何 secret。

環境缺少必要設定時：

- 應 fail fast。
- 錯誤訊息應指出缺少的變數。
- 不得自動產生假的 production credential。
- 不得把 secret 寫入原始碼、文件範例、log 或 public environment variable。

---

## 6. 基本工作流程

每個任務都應依序執行以下步驟。

### 6.1 理解任務

開始修改前：

1. 讀取直接相關的程式碼。
2. 讀取直接相關的測試。
3. 讀取相關 architecture、security 與 Phase 文件。
4. 檢查是否存在適用的 repository-scoped Skill。
5. 確認資料流、權限邊界與 API contract。
6. 確認修改是否涉及 migration、環境變數或 release 設定。

不得只看單一檔案便進行跨系統修改。

### 6.2 制定最小變更

修改應：

- 聚焦於使用者要求。
- 優先修正根本原因。
- 避免無關重構。
- 避免大規模重新命名。
- 避免改動穩定 API。
- 保持向後相容，除非任務明確要求 breaking change。
- 不得因為測試難寫而移除驗證或降低安全性。

### 6.3 實作

實作時：

- 遵守既有 workspace 邊界。
- 使用既有共用 schema、type、repository 與 utility。
- 不重複建立已存在的 domain model。
- 所有外部輸入都必須驗證。
- 所有非同步操作都必須處理失敗狀態。
- 所有使用者可見錯誤都應提供可理解的繁體中文訊息。
- 不得向使用者顯示 stack trace、SQL error 或 provider 原始錯誤。

### 6.4 驗證

先執行與修改範圍最相關的測試，再執行 repository-wide gates。

不得聲稱測試通過，除非實際執行並取得成功結果。

### 6.5 回報

最終結果至少應包含：

- 完成內容
- 修改檔案
- 架構或資料庫影響
- 執行的測試
- 未執行的測試及原因
- 已知風險
- 後續外部操作
- 是否達到相關 Definition of Done

---

## 7. TypeScript 與程式品質

### 7.1 TypeScript

必須：

- 保持 TypeScript strict mode。
- 優先使用明確型別。
- 使用 discriminated union 表示有多種狀態的資料。
- 對外部資料使用 Zod 驗證。
- 避免型別斷言。
- 避免非必要的 non-null assertion。
- 保持 database row、API DTO、domain model 與 UI ViewModel 分離。

不得：

- 使用未說明理由的 `any`。
- 使用 `as unknown as T` 繞過型別系統。
- 在 UI 中重新定義已存在的 API response type。
- 直接把未驗證的 JSON 當成可信 domain object。
- 靠 optional chaining 隱藏本應處理的資料缺失。

不得使用：

```ts
// 禁止
const result: any = response;
```

應使用：

```ts
const result = responseSchema.parse(response);
```

### 7.2 命名

- React component：`PascalCase`
- Hook：`useSomething`
- 一般函式與變數：`camelCase`
- 常數：依既有慣例使用 `camelCase` 或 `UPPER_SNAKE_CASE`
- Zod schema：`somethingSchema`
- Request／Response type：`SomethingRequest`、`SomethingResponse`
- Database migration：時間戳加清楚的 snake_case 描述
- Test：描述使用者行為與可觀察結果

名稱必須表達 domain 意義，不得使用模糊名稱，例如：

- `data2`
- `temp`
- `thing`
- `handler1`
- `doStuff`

### 7.3 函式設計

函式應：

- 單一職責
- 輸入與輸出清楚
- 容易測試
- 對錯誤有明確處理
- 避免隱藏的全域副作用

不得在純 domain package 中直接：

- 存取環境變數
- 呼叫 Supabase
- 呼叫 OpenAI
- 顯示 UI
- 讀寫 AsyncStorage

---

## 8. 架構不變條件

以下規則屬於 architecture invariants，除非有完整設計、migration、測試與文件，不得變更。

### 8.1 Mobile 邊界

Mobile App 負責：

- UI
- 表單
- 本機狀態
- 離線快取
- 使用者回饋
- API 呼叫
- Auth session
- Owner-scoped Storage binary 操作

Mobile App 不得：

- 持有 OpenAI API key
- 持有 Supabase service-role key
- 直接修改受保護資料表
- 自行決定正式 attempt score
- 自行寫入 mastery 或 review queue
- 讀取受保護的答案、逐字稿或內部評分規則
- 把 Demo session 偽裝成正式 Supabase session

### 8.2 Admin 邊界

Admin 負責：

- 課程與題目編輯
- 版本管理
- 送審
- 審核
- AI 草稿
- 發布
- Audit history
- 管理統計

所有管理功能必須：

- 驗證 Supabase session。
- 驗證 profile role。
- 驗證操作所需權限。
- 由後端或受保護 RPC 再次驗證。
- 不依賴前端隱藏按鈕作為安全控制。

### 8.3 API 邊界

API 負責：

- Authentication
- Authorization
- Request validation
- Server-authoritative grading
- AI provider calls
- Storage signed URLs
- Protected database writes
- Rate limits
- Idempotency
- Audit logs
- AI usage／cost logs
- Safe error responses

只有 API runtime 可以使用：

```text
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

### 8.4 Database 邊界

資料庫負責：

- RLS
- 資料完整性
- 唯一性與 foreign key constraints
- Transactional writes
- 發布條件
- Role-sensitive operations
- Idempotent persistence
- Owner isolation

不得只依賴 application code 維持安全或資料一致性。

---

## 9. API 規則

每個 API endpoint 都必須明確定義：

- Method
- Path
- Request schema
- Response schema
- Authentication
- Authorization
- Rate limit
- Cache policy
- Idempotency policy
- Error codes
- Logging policy
- Sensitive-data policy

### 9.1 請求驗證

所有來源均視為不可信，包括：

- Mobile
- Admin
- URL parameters
- Query parameters
- Headers
- JSON body
- Multipart metadata
- Supabase database response
- OpenAI response
- Storage object metadata

驗證應發生在系統邊界。

### 9.2 統一錯誤格式

API 應使用一致錯誤格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "提交資料格式不正確。",
    "retryable": false,
    "requestId": "req_..."
  }
}
```

錯誤碼應使用穩定、可機器判斷的代碼，例如：

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
NETWORK_ERROR
DATABASE_ERROR
AI_TIMEOUT
AI_RESPONSE_INVALID
AUDIO_UPLOAD_FAILED
CONTENT_NOT_PUBLISHED
```

不得將下列內容傳給 client：

- Stack trace
- SQL statement
- Raw database error
- OpenAI secret
- Supabase service-role key
- Internal file path
- JWT
- Provider request body
- 其他使用者資料

### 9.3 Idempotency

建立 attempt、AI evaluation、review completion、同步與內容生成等操作必須遵守 idempotency contract。

不得：

- 在 retry 時重複扣除額度。
- 建立重複 attempt。
- 重複排入 review。
- 因網路重試而重複產生 AI 費用。
- 只在 client 端處理 idempotency。

### 9.4 Rate limit

新增或修改昂貴、寫入型或私人 endpoint 時，必須確認：

- Rate-limit key
- Window
- Limit
- Replay 行為
- 多執行個體部署行為
- 錯誤回應
- 使用者提示

若目前 rate limit 只存在單一 runtime memory，文件中不得將其描述為全域 distributed rate limit。

---

## 10. Supabase 與 Migration 規則

### 10.1 Append-only migrations

已進入版本控制或已套用的 migration 不得修改。

需要調整 schema 時：

1. 建立新的 migration。
2. 保留歷史 migration。
3. 確保乾淨資料庫可以從零重建。
4. 確保現有資料庫可從目前版本升級。
5. 更新 generated database types。
6. 新增 migration 驗證或 integration test。
7. 更新相關文件。

不得：

- 重寫已發布 migration。
- 手動修改遠端資料庫後不留下 migration。
- 使用 destructive reset 修正 production。
- 在沒有備份或 rollback 計畫時刪除正式欄位。
- 以 `DROP ... CASCADE` 取代完整影響分析。

### 10.2 RLS

所有私人資料表都必須有 RLS。

至少測試：

- 未登入使用者不可讀取私人資料。
- 使用者 A 不可讀取使用者 B 的資料。
- 使用者 A 不可修改使用者 B 的資料。
- 使用者 A 不可刪除使用者 B 的資料。
- learner 不可執行管理操作。
- content_editor、reviewer、admin 權限符合 contract。
- service role 只在 server runtime 使用。

### 10.3 Database functions

新增或修改 PostgreSQL function 時，必須檢查：

- 是否真的需要 `SECURITY DEFINER`
- 固定 `search_path`
- 明確的 `EXECUTE` allowlist
- 不依賴預設 `PUBLIC EXECUTE`
- 呼叫者身分驗證
- Role 驗證
- Owner 驗證
- 輸入驗證
- Transaction behavior
- Replay behavior
- Audit requirements

匿名使用者不得執行 privileged `SECURITY DEFINER` functions。

Trigger function 不應對一般 authenticated 使用者開放直接執行。

### 10.4 Seed

Seed 必須：

- 可重複執行或有明確 reset 前提。
- 使用穩定 identifier。
- 符合 schema。
- 通過 content-readiness 驗證。
- 不包含 secret 或真實私人資料。
- 不將受保護答案、逐字稿或規則暴露為公開內容。

Release seed 的內容數量及狀態應由自動化測試驗證，不得只靠人工計算。

---

## 11. Authentication、Authorization 與角色

角色包括：

```text
learner
content_editor
reviewer
admin
```

基本權限：

| 角色             | 權限                                       |
| ---------------- | ------------------------------------------ |
| `learner`        | 讀取 published 內容，管理自己的學習資料    |
| `content_editor` | 建立與修改草稿、上傳素材、送審             |
| `reviewer`       | 審核、核准、拒絕內容                       |
| `admin`          | 發布、角色管理、系統設定、audit 與成本管理 |

管理操作至少需要：

1. 有效 Supabase session
2. 有效 profile
3. 正確 role
4. 後端權限檢查
5. Database/RPC 層限制

不得：

- 信任 client 傳入的 role。
- 只根據前端 route protection 判斷權限。
- 在 JWT 或 profile 缺失時預設為 admin。
- 用 email 字串 hard-code 管理員。
- 讓 content_editor 直接發布尚未核准的版本。

---

## 12. Mobile App 規則

### 12.1 狀態管理

使用：

- TanStack Query：server state
- Zustand：session-adjacent UI state
- React Hook Form + Zod：表單
- Expo Router：navigation
- AsyncStorage：目前允許的小型、版本化離線 snapshot

每個資料畫面都必須考慮：

- Loading
- Empty
- Success
- Error
- Retry
- Offline
- Unauthorized
- Stale data
- Partial sync
- Conflict

### 12.2 UI

使用者可見文字預設使用繁體中文。

德語內容應保留正確：

- 大小寫
- Umlaut
- ß
- 標點
- 名詞性別
- 複數
- 動詞支配
- CEFR 程度

錯誤訊息應：

- 清楚
- 不羞辱使用者
- 不誇大問題
- 指出是否可以重試
- 保留使用者輸入
- 提供下一步

### 12.3 Demo 模式

Demo 模式必須與 connected authentication 明確分離。

Demo 模式：

- 不建立 Supabase session。
- 不呼叫 authenticated API。
- 只使用 mock catalog。
- 將支援的資料保存於本機。
- 明確標示資料不會雲端同步。
- 隱藏無法真正運作的功能。

不得在 Demo 模式顯示：

- 假的 AI 評分
- 假的雲端同步
- 假的帳號狀態
- 假的知識搜尋結果
- 假的音訊 AI 結果

### 12.4 原生功能

涉及下列功能時，Web export 通過不代表任務完成：

- 麥克風
- 錄音
- 通知
- Background behavior
- App restart
- Storage permission
- Audio playback
- Network reconnection
- Android installation

至少必須記錄：

- 實體裝置型號
- Android 版本
- App version
- Build ID
- 測試流程
- 實際結果
- 截圖或 log
- 已知限制

---

## 13. 離線與同步

離線功能目前主要支援：

- 已下載課程
- 固定題型
- 本機學習進度
- Pending attempts
- 重新連線同步

離線不支援：

- AI 自由回答
- AI 作文評分
- TTS 新生成
- STT
- AI 對話
- 即時 AI 題目生成

### 13.1 Offline queue

Offline queue 必須：

- 依 profile 隔離。
- 使用版本化 schema。
- 每次讀取後重新通過 Zod 驗證。
- 保存原始 `submittedAt`。
- 保存 idempotency key。
- 依時間由舊到新同步。
- App 重啟時將中斷的 `syncing` 恢復為可處理狀態。
- 提供 retry 與 discard。
- 對 conflict 提供明確說明。

### 13.2 Server authority

裝置可提供即時本機評分，但正式同步時：

- Client 只提交原始答案。
- API 重新載入 published exercise。
- API 使用可信答案重新評分。
- Database 只保存 server result。
- Mastery 與 review schedule 使用 server result 更新。

不得信任 client 傳入的：

```text
score
isCorrect
gradingResult
masteryDelta
nextReviewAt
```

### 13.3 儲存限制

目前使用 AsyncStorage snapshot 時：

- 不應無限制增加單一 JSON item。
- Pending attempts 應有明確上限。
- 超出既有規模、接近數 MB、需要跨資料查詢或大量同步時，應評估遷移至 SQLite。

不得透過繼續擴大巨大 JSON snapshot 迴避正確的儲存架構。

---

## 14. 固定題評分與 Learning Engine

固定題評分必須：

- 具有 deterministic behavior。
- 對相同正規化輸入產生相同結果。
- 在 shared grading package 中實作。
- 有完整 unit tests。
- 不依賴 UI。
- 不依賴網路。
- 不信任 client score。

新增題型時必須同步處理：

1. Shared type
2. Discriminated union
3. Zod schema
4. Content schema
5. Admin editor
6. Mobile renderer
7. Mobile answer input
8. Deterministic grader
9. API submission
10. Server-authoritative regrading
11. Error classification
12. Learning-engine integration
13. Seed example
14. Unit tests
15. Integration tests
16. 文件

### 14.1 Mastery

Mastery 更新應：

- 使用明確且版本化的演算法。
- 與 attempt persistence 在一致 transaction 中處理。
- 避免重複 replay 重複增加熟練度。
- 對時間與時區處理明確。
- 具備邊界測試。
- 不因 client clock 異常破壞排程。

### 14.2 Review scheduling

Review scheduling 必須：

- 使用 server-authoritative attempt。
- 保留原始、合理範圍內的 submission time。
- Idempotent replay 不建立重複 review。
- Failed sync 不得默默遺失。
- Conflict 不得自動偽裝成成功。
- 對 overdue 與 timezone 有測試。

---

## 15. AI 功能規則

### 15.1 一般原則

所有 AI 功能都必須：

- 僅由 backend 呼叫 provider。
- 使用版本化 prompt。
- 使用 Structured Outputs 或明確 JSON Schema。
- 通過 schema 驗證。
- 通過 Zod 驗證。
- 通過業務規則驗證。
- 記錄 model、prompt version、schema version、usage 與 cost metadata。
- 設定 timeout。
- 設定 quota。
- 支援合理 retry。
- 提供 safe fallback。
- 向使用者說明 AI 可能出錯。

不得將模型輸出直接視為可信資料。

### 15.2 Prompt injection

使用者內容必須作為資料欄位處理，而不是拼接為未隔離的 system instruction。

不得讓使用者輸入：

- 覆寫 system instruction
- 決定評分 schema
- 提供可信答案
- 指定其他使用者資料
- 控制 database identifier
- 控制發布狀態
- 控制角色或 review decision

### 15.3 評分上下文

後端必須依可信 identifier 載入：

- Exercise
- Version
- CEFR level
- Allowed skills
- Reference answer
- Writing prompt
- Grading notes
- Listening transcript
- Content status

不得信任 client 傳入上述評分上下文。

### 15.4 AI fake mode

```text
AI_EVALUATION_FAKE_MODE=true
```

只允許：

- Local development
- Automated tests
- Deterministic fixtures

不得用於：

- Staging acceptance
- Production
- 對外 Demo 中宣稱的真實 AI 功能
- 成本、品質或 latency 驗收

Staging 與 production 應 fail fast 拒絕 fake mode。

### 15.5 AI 寫作

作文功能必須維持：

- Immutable versions
- 明確 version numbering
- 最大版本數限制
- UTF-16 offset 一致性
- 原文字串與 offset 驗證
- Error type 與 skill 驗證
- Rubric total 與 dimension 驗證
- Reference rewrite 的顯示規則
- Retry 與 failed evaluation 狀態
- Owner isolation
- Deletion behavior

不得把 AI 評語描述為教師認證或絕對正確。

### 15.6 聽力與口說

TTS：

- 只能對可信內容生成。
- 不接受 client 任意文字冒充課程素材。
- Cache key 必須包含內容版本、voice、model 與內容 hash。
- Transcript 與生成指令不得公開。

STT：

- 驗證 owner Storage path。
- 驗證 MIME type。
- 驗證 duration。
- 驗證 object 確實存在。
- 不讀取其他使用者錄音。

口說回饋只能描述：

- Transcript 差異
- 語速
- 停頓
- 內容涵蓋
- 可觀察的文字或時序資料

除非有經驗證的專用發音評分模型，不得宣稱提供精確發音分數。

---

## 16. 內容管理與發布

內容狀態應遵守既有 workflow，例如：

```text
draft
pending_review
approved
published
rejected
archived
```

實際狀態名稱以 shared schema 與 migration 為準。

基本規則：

- AI 只能建立 draft。
- AI 不可自行核准。
- AI 不可自行發布。
- content_editor 可建立、編輯與送審。
- reviewer 可核准或拒絕。
- admin 才可完成正式發布。
- Published content 必須對應已核准的相同版本。
- 發布與撤回必須留下 audit log。
- 已發布版本不得被靜默覆寫。

不得直接修改 published row 來迴避版本流程。

---

## 17. 德語內容品質

所有正式德語內容應由具備足夠能力的人員審查。

新增或修改內容時，檢查：

- CEFR 程度
- 文法正確性
- 自然度
- 名詞性別
- 複數形式
- 動詞變位
- 介系詞支配
- 格變化
- 語序
- 拼字
- 大小寫
- Umlaut
- `ß`
- 文化與情境合理性
- 繁體中文翻譯
- 繁體中文解釋
- 常見華語學習者錯誤
- 正確答案完整性
- Distractor 合理性
- Rubric 與題目一致性

不得：

- 把未審核的 AI 內容直接發布。
- 使用簡體中文取代既定繁體中文介面。
- 使用明顯機器翻譯但不審查。
- 在公開 catalog 洩漏自由回答參考答案。
- 在公開 API 洩漏逐字稿、內部評分規則或 writing prompt rules。
- 以題數增加取代內容品質。

---

## 18. Security 與 Privacy

### 18.1 Secrets

以下資訊只能存在於 server runtime 或受保護的 secret store：

```text
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Public client 只可使用經核准的公開變數，例如：

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL
```

實際名稱以 `.env.example` 為準。

禁止：

- 將 secret commit 到 Git。
- 將 secret 放入 `EXPO_PUBLIC_*`。
- 將 secret 放入 `NEXT_PUBLIC_*`。
- 將 secret 寫入 APK、JavaScript bundle 或 source map。
- 在 log 中輸出完整 env。
- 在錯誤訊息中輸出 token。
- 在測試 fixture 中放入真實 credential。

### 18.2 Logs

不得記錄：

- Password
- JWT
- Refresh token
- Service-role key
- OpenAI key
- 完整作文原文
- 完整錄音內容
- 完整 transcript
- 其他使用者私人資料
- 未遮罩的 provider request

Log 應包含：

- Request ID
- Correlation ID
- Endpoint
- Safe status
- Duration
- Retry count
- Usage metadata
- 可安全記錄的 domain identifier
- Error category

### 18.3 Owner isolation

所有私人功能至少需要雙使用者測試。

測試情境：

1. 建立使用者 A。
2. 建立使用者 B。
3. A 建立資料。
4. B 嘗試讀取。
5. B 嘗試修改。
6. B 嘗試刪除。
7. 未登入者嘗試存取。
8. 驗證所有操作遭拒。
9. 驗證 API response 不洩漏資料是否存在。

### 18.4 資料刪除

刪除單篇作文或錄音時：

- 驗證 owner。
- 刪除原文或 binary。
- 刪除相關版本、轉錄與回饋。
- 保留資料必須有明確稽核或法務理由。
- 保留的 usage metadata 不得包含原始私人內容。

完整帳號刪除必須涵蓋：

1. 明確破壞性確認
2. Private Storage
3. Writing data
4. Audio data
5. Learning records
6. Preferences
7. Profile
8. Auth user
9. Sessions
10. On-device cache
11. Pending offline queue
12. 舊 token 無法繼續存取

只有 UI 按鈕而沒有完整清除流程，不算完成。

---

## 19. Admin 安全

`/admin` 不得只靠 client-side redirect 保護。

必須：

- 在 server boundary 驗證 session。
- 驗證 profile role。
- 在 API 或 RPC 再次驗證。
- 對未登入者回傳適當狀態。
- 對 learner 回傳 forbidden。
- 不洩漏管理頁面資料。
- 不把 service-role client 傳到 browser。
- 對敏感管理操作寫入 audit log。

AI 內容管理必須維持 human-in-the-loop。

---

## 20. 測試規則

### 20.1 Repository-wide quality gates

一般修改完成後執行：

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

API production artifact：

```powershell
pnpm --filter @deutschtrainer/api build
pnpm --filter @deutschtrainer/api verify:bundle
```

本機 Supabase 與整合驗證：

```powershell
pnpm supabase:status
pnpm --filter @deutschtrainer/api verify:learning-api:local
pnpm --filter @deutschtrainer/api verify:workspaces:local
pnpm --filter @deutschtrainer/api verify:audio:local
pnpm --filter @deutschtrainer/api verify:admin:local
pnpm --filter @deutschtrainer/api verify:settings:local
pnpm --filter @deutschtrainer/api verify:offline-sync:local
pnpm --filter @deutschtrainer/api verify:knowledge:local
pnpm --filter @deutschtrainer/api verify:content-readiness:local
```

依修改範圍還應執行：

- Admin production build
- Android export
- Web export
- Expo dependency check
- Expo Doctor
- Docker image build
- Container health check
- Maestro device flow
- Remote Supabase verification

### 20.2 測試順序

建議順序：

1. 修改檔案的 targeted unit tests
2. 修改 package 的 tests
3. Typecheck
4. Integration tests
5. Repository tests
6. Build／export
7. Device／deployment acceptance

### 20.3 測試品質

測試應驗證行為，不得只驗證 implementation detail。

必要時涵蓋：

- 正常情況
- 空資料
- 無效輸入
- 未登入
- 權限不足
- 其他使用者資料
- Timeout
- Rate limit
- Retry
- Idempotent replay
- Network failure
- Provider failure
- Schema mismatch
- Conflict
- App restart
- Offline reconnect
- Timezone boundary
- DST
- Duplicate submission

### 20.4 不得偽造測試

禁止：

- 未執行卻寫「all tests passed」。
- 因失敗而刪除測試。
- 使用 `.skip` 隱藏回歸。
- 放寬 assertion 只為通過。
- 捕捉所有 exception 後視為成功。
- 將 integration test 改成沒有真實驗證的 mock。
- 以 fake AI 結果冒充 connected AI acceptance。

測試未執行時，必須明確說明原因。

---

## 21. CI 規則

CI 應至少維持：

- Frozen dependency install
- Format check
- Lint
- Strict typecheck
- Unit tests
- Integration tests
- API production bundle
- Bundle health smoke
- API container build
- Expo compatibility check
- Expo Doctor
- Android export
- Web export
- Admin production build

不得：

- 因單一套件錯誤而永久移除整個 gate。
- 使用 `continue-on-error` 隱藏 required check。
- 在 CI log 中輸出 secrets。
- 讓 lockfile 與 manifest 不一致。
- 忽略 dependency compatibility 警告而宣稱 release-ready。

若外部 dependency metadata 更新造成 CI 失敗：

- 應修正相容性。
- 記錄 root cause。
- 使用獨立 PR，避免污染不相關變更。
- 完成 Expo／framework 官方相容性檢查。

---

## 22. Pull Request 規則

PR 應保持單一目的。

PR 說明至少包含：

```markdown
## Summary

## Why

## Scope

## Architecture impact

## Database migrations

## Security and privacy

## Validation

## Manual acceptance

## Risks

## Deployment

## Rollback

## Remaining work
```

若無某項影響，明確寫：

```text
Not applicable
```

不得省略而讓 reviewer 猜測。

### 22.1 PR 證據

PR 中的測試證據應包含：

- 實際命令
- 通過結果
- Test suite／test 數量
- Build 或 export 結果
- Migration rebuild 結果
- Remote verification 結果
- Device 型號與 Android 版本
- 截圖、錄影或 log
- 未驗證項目

### 22.2 合併

只有在以下條件成立時才可建議合併：

- Required checks 通過。
- 無未處理的高風險安全問題。
- Migration 可重建。
- 文件已更新。
- 沒有未說明的 breaking change。
- Review comments 已處理。
- Release claim 與實際證據一致。

Agent 不得自行把 Draft PR 描述為已完成 release。

---

## 23. Commit 規則

Commit 應：

- 小而完整
- 描述原因與結果
- 不混入無關格式變更
- 不包含 generated secret
- 不包含本機 `.env`
- 不包含 build artifacts，除非 release contract 明確要求

建議格式：

```text
feat: add account deletion workflow
fix: preserve offline submission timestamp
security: restrict privileged function execution
test: cover cross-user writing isolation
docs: align release readiness status
chore: update Expo SDK compatibility
```

不得使用：

```text
update
fix stuff
changes
final
working
test123
```

---

## 24. 文件規則

修改行為、架構、環境、API、資料庫或 release 流程時，必須更新相關文件。

可能需要更新：

- `README.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/definition-of-done.md`
- Phase 文件
- Testing 文件
- Deployment 文件
- Environment examples
- API contract
- Release notes
- Account-deletion 說明
- Privacy／support 頁面

不得讓文件宣稱超出實際能力。

例如：

- 尚未部署 connected API，不得寫「正式雲端版已可使用」。
- 尚未完成帳號刪除，不得寫「所有資料可由使用者完整刪除」。
- 只有 Demo APK，不得寫「正式 Android App 已發布」。
- 只有本機 rate limit，不得寫「多節點全域 rate limiting 已完成」。

---

## 25. Definition of Done

能夠本機啟動、顯示畫面、通過單一測試或產生 APK，均不代表產品完成。

Release readiness 由 `docs/definition-of-done.md` 管理。

必要 gates 包括：

```text
A. 產品邊界
B. 核心學習流程
C. 內容品質
D. 資料權利
E. 安全
F. 程式品質
G. 連線部署
H. Android 實機
I. 可營運性
J. 公開交付
```

只有所有必要 gates 都有可重現證據並判定為 `Pass`，才可宣稱 DeutschTrainer：

```text
已完成
可公開使用
production-ready
正式發布
```

若仍有任一必要 gate 為：

```text
Partial
Not started
Blocked externally
```

應使用精確描述，例如：

```text
功能完整度高的 Preview／Demo，仍在部署與實機驗收階段。
```

不得因 repository 內工作完成，就忽略：

- DNS
- HTTPS deployment
- Remote Supabase
- OpenAI credential
- EAS build
- Physical device
- Backup／restore
- Monitoring
- Store review
- Release asset

---

## 26. Deployment 規則

### 26.1 API

Production API 必須：

- 使用 build 產出的正式 bundle。
- 不依賴 TypeScript runtime。
- 不依賴 `tsx`。
- 以非 root 使用者執行。
- 綁定正確 `HOST` 與 `PORT`。
- 提供 `/health`。
- 支援 graceful shutdown。
- 接收 runtime secrets。
- 拒絕 placeholder credential。
- 在 staging／production 拒絕 fake AI mode。
- 正式 Supabase URL 使用 HTTPS。

### 26.2 Docker

Docker build 應從 monorepo root 執行：

```powershell
docker build --file apps/api/Dockerfile --tag deutschtrainer-api .
```

Container 必須：

- 只包含 runtime 所需檔案。
- 不包含 `.env`。
- 不包含 Git history。
- 不包含 service-role key。
- 不包含 OpenAI key。
- 使用 unprivileged user。
- 有 health check。
- 有合理 shutdown timeout。

### 26.3 Connected Preview

Connected Preview 必須：

- 使用遠端 HTTPS API。
- 使用遠端 Supabase。
- 使用正確 release ID。
- 不使用 localhost。
- 不使用 mock content source。
- 不使用 placeholder key。
- 不啟用 AI fake mode。
- 通過 Android 實機流程。

---

## 27. Release 規則

Connected Preview pre-release 至少包含：

- APK
- SHA-256 checksum
- App version
- Android version code
- Build ID
- Commit SHA
- 安裝步驟
- 測試帳號建立方式
- 環境邊界
- 已知限制
- 支援方式
- Release Notes

Release 前必須：

1. 確認預設分支內容。
2. 確認 required CI checks。
3. 確認沒有 secrets。
4. 確認 migration history。
5. 確認 content readiness。
6. 確認 remote security。
7. 確認 connected device matrix。
8. 確認 account deletion。
9. 確認 monitoring。
10. 確認 backup／restore。
11. 確認 rollback。
12. 從乾淨環境重建。

---

## 28. 營運與可觀測性

正式環境需要：

- Health check
- Structured logs
- Request ID
- Correlation ID
- Sensitive-data redaction
- Error monitoring
- Latency monitoring
- AI usage monitoring
- AI cost monitoring
- Rate-limit monitoring
- Database monitoring
- Alerting
- Backup
- Restore drill
- API rollback runbook
- Database rollback／forward-fix runbook

只有 health endpoint 不等同於完整 observability。

只有備份設定不等同於已驗證可還原。

Restore drill 必須記錄：

- 備份來源
- 還原目標
- 所需時間
- 資料完整性驗證
- 遇到的問題
- 後續修正

---

## 29. 常見任務檢查表

### 29.1 新增 API endpoint

- [ ] 定義 request schema
- [ ] 定義 response schema
- [ ] 定義 auth
- [ ] 定義 authorization
- [ ] 定義 rate limit
- [ ] 定義 idempotency
- [ ] 定義 error codes
- [ ] 定義 cache
- [ ] 驗證所有輸入
- [ ] 加入 safe logs
- [ ] 加入 unit tests
- [ ] 加入 integration tests
- [ ] 加入 cross-user tests
- [ ] 更新 API 文件
- [ ] 更新 Mobile／Admin client
- [ ] 更新 release impact

### 29.2 新增資料表

- [ ] 建立新 migration
- [ ] Primary key
- [ ] Foreign keys
- [ ] Constraints
- [ ] Indexes
- [ ] RLS enabled
- [ ] Owner policies
- [ ] Role policies
- [ ] Function privileges
- [ ] Generated types
- [ ] Repository contract
- [ ] Integration tests
- [ ] Seed／backfill
- [ ] Security 文件
- [ ] Migration rebuild

### 29.3 新增 AI 功能

- [ ] Backend-only provider call
- [ ] Versioned prompt
- [ ] Structured Output
- [ ] Zod schema
- [ ] Business validation
- [ ] Timeout
- [ ] Retry
- [ ] Quota
- [ ] Rate limit
- [ ] Idempotency
- [ ] Usage log
- [ ] Cost metadata
- [ ] Safe error
- [ ] Fake fixture
- [ ] Connected acceptance
- [ ] Privacy review
- [ ] Prompt-injection review
- [ ] 使用者 AI 聲明

### 29.4 修改 Mobile 畫面

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Retry
- [ ] Offline
- [ ] Accessibility label
- [ ] Keyboard behavior
- [ ] Small screen
- [ ] Long Traditional Chinese text
- [ ] Long German text
- [ ] Auth redirect
- [ ] Demo behavior
- [ ] Connected behavior
- [ ] Android export
- [ ] 原生功能實機驗收

### 29.5 修改離線同步

- [ ] Profile isolation
- [ ] Schema version
- [ ] Zod validation
- [ ] Idempotency
- [ ] Original timestamp
- [ ] Oldest-first
- [ ] Retry
- [ ] Conflict
- [ ] Discard
- [ ] Restart recovery
- [ ] Logout cleanup
- [ ] Account deletion cleanup
- [ ] Two-profile test
- [ ] Airplane-mode device test

### 29.6 修改管理後台

- [ ] Server authentication
- [ ] Role authorization
- [ ] API authorization
- [ ] RLS／RPC authorization
- [ ] Version workflow
- [ ] Review gate
- [ ] Audit log
- [ ] Safe error
- [ ] Learner denial
- [ ] Admin production build

### 29.7 修改帳號刪除

- [ ] 明確二次確認
- [ ] Private Storage
- [ ] Writing
- [ ] Speaking
- [ ] Listening private data
- [ ] Learning records
- [ ] Profile
- [ ] Auth user
- [ ] Sessions
- [ ] Local cache
- [ ] Offline queue
- [ ] Old-token rejection
- [ ] Two-user isolation
- [ ] Partial-failure recovery
- [ ] Android acceptance
- [ ] Privacy page
- [ ] Support page

---

## 30. Repository-scoped Skills

開始工作前，檢查：

```text
.agents/skills/
```

若存在符合任務的 Skill：

1. 讀取該 Skill 的 `SKILL.md`。
2. 遵守其 trigger 與 non-trigger boundary。
3. 使用其程序、驗證命令與證據格式。
4. 不得只因 Skill 存在就假設任務已完成。
5. Skill 與本文件衝突時，安全與本文件的 repository-wide invariants 優先。

可能的任務類型包括：

- Release readiness
- Security audit
- Learning logic
- AI quality
- Offline sync
- German content quality
- CI verification
- PR evidence
- Documentation drift

Skills 是執行程序，不是免除理解 repository 的替代品。

---

## 31. 禁止事項

任何 agent 都不得：

- Commit secret。
- 將 OpenAI key 放進前端。
- 將 service-role key 放進前端。
- 停用 RLS 來修正權限問題。
- 使用 service role 取代正確 authorization。
- 讓 learner 存取 admin 資料。
- 信任 client score。
- 信任 client role。
- 信任 client grading context。
- 信任未驗證的 AI output。
- 修改已套用 migration。
- 直接覆寫 published content。
- 跳過 human review 發布 AI 草稿。
- 在 log 記錄私人原文或 token。
- 使用 fake AI 冒充 staging 驗收。
- 使用 Demo 冒充 connected product。
- 宣稱未執行的測試已通過。
- 刪除失敗測試來讓 CI 變綠。
- 使用 placeholder 冒充完整功能。
- 增加未要求的大型功能。
- 進行無關的大規模重構。
- 使用危險 Git 操作破壞使用者未提交的變更。
- 在未確認影響時刪除資料。
- 在沒有證據時宣稱 production-ready。

---

## 32. Agent 最終回報格式

完成任務後，應使用以下結構回報：

```markdown
## 完成內容

- ...

## 修改檔案

- `path/to/file`: ...

## 架構與資料影響

- ...

## 安全與隱私

- ...

## 測試與驗證

- `command` — Pass／Fail／Not run
- ...

## 未完成或受阻項目

- ...

## 已知風險

- ...

## Definition of Done

- Gate：Pass／Partial／Not started／Blocked externally
- 判定理由：...
```

不得只回覆「完成了」。

若有任何測試、部署或實機驗收未完成，必須清楚標示。

---

## 33. 任務停止條件

Agent 應在以下條件成立時停止增加範圍：

- 使用者要求已完成。
- 修改已通過適當測試。
- 文件與實作一致。
- 沒有因本次修改引入未處理的安全漏洞。
- 沒有必要但未處理的 migration。
- 沒有無關重構。
- 沒有為了「看起來更完整」而增加未要求功能。

不得畫蛇添足。

當功能已符合需求、架構、安全、測試與文件標準時，應停止繼續擴充，並如實回報剩餘的外部 deployment 或 device acceptance 工作。
