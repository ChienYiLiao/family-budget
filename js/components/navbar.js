/**
 * navbar.js — 底部導覽列
 */

const Navbar = {
  render() {
    const el = document.getElementById('navbar');
    if (!el) return;
    el.innerHTML = `
      <a class="navbar-item" data-route="dashboard" href="#dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>首頁</span>
      </a>
      <a class="navbar-item" data-route="history" href="#history">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
        <span>記錄</span>
      </a>
      <a class="navbar-add-btn" data-route="add" href="#add">
        <div class="add-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span>記帳</span>
      </a>
      <a class="navbar-item" data-route="stats" href="#stats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <span>統計</span>
      </a>
      <a class="navbar-item" data-route="recurring" href="#recurring">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
          <path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
        </svg>
        <span>固定</span>
      </a>
    `;
  }
};
