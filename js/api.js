/**
 * api.js — GAS API 呼叫封裝層
 *
 * 推送方式（沿用 tokyo-expense 已驗證方案）：
 * 寫入操作一律用 GET + ?payload=JSON，避免瀏覽器跟隨 GAS 302 轉址時 POST→GET 問題。
 */

const API = (() => {
  function _url(params) {
    const qs = new URLSearchParams(params).toString();
    return `${CONFIG.GAS_URL}?${qs}`;
  }

  /**
   * 讀取操作：GET + query params
   */
  async function get(action, params = {}) {
    const url = _url({ action, ...params });
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API Error');
    return data.data;
  }

  /**
   * 寫入操作：GET + payload JSON（tokyo-expense 方案）
   */
  async function write(action, body = {}) {
    const payload = JSON.stringify({ action, ...body });
    const url = _url({ payload });
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API Error');
    return data.data;
  }

  return {
    // ── 使用者 ──────────────────────────────────────────────────────────────
    getUsers() {
      return get('getUsers');
    },
    updateAvatar(userId, base64, mimeType) {
      return write('updateAvatar', { userId, imageBase64: base64, mimeType });
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

    // ── 收據掃描 ────────────────────────────────────────────────────────────
    scanReceipt(userId, base64, mimeType) {
      return write('scanReceipt', { user_id: userId, imageBase64: base64, mimeType });
    }
  };
})();
