# Acceptance Criteria

## 1. Phase 0 驗收

- 15 份指定規劃文件已建立。
- 建議 monorepo 骨架已建立。
- B1、B2、C1、C2 均出現在產品需求、內容模型、資料庫 schema、exercise type 與 AI schema 契約中。
- 課程結構 Level -> Course -> Unit -> Lesson -> Activity -> Exercise 與 database schema 一致。
- Exercise 型別與資料表 `exercises.type`、`exercises.payload_json`、`exercise_options`、`exercise_answers` 一致。
- AI JSON Schema/TypeScript 型別與 `ai_feedback.feedback_json`、`attempt_answers.grading_result_json` 對齊。
- Mobile 與 backend API 契約列出 request schema、response schema、權限、rate limit、cache、idempotency。
- 權限規則與 learner、content_editor、reviewer、admin 角色一致。
- 每個開發階段都有可測量的驗收條件。
- MVP 未加入排行榜、付款、好友、公會、虛擬貨幣或即時多人功能。

## 2. 一致性檢查結果

| 檢查項目                 | 結果                | 備註                                                                     |
| ------------------------ | ------------------- | ------------------------------------------------------------------------ |
| B1-B2-C1-C2 支援         | Pass                | Level enum、內容主題、課程資料表、AI schema 均含四個程度                 |
| 課程結構與 DB 一致       | Pass                | courses、units、lessons、activities、exercises 對應階層                  |
| Exercise 型別與 DB 一致  | Pass                | exercise_type enum、payload_json、options、answers、attempt_answers 對應 |
| AI schema 與 TS 型別一致 | Pass with follow-up | Phase 0 定義 contract；Phase 1/5 需落地到 `packages/ai-schemas`          |
| Mobile 與後端 API 一致   | Pass with follow-up | API contract 已列；Phase 1/2 需建立 schema package                       |
| 權限與角色一致           | Pass                | RLS 文件與角色故事對齊                                                   |
| Phase 驗收可測量         | Pass                | Roadmap 每階段均列驗收                                                   |
| MVP 排除非目標           | Pass                | PRD 明列排除排行榜、付款、社交等                                         |

## 3. Phase 1 驗收

- `apps/mobile` Expo App 可啟動。
- `apps/admin` Next.js App 可啟動。
- Supabase local 可啟動並套用初始 migration。
- `pnpm lint` 通過。
- `pnpm typecheck` 通過。
- `pnpm test` 通過。
- GitHub Actions 執行上述檢查。
- `.env.example` 明確區分 public 與 server-only secret。

## 4. Phase 2 驗收

- 未登入不可進入主要 App。
- 登入狀態可保存。
- 初次設定完成前導向 onboarding。
- 使用者只能讀寫自己的 profile、preferences、levels。
- 表單有前端與後端驗證。

## 5. Phase 3 驗收

- B1、B2、C1、C2 課程資料可顯示。
- Lesson 顯示標題、程度、技能分類、時間、先備技能、目標、單字、文法、CEFR 描述、版本與發布狀態。
- 第一階段固定題型可作答與提交。
- loading、empty、error、retry 狀態完整。
- 重新開啟 App 後進度仍存在。

目前結果：Pass。

- Supabase seed 已實際驗證 B1、B2、C1、C2 共 4 門課、9 堂課及 50 題。
- Lesson 必要欄位已在課堂頁顯示。
- 六種固定題型共用 discriminated union、Zod contract 與 deterministic grading。
- mock/Supabase adapter 均輸出同一個 `CourseCatalog` ViewModel。
- 進度依使用者分區寫入 AsyncStorage，且寫入完成後才顯示提交結果。

## 6. Phase 4 驗收

- Attempt 寫入後自動更新 SkillMastery。
- 錯誤建立 ErrorRecord。
- 錯誤或低掌握技能建立 ReviewQueue。
- 到期複習能正確顯示與完成。
- 學習分析顯示技能掌握度與弱項。

## 7. Phase 5 驗收

- AI key 不出現在 mobile bundle。
- AI 回傳必須通過 JSON Schema 與 Zod。
- AI 失敗時 App 不崩潰。
- AI 成本寫入 ai_usage_logs。
- 使用者看到繁體中文錯誤解釋。
