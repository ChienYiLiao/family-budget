# 部署設定指南

## 步驟一：建立 Google Sheets

1. 到 [Google Sheets](https://sheets.google.com) 建立新試算表，命名「家庭記帳本」
2. 記錄 URL 中的 Spreadsheet ID（`/d/` 和 `/edit` 之間的字串）

## 步驟二：建立 Google Drive 資料夾

1. 在 Google Drive 新增資料夾「FamilyBudgetAvatars」
2. 右鍵 → 共用 → 改為「知道連結的人可以查看」
3. 記錄資料夾 URL 中的 Folder ID

## 步驟三：申請 API 金鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案「FamilyBudget」
3. 啟用「Cloud Vision API」
4. 啟用「Generative Language API」（Gemini）
5. 建立 API 金鑰（API & Services → Credentials → Create API Key）
6. 建議限制 API 金鑰只允許 Vision + Generative Language API

## 步驟四：部署 Google Apps Script

1. 在剛建立的 Google Sheets → 擴充功能 → Apps Script
2. 刪除預設的 `myFunction`
3. 依序建立以下 .gs 檔案，並貼入 gas/ 目錄中的對應程式碼：
   - `Code.gs`
   - `Sheets.gs`
   - `Utils.gs`
   - `Auth.gs`
   - `Transactions.gs`
   - `Recurring.gs`
   - `Receipt.gs`
   - `Dashboard.gs`
   - `Stats.gs`
4. 設定 Script Properties（專案設定 → 指令碼屬性）：
   - `SPREADSHEET_ID`：步驟一的 Spreadsheet ID
   - `DRIVE_FOLDER_ID`：步驟二的 Folder ID
   - `VISION_API_KEY`：步驟三的 API 金鑰
   - `GEMINI_API_KEY`：步驟三的 API 金鑰（可與 Vision 用同一把）
5. 手動執行一次 `initAllSheets()` 函式（初始化 Sheet 結構與預設使用者）
6. 部署 → 管理部署 → 新增部署：
   - 類型：網頁應用程式
   - 執行身分：我
   - 存取權：任何人（含匿名使用者）
7. 複製產生的 URL

## 步驟五：設定前端

1. 開啟 `js/config.js`
2. 將 `GAS_URL` 改為步驟四取得的 URL：
   ```javascript
   GAS_URL: 'https://script.google.com/macros/s/YOUR_ACTUAL_ID/exec',
   ```
3. 放置豬豬、滾滾的頭像圖片到 `assets/default-avatars/`：
   - `pigpig.png`
   - `gungun.png`

## 步驟六：部署至 GitHub Pages

```bash
# 在 family-budget 目錄
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/family-budget.git
git push -u origin main
```

然後在 GitHub → Settings → Pages → Source 選 `main` branch。

網址會是：`https://YOUR_USERNAME.github.io/family-budget/`

## 更新 GAS 程式碼

修改 .gs 後：
- Apps Script → 部署 → 管理部署 → 編輯（鉛筆圖示）
- 版本選「新版本」
- 部署

> 注意：更新版本後 URL 不變，但程式碼會更新。
