/**
 * add-transaction.js — 新增/編輯記帳頁面
 */

const AddPage = (() => {
  const PAGE_ID = 'page-add';
  let _type = 'expense';
  let _isDirty = false;

  function show() {
    const prefill = State.getState().pendingTxn || {};
    _type = prefill.type || 'expense';
    _render(prefill);
    if (prefill.amount) {
      // 清除 pendingTxn
      State.setState({ pendingTxn: null });
    }
  }

  function hide() {
    Router.setDirty(false);
    _isDirty = false;
  }

  function _render(prefill = {}) {
    const page = document.getElementById(PAGE_ID);
    const today = Utils.today();

    page.innerHTML = `
      <!-- 支出/收入切換 -->
      <div style="padding:16px 16px 0;">
        <div class="toggle-group">
          <button class="toggle-btn ${_type==='expense'?'active expense':''}" id="tab-expense" onclick="AddPage._setType('expense')">支出</button>
          <button class="toggle-btn ${_type==='income'?'active income':''}"  id="tab-income"  onclick="AddPage._setType('income')">收入</button>
        </div>
      </div>

      <!-- 金額輸入 -->
      <div class="amount-display">
        <span class="amount-prefix">$</span><input
          type="number" inputmode="decimal" id="add-amount"
          class="form-input-amount" placeholder="0"
          value="${prefill.amount || ''}" min="0" step="1">
      </div>

      <!-- 類別選擇 -->
      <div style="padding:0 16px;">
        <div class="form-label" style="margin-bottom:8px;">類別</div>
        <div class="category-grid" id="category-grid"></div>
      </div>

      <!-- 支付方式 -->
      <div style="padding:16px 16px 0;">
        <div class="form-label" style="margin-bottom:8px;">支付方式</div>
        <div class="payment-group" id="payment-group">
          ${CONFIG.PAYMENT_METHODS.map(p => `
            <button class="payment-btn ${p.key} ${(prefill.payment_method||'cash')===p.key?'selected':''}"
                    onclick="AddPage._selectPayment('${p.key}')" data-pay="${p.key}">
              ${p.emoji} ${p.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 日期 -->
      <div style="padding:16px 16px 0;">
        <div class="form-label" style="margin-bottom:8px;">日期</div>
        <input type="date" id="add-date" class="form-input" value="${prefill.date || today}" max="${today}">
      </div>

      <!-- 備註 -->
      <div style="padding:16px 16px 0;">
        <div class="form-label" style="margin-bottom:8px;">備註</div>
        <input type="text" id="add-note" class="form-input" placeholder="備註（選填）"
               value="${prefill.note || ''}" maxlength="50">
      </div>

      <!-- 店名（收據識別時帶入） -->
      <div style="padding:16px 16px 0;" id="merchant-row" class="${prefill.merchant_name?'':'hidden'}">
        <div class="form-label" style="margin-bottom:8px;">店家名稱</div>
        <input type="text" id="add-merchant" class="form-input" placeholder="店家名稱"
               value="${prefill.merchant_name || ''}">
      </div>

      <!-- 提交按鈕 -->
      <div style="padding:24px 16px;">
        <button class="btn btn-primary btn-block" onclick="AddPage._submit()">
          確認記帳
        </button>
      </div>
    `;

    _renderCategories(prefill.category);

    // 監聽輸入 dirty
    const trackDirty = () => {
      _isDirty = true;
      Router.setDirty(true);
    };
    ['add-amount','add-date','add-note','add-merchant'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', trackDirty);
    });

    page.classList.add('active');
  }

  function _renderCategories(selected) {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    const cats = _type === 'expense' ? CONFIG.EXPENSE_CATEGORIES : CONFIG.INCOME_CATEGORIES;
    grid.innerHTML = cats.map(c => `
      <button class="category-item ${c.name === selected ? 'selected' : ''}"
              onclick="AddPage._selectCategory('${c.name}')" data-cat="${c.name}">
        <div class="cat-icon">${c.emoji}</div>
        <div class="cat-name">${c.name}</div>
      </button>
    `).join('');
  }

  function _setType(type) {
    _type = type;
    // 更新 toggle
    document.getElementById('tab-expense').className = `toggle-btn ${type==='expense'?'active expense':''}`;
    document.getElementById('tab-income').className  = `toggle-btn ${type==='income'?'active income':''}`;
    // 重新渲染類別
    const currentCat = document.querySelector('.category-item.selected')?.dataset.cat || '';
    _renderCategories(currentCat);
  }

  function _selectCategory(name) {
    document.querySelectorAll('.category-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.cat === name);
    });
  }

  function _selectPayment(key) {
    document.querySelectorAll('.payment-btn').forEach(el => {
      el.classList.toggle('selected', el.dataset.pay === key);
    });
  }

  async function _submit() {
    const user = State.getState().currentUser;
    if (!user) { Toast.error('請先選擇使用者'); return; }

    const amount = parseFloat(document.getElementById('add-amount').value);
    if (!amount || amount <= 0) { Toast.error('請輸入金額'); return; }

    const category = document.querySelector('.category-item.selected')?.dataset.cat;
    if (!category) { Toast.error('請選擇類別'); return; }

    const payMethod = document.querySelector('.payment-btn.selected')?.dataset.pay || 'cash';
    const date      = document.getElementById('add-date').value    || Utils.today();
    const note      = document.getElementById('add-note').value    || '';
    const merchant  = document.getElementById('add-merchant')?.value || '';

    Loader.show('記帳中...');
    try {
      await API.addTransaction({
        user_id:        user.userId,
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
      _isDirty = false;
      Toast.success('記帳成功！💰');
      Router.navigate('dashboard', true);
    } catch (err) {
      Toast.error('記帳失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  return { show, hide, _setType, _selectCategory, _selectPayment, _submit };
})();
