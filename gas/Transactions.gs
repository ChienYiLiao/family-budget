/**
 * Transactions.gs — 收支記帳 CRUD
 */

// ── 讀取 ───────────────────────────────────────────────────────────────────────
function handleGetTransactions(params) {
  const year  = params.year  ? parseInt(params.year)  : null;
  const month = params.month ? parseInt(params.month) : null;
  const userId   = params.userId   || null;
  const category = params.category || null;
  const type     = params.type     || null;

  let rows = readAllRows('TRANSACTIONS');

  if (year && month) {
    const ym = `${year}-${String(month).padStart(2,'0')}`;
    rows = rows.filter(r => r.date && r.date.startsWith(ym));
  } else if (year) {
    rows = rows.filter(r => r.date && r.date.startsWith(String(year)));
  }
  if (userId)   rows = rows.filter(r => r.user_id === userId);
  if (category) rows = rows.filter(r => r.category === category);
  if (type)     rows = rows.filter(r => r.type === type);

  // 按日期降序
  rows.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });

  return { transactions: rows, total: rows.length };
}

// ── 新增（含去重） ─────────────────────────────────────────────────────────────
function handleAddTransaction(body) {
  const existing = readAllRows('TRANSACTIONS');
  // 如果前端帶了 transaction_id 做去重（離線重送場景）
  if (body.transaction_id) {
    const dup = existing.find(r => r.transaction_id === body.transaction_id);
    if (dup) return { transaction_id: body.transaction_id, duplicate: true };
  }

  const id = body.transaction_id || generateId('txn');
  const now = nowIso();
  const row = {
    transaction_id:  id,
    user_id:         body.user_id         || '',
    type:            body.type            || 'expense',
    amount:          Number(body.amount)  || 0,
    category:        body.category        || '',
    payment_method:  body.payment_method  || 'cash',
    note:            body.note            || '',
    merchant_name:   body.merchant_name   || '',
    items:           body.items           || '',
    receipt_source:  body.receipt_source  || 'manual',
    date:            body.date            || todayStr(),
    created_at:      now
  };
  appendRow('TRANSACTIONS', row);
  return { transaction_id: id };
}

// ── 更新 ───────────────────────────────────────────────────────────────────────
function handleUpdateTransaction(body) {
  const id = body.transaction_id;
  if (!id) throw new Error('Missing transaction_id');
  const patch = {};
  const allowed = ['type','amount','category','payment_method','note','merchant_name','items','date'];
  allowed.forEach(k => { if (body[k] !== undefined) patch[k] = body[k]; });
  const ok = updateRow('TRANSACTIONS', 'transaction_id', id, patch);
  if (!ok) throw new Error('Transaction not found: ' + id);
  return { transaction_id: id };
}

// ── 刪除 ───────────────────────────────────────────────────────────────────────
function handleDeleteTransaction(body) {
  const id = body.transaction_id;
  if (!id) throw new Error('Missing transaction_id');
  const ok = deleteRow('TRANSACTIONS', 'transaction_id', id);
  if (!ok) throw new Error('Transaction not found: ' + id);
  return { deleted: true };
}
