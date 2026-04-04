/**
 * recurring.js — 固定收支管理頁面
 * Modal 必須 append 到 document.body，避免 iOS overflow-scroll 破壞 position:fixed
 */

const RecurringPage = (() => {
  const PAGE_ID = 'page-recurring';
  let _data = [];

  function show() {
    _render();
    _loadData();
  }

  function hide() {
    // 關閉任何開著的 modal
    const m = document.getElementById('recurring-form-modal');
    if (m) m.classList.remove('active');
  }

  function _render() {
    const page = document.getElementById(PAGE_ID);
    page.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-size:18px;font-weight:800;">固定收支管理</h2>
        <button class="btn btn-primary" style="padding:8px 16px;font-size:13px;"
                onclick="RecurringPage._openAddModal()">＋ 新增</button>
      </div>

      <div class="section">
        <div class="section-title" style="color:var(--color-income);">💰 固定收入</div>
        <div id="recurring-income-list"></div>
      </div>

      <div class="section">
        <div class="section-title" style="color:var(--color-expense);">💸 固定支出</div>
        <div id="recurring-expense-list"></div>
      </div>
    `;

    // 確保 modal 存在於 body（只建立一次）
    _ensureModal();
  }

  function _ensureModal() {
    if (document.getElementById('recurring-form-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'recurring-form-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title" id="rec-modal-title">新增固定收支</div>
        <div id="rec-modal-body"></div>
      </div>
    `;
    overlay.onclick = e => { if (e.target === overlay) Modal.hide('recurring-form-modal'); };
    document.body.appendChild(overlay);
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

    const emptyMsg = type => `
      <div style="color:var(--color-text-muted);font-size:13px;padding:12px 4px;text-align:center;">
        尚未設定固定${type === 'income' ? '收入' : '支出'}，點擊「新增」開始設定
      </div>`;

    document.getElementById('recurring-income-list').innerHTML =
      income.length ? income.map(_renderItem).join('') : emptyMsg('income');

    document.getElementById('recurring-expense-list').innerHTML =
      expense.length ? expense.map(_renderItem).join('') : emptyMsg('expense');
  }

  function _renderItem(r) {
    const isActive = String(r.is_active).toUpperCase() === 'TRUE';
    const emoji    = CONFIG.getCategoryEmoji(r.category);
    const payLabel = CONFIG.getPaymentLabel(r.payment_method);
    const adjustBtn = (r.type === 'income' && isActive) ? `
      <button style="background:none;border:none;color:var(--color-primary);font-size:11px;padding:2px 0;cursor:pointer;text-decoration:underline;text-align:left;"
              onclick="RecurringPage._adjustThisMonth('${r.recurring_id}')">本月調整</button>
    ` : '';
    return `
      <div class="recurring-item ${isActive ? '' : 'inactive'}" id="rec-item-${r.recurring_id}">
        <div style="font-size:24px;flex-shrink:0;">${emoji}</div>
        <div class="recurring-info">
          <div class="recurring-name">${r.name || r.category}</div>
          <div class="recurring-meta">每月 ${r.day_of_month} 日・${payLabel}</div>
          ${adjustBtn}
        </div>
        <div class="recurring-amount ${r.type}">
          ${r.type === 'income' ? '+' : '-'}${Utils.formatAmount(r.amount)}
        </div>
        <label class="switch" title="${isActive ? '停用' : '啟用'}">
          <input type="checkbox" ${isActive ? 'checked' : ''}
                 onchange="RecurringPage._toggle('${r.recurring_id}', this.checked)">
          <span class="switch-slider"></span>
        </label>
        <button style="background:none;border:none;color:var(--color-text-muted);font-size:18px;padding:4px 6px;cursor:pointer;flex-shrink:0;"
                onclick="RecurringPage._delete('${r.recurring_id}')" title="刪除">✕</button>
      </div>
    `;
  }

  function _adjustThisMonth(recurringId) {
    const item = _data.find(r => r.recurring_id === recurringId);
    if (!item) return;

    const now = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    const ym = `${thisYear}-${String(thisMonth).padStart(2,'0')}`;

    const id = 'recurring-adjust-modal';
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'modal-overlay';
      overlay.onclick = e => { if (e.target === overlay) Modal.hide(id); };
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">本月實際調整</div>
        <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;line-height:1.6;">
          調整 <strong>${ym}</strong> 的「${item.name || item.category}」實際收入金額。<br>
          若本月已套用固定收支，將更新該筆紀錄；否則新增一筆本月實際記錄。
        </div>
        <div class="form-group">
          <div class="form-label">實際金額</div>
          <input type="number" class="form-input" id="adj-amount"
                 value="${item.amount}" inputmode="decimal" min="0">
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;padding-bottom:8px;">
          <button class="btn btn-secondary btn-block" onclick="Modal.hide('${id}')">取消</button>
          <button class="btn btn-primary btn-block" onclick="RecurringPage._submitAdjust('${recurringId}', '${ym}')">確認</button>
        </div>
      </div>
    `;
    Modal.show(id);
  }

  async function _submitAdjust(recurringId, ym) {
    const item = _data.find(r => r.recurring_id === recurringId);
    if (!item) return;

    const actualAmount = parseFloat(document.getElementById('adj-amount').value);
    if (!actualAmount || actualAmount <= 0) { Toast.error('請輸入有效金額'); return; }

    const [yearStr, monthStr] = ym.split('-');
    const year = parseInt(yearStr), month = parseInt(monthStr);

    Modal.hide('recurring-adjust-modal');
    Loader.show('調整中...');
    try {
      // 找本月是否已有對應的固定收支交易
      const result = await API.getTransactions({ year, month });
      const recurringTxn = (result.transactions || []).find(t =>
        t.receipt_source === 'recurring' && t.category === item.category
      );

      if (recurringTxn) {
        await API.updateTransaction(recurringTxn.transaction_id, {
          amount: actualAmount,
          note: `${item.name || item.category} 本月實際`
        });
        Toast.success(`已更新為 ${Utils.formatAmount(actualAmount)}`);
      } else {
        // 本月尚未套用固定收支，直接新增一筆實際記錄
        const user = State.getState().currentUser;
        await API.addTransaction({
          user_id:        item.user_id || user?.userId || '',
          type:           item.type,
          amount:         actualAmount,
          category:       item.category,
          payment_method: item.payment_method,
          note:           `${item.name || item.category} 本月實際`,
          receipt_source: 'adjustment',
          date:           `${ym}-01`
        });
        Toast.success(`已新增本月實際記錄 ${Utils.formatAmount(actualAmount)}`);
      }
    } catch(err) {
      Toast.error('調整失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  function _openAddModal() {
    document.getElementById('rec-modal-title').textContent = '新增固定收支';
    _renderModalForm();
    Modal.show('recurring-form-modal');
  }

  function _renderModalForm(prefill = {}) {
    const type = prefill.type || 'expense';
    const allCats = type === 'income'
      ? CONFIG.RECURRING_INCOME_CATEGORIES
      : CONFIG.RECURRING_EXPENSE_CATEGORIES;

    document.getElementById('rec-modal-body').innerHTML = `
      <div class="form-group">
        <div class="form-label">類型</div>
        <div class="toggle-group">
          <button class="toggle-btn ${type==='expense'?'active expense':''}" id="rec-tab-expense"
                  onclick="RecurringPage._setFormType('expense')">支出</button>
          <button class="toggle-btn ${type==='income'?'active income':''}"  id="rec-tab-income"
                  onclick="RecurringPage._setFormType('income')">收入</button>
        </div>
      </div>
      <div class="form-group">
        <div class="form-label">類別</div>
        <select class="form-input" id="rec-form-category">
          ${allCats.map(c => `<option value="${c.name}" ${c.name===prefill.category?'selected':''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">名稱（可自訂，選填）</div>
        <input type="text" class="form-input" id="rec-form-name"
               placeholder="例：房貸、薪水" value="${prefill.name || ''}">
      </div>
      <div class="form-group">
        <div class="form-label">金額</div>
        <input type="number" class="form-input" id="rec-form-amount"
               placeholder="0" inputmode="decimal" min="0" value="${prefill.amount || ''}">
      </div>
      <div class="form-group">
        <div class="form-label">支付方式</div>
        <select class="form-input" id="rec-form-payment">
          ${CONFIG.PAYMENT_METHODS.map(p => `<option value="${p.key}" ${p.key===(prefill.payment_method||'cash')?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">每月幾號出入帳</div>
        <select class="form-input" id="rec-form-dom">
          ${Array.from({length:28},(_,i)=>i+1).map(d =>
            `<option value="${d}" ${d===(parseInt(prefill.day_of_month)||1)?'selected':''}>${d} 日</option>`
          ).join('')}
        </select>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;padding-bottom:8px;">
        <button class="btn btn-secondary btn-block"
                onclick="Modal.hide('recurring-form-modal')">取消</button>
        <button class="btn btn-primary btn-block"
                onclick="RecurringPage._submitForm()">儲存</button>
      </div>
    `;
  }

  function _setFormType(type) {
    document.getElementById('rec-tab-expense').className = `toggle-btn ${type==='expense'?'active expense':''}`;
    document.getElementById('rec-tab-income').className  = `toggle-btn ${type==='income'?'active income':''}`;
    const cats = type === 'income' ? CONFIG.RECURRING_INCOME_CATEGORIES : CONFIG.RECURRING_EXPENSE_CATEGORIES;
    const sel = document.getElementById('rec-form-category');
    if (sel) sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  }

  async function _submitForm() {
    const incomeActive = document.getElementById('rec-tab-income').classList.contains('active');
    const type     = incomeActive ? 'income' : 'expense';
    const category = document.getElementById('rec-form-category').value;
    const name     = document.getElementById('rec-form-name').value.trim() || category;
    const amount   = parseFloat(document.getElementById('rec-form-amount').value);
    const payment  = document.getElementById('rec-form-payment').value;
    const dom      = parseInt(document.getElementById('rec-form-dom').value);
    const user     = State.getState().currentUser;

    if (!amount || amount <= 0) { Toast.error('請輸入金額'); return; }

    Loader.show('儲存中...');
    try {
      await API.addRecurring({
        user_id:        user?.userId || '',
        type, category, name, amount,
        payment_method: payment,
        day_of_month:   dom,
        is_active:      true
      });
      Modal.hide('recurring-form-modal');
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
      const el = document.getElementById(`rec-item-${id}`);
      if (el) el.classList.toggle('inactive', !isActive);
      Toast.info(isActive ? '已啟用' : '已停用');
    } catch(err) {
      Toast.error('操作失敗');
    }
  }

  async function _delete(id) {
    const ok = await Modal.confirm('確定要刪除此固定收支項目？', {
      danger: true, confirmText: '刪除'
    });
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

  return { show, hide, _openAddModal, _setFormType, _submitForm, _toggle, _delete, _adjustThisMonth, _submitAdjust };
})();
