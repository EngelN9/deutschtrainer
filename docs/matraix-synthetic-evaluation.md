# MatrAIx 合成學習者評估

## 定位

`evaluation/matraix` 是與 production runtime 完全分離的研究與品質工具。它以完全虛構、年滿
18 歲的固定 persona，檢查 DeutschTrainer 寫作回饋是否容易辨識、理解、修正與遷移運用。
它只能產生待人工審查的候選證據，不是 learner-facing 功能，也不是臺灣德語學習者的機率
樣本。

> Synthetic persona evidence is supplementary evaluation evidence only and cannot satisfy any gate requiring real learners, qualified human-language review, real AI, device evidence, or production evidence.

每份 JSON 與 Markdown 報告都必須以以下字串開頭或第一個欄位明確呈現：

```text
SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE
```

## 不可變邊界

MatrAIx 不得：

- 評分 learner、決定 CEFR、mastery、review queue 或正式 attempt。
- 核准、發布或撤回內容，也不得自動修改 production prompt、rubric 或答案。
- 呼叫 `WritingEvaluationService`、Supabase、正式 API、quota、usage log 或 learner persistence。
- 使用正式 learner submission、profile、錄音、逐字稿、analytics、帳號 identifier 或其 hash。
- 下載、抽樣或再散布 Persona 1M；其來源資料仍各自受原授權與條款約束。
- 自動推進 PR、部署、release 或 Definition of Done A–J gate。

第一版 upstream 只允許完整 commit
`6439df181996c2a67cac16f3b0089a909c011ada`，宣告版本 `0.1.0`。live adapter 位於 Python
optional dependency group；一般 repository 與 deterministic CI 不安裝或執行它。上游程式碼為
MIT；隔離 image 中保留 clone 的 `LICENSE`。本計畫不引入 Persona 1M。

