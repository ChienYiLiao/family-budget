/**
 * router.js — Hash-based 前端路由
 */

const Router = (() => {
  const _routes = {};
  let _current = null;
  let _isDirty = false;

  function register(hash, { onEnter, onLeave }) {
    _routes[hash] = { onEnter, onLeave };
  }

  function setDirty(dirty) {
    _isDirty = dirty;
  }

  function _getHash() {
    return window.location.hash.replace('#', '') || 'dashboard';
  }

  function navigate(hash, replace = false) {
    if (_isDirty) {
      const confirmed = window.confirm('資料尚未儲存，確定要離開嗎？');
      if (!confirmed) return;
      _isDirty = false;
    }
    if (replace) {
      window.location.replace(`#${hash}`);
    } else {
      window.location.hash = hash;
    }
  }

  function _handleRouteChange() {
    const hash = _getHash();
    if (hash === _current) return;

    // 1. 離開目前頁面
    if (_current && _routes[_current]?.onLeave) {
      _routes[_current].onLeave();
    }

    // 2. 隱藏所有頁面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // 3. 回到頂部
    const content = document.getElementById('main-content');
    if (content) content.scrollTop = 0;

    // 4. 顯示目標頁面
    const pageEl = document.getElementById(`page-${hash}`);
    if (pageEl) pageEl.classList.add('active');

    _current = hash;
    State.setState({ currentPage: hash });

    // 5. 進入新頁面
    if (_routes[hash]?.onEnter) {
      _routes[hash].onEnter();
    }

    _updateNavbar(hash);
    _updateTopbar(hash);
  }

  function _updateNavbar(hash) {
    document.querySelectorAll('.navbar-item, .navbar-add-btn').forEach(el => {
      el.classList.remove('active');
    });
    const active = document.querySelector(`[data-route="${hash}"]`);
    if (active) active.classList.add('active');
  }

  function _updateTopbar(hash) {
    const backBtn = document.getElementById('topbar-back');
    const titleEl = document.getElementById('topbar-title');
    const titles = {
      dashboard: '薯條幫記帳本',
      add:       '記帳',
      scan:      '掃描收據',
      recurring: '固定收支',
      history:   '歷史記錄',
      stats:     '統計分析'
    };
    if (titleEl) titleEl.textContent = titles[hash] || '';
    if (backBtn) {
      const showBack = ['add','scan'].includes(hash);
      backBtn.style.display = showBack ? 'flex' : 'none';
    }
  }

  function init() {
    window.addEventListener('hashchange', _handleRouteChange);
    _handleRouteChange();
  }

  function getCurrent() { return _current; }

  return { register, navigate, init, getCurrent, setDirty };
})();
