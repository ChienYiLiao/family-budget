/**
 * history.js — 歷史記錄頁面
 */

const HistoryPage = (() => {
  const PAGE_ID = 'page-history';
  let _year, _month;
  let _filterCategory = '';
  let _filterType = '';
  let _allTxns = [];

  function show() {
    const now = new Date();
    _year  = now.getFullYear();
    _month = now.getMonth() + 1;
    _filterCategory = '';
    _filterType = '';
    _render();
    _loadData();
  }

  function hide() {}

  function _render() {
    const page = document.getElementById(PAGE_ID);
    page.innerHTML = `
      <!-- 月份導航 -->
      <div class="month-nav" style="margin-bottom:16px;">
        <button class="month-nav-btn" onclick="HistoryPage._prevMonth()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="month-nav-label" id="hist-month-label">${_year} / ${String(_month).padStart(2,'0')}</div>
        <button class="month-nav-btn" onclick="HistoryPage._nextMonth()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- 月份摘要 -->
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div class="stat-card" style="flex:1;">
          <div class="stat-label">支出</div>
          <div class="stat-value amount-expense" id="hist-expense">—</div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-label">收入</div>
          <div class="stat-value amount-income" id="hist-income">—</div>
        </div>
      </div>

      <!-- 篩選 -->
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <select class="form-input" id="hist-filter-type" style="flex:1;min-width:80px;padding:8px 12px;"
                onchange="HistoryPage._applyFilter()">
          <option value="">全部類型</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <select class="form-input" id="hist-filter-cat" style="flex:2;min-width:120px;padding:8px 12px;"
                onchange="HistoryPage._applyFilter()">
          <option value="">全部類別</option>
          ${CONFIG.EXPENSE_CATEGORIES.map(c=>`<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('')}
          ${CONFIG.INCOME_CATEGORIES.map(c=>`<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>

      <!-- 記帳列表 -->
      <div id="hist-list"></div>
    `;
  }

  async function _loadData() {
    try {
      const result = await API.getTransactions({ year: _year, month: _month });
      _allTxns = result.transactions || [];
      _applyFilter();
    } catch(err) {
      Toast.error('載入失敗：' + err.message);
    }
  }

  function _applyFilter() {
    const typeEl = document.getElementById('hist-filter-type');
    const catEl  = document.getElementById('hist-filter-cat');
    _filterType     = typeEl ? typeEl.value : '';
    _filterCategory = catEl  ? catEl.value  : '';

    let txns = [..._allTxns];
    if (_filterType)     txns = txns.filter(t => t.type === _filterType);
    if (_filterCategory) txns = txns.filter(t => t.category === _filterCategory);

    // 更新月份摘要
    const expense = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const income  = txns.filter(t=>t.type==='income' ).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const eEl = document.getElementById('hist-expense');
    const iEl = document.getElementById('hist-income');
    if (eEl) eEl.textContent = Utils.formatAmount(expense);
    if (iEl) iEl.textContent = Utils.formatAmount(income);

    _renderList(txns);
  }

  function _renderList(txns) {
    const el = document.getElementById('hist-list');
    if (!el) return;
    if (!txns.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">本月尚無記錄</div></div>`;
      return;
    }

    // 按日期分組
    const groups = {};
    txns.forEach(t => {
      const d = t.date || '未知日期';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    el.innerHTML = Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, items]) => {
      const dayExpense = items.filter(t=>t.type==='expense').reduce((s,t)=>s+(Number(t.amount)||0),0);
      return `
        <div class="date-group-header">
          <div class="date-group-label">${Utils.formatDate(date, 'long')}</div>
          ${dayExpense > 0 ? `<div class="date-group-total">-${Utils.formatAmount(dayExpense)}</div>` : ''}
        </div>
        <div class="txn-list" style="margin-bottom:12px;">
          ${items.map(t => _renderTxnItem(t)).join('')}
        </div>
      `;
    }).join('');
  }

  function _renderTxnItem(t) {
    const emoji = CONFIG.getCategoryEmoji(t.category);
    const isExpense = t.type === 'expense';
    const user = CONFIG.USERS[t.user_id];
    const userEmoji = user ? user.emoji : '👤';
    const payLabel = CONFIG.getPaymentLabel(t.payment_method);
    return `
      <div class="txn-item" onclick="HistoryPage._openDetail('${t.transaction_id}')">
        <div class="txn-cat-icon">${emoji}</div>
        <div class="txn-info">
          <div class="txn-category">${t.category || '其他'}</div>
          <div class="txn-note">${t.note || t.merchant_name || payLabel}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount ${isExpense ? 'expense' : 'income'}">
            ${isExpense ? '-' : '+'}${Utils.formatAmount(t.amount)}
          </div>
          <div class="txn-meta">${userEmoji} ${payLabel}</div>
        </div>
      </div>
    `;
  }

  function _openDetail(id) {
    const t = _allTxns.find(x => x.transaction_id === id);
    if (!t) return;
    const emoji = CONFIG.getCategoryEmoji(t.category);
    const isExpense = t.type === 'expense';

    let overlay = document.getElementById('txn-detail-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'txn-detail-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
      overlay.onclick = e => { if(e.target === overlay) Modal.hide('txn-detail-overlay'); };
    }

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:40px;">${emoji}</div>
          <div style="font-size:28px;font-weight:800;color:${isExpense?'var(--color-expense)':'var(--color-income)'};">
            ${isExpense?'-':'+'}${Utils.formatAmount(t.amount)}
          </div>
          <div style="font-size:14px;color:var(--color-text-muted);margin-top:4px;">${t.category}</div>
        </div>
        ${_detailRow('日期', Utils.formatDate(t.date, 'long'))}
        ${_detailRow('支付方式', CONFIG.getPaymentEmoji(t.payment_method) + ' ' + CONFIG.getPaymentLabel(t.payment_method))}
        ${t.note ? _detailRow('備註', t.note) : ''}
        ${t.merchant_name ? _detailRow('店家', t.merchant_name) : ''}
        ${_detailRow('來源', t.receipt_source === 'receipt_scan' ? '📷 收據掃描' : t.receipt_source === 'recurring' ? '🔁 固定收支' : '✏️ 手動記帳')}
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn btn-secondary btn-block" onclick="Modal.hide('txn-detail-overlay')">關閉</button>
          <button class="btn btn-danger btn-block" onclick="HistoryPage._deleteTxn('${id}')">刪除</button>
        </div>
      </div>
    `;
    Modal.show('txn-detail-overlay');
  }

  function _detailRow(label, value) {
    return `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border);">
        <span style="color:var(--color-text-muted);font-size:14px;">${label}</span>
        <span style="font-weight:600;font-size:14px;">${value}</span>
      </div>
    `;
  }

  async function _deleteTxn(id) {
    const ok = await Modal.confirm('確定要刪除此記帳？', { danger: true, confirmText: '刪除' });
    if (!ok) return;
    Modal.hide('txn-detail-overlay');
    Loader.show('刪除中...');
    try {
      await API.deleteTransaction(id);
      State.invalidateTransactionCache();
      Toast.success('已刪除');
      await _loadData();
    } catch(err) {
      Toast.error('刪除失敗');
    } finally {
      Loader.hide();
    }
  }

  function _prevMonth() {
    const p = Utils.prevMonth(_year, _month);
    _year = p.year; _month = p.month;
    _updateMonthLabel();
    _loadData();
  }

  function _nextMonth() {
    const now = new Date();
    if (_year >= now.getFullYear() && _month >= now.getMonth()+1) return;
    const n = Utils.nextMonth(_year, _month);
    _year = n.year; _month = n.month;
    _updateMonthLabel();
    _loadData();
  }

  function _updateMonthLabel() {
    const el = document.getElementById('hist-month-label');
    if (el) el.textContent = `${_year} / ${String(_month).padStart(2,'0')}`;
  }

  return { show, hide, _prevMonth, _nextMonth, _applyFilter, _openDetail, _deleteTxn };
})();
