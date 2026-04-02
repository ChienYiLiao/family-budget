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
