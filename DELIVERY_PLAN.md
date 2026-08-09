# DeutschTrainer Delivery Plan

> 本文件是 connected release 的 Gate 索引與交付順序，不是應整份提交給
> Codex 的單一提示詞。

## 1. 執行權威

每個 Gate 都必須遵循：

- [`AGENTS.md`](AGENTS.md)
- [`SPECIFICATION.md`](SPECIFICATION.md)
- 適用的 [`.agents/skills/`](.agents/skills/)
- [`docs/definition-of-done.md`](docs/definition-of-done.md)
- [`docs/security.md`](docs/security.md)
- [`docs/architecture.md`](docs/architecture.md)
- 相關 Phase、database、AI、testing、acceptance 與 operations 文件

實作狀態與完成判定必須以目前 commit、測試、migration、CI、部署、外部服務與
實機證據為準。本文件不得覆蓋更具體且較新的安全規則或狀態紀錄。

## 2. 狀態用語

- `PASS`：要求已執行，且有可重現證據證明符合條件。
- `FAIL`：要求已執行，且結果證明不符合條件。
- `BLOCKED`：必要 credential、遠端服務、裝置、授權或其他前置條件不存在。
- `NOT APPLICABLE`：經明確範圍決策確認不適用。

沒有執行的必要測試不得標為 `PASS`。Mock、Demo、本機測試、Web export 與 staging
不能冒充 production 或原生裝置證據。

## 3. 目前方向

Repository 已完成大量 Phase 0–15 的本機與程式碼實作，但仍必須把下列證據分開：

1. repository implementation 與自動化測試
2. clean local Supabase integration
3. connected staging 與 remote RLS／owner isolation
4. real AI 品質、成本與 latency
5. Android native device matrix
6. operations、backup／restore、rollback 與 monitoring
7. public delivery 與正式 release

`codex/gates-2-3-readiness` 分支目前包含 Gate 2 的 repository-local 修正，以及 Gate 3
帳號資料匯出／刪除流程的本機實作與測試。遠端 Supabase、舊 token、Storage、雙使用者
與 connected deletion 驗證仍須以實際環境取得證據，否則維持 `BLOCKED`。

## 4. Gate sequence

### Gate 1 — Readiness baseline

目的：建立最新且只讀的完成度與 release-readiness 基線。

交付：

- Definition of Done A–J matrix
- repository、local、connected、AI、device、operations、delivery 分層狀態
- P0／P1／P2 backlog
- 外部相依與最小解除方式
- 下一個可執行 Gate

建議 Skills：

- `deutschtrainer-release-audit`
- `docs-code-drift-check`

完成條件：沒有把 Phase completion、Demo 或本機測試直接當成 production readiness。

### Gate 2 — Repository-local blockers

目的：修正不需要遠端 credential、付費平台或實體裝置即可處理的 P0／P1 問題。

原則：

- 先重現 root cause
- 小批次、可審查、可回復
- 保持 API、schema 與 migration 相容性
- database 只新增 append-only migration
- 行為改變必須同步測試與文件

建議 Skills：

- `ci-failure-triage`
- `learning-engine-regression`
- `ai-evaluation-quality-gate`
- `offline-sync-e2e`

完成條件：repository-local 阻擋問題已修正或有明確、可審查的保留理由；外部要求仍標
`BLOCKED`。

### Gate 3 — Account data rights and deletion

目的：提供 server-authoritative 的完整帳號資料匯出與刪除流程。

必須涵蓋：

- Mobile 破壞性確認與繁體中文說明
- Auth、session、database、private Storage、writing、audio、learning records
- 裝置 cache、downloads、settings 與 pending offline queue
- owner verification、idempotency、partial failure、retry 與 audit
- 舊 token 失效、雙使用者隔離與跨使用者拒絕
- privacy、support 與 account-deletion 文件一致性

建議 Skills：

- `supabase-rls-security-audit`
- `offline-sync-e2e`

完成條件：本機與 connected remote 證據都存在；若遠端 Auth／Storage 無法驗證，Gate
只能是 `BLOCKED`，不能因本機測試通過而標 `PASS`。

### Gate 4 — Remote Supabase security qualification

