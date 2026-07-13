# Testing Strategy

## 1. 測試原則

- 不在沒有測試的情況下宣稱功能完成。
- 核心商業邏輯不得只靠 E2E 測試。
- AI 輸出解析與錯誤處理必須有固定樣本測試。
- 每個開發階段需有可量測驗收條件。

## 2. 單元測試

工具：Jest。

測試範圍：

- 答案正規化。
- 固定題型評分。
- 掌握度計算。
- 複習排程。
- Zod schema。
- AI 回傳解析。
- 權限判斷。
- 成本計算。

預期位置：

- `packages/grading`
- `packages/learning-engine`
- `packages/validation`
- `packages/ai-schemas`

## 3. 元件測試

工具：Jest + React Native Testing Library。

測試範圍：

- 題目元件。
- 表單驗證。
- loading、empty、error、retry 狀態。
- accessibilityLabel。
- 作答互動。
- 德語長字不破版的基本案例。

## 4. 整合測試

測試流程：

- 登入。
- 課程載入。
- 提交答案。
- 更新進度。
- 建立複習項目。
- 提交作文。
- AI 回饋成功與失敗流程。

應使用測試資料庫或 Supabase local，避免污染正式資料。

## 5. E2E 測試

工具：Maestro 或 Detox，MVP 至少覆蓋：

1. 使用者註冊。
2. 選擇 B1 程度。
3. 開啟課程。
4. 完成五題。
5. 查看結果。
6. 錯題進入複習。
7. 登出及重新登入。
8. 確認進度仍存在。

## 6. AI 測試

- 使用固定 fixture 測試 schema valid 與 invalid。
- 測試 JSON parse 失敗。
- 測試缺欄位、未知 error type、超出 CEFR。
- 測試 retry 後成功。
- 測試 fallback 錯誤訊息。
- 不在測試中依賴真實 OpenAI 呼叫作為必要條件。

## 7. Accessibility 測試

- 按鈕與互動元素需有 accessibilityLabel。
- 圖表需有文字替代資訊。
- 錯誤狀態不只用顏色表達。
- 字體縮放後文字不應遮擋。
- 錄音狀態清楚可讀。

## 8. CI Gate

Phase 1 後 CI 至少執行：

```text
pnpm lint
pnpm typecheck
pnpm test
```

後續可加入 coverage、Supabase migration check、E2E smoke test。

## 9. Phase 0 文件檢查

本階段尚無可執行 app，因此驗收以文件存在、一致性檢查與規格覆蓋為主：

- 15 份指定文件存在。
- B1、B2、C1、C2 均被資料模型、內容模型、AI schema 支援。
- API、Exercise、DB、權限無明顯命名矛盾。
- MVP 排除排行榜、付款與社交系統。

## 10. Phase 5 可執行驗證

- API service unit tests 使用固定 provider/repository，不依賴真實 OpenAI 呼叫。
- `pnpm --filter @deutschtrainer/api verify:local` 使用兩個臨時 Supabase 使用者驗證批改、重播、快取、資料落庫、RLS 與 RPC 權限。
- Playwright Web smoke test 強制中斷一次 `/ai/evaluate-response`，確認回答保留及重試，之後驗證完整繁中 AI 回饋。
- 桌面及 390 px viewport 均檢查 `scrollWidth <= innerWidth + 1`。
