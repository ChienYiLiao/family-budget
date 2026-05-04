/**
 * Recurring.gs — 固定收支管理
 */

// ── 讀取 ───────────────────────────────────────────────────────────────────────
function handleGetRecurring(params) {
  let rows = readAllRows('RECURRING');
  if (params.userId) rows = rows.filter(r => r.user_id === params.userId || r.user_id === '');
  rows.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return Number(a.day_of_month || 0) - Number(b.day_of_month || 0);
  });
  return { recurring: rows };
}

// ── 新增 ───────────────────────────────────────────────────────────────────────
function handleAddRecurring(body) {
  const id = generateId('rec');
  const now = nowIso();
  const row = {
    recurring_id:        id,
    user_id:             body.user_id        || '',
    type:                body.type           || 'expense',
    category:            body.category       || '',
    name:                body.name           || '',
    amount:              Number(body.amount) || 0,
    payment_method:      body.payment_method || 'cash',
    day_of_month:        Number(body.day_of_month) || 1,
    is_active:           body.is_active !== false ? 'TRUE' : 'FALSE',
    last_applied_month:  '',
    created_at:          now,
    updated_at:          now
  };
  appendRow('RECURRING', row);
  return { recurring_id: id };
}

// ── 更新 ───────────────────────────────────────────────────────────────────────
function handleUpdateRecurring(body) {
  const id = body.recurring_id;
  if (!id) throw new Error('Missing recurring_id');
  const patch = { updated_at: nowIso() };
  const allowed = ['type','category','name','amount','payment_method','day_of_month'];
  allowed.forEach(k => { if (body[k] !== undefined) patch[k] = body[k]; });
  const ok = updateRow('RECURRING', 'recurring_id', id, patch);
  if (!ok) throw new Error('Recurring not found: ' + id);
  return { recurring_id: id };
}

// ── 刪除 ───────────────────────────────────────────────────────────────────────
function handleDeleteRecurring(body) {
  const id = body.recurring_id;
  if (!id) throw new Error('Missing recurring_id');
  const ok = deleteRow('RECURRING', 'recurring_id', id);
  if (!ok) throw new Error('Recurring not found: ' + id);
  return { deleted: true };
}

// ── 啟用/停用 ──────────────────────────────────────────────────────────────────
function handleToggleRecurring(body) {
  const id = body.recurring_id;
  if (!id) throw new Error('Missing recurring_id');
  const isActive = body.is_active !== false ? 'TRUE' : 'FALSE';
  const ok = updateRow('RECURRING', 'recurring_id', id, { is_active: isActive, updated_at: nowIso() });
  if (!ok) throw new Error('Recurring not found: ' + id);
  return { recurring_id: id, is_active: body.is_active };
}

// ── 套用固定收支（每月入帳） ───────────────────────────────────────────────────
function handleApplyRecurring(body) {
  const year  = parseInt(body.year  || new Date().getFullYear());
  const month = parseInt(body.month || (new Date().getMonth() + 1));
  const ym = `${year}-${String(month).padStart(2,'0')}`;
  const todayDay = parseInt(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd'));

  const items = readAllRows('RECURRING');
  // 一次性讀取本月所有交易，用於下方檢查是否已有手動記帳
  const allTxns = readAllRows('TRANSACTIONS');
  const results = [];
  let applied = 0, skipped = 0;

  items.forEach(item => {
    if (String(item.is_active).toUpperCase() !== 'TRUE') {
      results.push({ recurring_id: item.recurring_id, status: 'skipped_inactive' });
      skipped++;
      return;
    }
    // 防重複：已套用過這個月
    if (item.last_applied_month === ym) {
      results.push({ recurring_id: item.recurring_id, status: 'skipped_duplicate' });
      skipped++;
      return;
    }
    // 防重複：本月同 user_id + category 已有任何記帳（含手動記帳、本月調整）
    const hasExisting = allTxns.some(t =>
      t.user_id === item.user_id &&
      t.category === item.category &&
      String(t.date || '').slice(0, 7) === ym
    );
    if (hasExisting) {
      // 標記為已套用，避免下次仍判斷為待套用
      updateRow('RECURRING', 'recurring_id', item.recurring_id, {
        last_applied_month: ym,
        updated_at: nowIso()
      });
      results.push({ recurring_id: item.recurring_id, status: 'skipped_existing' });
      skipped++;
      return;
    }
    // 日期未到
    const dom = parseInt(item.day_of_month || 1);
    if (dom > todayDay) {
      results.push({ recurring_id: item.recurring_id, status: 'skipped_date' });
      skipped++;
      return;
    }

    // 入帳
    const dateStr = `${ym}-${String(dom).padStart(2,'0')}`;
    const txnBody = {
      user_id:        item.user_id,
      type:           item.type,
      amount:         item.amount,
      category:       item.category,
      payment_method: item.payment_method,
      note:           `固定${item.type === 'income' ? '收入' : '支出'}：${item.name}`,
      merchant_name:  '',
      items:          '',
      receipt_source: 'recurring',
      date:           dateStr
    };
    const txnResult = handleAddTransaction(txnBody);

    // 更新 last_applied_month
    updateRow('RECURRING', 'recurring_id', item.recurring_id, {
      last_applied_month: ym,
      updated_at: nowIso()
    });

    results.push({ recurring_id: item.recurring_id, status: 'applied', transaction_id: txnResult.transaction_id });
    applied++;
  });

  return { applied, skipped, details: results };
}

/**
 * 月底自動套用固定收支（time-driven trigger 呼叫）
 * 在每月最後一天 23:00 執行，確保當月所有未手動確認的固定收支都被記錄
 */
function autoApplyRecurring() {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  // 只在月底最後一天執行
  if (tomorrow.getDate() !== 1) return;

  const year  = today.getFullYear();
  const month = today.getMonth() + 1;
  const result = handleApplyRecurring({ year, month });
  Logger.log('月底自動套用固定收支完成：' +
    Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd') +
    ' applied=' + result.applied + ' skipped=' + result.skipped);
}

/**
 * 設定月底自動套用 Trigger（在 GAS 編輯器手動執行一次即可）
 */
function setupAutoApplyTrigger() {
  // 清除舊的同名 trigger
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoApplyRecurring') ScriptApp.deleteTrigger(t);
  });
  // 每天 23:00 執行，函式內部判斷是否為月底
  ScriptApp.newTrigger('autoApplyRecurring')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .create();
  Logger.log('✓ 固定收支月底自動套用 Trigger 設定完成（每天 23:00 執行，月底才入帳）');
}
