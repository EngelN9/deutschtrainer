# Phase 14：MVP 發行就緒

## 目標

Phase 14 將既有 Phase 1–13 功能整理成可交付的第一階段 MVP，不新增付款、社交、排行榜、即時多人或完整即時 AI 對話。此階段補齊內容數量、原生 App 識別、EAS build profiles、無 secrets 的內容驗證及第一條原生 guest smoke flow。

## 內容門檻

本機 seed 現在包含 100 題 `human`／`approved`／`published` Exercise：

| CEFR | 題數 |
| ---- | ---: |
| B1   |   50 |
| B2   |   25 |
| C1   |   13 |
| C2   |   12 |

每題皆有 `exercise_answers` row，並保留既有八種題型。新增的 46 題集中在填空、排序與改錯，補強既有九堂課的句法、搭配、正式語域、論證、學術摘要與反諷辨識。

`pnpm --filter @deutschtrainer/api verify:content-readiness:local` 會驗證精確總數、程度分布、八種題型至少各兩題，以及每題均有答案資料。

## 原生發行設定

- iOS bundle identifier 與 Android application ID：`com.deutschtrainer.app`
- iOS build number／Android version code：`3`
- App version：`0.1.1`
- `apps/mobile/eas.json` 提供：
  - `preview`：internal distribution；Android 產生可直接安裝的 APK。
  - `staging`：internal distribution；使用 EAS `preview` environment、API content source
    與 production-equivalent remote HTTPS fail-fast。
  - `production`：使用 store distribution 預設輸出、production EAS environment，並固定
    `EXPO_PUBLIC_CONTENT_SOURCE=api`。
- App icon、splash 及 Web favicon 共用專案內的正式圖示資產。
- Phase 14 第一個 preview 明確使用 `EXPO_PUBLIC_CONTENT_SOURCE=mock`；不把 `localhost` 誤當成可交付的遠端服務。

依 Expo 的 monorepo 規則，所有 EAS 指令從 `apps/mobile` 執行，`eas.json` 也保存在該目錄：

```powershell
cd apps/mobile
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest config --platform android --profile preview --non-interactive
pnpm dlx eas-cli@latest build --platform android --profile preview
pnpm dlx eas-cli@latest config --platform android --profile staging --non-interactive
pnpm dlx eas-cli@latest build --platform android --profile staging
```

目前 app config 已有 Expo project ID。重新連結 project、建立 EAS build 或查閱遠端 build
仍是 Expo 帳號層級的外部操作，不在無帳號的本機驗證中假裝完成。

Production／連線式 preview build 必須在 EAS environment 提供：

- `EXPO_PUBLIC_CONTENT_SOURCE=api`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

OpenAI 與 Supabase service-role key 不得出現在 Mobile 或 EAS public variables。
`app.config.ts` 在 production profile 對缺少的 public API/Supabase 設定、localhost、
非 HTTPS URL、placeholder anon key 或非 API content source fail fast。此檢查只證明
build-time contract，不代表遠端服務已驗收。

## 原生 smoke flow

`apps/mobile/.maestro/guest-smoke.yaml` 不需要登入資料，覆蓋：

1. 清除 App state 並啟動。
2. 顯示訪客歡迎頁。
3. 確認 Preview 沒有 connected 註冊／登入入口。
4. 進入離線 Demo，走完一題固定課程。
5. 重新啟動後確認 Demo session 保留。
6. 從四項主要導覽進入「聽說」，確認固定 Listening D1 可達。

註冊、登入與忘記密碼改由 `staging` connected smoke 驗證；Preview 的 auth route deep link
只可顯示需要 Staging 連線版的說明，不得呼叫 Supabase。

安裝 preview build 並連接 Android／iOS 裝置後執行：

```powershell
cd apps/mobile
maestro test .maestro/guest-smoke.yaml
```

通過實機 smoke 後，使用與當次 `version`、build number、commit SHA 一致且未被占用的
preview tag 建立 GitHub pre-release，附上 APK 與 SHA-256 checksum。既有歷史 tag 或
歷史 EAS build 不自動證明目前 revision；EAS build 頁面保留為建置來源與診斷證據，
GitHub Release 作為 preview 成品的主要交付位置。

## 驗收證據

- 乾淨 Supabase reset 必須可重建全部 append-only migrations 與 Phase 14 release seed。
- Database 實測 100 題全部為 human／approved／published，且 100 題都有答案。
- Expo config、EAS schema、Expo Doctor、Web export、Admin build、repository quality gates 需全數通過。
- 原生 guest flow 已版本化；實際 Android/iOS 執行仍需具備 Java/Android SDK、macOS/iOS simulator 或實體裝置的環境完成。
- 歷史 device claim 不自動適用於目前 `0.1.1`／build `3`；release evidence 必須記錄
  當次裝置、OS、app/build ID、流程、結果及 log／截圖。

## 官方參考

- [Expo EAS Build](https://docs.expo.dev/build/)
- [EAS build configuration](https://docs.expo.dev/build/eas-json/)
- [Expo monorepo build setup](https://docs.expo.dev/build-reference/build-with-monorepos/)
