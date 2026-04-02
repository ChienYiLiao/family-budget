/**
 * Sheets.gs — Google Sheets 操作封裝層
 * 所有 Sheet 讀寫透過此模組，統一處理 header、Date 格式等問題
 */

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

const SHEET_NAMES = {
  USERS: 'Users',
  TRANSACTIONS: 'Transactions',
  RECURRING: 'Recurring',
  RECEIPT_LOG: 'ReceiptLog'
};

const SHEET_HEADERS = {
  USERS: ['user_id','display_name','avatar_url','avatar_updated_at','created_at'],
  TRANSACTIONS: ['transaction_id','user_id','type','amount','category','payment_method','note','merchant_name','items','receipt_source','date','created_at'],
  RECURRING: ['recurring_id','user_id','type','category','name','amount','payment_method','day_of_month','is_active','last_applied_month','created_at','updated_at'],
  RECEIPT_LOG: ['log_id','user_id','raw_ocr_text','parsed_result','status','error_message','transaction_id','created_at']
};

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * 取得或建立 Sheet，並自動修復 header
 */
function getOrCreateSheet(sheetKey) {
  const name = SHEET_NAMES[sheetKey];
  const headers = SHEET_HEADERS[sheetKey];
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2d2d2d')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // 自動修復 header
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    const cur = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    if (cur.slice(0, headers.length).join(',') !== headers.join(',')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

/**
 * 讀取 Sheet 所有資料，轉成物件陣列（自動處理 Date 格式）
 */
function readAllRows(sheetKey) {
  const sheet = getOrCreateSheet(sheetKey);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0].map(String);
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return normalizeRow(obj);
  }).filter(r => r[headers[0]]); // 過濾空行
}

/**
 * 附加一列資料
 */
function appendRow(sheetKey, obj) {
  const sheet = getOrCreateSheet(sheetKey);
  const headers = SHEET_HEADERS[sheetKey];
  const row = headers.map(h => (obj[h] !== undefined && obj[h] !== null) ? obj[h] : '');
  sheet.appendRow(row);
}

/**
 * 更新符合條件的列（找第一個 primaryKey 欄位值符合的列）
 */
function updateRow(sheetKey, primaryKey, id, patch) {
  const sheet = getOrCreateSheet(sheetKey);
  const headers = SHEET_HEADERS[sheetKey];
  const pkIdx = headers.indexOf(primaryKey);
  if (pkIdx < 0) return false;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][pkIdx]) === String(id)) {
      patch.forEach ? null : null;
      Object.keys(patch).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx >= 0) sheet.getRange(i + 1, colIdx + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  return false;
}

/**
 * 刪除符合條件的列
 */
function deleteRow(sheetKey, primaryKey, id) {
  const sheet = getOrCreateSheet(sheetKey);
  const headers = SHEET_HEADERS[sheetKey];
  const pkIdx = headers.indexOf(primaryKey);
  if (pkIdx < 0) return false;
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][pkIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/**
 * 清除所有資料列（保留 header）
 */
function clearAllRows(sheetKey) {
  const sheet = getOrCreateSheet(sheetKey);
  const last = sheet.getLastRow();
  if (last > 1) sheet.deleteRows(2, last - 1);
}

/**
 * 正規化一列資料（處理 GAS 自動轉 Date 問題）
 */
function normalizeRow(obj) {
  const tz = Session.getScriptTimeZone();
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val instanceof Date) {
      if (key === 'date') {
        obj[key] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      } else if (key.endsWith('_at') || key === 'avatar_updated_at') {
        obj[key] = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss'Z'");
      } else {
        obj[key] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
    } else if (typeof val === 'number') {
      obj[key] = val;
    } else {
      obj[key] = String(val === null || val === undefined ? '' : val);
    }
  });
  return obj;
}

/**
 * 初始化所有 Sheet（可手動執行一次）
 */
function initAllSheets() {
  Object.keys(SHEET_NAMES).forEach(key => getOrCreateSheet(key));
  // 預填 Users 資料
  const users = readAllRows('USERS');
  const existingIds = users.map(u => u.user_id);
  const now = new Date().toISOString();
  if (!existingIds.includes('user_pigpig')) {
    appendRow('USERS', { user_id: 'user_pigpig', display_name: '豬豬', avatar_url: '', avatar_updated_at: now, created_at: now });
  }
  if (!existingIds.includes('user_gungun')) {
    appendRow('USERS', { user_id: 'user_gungun', display_name: '滾滾', avatar_url: '', avatar_updated_at: now, created_at: now });
  }
  Logger.log('✓ Sheets 初始化完成');
}
