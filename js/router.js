/**
 * router.js — Hash-based 前端路由
 * 路由表：#dashboard, #add, #scan, #recurring, #history, #stats
 */

const Router = (() => {
  const _routes = {};
  let _current = null;
  let _isDirty = false;  // 表單是否有未儲存資料

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

    // 離開前
    if (_current && _routes[_current] && _routes[_current].onLeave) {
      _routes[_current].onLeave();
    }

    _current = hash;
    State.setState({ currentPage: hash });

    // 進入頁面
    if (_routes[hash] && _routes[hash].onEnter) {
      _routes[hash].onEnter();
    }

    // 更新 navbar 活躍狀態
    _updateNavbar(hash);

    // 更新 topbar（顯示/隱藏返回按鈕）
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
      dashboard: '記帳本',
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
    _handleRouteChange();  // 初始化
  }

  function getCurrent() { return _current; }

  return { register, navigate, init, getCurrent, setDirty };
})();
