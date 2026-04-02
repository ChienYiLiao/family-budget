/**
 * recurring.js — 固定收支管理頁面
 */

const RecurringPage = (() => {
  const PAGE_ID = 'page-recurring';
  let _data = [];

  function show() {
    _render();
    _loadData();
  }

  function hide() {}

  function _render() {
    const page = document.getElementById(PAGE_ID);
    page.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-size:18px;font-weight:800;">固定收支</h2>
        <button class="btn btn-primary" style="padding:8px 16px;" onclick="RecurringPage._openAddModal()">+ 新增</button>
      </div>

      <!-- 固定收入 -->
      <div class="section">
        <div class="section-title" style="color:var(--color-income);">固定收入</div>
        <div id="recurring-income-list"></div>
      </div>

      <!-- 固定支出 -->
      <div class="section">
        <div class="section-title" style="color:var(--color-expense);">固定支出</div>
        <div id="recurring-expense-list"></div>
      </div>

      <!-- 新增/編輯 Modal -->
      <div class="modal-overlay" id="recurring-modal">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title" id="recurring-modal-title">新增固定收支</div>
          <div id="recurring-modal-form"></div>
        </div>
      </div>
    `;
    page.classList.add('active');
  }

  async function _loadData() {
    try {
      const result = await API.getRecurring();
      _data = result.recurring || [];
      _renderLists();
    } catch(err) {
      Toast.error('載入失敗：' + err.message);
    }
  }

  function _renderLists() {
    const income  = _data.filter(r => r.type === 'income');
    const expense = _data.filter(r => r.type === 'expense');

    document.getElementById('recurring-income-list').innerHTML =
      income.length ? income.map(_renderItem).join('') : '<div style="color:var(--color-text-muted);font-size:13px;padding:8px 4px;">尚未設定固定收入</div>';

    document.getElementById('recurring-expense-list').innerHTML =
      expense.length ? expense.map(_renderItem).join('') : '<div style="color:var(--color-text-muted);font-size:13px;padding:8px 4px;">尚未設定固定支出</div>';
  }

  function _renderItem(r) {
    const isActive = String(r.is_active).toUpperCase() === 'TRUE';
    const emoji = CONFIG.getCategoryEmoji(r.category);
    const payLabel = CONFIG.getPaymentLabel(r.payment_method);
    return `
      <div class="recurring-item ${isActive ? '' : 'inactive'}" id="rec-${r.recurring_id}">
        <div style="font-size:24px;">${emoji}</div>
        <div class="recurring-info">
          <div class="recurring-name">${r.name || r.category}</div>
          <div class="recurring-meta">每月 ${r.day_of_month} 日・${payLabel}</div>
        </div>
        <div class="recurring-amount ${r.type}">
          ${r.type === 'income' ? '+' : '-'}${Utils.formatAmount(r.amount)}
        </div>
        <label class="switch">
          <input type="checkbox" ${isActive ? 'checked' : ''}
                 onchange="RecurringPage._toggle('${r.recurring_id}', this.checked)">
          <span class="switch-slider"></span>
        </label>
        <button class="btn btn-ghost" style="padding:4px 8px;color:var(--color-expense);"
                onclick="RecurringPage._delete('${r.recurring_id}')">✕</button>
      </div>
    `;
  }

  function _openAddModal() {
    document.getElementById('recurring-modal-title').textContent = '新增固定收支';
    document.getElementById('recurring-modal-form').innerHTML = _renderForm();
    Modal.show('recurring-modal');
  }

  function _renderForm(prefill = {}) {
    const type = prefill.type || 'expense';
    const allCats = type === 'income'
      ? CONFIG.RECURRING_INCOME_CATEGORIES
      : CONFIG.RECURRING_EXPENSE_CATEGORIES;

    return `
      <div class="form-group">
        <div class="form-label">類型</div>
        <div class="toggle-group">
          <button class="toggle-btn ${type==='expense'?'active expense':''}" id="rec-tab-expense"
                  onclick="RecurringPage._setFormType('expense')">支出</button>
          <button class="toggle-btn ${type==='income'?'active income':''}" id="rec-tab-income"
                  onclick="RecurringPage._setFormType('income')">收入</button>
        </div>
      </div>
      <div class="form-group">
        <div class="form-label">類別</div>
        <select class="form-input" id="rec-category">
          ${allCats.map(c => `<option value="${c.name}" ${c.name===prefill.category?'selected':''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">名稱（選填，可自訂）</div>
        <input type="text" class="form-input" id="rec-name" placeholder="例：房貸" value="${prefill.name || ''}">
      </div>
      <div class="form-group">
        <div class="form-label">金額</div>
        <input type="number" class="form-input" id="rec-amount" placeholder="0" inputmode="decimal" value="${prefill.amount || ''}">
      </div>
      <div class="form-group">
        <div class="form-label">支付方式</div>
        <select class="form-input" id="rec-payment">
          ${CONFIG.PAYMENT_METHODS.map(p => `<option value="${p.key}" ${p.key===prefill.payment_method?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">每月幾號入帳</div>
        <select class="form-input" id="rec-dom">
          ${Array.from({length:28},(_,i)=>i+1).map(d => `<option value="${d}" ${d===(parseInt(prefill.day_of_month)||1)?'selected':''}>${d} 日</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-secondary btn-block" onclick="Modal.hide('recurring-modal')">取消</button>
        <button class="btn btn-primary btn-block"   onclick="RecurringPage._submitForm()">儲存</button>
      </div>
    `;
  }

  function _setFormType(type) {
    document.getElementById('rec-tab-expense').className = `toggle-btn ${type==='expense'?'active expense':''}`;
    document.getElementById('rec-tab-income').className  = `toggle-btn ${type==='income'?'active income':''}`;
    const cats = type === 'income' ? CONFIG.RECURRING_INCOME_CATEGORIES : CONFIG.RECURRING_EXPENSE_CATEGORIES;
    const sel = document.getElementById('rec-category');
    if (sel) sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  }

  async function _submitForm() {
    const type       = document.getElementById('rec-tab-income').classList.contains('active') ? 'income' : 'expense';
    const category   = document.getElementById('rec-category').value;
    const name       = document.getElementById('rec-name').value || category;
    const amount     = parseFloat(document.getElementById('rec-amount').value);
    const payment    = document.getElementById('rec-payment').value;
    const dom        = parseInt(document.getElementById('rec-dom').value);
    const user       = State.getState().currentUser;

    if (!amount || amount <= 0) { Toast.error('請輸入金額'); return; }

    Loader.show('儲存中...');
    try {
      await API.addRecurring({
        user_id: user?.userId || '',
        type, category, name, amount,
        payment_method: payment,
        day_of_month:   dom,
        is_active:      true
      });
      Modal.hide('recurring-modal');
      Toast.success('已新增！');
      await _loadData();
    } catch(err) {
      Toast.error('新增失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  async function _toggle(id, isActive) {
    try {
      await API.toggleRecurring(id, isActive);
      const item = _data.find(r => r.recurring_id === id);
      if (item) item.is_active = isActive ? 'TRUE' : 'FALSE';
      // 更新 DOM 樣式
      const el = document.getElementById(`rec-${id}`);
      if (el) el.classList.toggle('inactive', !isActive);
    } catch(err) {
      Toast.error('操作失敗');
    }
  }

  async function _delete(id) {
    const ok = await Modal.confirm('確定要刪除此固定收支？', { danger: true, confirmText: '刪除' });
    if (!ok) return;
    Loader.show('刪除中...');
    try {
      await API.deleteRecurring(id);
      Toast.success('已刪除');
      await _loadData();
    } catch(err) {
      Toast.error('刪除失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  return { show, hide, _openAddModal, _setFormType, _submitForm, _toggle, _delete };
})();
