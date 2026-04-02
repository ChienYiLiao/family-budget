/**
 * Utils.gs — GAS 端工具函式
 */

/**
 * 統一 JSON 回應格式
 */
function jsonRes(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 產生唯一 ID
 * @param {string} prefix - 前綴，如 'txn', 'rec', 'rcpt'
 */
function generateId(prefix) {
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * 取得今日日期字串 YYYY-MM-DD
 */
function todayStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * 取得當前 ISO 時間字串
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 取得年月字串 YYYY-MM
 */
function yearMonthStr(date) {
  const d = date || new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
}

/**
 * 安全解析 JSON，失敗回傳 null
 */
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch(_) { return null; }
}

/**
 * 從 Script Properties 取得設定值
 */
function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}
