---
name: ai-evaluation-quality-gate
description: >-
  Gate DeutschTrainer AI evaluation quality, safety, schemas, prompts,
  resilience, cost metadata, and modality-specific rubrics. Use for translation,
  free-response, writing, listening, speaking, TTS/STT, or AI provider changes;
  do not use for deterministic fixed grading, general content proofreading, or
  to accept fake-mode output as connected or production evidence.
---

# AI Evaluation Quality Gate

## 目的

驗證 AI 只在後端執行，以可信上下文、版本化 prompt、Structured Outputs、Zod 與業務規則產生安全且可追蹤的評量；fake mode 僅限 local/test。

## 適用範圍

- `packages/ai-schemas/`、`packages/ai-prompts/`
- `apps/api/src/evaluation/`、`apps/api/src/writing/`、`apps/api/src/audio/`
- `apps/api/src/content-generation/` 中與評量 draft 邊界相關部分
- `apps/mobile/src/features/ai-evaluation/`、writing/audio feedback 顯示
- `docs/ai-integration.md`、`docs/ai-output-schemas.md`、`docs/phase-5-ai-grading.md`、`docs/phase-6-writing.md`、`docs/phase-7-audio-speaking.md`

## 不適用情況

- 固定題 deterministic grading、全面 RLS、一般 release audit。
- 純 prompt 文案偏好但不涉及評量品質 gate。
- 沒有真實 provider/credential 時，不得宣稱 connected quality、latency 或 cost 通過。

## 前置檢查

1. 讀取 `AGENTS.md` 的 AI、Prompt injection、評分上下文、fake mode、作文、聽力與口說規則。
2. 追蹤 request schema、可信資料載入、prompt metadata、provider、Structured Output、Zod/business validation、persistence 與 client response。
3. 只確認 env variable 名稱，不讀取或輸出 `OPENAI_API_KEY`、JWT、service-role key 或 provider body。
4. 建立評量資料集與 rubric 前，區分 deterministic fixtures、mock/fake 與真實 connected samples。

## 執行步驟

1. 確認 provider 僅由 API 呼叫；Mobile/Admin bundle 不含 key。client 只傳可信 identifier 與 learner response，不可控制答案、逐字稿、rubric、role 或 content status。
2. 檢查每個 feature 使用版本化 prompt/schema/model metadata；Structured Outputs JSON Schema 後仍執行 Zod、allowed skills、CEFR、offset、rubric total 與禁止內容驗證。
3. 檢查 prompt injection 隔離：learner content 是 data，不可覆寫 system instruction 或存取其他使用者資料。
4. 檢查 answer-key protection：reference answer、writing rules、listening transcript、target text 與內部 grading notes 不出現在 public catalog、client response 或 log。
5. 檢查 timeout、有限 retry、invalid schema、provider unavailable、安全 fallback、quota/rate limit、idempotency、learner-scoped cache，以及 cache key 含 content/prompt/schema/version。
6. 檢查 usage/cost logging 僅記安全 metadata：model、versions、tokens/usage、cost、latency、retry；不得含完整作文、錄音、transcript、JWT 或 provider request。
7. 翻譯／自由回答：檢查 correctness、error types、skills、繁中說明、CEFR 與多重合理答案。
8. 作文：檢查十維 rubric 完整性、總分、UTF-16 inline offsets、原文比對、immutable versions、reference rewrite 顯示、failed/retry、owner deletion。
9. 聽力／TTS：只對可信內容生成，cache key 含版本/voice/model/hash，逐字稿受保護；dictation 使用 server-trusted transcript。
10. 口說／STT：驗證 owner Storage path、MIME、duration、object；只描述 transcript 差異、語速、停頓與涵蓋，不宣稱未經驗證的精確發音分數。
11. 執行：

```powershell
pnpm test
pnpm typecheck
pnpm --filter @deutschtrainer/api verify:local
pnpm --filter @deutschtrainer/api verify:writing:local
pnpm --filter @deutschtrainer/api verify:audio:local
```

12. 檢查 `apps/api/src/config.test.ts` 的 staging/production fake-mode fail-fast。真實品質抽樣、latency、cost 或模型行為未執行時標 `BLOCKED`。

## 輸出格式

按 feature 列 Contract、Schema/Prompt version、Resilience、Privacy、Quality sample、Evidence、Status。findings 需含嚴重性、失敗模式、受影響資料與最小修正。分開回報 fake/local 與 connected evidence。

## 判定規則

- `PASS`：schema、安全、resilience、rubric 與適用的 connected evidence 均符合要求。
- `FAIL`：信任 client context、schema/business validation 可繞過、答案洩漏、錯誤 cache、無邊界 retry、敏感 log、fake mode 可進 staging/production，或不實的口說評分。
- `BLOCKED`：需要真實 provider、credential、成本/latency 樣本或人工語言判讀但無法驗證。
- `NOT APPLICABLE`：該 modality 不在變更或產品路徑中，且有資料流證據。

## 完成條件

所有適用 modality 的 schema、prompt、retry/timeout/cache/log、rubric、privacy 與 fake-mode 邊界都有判定；fake fixture 不得替代 production quality gate。
