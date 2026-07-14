# Phase 8：管理後台與內容治理

## 交付範圍

- Next.js 內容營運總覽與 Supabase session gate。
- 課程與題目建立、修改、版本、送審及發布。
- reviewer 核准／退回工作區與版本快照檢視。
- 三種受約束題型的 AI 草稿生成與 generation job 紀錄。
- admin-only 操作紀錄與資料庫強制發布 audit。

## 角色矩陣

| 操作                 | learner | content_editor | reviewer | admin |
| -------------------- | ------- | -------------- | -------- | ----- |
| 讀取未發布內容與版本 | 否      | 是             | 是       | 是    |
| 建立／修改草稿       | 否      | 是             | 否       | 是    |
| 送出審核             | 否      | 是             | 否       | 是    |
| 核准／退回           | 否      | 否             | 是       | 是    |
| AI 生成草稿          | 否      | 是             | 否       | 是    |
| 發布與查看 audit     | 否      | 否             | 否       | 是    |

## 資料與交易邊界

- `content_versions` 保存課程 row 或包含 options/answer 的完整題目快照；同一 entity/version 唯一且不覆寫。
- `content_reviews` 指向確切 content version；內容改版會將舊 pending review 標成 superseded。
- `admin_save_course` 與 `admin_save_exercise` 進行 expected-version optimistic locking，保存後狀態回到 draft。
- `admin_submit_content_review`、`admin_review_content`、`admin_publish_content` 分別驗證 editor、reviewer、admin 角色。
- 發布 RPC 與 trigger 都要求相同版本的 approved review；trigger 對 courses、units、lessons、activities、exercises 寫入 `content.published`。

## AI 草稿

- API：`POST /admin/ai/exercise-drafts`。
- 支援 `multiple_choice`、`fill_blank`、`error_correction`。
- request 只接受可信 activity、CEFR、skill code、topic 與編輯限制。
- provider output 不包含資料庫 ID、status、review decision 或發布欄位。
- JSON Schema、Zod、題型一致性、語言與禁止內容檢查失敗時最多重試一次，仍失敗只保存 job error。
- 成功時由後端產生 UUID、答案與 grading policy，service-only RPC 固定寫入 `ai_generated`、`draft`、`requiresHumanReview=true`。

## 本機驗證

```powershell
pnpm supabase:reset
pnpm dev:api
pnpm --filter @deutschtrainer/api verify:admin:local
pnpm --filter @deutschtrainer/admin typecheck
pnpm --filter @deutschtrainer/admin build
```

整合腳本建立四個臨時角色，驗證未授權路徑、課程與 AI 題目的完整審核發布流程、AI 冪等重播、usage log、audit actor 與測試資料清理。測試不依賴真實 OpenAI 呼叫。

## 發行前檢查

- production 必須設定 admin 的 Supabase URL／anon key 與 API base URL；service-role/OpenAI key 只存在 API runtime。
- 建立首位 admin 需透過可信後端或資料庫管理流程，不提供公開自助升權。
- 真實 OpenAI 模型需以受審核資料集抽查德文自然度、CEFR 與答案唯一性；任何模型產物仍須人工核准。