參考：[MatrAIx repository](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B)、
[Persona 1M data card](https://huggingface.co/datasets/MatrAIx2026/MatrAIx_Persona_1M_Public_Release)、
[NIST Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)。

## 資料流與隔離

```text
versioned synthetic cohort + pending scenarios
  -> deterministic matrix planner
  -> ignored .runs/materialized MatrAIx survey tasks
  -> optional isolated container and evaluation-only provider key
  -> schema/security validation
  -> frozen-key and frozen-facet metrics
  -> ignored raw run records
  -> redacted JSON/Markdown candidate report
  -> independent human disposition
```

`evaluation/matraix` 不在 `pnpm-workspace.yaml`。Root production `.dockerignore` 排除整個
`evaluation`；`apps`、`packages`、`supabase`、production Docker 與 client exports 不可依賴此
subproject。隔離 container 的 build context 只能是 `evaluation/matraix`，以 non-root user、
read-only filesystem、全部 capability dropped、`no-new-privileges` 執行，且不掛載 Docker
socket、repository `.env`、production data 或完整 repository。

Live output 只可放在 ignored `evaluation/matraix/.runs/`。Repository 只保存 deterministic
golden plan、空結果報告與 versioned synthetic fixtures；provider 原始輸出不得提交。

## Frozen contracts

- `cohort.v1`：8 個完全虛構 adult personas，B1–C2 各 2 個，只含教學相關能力與偏好。
- `scenario.v1`：4 個 CEFR × 9 類別，共 36 個。每個 scenario 有自己的
  `pending_human_review | approved` 狀態。
- `WritingFeedback.v1`：fixture 必須同時通過正式 `writingFeedbackSchema`、prompt registry
  version 與 JavaScript UTF-16 offset 驗證。
- `literal_zh_de_transfer`：只存在 evaluation taxonomy；正式 fixture 仍映射到既有
  `idiomaticity`、`word_choice` 或 `word_order`，不修改 production taxonomy。
- `metrics.v1`：八項結果均為 `true | false | null`，同時保存 scorable、scoring source、
  denominator policy 與 not-scorable reason，不建立合成總分。

Persona 只能看見 learner 原錯誤片段、修正、繁中解釋、revision task 與 unseen transfer
item。Rubric score、參考答案、internal prompt、gold key 與診斷標籤均為 verifier-only。

## 矩陣與統計解讀

基本矩陣為 36 scenarios × 每層 2 personas × 2 variants，共 144 base cells。預先固定 24
個 cells 各追加兩次 replicate，正式排程共 192 evaluations。Replicate 只用於回報 checksum
match、metric-vector agreement、3/3 agreement、flip rate 與 schema-valid rate，不是額外獨立
persona，也不得宣稱模型 deterministic。

報告同時列出 end-to-end rate 與 schema-valid/scorable conditional rate。Timeout、provider
failure、invalid schema 與 security rejection 保留在 scheduled denominator 和 failure bucket。
所有結果保留 numerator/denominator；`n < 20` 只列精確計數、不排名。足量分層可列描述性
Wilson 95% interval，但不得外推真實學習者，也不執行探索性 p-value 檢定。

36-cell calibration set 必須由兩位具資格 reviewer 獨立判讀。Harness 只在完整 36 cells × 4
pedagogical flags × 2 reviewers 時產生 raw agreement、Cohen's kappa、confusion matrix 及
positive/negative agreement；類別退化時不硬算 kappa。這項校準不滿足 Gate C。

## CLI 與 deterministic 驗證

從 repository root 執行：

```powershell
python -m uv run --project evaluation/matraix --frozen dt-matraix validate
python -m uv run --project evaluation/matraix --frozen dt-matraix plan --run-id preflight-v1
python -m uv run --project evaluation/matraix --frozen dt-matraix materialize --run-id preflight-v1
python -m uv run --project evaluation/matraix --frozen dt-matraix report --run-id preflight-v1
python -m uv run --project evaluation/matraix --frozen dt-matraix verify-isolation
```

CLI 只接受受控 ID，不接受任意路徑；解析後必須 containment-check 在 allowlisted run root。
Deterministic CI 固定 Python 3.12、uv `0.12.3`，不提供 secret、不呼叫 provider、不下載
Persona 1M。`scripts/verify-writing-fixtures.ts` 另以正式 TypeScript/Zod schema 檢查 36 個
feedback contracts。

## Live run gate

`run-live` 預設 fail closed，且只可在隔離 container 內執行。開始前必須同時具備：

- 乾淨且已提交的 DeutschTrainer exact revision 與 pinned MatrAIx SHA。
- 36 個逐項 `approved` scenarios。
- 兩位 reviewer 的 measurement approval 與 calibration artifact。
- 明確 provider/model、費用上限、terms、retention 與資料處理核對。
- 獨立 `MATRAIX_EVAL_OPENAI_API_KEY` 或 `MATRAIX_EVAL_ANTHROPIC_API_KEY`。
- OpenAI adapter 經確認實際送出 `store: false`；在此之前 OpenAI live run 維持 `BLOCKED`。

不得讀取 production `OPENAI_API_KEY`、Mobile/Admin public variables 或 learner BYOK。執行時
須限制 output 64 KiB、timeout 與 retry，並拒絕 raw HTML、secret、JWT、private key、email
或電話。狀態只使用 `CANDIDATE`、`ACCEPTED_FOR_HUMAN_REVIEW`、`REJECTED` 或 `BLOCKED`。
Survey agent 依 MatrAIx auto-mode contract 在受限的外層 evaluation container 內以 host runtime
執行，不掛載 Docker socket。Harbor subprocess 只繼承執行所需的 allowlisted runtime 變數與
映射後的單一 evaluation-only provider key，不繼承完整 container environment。

## 人工審查、隱私與發布

36 個 scenario 的德文、繁中、CEFR、唯一答案、facet 與 perturbation 都必須由合格德語
reviewer 逐項核准。Automation 不可把 `pending_human_review` 改成 `approved`。正式 192 次
provider run、人類 calibration 與對外研究結論目前均為 `BLOCKED`。

任何 provider 原文都不可直接進入 `outputs/`。只有經人工確認、刪減、通過 PII/secret
掃描且不含原文的報告，才可在另一項明確授權工作中納入。不得宣稱學習成效、留存、考試
進步、CEFR validity、人口代表性或 production readiness。

## Rollback

移除 `evaluation/matraix`、CI 的 `matraix-evaluation` job 與本文件引用即可完整 rollback。
Production apps/packages、API contract、database、migration、quota 與 secret 不受影響，不需
資料回填、API rollback 或 production key rotation。
