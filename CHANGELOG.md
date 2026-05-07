# CHANGELOG — 薯條幫帳本

所有重大變更記錄於此。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

---

## [v1.2.0] — 2026-05-07

### Bug Fixes
- **固定收支重複記帳修復**：`Recurring.gs` `handleApplyRecurring` 新增「當月同類別已有交易則跳過」檢查，防止與匯入資料或手動記帳重複
- **快速記帳重複修復**：`add-transaction.js` `_quickRecord()` 改為先查詢當月同類別是否已記帳，有則更新金額，無則新增
- **`last_applied_month` 補寫**：跳過已存在記帳時仍更新 `last_applied_month`，避免下次重複判斷

### Features
- **Dashboard 每日自動套用**：新增 `_autoApplyOnce()` — 每天首次開啟 Dashboard 時靜默呼叫 `applyRecurring`（以 `localStorage['lastApplyDate']` 防重複）
- **歷史記錄每日標題顯示收入**：`history.js` `_renderList()` 每日 header 改為同時顯示支出（紅）與收入（綠），若僅有其一則單獨顯示
- **使用說明書更新**：修正「固定收支」與「歷史記錄」兩節描述以符合實際功能

### Internal Tools (GAS)
- 新增 `ImportData.gs` `diagApril()` — 輸出指定月所有交易供診斷
- 新增 `ImportData.gs` `fixDuplicateRecurring(targetYm)` — 一次性清理歷史重複固定收支（以備忘前綴 `固定收入：`/`固定支出：` 識別自動入帳，同類別保留手動，刪除自動）

---

## [v1.0.0] — 2026-01 (Initial Release)

### Features
- 手動記帳（支出 / 收入，類別、支付方式、日期、備註、店家名稱）
- 個人 / 共同記帳切換
- 掃描收據（Google AI Studio Gemini 辨識金額、店名、日期與品項，一鍵帶入表單）
- 固定收支管理（新增、啟用/停用、刪除；每月最後一天 23:00 GAS Trigger 自動入帳）
- 固定收支快速記帳 Tab（金額可修改，標示可調整金額類別）
- 歷史記錄（月份切換、類型/類別篩選、詳情查看、刪除）
- Dashboard 摘要（本月支出/收入/結餘、今日支出/收入）
- 支出類別圓餅圖（Top 5）& 每日支出長條圖
- 統計分析（豬豬/滾滾/共同收支對比、月趨勢、支付方式佔比、類別排名、Top 10 消費）
- 排除房貸/房租、排除固定收支項目篩選
- 月報表匯出至 Google Sheets（可選月份範圍）
- 頭像自訂（登入畫面長按頭像，相機拍攝或相簿選取，Cropper.js 裁切）
- Google Sheets 作為資料庫（Users / Transactions / Recurring / ReceiptLog）
