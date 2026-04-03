/**
 * api.js — GAS API 呼叫封裝層
 *
 * 一般寫入：GET + ?payload=JSON（tokyo-expense 已驗證，避免 302 轉址問題）
 * 圖片上傳：POST + Content-Type:text/plain（base64 太大，GET URL 有長度限制）
 */

const API = (() => {
  function _url(params) {
    const qs = new URLSearchParams(params).toString();
    return `${CONFIG.GAS_URL}?${qs}`;
  }

  /** 讀取：GET + query params */
  async function get(action, params = {}) {
    const url = _url({ action, ...params });
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API Error');
    return data.data;
  }

  /** 一般寫入：GET + payload（tokyo-expense 方案，避免 302 轉址） */
  async function write(action, body = {}) {
    const payload = JSON.stringify({ action, ...body });
    const url = _url({ payload });
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API Error');
    return data.data;
  }

  /**
   * 圖片上傳：真正的 POST（base64 太大，超過 URL 長度限制，必須用 POST body）
   * Content-Type 設為 text/plain 避免 CORS preflight（GAS 不支援自訂 response header）
   */
  async function post(action, body = {}) {
    const payload = JSON.stringify({ action, ...body });
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API Error');
    return data.data;
  }

  return {
    // ── 使用者 ──────────────────────────────────────────────────────────────
    getUsers() {
      return get('getUsers');
    },
    // 頭像包含大型 base64 → 改用 POST
    updateAvatar(userId, base64, mimeType) {
      return post('updateAvatar', { userId, imageBase64: base64, mimeType });
    },

    // ── 收支 ────────────────────────────────────────────────────────────────
    getTransactions(params = {}) {
      return get('getTransactions', params);
    },
    addTransaction(data) {
      return write('addTransaction', data);
    },
    updateTransaction(id, patch) {
      return write('updateTransaction', { transaction_id: id, ...patch });
    },
    deleteTransaction(id) {
      return write('deleteTransaction', { transaction_id: id });
    },

    // ── 固定收支 ────────────────────────────────────────────────────────────
    getRecurring(userId) {
      return get('getRecurring', userId ? { userId } : {});
    },
    addRecurring(data) {
      return write('addRecurring', data);
    },
    updateRecurring(id, patch) {
      return write('updateRecurring', { recurring_id: id, ...patch });
    },
    deleteRecurring(id) {
      return write('deleteRecurring', { recurring_id: id });
    },
    toggleRecurring(id, isActive) {
      return write('toggleRecurring', { recurring_id: id, is_active: isActive });
    },
    applyRecurring(year, month) {
      return write('applyRecurring', { year, month });
    },

    // ── Dashboard ───────────────────────────────────────────────────────────
    getDashboard(year, month) {
      return get('getDashboard', { year, month });
    },

    // ── 統計 ────────────────────────────────────────────────────────────────
    getStats(params = {}) {
      return get('getStats', params);
    },

    // ── 統計 ────────────────────────────────────────────────────────────────
    generateMonthlyReport() {
      return write('generateMonthlyReport', {});
    },

    // ── 收據掃描：圖片 base64 → 改用 POST ──────────────────────────────────
    scanReceipt(userId, base64, mimeType) {
      return post('scanReceipt', { user_id: userId, imageBase64: base64, mimeType });
    }
  };
})();
