/**
 * add-transaction.js — 新增記帳頁面
 * 三個 Tab：支出 / 收入 / 固定收支（快速從預設項目記帳）
 */

const AddPage = (() => {
  const PAGE_ID = 'page-add';
  let _type = 'expense';
  let _tab = 'expense'; // 'expense' | 'income' | 'recurring'
  let _who = 'personal'; // 'personal' | 'shared'
  let _recurringItems = [];

  function show() {
    const prefill = State.getState().pendingTxn || null;
    _who = 'personal';
    if (prefill) {
      _tab = prefill.type === 'income' ? 'income' : 'expense';
      _type = _tab;
      State.setState({ pendingTxn: null });
    } else {
      _tab = 'expense';
      _type = 'expense';
    }
    _render(prefill || {});
    if (_tab === 'recurring') _loadRecurring();
  }

  function hide() {
    Router.setDirty(false);
  }

  function _render(prefill = {}) {
    const page = document.getElementById(PAGE_ID);
    const today = Utils.today();
    page.innerHTML = `
      <!-- 三 Tab 切換 -->
      <div style="padding:0 0 12px;">
        <div class="toggle-group">
          <button class="toggle-btn ${_tab==='expense'?'active expense':''}" id="tab-expense"
                  onclick="AddPage._switchTab('expense')">支出</button>
          <button class="toggle-btn ${_tab==='income'?'active income':''}" id="tab-income"
                  onclick="AddPage._switchTab('income')">收入</button>
          <button class="toggle-btn ${_tab==='recurring'?'active':''}" id="tab-recurring"
                  onclick="AddPage._switchTab('recurring')" style="${_tab==='recurring'?'color:var(--color-primary-light);':''}">🔁 固定</button>
        </div>
      </div>

      <!-- 一般記帳表單 -->
      <div id="add-normal-form" style="${_tab==='recurring'?'display:none;':''}">
        <div class="amount-display">
          <span class="amount-prefix">$</span><input
            type="number" inputmode="decimal" id="add-amount"
            class="form-input-amount" placeholder="0"
            value="${prefill.amount || ''}" min="0">
        </div>

        <div style="margin-bottom:12px;">
          <div class="form-label" style="margin-bottom:8px;">類別</div>
          <div class="category-grid" id="category-grid"></div>
        </div>

        <div class="form-group">
          <div class="form-label">支付方式</div>
          <div class="payment-group" id="payment-group">
            ${CONFIG.PAYMENT_METHODS.map(p => `
              <button class="payment-btn ${p.key} ${(prefill.payment_method||'cash')===p.key?'selected':''}"
                      onclick="AddPage._selectPayment('${p.key}')" data-pay="${p.key}">
                ${p.emoji} ${p.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">記帳對象</div>
          <div class="toggle-group">
            <button class="toggle-btn ${_who==='personal'?'active':''}" id="who-personal"
                    onclick="AddPage._selectWho('personal')">👤 個人</button>
            <button class="toggle-btn ${_who==='shared'?'active':''}" id="who-shared"
                    onclick="AddPage._selectWho('shared')">👫 共同</button>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">日期</div>
          <input type="date" id="add-date" class="form-input"
                 value="${prefill.date || today}" max="${today}">
        </div>

        <div class="form-group">
          <div class="form-label">備註</div>
          <input type="text" id="add-note" class="form-input"
                 placeholder="備註（選填）" value="${prefill.note || ''}" maxlength="50">
        </div>

        ${prefill.merchant_name ? `
        <div class="form-group">
          <div class="form-label">店家名稱</div>
          <input type="text" id="add-merchant" class="form-input"
                 value="${prefill.merchant_name}">
        </div>` : ''}

        <div style="padding-top:8px;">
          <button class="btn btn-primary btn-block" onclick="AddPage._submit()">確認記帳</button>
        </div>
      </div>

      <!-- 固定收支快速記帳 -->
      <div id="add-recurring-panel" style="${_tab!=='recurring'?'display:none;':''}">
        <div style="color:var(--color-text-muted);font-size:13px;margin-bottom:12px;">
          點選下方項目快速記帳，不影響日常記帳統計。
          <a href="#recurring" style="color:var(--color-primary-light);font-weight:600;margin-left:4px;">管理 →</a>
        </div>
        <div id="recurring-shortcuts"></div>
      </div>
    `;

    _renderCategories(prefill.category);

    // dirty tracking
    ['add-amount','add-date','add-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => Router.setDirty(true));
    });

    if (_tab === 'recurring') _loadRecurring();
  }

  function _switchTab(tab) {
    _tab = tab;
    document.getElementById('tab-expense').className  = `toggle-btn ${tab==='expense'?'active expense':''}`;
    document.getElementById('tab-income').className   = `toggle-btn ${tab==='income'?'active income':''}`;
    document.getElementById('tab-recurring').className = `toggle-btn ${tab==='recurring'?'active':''}`;
    if (tab === 'recurring') document.getElementById('tab-recurring').style.color = tab==='recurring'?'var(--color-primary-light)':'';

    const normalForm     = document.getElementById('add-normal-form');
    const recurringPanel = document.getElementById('add-recurring-panel');
    if (normalForm)     normalForm.style.display     = tab === 'recurring' ? 'none' : '';
    if (recurringPanel) recurringPanel.style.display = tab === 'recurring' ? '' : 'none';

    if (tab !== 'recurring') {
      _type = tab;
      _renderCategories(null);
    } else {
      _loadRecurring();
    }
  }

  function _renderCategories(selected) {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    const cats = _type === 'income' ? CONFIG.INCOME_CATEGORIES : CONFIG.EXPENSE_CATEGORIES;
    grid.innerHTML = cats.map(c => `
      <button class="category-item ${c.name===selected?'selected':''}"
              onclick="AddPage._selectCategory('${c.name}')" data-cat="${c.name}">
        <div class="cat-icon">${c.emoji}</div>
        <div class="cat-name">${c.name}</div>
      </button>
    `).join('');
  }

  function _selectCategory(name) {
    document.querySelectorAll('.category-item').forEach(el =>
      el.classList.toggle('selected', el.dataset.cat === name)
    );
  }

  function _selectPayment(key) {
    document.querySelectorAll('.payment-btn').forEach(el =>
      el.classList.toggle('selected', el.dataset.pay === key)
    );
  }

  function _selectWho(who) {
    _who = who;
    const personal = document.getElementById('who-personal');
    const shared   = document.getElementById('who-shared');
    if (personal) personal.className = `toggle-btn ${who==='personal'?'active':''}`;
    if (shared)   shared.className   = `toggle-btn ${who==='shared'?'active':''}`;
  }

  async function _loadRecurring() {
    const el = document.getElementById('recurring-shortcuts');
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--color-text-muted);">載入中...</div>`;
    try {
      const result = await API.getRecurring();
      _recurringItems = (result.recurring || []).filter(r => String(r.is_active).toUpperCase() === 'TRUE');
      _renderRecurringShortcuts();
    } catch(err) {
      el.innerHTML = `<div style="color:var(--color-expense);font-size:13px;">載入失敗：${err.message}</div>`;
    }
  }

  // 浮動金額類別（點擊後提示可調整）
  const _VARIABLE_CATEGORIES = new Set(['薪水','投資','投資收益','水費','電費','瓦斯費','電話費']);

  function _renderRecurringShortcuts() {
    const el = document.getElementById('recurring-shortcuts');
    if (!el) return;
    if (!_recurringItems.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔁</div>
          <div class="empty-state-title">尚未設定固定收支</div>
          <div class="empty-state-desc">到「固定」頁面新增定期項目</div>
          <div style="margin-top:16px;">
            <a href="#recurring" class="btn btn-primary">前往管理</a>
          </div>
        </div>`;
      return;
    }

    const income  = _recurringItems.filter(r => r.type === 'income');
    const expense = _recurringItems.filter(r => r.type === 'expense');

    const renderGroup = (items, type) => items.length ? `
      <div class="section-title" style="color:${type==='income'?'var(--color-income)':'var(--color-expense)'};">
        ${type === 'income' ? '💰 固定收入' : '💸 固定支出'}
      </div>
      ${items.map(r => {
        const emoji = CONFIG.getCategoryEmoji(r.category);
        const isVariable = _VARIABLE_CATEGORIES.has(r.category);
        return `
          <div class="txn-item" style="margin-bottom:6px;cursor:pointer;"
               onclick="AddPage._quickRecord('${r.recurring_id}')">
            <div class="txn-cat-icon">${emoji}</div>
            <div class="txn-info">
              <div class="txn-category">${r.name || r.category}</div>
              <div class="txn-note">每月 ${r.day_of_month} 日・${CONFIG.getPaymentLabel(r.payment_method)}</div>
            </div>
            <div class="txn-right">
              <div class="txn-amount ${type}">${type==='income'?'+':'-'}${Utils.formatAmount(r.amount)}</div>
              <div class="txn-meta">${isVariable ? '✏️ 可調整金額' : '點擊記帳'}</div>
            </div>
          </div>
        `;
      }).join('')}
    ` : '';

    el.innerHTML = renderGroup(income, 'income') + renderGroup(expense, 'expense');
  }

  // 顯示固定收支確認 modal（含可編輯金額）
  function _showQuickRecordModal(item, onConfirm) {
    const id = 'quick-record-modal';
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    const typeColor = item.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)';
    const emoji = CONFIG.getCategoryEmoji(item.category);
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">快速記帳</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="font-size:32px;">${emoji}</div>
          <div>
            <div style="font-weight:700;">${item.name || item.category}</div>
            <div style="font-size:12px;color:var(--color-text-muted);">每月 ${item.day_of_month} 日・${CONFIG.getPaymentLabel(item.payment_method)}</div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">金額（可修改）</div>
          <div class="amount-display" style="margin-bottom:0;">
            <span class="amount-prefix" style="color:${typeColor};">$</span>
            <input type="number" inputmode="decimal" id="qr-amount" class="form-input-amount"
                   value="${item.amount}" min="0" style="color:${typeColor};">
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">日期</div>
          <input type="date" id="qr-date" class="form-input" value="${Utils.today()}" max="${Utils.today()}">
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;">
          <button class="btn btn-secondary btn-block" id="qr-cancel">取消</button>
          <button class="btn btn-primary btn-block" id="qr-confirm">確定記帳</button>
        </div>
      </div>
    `;
    overlay.onclick = e => { if (e.target === overlay) Modal.hide(id); };
    document.getElementById('qr-cancel').onclick = () => Modal.hide(id);
    document.getElementById('qr-confirm').onclick = () => {
      const amount = parseFloat(document.getElementById('qr-amount').value);
      const date   = document.getElementById('qr-date').value || Utils.today();
      if (!amount || amount <= 0) { Toast.error('請輸入有效金額'); return; }
      Modal.hide(id);
      onConfirm(amount, date);
    };
    Modal.show(id);
  }

  async function _quickRecord(recurringId) {
    const item = _recurringItems.find(r => r.recurring_id === recurringId);
    if (!item) return;
    const user = State.getState().currentUser;
    if (!user) { Toast.error('請先選擇使用者'); return; }

    _showQuickRecordModal(item, async (amount, date) => {
      Loader.show('記帳中...');
      try {
        await API.addTransaction({
          user_id:        user.userId,
          type:           item.type,
          amount,
          category:       item.category,
          payment_method: item.payment_method,
          note:           `固定：${item.name || item.category}`,
          merchant_name:  '',
          receipt_source: 'recurring',
          date
        });
        State.invalidateTransactionCache();
        Toast.success('記帳成功！');
      } catch(err) {
        Toast.error('記帳失敗：' + err.message);
      } finally {
        Loader.hide();
      }
    });
  }

  async function _submit() {
    const user = State.getState().currentUser;
    if (!user) { Toast.error('請先選擇使用者'); return; }

    const amount = parseFloat(document.getElementById('add-amount')?.value);
    if (!amount || amount <= 0) { Toast.error('請輸入金額'); return; }

    const category = document.querySelector('.category-item.selected')?.dataset.cat;
    if (!category) { Toast.error('請選擇類別'); return; }

    const payMethod = document.querySelector('.payment-btn.selected')?.dataset.pay || 'cash';
    const date      = document.getElementById('add-date')?.value      || Utils.today();
    const note      = document.getElementById('add-note')?.value      || '';
    const merchant  = document.getElementById('add-merchant')?.value  || '';

    Loader.show('記帳中...');
    try {
      await API.addTransaction({
        user_id:        _who === 'shared' ? 'shared' : user.userId,
        type:           _type,
        amount,
        category,
        payment_method: payMethod,
        date,
        note,
        merchant_name:  merchant,
        receipt_source: 'manual'
      });
      State.invalidateTransactionCache();
      Router.setDirty(false);
      Toast.success('記帳成功！💰');
      Router.navigate('dashboard', true);
    } catch(err) {
      Toast.error('記帳失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  return { show, hide, _switchTab, _selectCategory, _selectPayment, _selectWho, _submit, _quickRecord };
})();
