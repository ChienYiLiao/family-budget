# CLAUDE.md — 薯條幫帳本開發規則

## 每次更新前必做

1. 閱讀 `CHANGELOG.md` 了解目前版本與歷史變更
2. 確認本次修改的影響範圍（前端 / GAS / 兩者都有）

## 每次更新後必做

1. 在 `CHANGELOG.md` 新增對應版本的變更記錄（版本號 + 日期 + 變更項目）
2. 若修改了功能邏輯，確認 `js/pages/dashboard.js` `_guideHTML()` 使用說明書是否需要同步更新
3. 前端變更：`git push` 至 GitHub Pages 完成部署
4. GAS 變更：提醒使用者至 Google Apps Script 手動重新部署（Deploy → Manage deployments → New version）

## 專案架構

| 層次 | 位置 | 說明 |
|------|------|------|
| 前端 | `family-budget/` | GitHub Pages 靜態部署 |
| 後端 | `family-budget/gas/` | Google Apps Script，作為 REST API |
| 資料 | Google Sheets | SPREADSHEET_ID 存於 GAS Script Properties |
| 圖床 | Google Drive | 頭像以 base64 存於 localStorage（不上傳後端）|

## 重要注意事項

- GAS 變更後**必須重新部署**，只改程式碼不部署不會生效
- `fixDuplicateRecurring()` 是一次性清理工具，執行前確認邏輯正確
- `_autoApplyOnce()` 以 `localStorage['lastApplyDate']` 防重複，清除 localStorage 可觸發重新套用
- 固定收支去重邏輯：`handleApplyRecurring` 以 `user_id + category + 年月` 判斷是否已存在