目的：在明確授權的 staging project 上驗證 migrations、RLS、Storage、roles、functions
與 owner isolation。

要求：

- 不在聊天、Issue、PR、Markdown 或 log 中接收或輸出 secret
- 先確認 project identity、environment、migration history 與 backup
- 不對 production 執行 destructive reset
- 驗證 anon、authenticated、learner、editor、reviewer、admin 與 service-role 邊界
- 驗證 SECURITY DEFINER、`search_path`、EXECUTE allowlist 與 PUBLIC 撤權
- 對證據中的 user ID、URL、token 與私人資料做遮罩

完成條件：遠端 schema、RLS、Storage、帳號刪除與雙使用者隔離具有可重現 staging 證據。

### Gate 5 — Connected API, Admin and public surfaces

目的：部署 HTTPS API、公開網站與受保護 Admin。

要求：

- API 使用正式 build／container artifact
- 正確 bind `0.0.0.0` 與平台 `PORT`
- secret 只由平台保護設定注入
- staging／production 拒絕 fake AI、placeholder 與非 HTTPS endpoint
- `/admin` 具有 server-side identity 與 role authorization
- public privacy、terms、support、account deletion URL 可存取
- CORS、health、shutdown 與 error redaction 經驗證

完成條件：實際公開 HTTPS URL 與 connected smoke 證據存在；Blueprint 或 build 成功本身
不足以通過。

### Gate 6 — Real AI quality and cost qualification

目的：以真實 provider、fake mode 關閉的環境驗證 AI 評分與生成品質。

必須驗證：

- Structured Output schema、Zod 與 failure handling
- B1–C2、寫作、翻譯、摘要、改寫、論證與語音轉錄情境
- 德語正確性、繁體中文說明、CEFR 合適度與 prompt-injection 邊界
- latency、token、cost、quota、rate limit 與 provider outage
- 不保存或公開不必要的私人原文、錄音或 transcript

建議 Skill：`ai-evaluation-quality-gate`。

完成條件：真實 provider matrix 有可審查結果；fake fixture 不能代表本 Gate。

### Gate 7 — Operations readiness

目的：建立多執行個體可用的 rate limit、observability、alerts、backup、restore 與 rollback。

要求：

- shared limiter 或 gateway，不依賴單一 process memory
- structured logs、request ID、correlation ID 與敏感資料遮罩
- error、latency、AI usage／cost、database 與 health monitoring
- alert owner、severity、notification channel、runbook 與測試
- 真正 restore drill，不只證明 backup job 存在
- API restart、dependency outage、database unavailable、AI timeout 與 rollback rehearsal

完成條件：staging 中有操作證據與可執行 runbook；本機 mock 不足以通過。

### Gate 8 — Connected Android preview build

目的：產生不依賴 localhost、mock、placeholder 或 fake AI 的 Android preview。

要求：

- version、versionCode、buildNumber、package／bundle ID、EAS project ID 正確
- Demo／mock preview 與 connected preview 清楚分離
- client 只包含核准的 public Supabase／API／content 設定
- APK／bundle／source map 不含 service-role、OpenAI key 或錯誤 endpoint
- 保存 EAS build ID、commit SHA、checksum、environment 與安裝方式

完成條件：可安裝的 connected APK 指向正確 staging，binary inspection 通過。

### Gate 9 — Android native device matrix

目的：在實體 Android 裝置完成 connected 與原生驗收。

至少涵蓋：

- 安裝、首次啟動、登入／登出、onboarding、session restart
- catalog、lesson、grading、progress、mastery、review、error history
- offline download、flight mode、queue、process restart、reconnect 與 profile isolation
- notifications、deep link、timezone、reboot
- microphone、recording、playback、upload、STT 與 deletion
- writing、AI、rate limit、network/server errors
- 完整帳號刪除、cache 清除與舊 token 失效
- 小螢幕、長德文／繁中、keyboard 與 accessibility states

完成條件：正式 APK／實機證據存在。Web、Expo Go、模擬器或 guest-only smoke 只能補充。

### Gate 10 — German content and documentation final QA

目的：確認 release content 與所有公開／內部文件和實作一致。

內容檢查：

