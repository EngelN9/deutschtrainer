---
name: ci-failure-triage
description: >-
  Diagnose DeutschTrainer CI failures by identifying the first genuine root
  cause, separating cascading errors, reproducing minimally, and defining the
  smallest fix and verification evidence. Use when GitHub Actions or an
  equivalent repository gate fails; do not use for broad release audits or
  implement fixes unless the user explicitly requests remediation.
---

# CI Failure Triage

## 目的

從第一個可行動失敗找出 root cause，區分後續連鎖錯誤、環境問題與真正 regression，提供最小重現、最小修正範圍與驗證證據。預設只診斷。

## 適用範圍

- `.github/workflows/ci.yml`
- `package.json`、各 workspace `package.json`、`pnpm-lock.yaml`
- lint/Prettier/TypeScript/Jest 設定
- API build/bundle、`apps/api/Dockerfile`
- Expo dependency check/Doctor、Android/Web export、Admin build
- CI log、check metadata 與相對應原始碼／測試

## 不適用情況

- CI 綠燈時的一般 code review、release readiness 或產品功能驗收。
- 未明確要求修正時，不編輯 workflow、程式、測試或 lockfile。
- 不得用 `continue-on-error`、刪測試、`.skip`、放寬 assertion 或移除 gate 作為修正。

## 前置檢查

1. 讀取 `AGENTS.md` 的測試與 CI 規則、`.github/workflows/ci.yml` 與失敗 job 的完整 log。
2. 記錄 commit SHA、branch/PR、runner、Node/pnpm 版本、job/step、第一個非零 exit。
3. 遮罩 secrets；不得要求或輸出完整 env、token、provider body。
4. 以 `git status --short` 保存工作樹基線，避免本機未提交變更污染重現。

## 執行步驟

1. 依 workflow 順序定位第一個失敗 step。區分 setup/install、format、lint、typecheck、test、API build/bundle、Docker、Expo、export、Admin build。
2. 向上檢查最早的 error，不把後續 module-not-found、missing artifact、cancelled job 或 timeout 當獨立 root cause。
3. 判斷類別：程式 regression、測試 assertion、manifest/lockfile、工具版本、外部 metadata/network、runner 資源、secret/permission、服務相依。
4. 使用 workflow 中完全相同的既有命令重現；先跑最小 command，再跑完整 step。例如根據失敗執行 `pnpm typecheck`、`pnpm test`、API build/bundle 或對應 workspace build。
5. 比對本機與 CI 的 Node 24、pnpm 11.7.0、frozen install、OS、cache 與環境差異。不得因本機通過就宣稱 CI 假失敗。
6. 將 primary failure、secondary/cascading failures、unrelated warnings 分開；對每項提供 log location、因果鏈與反證。
7. 定義最小修正範圍：受影響檔案、contract、需新增/更新的測試，以及不應碰的區域。除非使用者要求，停在診斷。
8. 修正後的必要驗證必須包含原始失敗命令及其上游／下游必要 gates；沒有新的 CI rerun 時標 `BLOCKED`，不得宣稱 CI 已恢復。

## 輸出格式

先輸出 `Root cause`：失敗 step、第一個錯誤、原因、證據、信心。接著列 `Cascading failures`、`Minimal reproduction`、`Minimal fix scope`、`Verification required`、`Blocked evidence`。命令需逐字列出並附 exit code。

## 判定規則

- `PASS`：triage 已以最小重現確認 root cause，並完成要求範圍內的驗證；若任務只要求診斷，代表診斷完成，不代表 CI 綠燈。
- `FAIL`：證據顯示 repository gate 真正失敗，或提出的修正無法通過原始重現。
- `BLOCKED`：log 不完整、無法取得相同 commit/artifact/service、外部 outage 未確認，或缺少 CI rerun。
- `NOT APPLICABLE`：某後續錯誤純屬 cancelled/cascade 或該 gate 未執行，並提供 workflow 證據。

## 完成條件

第一個 root cause、因果鏈、最小重現、修正邊界與驗證清單都明確；不得把連鎖錯誤列為多個根因，也不得在未 rerun 時聲稱 CI 通過。
