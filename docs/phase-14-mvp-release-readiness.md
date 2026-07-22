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
- iOS build number／Android version code：`1`
- App version：`0.1.0`
- `apps/mobile/eas.json` 提供：
  - `preview`：internal distribution；Android 產生可直接安裝的 APK。
  - `production`：使用 store distribution 預設輸出。
- App icon、splash 及 Web favicon 共用專案內的正式圖示資產。

依 Expo 的 monorepo 規則，所有 EAS 指令從 `apps/mobile` 執行，`eas.json` 也保存在該目錄：

```powershell
cd apps/mobile
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest config --platform android --profile preview --non-interactive
pnpm dlx eas-cli@latest build --platform android --profile preview
```

首次 `init` 會建立或連結 Expo project，並將 project ID 寫入 app config。這是 Expo 帳號層級的外部操作，不在無帳號的本機驗證中假裝完成。

Production／連線式 preview build 必須在 EAS environment 提供：

- `EXPO_PUBLIC_CONTENT_SOURCE=api`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

OpenAI 與 Supabase service-role key 不得出現在 Mobile 或 EAS public variables。

## 原生 smoke flow

`apps/mobile/.maestro/guest-smoke.yaml` 不需要登入資料，覆蓋：

1. 清除 App state 並啟動。
2. 顯示訪客歡迎頁。
3. 進入登入頁。
4. 開啟忘記密碼頁。
5. 返回登入頁。

安裝 preview build 並連接 Android／iOS 裝置後執行：

```powershell
cd apps/mobile
maestro test .maestro/guest-smoke.yaml
```

## 驗收證據

- 乾淨 Supabase reset 可重建 Phase 1–13 migrations 與 Phase 14 release seed。
- Database 實測 100 題全部為 human／approved／published，且 100 題都有答案。
- Expo config、EAS schema、Expo Doctor、Web export、Admin build、repository quality gates 需全數通過。
- 原生 guest flow 已版本化；實際 Android/iOS 執行仍需具備 Java/Android SDK、macOS/iOS simulator 或實體裝置的環境完成。

## 官方參考

- [Expo EAS Build](https://docs.expo.dev/build/)
- [EAS build configuration](https://docs.expo.dev/build/eas-json/)
- [Expo monorepo build setup](https://docs.expo.dev/build-reference/build-with-monorepos/)
