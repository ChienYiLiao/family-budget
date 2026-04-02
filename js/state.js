/**
 * state.js — 全域狀態管理
 */

const State = (() => {
  let _state = {
    currentUser: null,       // { userId, displayName, avatarUrl }
    currentPage: 'dashboard',
    isLoading: false,
    dashboardData: null,
    transactionsCache: {},   // key: 'YYYY-MM', value: []
    recurringData: null,
    statsData: null,
    pendingTxn: null,        // 收據掃描後暫存，傳給新增表單預填
  };

  const _listeners = [];

  function getState() { return _state; }

  function setState(patch) {
    _state = { ..._state, ...patch };
    _listeners.forEach(fn => fn(_state));
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return () => {
      const idx = _listeners.indexOf(fn);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }

  // ── 使用者持久化 ────────────────────────────────────────────────────────────
  function saveUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setState({ currentUser: user });
  }

  function loadUser() {
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        const user = JSON.parse(saved);
        setState({ currentUser: user });
        return user;
      }
    } catch(_) {}
    return null;
  }

  function clearUser() {
    localStorage.removeItem('currentUser');
    setState({ currentUser: null });
  }

  // ── Avatar 快取 ─────────────────────────────────────────────────────────────
  function saveAvatarCache(userId, url) {
    localStorage.setItem(`avatar_${userId}`, url);
  }

  function getAvatarCache(userId) {
    return localStorage.getItem(`avatar_${userId}`) || null;
  }

  // ── Transaction 快取清除 ────────────────────────────────────────────────────
  function invalidateTransactionCache(ym) {
    if (ym) {
      const cache = { ..._state.transactionsCache };
      delete cache[ym];
      setState({ transactionsCache: cache });
    } else {
      setState({ transactionsCache: {} });
    }
  }

  return {
    getState,
    setState,
    subscribe,
    saveUser,
    loadUser,
    clearUser,
    saveAvatarCache,
    getAvatarCache,
    invalidateTransactionCache
  };
})();
