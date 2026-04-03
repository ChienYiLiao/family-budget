/**
 * Stats.gs — 統計分析資料
 */

function handleGetStats(params) {
  const allTxns = readAllRows('TRANSACTIONS');
  const userId = params.userId || null;
  const excludeRecurring = params.excludeRecurring === 'true';
  let txns = userId ? allTxns.filter(r => r.user_id === userId) : allTxns;
  if (excludeRecurring) {
    txns = txns.filter(r => r.receipt_source !== 'recurring');
  }

  // 月份範圍
  const startYear  = parseInt(params.startYear  || new Date().getFullYear());
  const startMonth = parseInt(params.startMonth || 1);
  const endYear    = parseInt(params.endYear    || new Date().getFullYear());
  const endMonth   = parseInt(params.endMonth   || (new Date().getMonth() + 1));

  const months = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push(`${y}-${String(m).padStart(2,'0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  // 逐月趨勢
  const monthlyTrend = months.map(ym => {
    const mt = txns.filter(r => r.date && r.date.startsWith(ym));
    const totalExpense = mt.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount)||0), 0);
    const totalIncome  = mt.filter(r => r.type === 'income' ).reduce((s, r) => s + (Number(r.amount)||0), 0);
    return { yearMonth: ym, totalExpense, totalIncome, net: totalIncome - totalExpense };
  });

  // 類別累計（支出）
  const categoryMap = {};
  const filteredTxns = txns.filter(r => {
    if (!r.date) return false;
    const ym = r.date.substring(0, 7);
    return months.includes(ym) && r.type === 'expense';
  });
  filteredTxns.forEach(r => {
    const cat = r.category || '其他';
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += Number(r.amount) || 0;
    categoryMap[cat].count++;
  });
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  // 支付方式佔比（支出）
  const totalExpenseAll = filteredTxns.reduce((s, r) => s + (Number(r.amount)||0), 0);
  const payMap = {};
  filteredTxns.forEach(r => {
    const pm = r.payment_method || 'cash';
    payMap[pm] = (payMap[pm] || 0) + (Number(r.amount) || 0);
  });
  const paymentMethodBreakdown = Object.entries(payMap).map(([method, amount]) => ({
    method,
    amount,
    percentage: totalExpenseAll > 0 ? Math.round(amount / totalExpenseAll * 1000) / 10 : 0
  }));

  // 每個月的類別支出（用於月份選擇細看）
  const monthCategory = {};
  months.forEach(ym => {
    const mt = txns.filter(r => r.date && r.date.startsWith(ym) && r.type === 'expense');
    const cm = {};
    mt.forEach(r => {
      const cat = r.category || '其他';
      cm[cat] = (cm[cat] || 0) + (Number(r.amount) || 0);
    });
    monthCategory[ym] = cm;
  });

  return {
    monthlyTrend,
    categoryBreakdown,
    paymentMethodBreakdown,
    monthCategory
  };
}

/**
 * 產生月報表 Sheet（寫入「月報表」分頁）
 */
function handleGenerateMonthlyReport(body) {
  const ss = SpreadsheetApp.openById(getProp('SPREADSHEET_ID'));
  const sheetName = '月報表';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }

  const allTxns = readAllRows('TRANSACTIONS');

  // 取得所有月份並排序
  const monthSet = new Set();
  allTxns.forEach(r => { if (r.date && r.date.length >= 7) monthSet.add(r.date.substring(0, 7)); });
  const months = Array.from(monthSet).sort();

  // 寫入標題
  sheet.appendRow(['月份', '收入', '支出', '結餘', '固定收入', '固定支出', '日常收入', '日常支出']);

  months.forEach(ym => {
    const mt = allTxns.filter(r => r.date && r.date.startsWith(ym));
    const income  = mt.filter(r => r.type === 'income' ).reduce((s, r) => s + (Number(r.amount)||0), 0);
    const expense = mt.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount)||0), 0);
    const recurIncome  = mt.filter(r => r.type === 'income'  && r.receipt_source === 'recurring').reduce((s, r) => s + (Number(r.amount)||0), 0);
    const recurExpense = mt.filter(r => r.type === 'expense' && r.receipt_source === 'recurring').reduce((s, r) => s + (Number(r.amount)||0), 0);
    sheet.appendRow([ym, income, expense, income - expense, recurIncome, recurExpense, income - recurIncome, expense - recurExpense]);
  });

  // 加粗標題列
  sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  sheet.setFrozenRows(1);

  return { sheetName, months: months.length };
}