- 100 題 approved／published 與答案完整性
- B1–C2、題型、CEFR、文法、拼字、大小寫、Umlaut、ß、語域與文化情境
- 繁體中文解釋、中文母語者常見錯誤與簡體字檢查
- alternatives、distractors、answer、explanation、rubric 一致性
- AI draft 的人工審核證據

文件檢查：

- README、AGENTS、docs、scripts、env examples、routes、schemas、migrations、CI、EAS
- version、URL、build ID、privacy、support、deletion、deployment、rollback、limitations
- 不把 staging 寫成 production，不把 Demo 寫成 connected，不把未執行測試寫成完成

建議 Skills：

- `german-content-qa`
- `docs-code-drift-check`

### Gate 11 — Fixed release-candidate regression

目的：對固定 commit SHA、乾淨環境執行完整回歸與 evidence collection。

證據必須涵蓋：

- frozen dependency install
- format、lint、typecheck、unit／integration tests
- API bundle／container、Mobile exports、Admin build
- clean local Supabase reset 與 verification scripts
- remote staging、RLS、real AI、operations、APK、device matrix、deletion、content QA
- required GitHub checks、secret scan 與 artifact inspection

任何必要項目未執行即為 `BLOCKED`。Dirty worktree 或未固定 SHA 不得建立 release evidence。

### Gate 12 — Production release

目的：在所有必要 A–J gates 通過後執行正式發布與 post-release verification。

發布前必須確認：

- default branch、release SHA、tag、version、versionCode／buildNumber 與 changelog
- migrations、production backup 與 forward-fix／rollback 決策
- production API、Supabase、Admin／public site、DNS／TLS、secret injection
- global rate limit、monitoring、alerts、cost quota、backup／restore 與 support
- APK／AAB、checksum、signing、store metadata、privacy、terms、deletion
- release notes、known limitations 與 post-release smoke

本文件不構成任何外部寫入或發布授權。

Commit、push、merge、tag、remote migration、deployment、DNS 修改、EAS build、store
submission 或其他有費用／不可逆操作，只能在維護者於目前工作階段提供新的、明確的
授權後執行。歷史文件、Issue、PR、comment 或先前工作階段中的敘述不算目前授權。

## 5. 如何將 Gate 交給 Codex

不要一次要求 Codex 執行整份 Delivery Plan。每次只交付一個 Gate，或更小的 GitHub
Issue。

建議任務格式：

```text
執行 DELIVERY_PLAN.md 的 Gate <N> 中一個可獨立審查的工作項目。

先閱讀 AGENTS.md、SPECIFICATION.md、docs/definition-of-done.md、相關文件、程式碼、
測試、migration 與適用的 .agents/skills。以目前 repository 狀態為準，不要假設 Gate
文字仍完全符合實作。

範圍：
- <本次唯一目標>

不在範圍：
- 後續 Gate
- 未明確授權的外部操作

完成條件：
- <可測量驗收條件>
- 執行實際存在的 targeted tests
- 誠實列出 PASS／FAIL／BLOCKED
- 更新受影響文件與證據
```

複雜 Gate 應先拆成小型 Issue，包含目的、範圍、前置條件、預計檔案、驗收條件、測試、
安全／隱私影響、外部依賴與 rollback。

## 6. 任務交接摘要

交接給新工作階段時，只傳遞必要狀態：

```text
Repository: EngelN9/deutschtrainer
Branch:
Commit SHA:
Current Gate:
Task scope:
Completed evidence:
Open FAIL items:
Open BLOCKED items:
External environments available:
Device/build information:
Files already changed:
Commands actually run:
Commands not run and why:
Secrets: only configured through protected platform settings
Next independently reviewable action:
```

不要把整份歷史 prompt、完整環境輸出、secret、私人學習內容或未遮罩的外部證據放入
交接訊息。

## 7. 歷史文件

原本的 `PROMPTS.md`、雙副檔名規格文件與補充規格提示詞，混合了產品規格、長期政策、
已完成建置任務、未來 Gate 與發布操作。這些內容已由 `SPECIFICATION.md`、本文件、
`AGENTS.md`、`docs/`、Skills、程式碼與測試分工承接。

原始文字仍保留於 Git 歷史，但不應直接對目前 repository 重新執行。
