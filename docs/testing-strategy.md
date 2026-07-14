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
- 取得私有 TTS 音訊、提交聽寫、上傳／轉錄／刪除錄音。
- 以第二帳號驗證逐字稿、錄音、轉錄與刪除的隔離。

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
9. 送出作文第一稿並確認沒有完整範文。
10. 依行內錯誤重寫，確認第二稿範文與任選兩版比較。
11. 播放正常與慢速音訊、提交聽寫並確認字詞差異。
12. 拒絕麥克風權限並完成替代朗讀流程。
13. 錄音、預聽、轉錄、查看限制聲明並刪除錄音。

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

## 11. Phase 7 可執行驗證

- `pnpm --filter @deutschtrainer/api verify:audio:local` 使用兩個臨時使用者驗證 TTS、signed URL、聽力遙測、聽寫冪等、private upload、STT、RLS 與 owner deletion。
- deterministic audio provider 產生有效 WAV 與固定 word timings，不依賴真實 OpenAI 呼叫。
- 單元測試驗證德語 word diff、長停頓、發音限制聲明、cache hit 與 unavailable-provider fallback。
- Web 瀏覽器需巡檢桌面與 390 px viewport 的入口、聽力、口說權限替代及分析頁，並檢查無水平溢出。

## 12. Phase 8 可執行驗證

- `pnpm --filter @deutschtrainer/api verify:admin:local` 建立 learner、content_editor、reviewer、admin 四個臨時帳號。
- 驗證草稿保存、不可變版本、送審、核准、admin-only 發布、audit actor 與測試資料清理。
- 驗證 learner 看不到版本，editor 不可核准／直發，reviewer 不可發布，admin 不可發布未審 AI 草稿。
- deterministic content provider 不依賴真實 OpenAI；測試 schema invalid retry、quota、idempotency 與 draft-only persistence。
- Next production build 必須在缺少公開環境設定時仍可預渲染；執行時顯示設定狀態而非載入 server secret。
- 瀏覽器巡檢 1440 px 與 390 px 的登入、角色拒絕、六個工作區、長德文／UUID／JSON 及水平溢出。

## 13. Phase 9 可執行驗證

- `pnpm --filter @deutschtrainer/api verify:learning-api:local` 建立兩位臨時 learner。
- 驗證公開課程、level filter、course/lesson detail 與 cache header。
- 以錯誤答案驗證後端權威評分，再用正確答案重送相同 key 驗證原結果回放。
- 驗證 unauthenticated progress 401、跨帳號空進度、跨帳號 review 404。
- 驗證 review 完成、下一次排程及 authenticated 直接 RPC 404。
- 單元測試覆蓋未登入、未發布內容、authoritative grading、replay、owner review 與 rate limit。

## 14. Phase 10 可執行驗證

- `pnpm --filter @deutschtrainer/api verify:workspaces:local` 依序執行作文與聽說雙帳號整合測試。
- 作文驗證 API workspace 的兩個不可變版本、另一位使用者零筆資料、跨帳號刪除 `404`、owner 刪除與 metadata-only usage 保留。
- 聽說驗證 API 遙測、workspace owner filter、另一位使用者零筆 attempt/submission/audio metadata，以及 Storage RLS 與 owner deletion。
- authenticated 直接呼叫 `delete_own_writing_submission` 與 `record_listening_activity` 必須回傳 `403/404`。
- repository/service 單元測試驗證 owner profile 傳遞、workspace response、mutation response 與共用 rate limiter。
