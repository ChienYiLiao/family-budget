/**
 * Code.gs — GAS Web App 主路由
 *
 * 部署設定：
 * - 執行身分：我（帳戶擁有者）
 * - 存取權：任何人（含匿名）
 *
 * Script Properties 需設定：
 * - SPREADSHEET_ID: Google Sheets ID
 * - DRIVE_FOLDER_ID: 頭像存放的 Drive 資料夾 ID
 * - VISION_API_KEY: Google Cloud Vision API Key
 * - GEMINI_API_KEY: Gemini API Key
 *
 * 推送機制（參考 tokyo-expense 已驗證方案）：
 * 前端寫入一律用 GET + ?payload=JSON，避免瀏覽器跟隨 GAS 302 轉址時 POST→GET 問題。
 * doGet 偵測到 payload 參數後進入 handleAction，與 doPost 共用邏輯。
 */

// ── GET ────────────────────────────────────────────────────────────────────────
function doGet(e) {
  // 寫入操作：前端用 GET + payload 參數
  if (e.parameter && e.parameter.payload) {
    let body;
    try { body = JSON.parse(e.parameter.payload); }
    catch(_) { return jsonRes({ ok: false, error: 'Invalid payload JSON' }); }
    return handleAction(body);
  }

  // 讀取操作
  const action = (e.parameter && e.parameter.action) || '';
  try {
    switch (action) {
      case 'getUsers':        return jsonRes({ ok: true, data: handleGetUsers(e.parameter) });
      case 'getTransactions': return jsonRes({ ok: true, data: handleGetTransactions(e.parameter) });
      case 'getDashboard':    return jsonRes({ ok: true, data: handleGetDashboard(e.parameter) });
      case 'getRecurring':    return jsonRes({ ok: true, data: handleGetRecurring(e.parameter) });
      case 'getStats':        return jsonRes({ ok: true, data: handleGetStats(e.parameter) });
      default:                return jsonRes({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch(err) {
    return jsonRes({ ok: false, error: err.message });
  }
}

// ── POST (備用) ────────────────────────────────────────────────────────────────
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(_) { return jsonRes({ ok: false, error: 'Invalid JSON' }); }
  return handleAction(body);
}

// ── 共用 action 處理 ───────────────────────────────────────────────────────────
function handleAction(body) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const action = body.action;
    switch (action) {
      case 'updateAvatar':      return jsonRes({ ok: true, data: handleUpdateAvatar(body) });
      case 'addTransaction':    return jsonRes({ ok: true, data: handleAddTransaction(body) });
      case 'updateTransaction': return jsonRes({ ok: true, data: handleUpdateTransaction(body) });
      case 'deleteTransaction': return jsonRes({ ok: true, data: handleDeleteTransaction(body) });
      case 'addRecurring':      return jsonRes({ ok: true, data: handleAddRecurring(body) });
      case 'updateRecurring':   return jsonRes({ ok: true, data: handleUpdateRecurring(body) });
      case 'deleteRecurring':   return jsonRes({ ok: true, data: handleDeleteRecurring(body) });
      case 'toggleRecurring':   return jsonRes({ ok: true, data: handleToggleRecurring(body) });
      case 'applyRecurring':    return jsonRes({ ok: true, data: handleApplyRecurring(body) });
      case 'scanReceipt':       return jsonRes({ ok: true, data: handleScanReceipt(body) });
      default:                  return jsonRes({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch(err) {
    return jsonRes({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}
