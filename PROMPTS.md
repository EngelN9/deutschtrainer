\# DeutschTrainer Codex 完成路線提示詞

本文件提供一組可依序交給 Codex 執行的提示詞，目標是把 DeutschTrainer 從目前的高完成度 Preview／本機實作，推進到具有可重現證據的 connected release。

不要一次貼上所有提示詞。先執行「提示詞 0」，再依 Gate 順序逐一執行。每一階段完成後，保留 Codex 回報的命令、測試結果、外部證據與 \`BLOCKED\` 項目，作為下一階段輸入。

\#\# 使用前準備

外部服務或 credential 必須由使用者透過正式平台、CI secret、EAS secret 或受保護的 runtime 設定提供。不要把任何 secret 貼進聊天、issue、PR、Markdown、log 或 repository。

開始 connected release 前，使用者需要準備或決定：

\- 遠端 Supabase project 與管理權限。  
\- OpenAI API credential 與預算／quota。  
\- API hosting provider、正式 HTTPS domain、DNS 權限。  
\- Mobile/Admin 的公開 URL 與允許的公開環境變數。  
\- EAS project/account 與 Android signing 權限。  
\- Android 實體裝置；若 iOS 也屬公開範圍，另需 Apple 開發者帳號與實機。  
\- Monitoring、alerting、backup 與 restore drill 的目標環境。  
\- Store 發布帳號、隱私政策、服務條款、支援與帳號刪除頁面。

若外部條件尚未提供，Codex 必須完成所有安全的 repository 內工作，然後把外部項目標成 \`BLOCKED\`，不得使用假的 credential、假的部署結果或假的實機證據。

\#\# 提示詞 0：每個階段都要使用的共同指令

\`\`\`text  
你正在 DeutschTrainer repository 中工作。

開始前必須完整閱讀根目錄 AGENTS.md、README.md、與本次工作直接相關的 docs、原始碼、測試、package.json、migration，以及 .agents/skills/ 中適用的 SKILL.md。AGENTS.md 的安全、隱私、資料完整性與證據要求優先。

工作原則：

1\. 先執行 git status \--short，保留使用者既有變更，不得覆蓋或清除不屬於本次工作的內容。  
2\. 先診斷與建立 evidence matrix，再進行最小且聚焦的修改；不要無關重構。  
3\. 只能使用 repository manifests、README、AGENTS.md 或 docs 已確認存在的命令，不得虛構命令或路徑。  
4\. 不得讀取、輸出、複製、記錄或提交任何 secret。不要列印完整 env；只可檢查環境變數名稱與是否已安全設定。  
5\. Mobile/Admin 不得持有 SUPABASE\_SERVICE\_ROLE\_KEY 或 OPENAI\_API\_KEY。只有 API runtime 可使用這些 secret。  
6\. 不得停用 RLS、弱化 authorization、信任 client role/score/grading context、修改已套用 migration、刪除失敗測試，或用 placeholder/fake implementation 冒充完成。  
7\. AI\_EVALUATION\_FAKE\_MODE=true 只可用於 local/test deterministic fixtures，不得作為 staging、production、品質、成本或 latency 驗收。  
8\. Demo、mock、Web export、本機 Supabase、單元測試與 Maestro guest smoke 都不能單獨代表 connected production readiness。  
9\. 無法安全驗證的必要項目一律標示 BLOCKED；已執行且證明不符合要求的項目標示 FAIL，不得假裝通過。  
10\. 原生通知、麥克風、錄音、App restart、飛航模式、background reconnect 與安裝流程必須在實機驗證。  
11\. 除非我明確要求，否則不要 commit、push、建立 PR、部署、修改遠端資料或執行不可逆操作。  
12\. 修改後先跑最相關的 targeted tests，再依風險跑 repository-wide gates。

每次回報必須包含：

\- 完成內容  
\- 修改檔案  
\- 架構與資料庫影響  
\- 安全與隱私  
\- 執行的命令、exit code、suite/test 數或 build 結果  
\- 未執行項目及原因  
\- 已知風險  
\- 外部操作或使用者輸入  
\- PASS / FAIL / BLOCKED / NOT APPLICABLE 判定  
\- AGENTS.md Definition of Done A-J gate 狀態  
\- git diff \--check  
\- git status \--short

不要只回覆「完成」或「測試通過」。  
\`\`\`

\#\# Gate 1：建立最新完成基線

使用 Skill：\`deutschtrainer-release-audit\`、\`docs-code-drift-check\`

\`\`\`text  
請對目前 DeutschTrainer 執行一次完整、預設只讀的完成度與 release readiness 基線稽核。

要求：

1\. 讀取 AGENTS.md、README.md、package manifests、pnpm-workspace.yaml、CI、apps/mobile/app.json、apps/mobile/eas.json、apps/api/Dockerfile、全部 docs、supabase migrations/seed、現有 tests 與 verification scripts。  
2\. 使用 .agents/skills/deutschtrainer-release-audit/SKILL.md。  
3\. 使用 .agents/skills/docs-code-drift-check/SKILL.md，比對 Phase 0-15、README 與 acceptance claims。  
4\. 建立 AGENTS.md Definition of Done A-J matrix，逐項列出 PASS、FAIL、BLOCKED 或 NOT APPLICABLE，以及可重現證據。  
5\. 明確區分 repository-complete、local integration、connected staging、remote security、real AI、native device、operations 與 public delivery。  
6\. 執行安全且可用的 repository-wide gates。若 Docker、Supabase、網路或裝置不可用，完成其他檢查並標示 BLOCKED。  
7\. 不修正任何問題；先輸出按優先序排列的缺口 backlog、相依關係、最小修正範圍與完成順序。

最終輸出：

\- 整體 READY / NOT READY / BLOCKED  
\- A-J Gate matrix  
\- 已確認的完成項目  
\- P0/P1/P2 backlog  
\- 外部依賴清單  
\- 建議下一個 Gate  
\`\`\`

完成條件：已取得最新、可引用的 readiness baseline，且沒有把既有 Phase completion claim 直接視為 production readiness。

\#\# Gate 2：修完 repository 內可解決的阻擋問題

依 Gate 1 findings 選用：\`ci-failure-triage\`、\`learning-engine-regression\`、\`ai-evaluation-quality-gate\`、\`offline-sync-e2e\`

\`\`\`text  
根據上一階段的 readiness baseline，修正所有不需要外部 credential、遠端 deployment 或實體裝置即可完成的 P0/P1 repository 阻擋問題。

要求：

1\. 先逐項重現 root cause，不得只根據先前摘要修改。  
2\. 每次只處理一個最小問題群，保留既有 API、schema 與 migration 相容性。  
3\. 若修改 database，建立新的 append-only migration；不得修改既有 migration。  
4\. 若修改固定題、attempt、mastery、review、offline queue 或 timestamps，使用 learning-engine-regression 或 offline-sync-e2e Skill。  
5\. 若修改 AI schema、prompt、provider、writing/audio evaluation，使用 ai-evaluation-quality-gate Skill。  
6\. 若修改行為、架構、環境或完成聲明，同步更新必要測試與文件。  
7\. 跑 targeted tests 後執行：  
pnpm format:check  
pnpm lint  
pnpm typecheck  
pnpm test  
pnpm \--filter @deutschtrainer/api build  
pnpm \--filter @deutschtrainer/api verify:bundle  
8\. 可用時再執行相應 Supabase/API local verification、Mobile exports、Admin build 與 Docker build。

完成後重新產生 A-J matrix，只把具備新證據的項目改成 PASS。外部項目保持 BLOCKED。  
\`\`\`

完成條件：Gate 1 所有 repository-local P0/P1 findings 都已修正或有明確理由保留，相關測試與文件一致。

\#\# Gate 3：完成完整帳號刪除與資料權利

使用 Skill：\`supabase-rls-security-audit\`、\`offline-sync-e2e\`

\`\`\`text  
請稽核並完成 DeutschTrainer 的完整帳號刪除流程。這不是只刪除單篇作文或錄音，也不是只新增 UI 按鈕。

必須涵蓋：

1\. Mobile 端明確的破壞性二次確認與可理解的繁體中文說明。  
2\. Private Storage、writing submissions/versions/feedback、audio/recordings/transcripts、listening/speaking data。  
3\. Attempts、progress、mastery、review queue、error history、analytics、preferences、profile。  
4\. Supabase Auth user、sessions 與舊 token 無法繼續存取。  
5\. On-device cache、downloaded courses、settings cache 與 pending offline queue。  
6\. Metadata 保留的稽核／法務理由，且不得含原始私人內容。  
7\. Partial failure、retry、idempotency、audit、owner verification 與跨使用者隔離。  
8\. Privacy/support/account deletion 文件與實際行為一致。

先使用 supabase-rls-security-audit 建立刪除矩陣，再進行最小實作。Database 變更只能新增 migration。加入雙使用者、匿名、舊 token、partial failure 與 Android acceptance 測試。

無法安全操作遠端 Auth 或 Storage 時，完成本機實作與測試，將 remote deletion verification 標示 BLOCKED。  
\`\`\`

完成條件：單一 server-authoritative workflow 可完整刪除帳號資料，本機與遠端測試證明 owner isolation、partial failure recovery 及舊 session/token 失效。

\#\# Gate 4：部署 Remote Supabase 並完成安全稽核

使用 Skill：\`supabase-rls-security-audit\`

\`\`\`text  
在我已明確授權並透過安全 secret store 提供遠端 Supabase 環境後，完成 connected staging database 部署與安全驗證。

要求：

1\. 不要要求我在聊天中貼 service-role key、JWT 或 database password。  
2\. 先核對 remote project identity、environment、migration history 與 backup 狀態；不得對 production 執行 destructive reset。  
3\. 從乾淨環境驗證所有 migrations 可依序重建，現有 staging 可安全升級。  
4\. 驗證 private tables RLS、CRUD、匿名、使用者 A/B、learner、content\_editor、reviewer、admin、service role 邊界。  
5\. 驗證 SECURITY DEFINER、search\_path、EXECUTE allowlist、PUBLIC/anon/authenticated 撤權。  
6\. 驗證 writing、AI feedback、learning records、audio Storage、recordings、transcripts、signed URLs 與刪除流程。  
7\. 驗證 seed 為 human/approved/published、可重播、不含 secret 或真實私人資料。  
8\. 證據必須遮罩 user IDs、tokens、URLs 中的敏感部分與所有 credential。

先只讀稽核；任何 remote mutation、migration apply 或資料修正都要確認屬於本次授權範圍。失敗時停止並提供 rollback/forward-fix，不得以停用 RLS 解決。  
\`\`\`

完成條件：Remote Supabase schema/migrations、RLS、Storage、roles、刪除與雙使用者隔離都有可重現的 staging 證據。

\#\# Gate 5：部署 Connected API、Admin 與公開頁面

使用 Skill：\`deutschtrainer-release-audit\`、\`docs-code-drift-check\`

\`\`\`text  
在我提供 hosting、domain 與 DNS 權限後，部署 DeutschTrainer connected staging API 與 Admin/Public site。

要求：

1\. API 必須使用 pnpm \--filter @deutschtrainer/api build 產出的 dist/server.mjs，不使用 tsx 或 TypeScript runtime。  
2\. Container 從 monorepo root 建置：  
docker build \--file apps/api/Dockerfile \--tag deutschtrainer-api .  
3\. Runtime 使用非 root user、正確 HOST/PORT、/health、graceful shutdown 與平台 secret injection。  
4\. APP\_ENV=staging，SUPABASE\_URL 必須為 HTTPS，拒絕 placeholder credential 與 AI\_EVALUATION\_FAKE\_MODE=true。  
5\. 設定正式 HTTPS API domain、DNS、TLS、CORS 與允許的 Mobile/Admin public base URL。  
6\. Admin server boundary、API/RPC 與 database 三層都要驗證 session/role；learner 必須被拒絕且不得洩漏管理資料。  
7\. 公開頁面只提供產品、支援、隱私、服務條款與帳號刪除說明，不得暴露 admin data。  
8\. 執行 health、auth、API contract、rate limit、error redaction、shutdown、restart 與 container smoke。  
9\. 部署後不得因 staging 可用就宣稱 production-ready。

回報 deployment ID、commit SHA、domain、health 結果、設定邊界、rollback 步驟與所有 BLOCKED 項目；不要輸出 secret。  
\`\`\`

完成條件：遠端 HTTPS API/Admin/Public staging 可重現部署、健康檢查通過、權限與錯誤邊界正確，並具備 rollback。

\#\# Gate 6：真實 AI 評量品質、成本與韌性驗收

使用 Skill：\`ai-evaluation-quality-gate\`

\`\`\`text  
在 staging 已安全注入真實 OpenAI credential 後，執行 connected AI quality gate。不得開啟 fake mode。

涵蓋：

1\. Translation/free-response evaluation。  
2\. Writing 十維 rubric、UTF-16 inline offsets、version retry/reference flow。  
3\. Listening TTS/cache/transcript protection/dictation。  
4\. Speaking STT、owner Storage path、MIME/duration/object validation，以及非精確發音評分聲明。  
5\. Structured Outputs、JSON Schema、Zod、business validation、allowed skills、CEFR 與 prompt injection。  
6\. Versioned prompt/schema/model、timeout、有限 retry、fallback、quota、rate limit、idempotency 與 learner-scoped cache。  
7\. Usage/cost/latency/retry metadata 與敏感內容 redaction。  
8\. Protected answers、transcripts、writing rules、grading notes 不得回到 client 或 log。

建立經人工審核的 B1-C2 evaluation set，包含正常、合理替代答案、schema mismatch、timeout、provider failure、prompt injection、重播、跨使用者與高成本案例。

分開回報品質、schema success rate、retry rate、latency、usage/cost、privacy findings 與人工審核結果。不得把少量成功 sample 描述為全面品質保證。  
\`\`\`

完成條件：每個 AI modality 都有真實 staging 證據、人工評估、成本／延遲基線、安全邊界與 failure behavior。

\#\# Gate 7：營運、全域 rate limit、監控與備份還原

\`\`\`text  
完成 DeutschTrainer production operations readiness。

要求：

1\. 將目前單一 runtime 的 per-profile rate limit 補成多執行個體可共享的 gateway 或 shared store；保留既有 API contract、錯誤碼與 learner isolation。  
2\. 建立 structured logs、request ID、correlation ID、sensitive-data redaction。  
3\. 建立 error、latency、AI usage/cost、rate-limit、database 與 health monitoring。  
4\. 設定 alerts、owner、severity、notification channel、runbook 與測試方式。  
5\. 建立 API deployment/rollback runbook，以及 database append-only forward-fix/rollback decision runbook。  
6\. 設定 staging backup，執行真正 restore drill；不能只證明 backup job 存在。  
7\. Restore drill 記錄 backup source、restore target、耗時、資料完整性、RLS、Storage、Auth/owner isolation、問題與修正。  
8\. 確認 logs、metrics、traces、alerts 與 backups 不含作文原文、錄音、完整 transcript、JWT、key 或其他私人資料。  
9\. 執行多執行個體 rate-limit、API restart、dependency outage、database unavailable、AI timeout 與 rollback rehearsal。

涉及外部平台設定或費用前先確認授權。無法操作的平台項目標 BLOCKED，不能以本機 mock 代替。  
\`\`\`

完成條件：共享 rate limit、monitoring、alerting、backup、restore drill 與 rollback 都有 staging 實證與可操作 runbook。

\#\# Gate 8：Connected Mobile 設定與 EAS build

使用 Skill：\`deutschtrainer-release-audit\`

\`\`\`text  
建立不使用 mock、localhost、placeholder credential 或 fake AI 的 DeutschTrainer connected Android preview。

要求：

1\. 驗證 apps/mobile/app.json 的 version、Android versionCode、iOS buildNumber、package/bundle identifier 與 EAS project ID。  
2\. 檢查 apps/mobile/eas.json；保留 demo/mock preview 與 connected preview 的清楚區隔，不得讓 internal mock APK 被誤認為 connected release。  
3\. 只把核准的 EXPO\_PUBLIC\_SUPABASE\_URL、EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY、EXPO\_PUBLIC\_API\_BASE\_URL 與 content source 放入 client。  
4\. 絕對不得把 service-role/OpenAI key 放入 EAS env、Expo public variables、APK、bundle 或 source map。  
5\. Connected build 使用遠端 HTTPS API、遠端 Supabase、EXPO\_PUBLIC\_CONTENT\_SOURCE=api 與正確 release ID。  
6\. 執行 Expo compatibility、Expo Doctor、Android/Web export、Admin build、API bundle 與 repository gates。  
7\. 建立 EAS internal Android APK，保存 build ID、commit SHA、app version、versionCode、checksum、安裝方式、環境邊界與 known limitations。  
8\. 安裝前檢查 APK/JavaScript bundle 不含 secret、localhost 或錯誤 endpoint。

任何 EAS build、signing 或 paid external action都必須在我的明確授權範圍內執行。  
\`\`\`

完成條件：可安裝的 connected Android preview APK 對應正確 staging、具有 checksum/release metadata，且 binary 未洩漏 secret。

\#\# Gate 9：Android 實機 Device Matrix

使用 Skill：\`offline-sync-e2e\`、\`deutschtrainer-release-audit\`

\`\`\`text  
在 connected preview APK 與 Android 實體裝置上完成 release device matrix。Web、Expo Go、模擬器或 guest-only Maestro smoke 不能取代此驗收。

每次記錄：

\- 裝置型號  
\- Android 版本  
\- App version/versionCode  
\- EAS Build ID  
\- Commit SHA  
\- 網路與帳號條件  
\- 測試步驟  
\- 實際結果  
\- 截圖、錄影或已遮罩 log

至少驗證：

1\. 安裝、首次啟動、登入、登出、onboarding、session restart。  
2\. Connected catalog、lesson、固定題 server regrading、progress、mastery、review 與 error history。  
3\. Course download、飛航模式、連續離線作答、process kill/relaunch、background reconnect、duplicate、stale conflict、retry/discard、多筆 queue、低儲存與兩 profile 隔離。  
4\. 通知允許／拒絕、Android channel、排程送達、點擊 deep link、timezone 變更與 reboot 後行為。  
5\. 麥克風允許／拒絕、錄音、播放、background transition、private upload、STT、speaking deletion。  
6\. Writing create/evaluate/retry/version/delete。  
7\. 完整帳號刪除、本機 cache/queue 清除、舊 session/token 無法使用。  
8\. Slow/offline/reconnect、API timeout、rate limit、server error、Supabase error 與可理解繁中錯誤。  
9\. 小螢幕、長繁中、長德文、keyboard、loading/empty/error/retry/offline/unauthorized/conflict 狀態。

使用 apps/mobile/.maestro/guest-smoke.yaml 作為補充 smoke，但 connected flows 必須有獨立實證。缺少某裝置或 OS 版本時標 BLOCKED。  
\`\`\`

完成條件：所有 Android 必要原生與 connected flows 均在正式 APK/實機通過，失敗與限制都有可追蹤證據。若 iOS 被納入公開範圍，另建立等價 iOS matrix；否則明確標示不在此 release scope。

\#\# Gate 10：德語內容、文件與公開聲明終驗

使用 Skill：\`german-content-qa\`、\`docs-code-drift-check\`

\`\`\`text  
對 release candidate 執行最後的內容與文件一致性檢查。

內容要求：

1\. 100 題 human/approved/published 與答案完整性自動驗證。  
2\. B1、B2、C1、C2 與所有題型的人工抽樣。  
3\. 文法、拼字、大小寫、Umlaut、ß、標點、自然度、CEFR、文化情境。  
4\. 繁體中文翻譯/解釋、華語學習者常見錯誤與簡體字檢查。  
5\. 名詞冠詞/複數、動詞變化、介系詞/動詞支配格、語序。  
6\. 多重合理答案、accepted alternatives、distractor、answer/explanation/rubric 一致性。  
7\. AI draft 必須保留人工審核證據，不得自行核准或發布。  
8\. 公開 catalog 不得洩漏 reference answer、transcript 或內部 grading rules。

文件要求：

1\. 比對 README.md、AGENTS.md、docs、package scripts、env examples、API routes/schemas、migrations、CI、EAS、實際部署與 device evidence。  
2\. 更新過時的 Phase claim、URL、version、build ID、安裝說明、privacy、support、account deletion、deployment、rollback 與 known limitations。  
3\. 不得把 staging 寫成 production，不得把 Demo/mock APK 寫成 connected，不得把 local limiter 寫成 global，不得把未執行 restore/device test 寫成完成。

先列 findings，再進行最小修正。需要具足夠德語能力的人員審核但沒有證據時，內容 gate 標 BLOCKED。  
\`\`\`

完成條件：release content 具人工 QA 證據，所有公開與內部文件都與 code、schema、部署、裝置及已知限制一致。

\#\# Gate 11：Release Candidate 全面回歸

使用所有適用 repository Skills，最後以 \`deutschtrainer-release-audit\` 收斂。

\`\`\`text  
對固定 commit SHA 的 DeutschTrainer release candidate 執行乾淨、可重現的完整回歸。不要在未固定版本或 dirty worktree 上建立 release evidence。

依 repository 實際 scripts 執行：

pnpm install \--frozen-lockfile  
pnpm format:check  
pnpm lint  
pnpm typecheck  
pnpm test  
pnpm \--filter @deutschtrainer/api build  
pnpm \--filter @deutschtrainer/api verify:bundle  
docker build \--file apps/api/Dockerfile \--tag deutschtrainer-api .  
pnpm \--filter @deutschtrainer/mobile export:android  
pnpm \--filter @deutschtrainer/mobile export:web  
pnpm \--filter @deutschtrainer/admin build

在 apps/mobile 執行 CI 宣告的：

pnpm exec expo install \--check  
pnpm dlx expo-doctor@1.20.1

在可安全 reset 的本機 Supabase 執行：

pnpm supabase:start  
pnpm supabase:reset  
pnpm supabase:status  
pnpm \--filter @deutschtrainer/api verify:local  
pnpm \--filter @deutschtrainer/api verify:learning-api:local  
pnpm \--filter @deutschtrainer/api verify:workspaces:local  
pnpm \--filter @deutschtrainer/api verify:audio:local  
pnpm \--filter @deutschtrainer/api verify:admin:local  
pnpm \--filter @deutschtrainer/api verify:settings:local  
pnpm \--filter @deutschtrainer/api verify:offline-sync:local  
pnpm \--filter @deutschtrainer/api verify:knowledge:local  
pnpm \--filter @deutschtrainer/api verify:content-readiness:local

另外驗證：

\- Remote staging smoke 與 RLS matrix  
\- Real AI evaluation matrix  
\- Connected API/Admin/Public URLs  
\- Shared rate limit、monitoring、alerts、backup/restore、rollback  
\- Connected Android APK/checksum  
\- Android device matrix  
\- Account deletion  
\- Content human QA  
\- Required GitHub CI checks  
\- Secret scan 與 artifact inspection

輸出每個命令、exit code、suite/test 數、artifact/build ID、commit SHA、裝置與外部證據。任何一項未執行即標 BLOCKED。  
\`\`\`

完成條件：固定 RC commit 的自動化、本機 integration、remote staging、AI、operations、content 與 Android device evidence 全部通過。

\#\# Gate 12：Production 發布與最終完成判定

使用 Skill：\`pr-evidence-review\`、\`deutschtrainer-release-audit\`

\`\`\`text  
先對 release PR 與 RC evidence 執行 pr-evidence-review，findings 必須先於摘要。只有所有阻擋 finding 已處理、required checks 通過且 A-J 必要 gates 都有可重現證據時，才進入 production release。

Production release 前確認：

1\. 正確 default branch、release commit、tag、app version、versionCode/buildNumber 與 changelog。  
2\. Migrations append-only、production backup、forward-fix/rollback 決策與 maintenance plan。  
3\. Production HTTPS API、Supabase、Admin/Public site、DNS/TLS、secret injection 與 fake mode 拒絕。  
4\. Global rate limit、monitoring、alerts、AI cost quota、backup/restore 與 on-call/support。  
5\. Connected APK/AAB、checksum、signing、store metadata、privacy、terms、support、account deletion。  
6\. Release notes 包含 commit SHA、build ID、安裝／更新、環境、限制、rollback 與支援方式。  
7\. 發布後 smoke：health、auth、catalog、fixed attempt、AI、writing、audio、offline reconnect、account deletion。  
8\. 不得把 Draft PR、staging、internal preview 或 store submission 誤寫成正式發布。

任何 commit、push、merge、tag、remote migration、production deploy 或 store submission 都必須在我的明確授權後才執行。先提供 dry-run 計畫與精確 target。

完成後使用 deutschtrainer-release-audit 重新判定 A-J：

\- 全部必要 gates PASS：可判定 READY，並使用精確 release 狀態。  
\- 任一 FAIL：判定 NOT READY，立即停止發布並執行 rollback/forward-fix。  
\- 無 FAIL 但任一 BLOCKED：判定 BLOCKED，不得宣稱 production-ready。  
\`\`\`

完成條件：production release 已由授權人完成、post-release smoke 通過、rollback 可用、公開資訊正確，且 \`AGENTS.md\` 的 A-J 必要 gates 全部具有 \`PASS\` 證據。

\#\# 每次交接給新 Codex task 的狀態模板

\`\`\`text  
DeutschTrainer 目前狀態：

\- Repository path:  
\- Branch:  
\- Commit SHA:  
\- Current Gate:  
\- Previous Gate result:  
\- Completed evidence:  
\- Open FAIL items:  
\- Open BLOCKED items:  
\- External environments available:  
\- Device/build information:  
\- Files already changed:  
\- Commands already run:  
\- Commands not run:  
\- Secrets: 已透過平台安全設定，沒有貼在此處  
\- Authorization boundary: 不得 commit/push/deploy/remote mutate，除非本次訊息明確授權

請先讀取 AGENTS.md、README.md、相關 docs、tests、diff 與適用的 .agents/skills，再從 Current Gate 繼續。不要重做已具固定 commit 證據的工作；若 code 或 commit 已變更，重新驗證受影響 evidence。  
\`\`\`

\#\# 最終「作品完成」標準

只有以下條件同時成立，才可以把 DeutschTrainer 描述為完成或 production-ready：

\- 核心學習、內容、資料權利、安全與品質 gates 全部通過。  
\- Connected API、Admin/Public site、Remote Supabase 與 real AI 已驗收。  
\- 完整帳號刪除與 owner isolation 已驗證。  
\- Global rate limit、monitoring、alerting、backup、restore drill 與 rollback 可操作。  
\- Connected Android release artifact 已在實體裝置完成必要 matrix。  
\- Content 已通過具足夠能力的人員審核。  
\- Required CI、release PR、migrations、文件、release assets 與公開聲明一致。  
\- 沒有未處理的必要 \`FAIL\`、\`BLOCKED\`、\`Partial\` 或 \`Not started\` gate。

若仍缺遠端 credential、DNS、部署、EAS、實體裝置、store、監控或 restore evidence，正確描述應是：

\`\`\`text  
功能完整度高的 Preview／Demo，仍在 connected deployment、營運或實機驗收階段。  
\`\`\`
