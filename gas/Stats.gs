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

  // 本期最大支出 Top 10 單項
  const topTransactions = txns
    .filter(r => r.date && months.includes(r.date.substring(0,7)) && r.type === 'expense')
    .sort((a, b) => (Number(b.amount)||0) - (Number(a.amount)||0))
    .slice(0, 10)
    .map(r => ({
      transaction_id: r.transaction_id,
      date:           r.date,
      category:       r.category || '其他',
      note:           r.note || r.merchant_name || '',
      amount:         Number(r.amount) || 0,
      payment_method: r.payment_method || 'cash',
      user_id:        r.user_id || ''
    }));

  return {
    monthlyTrend,
    categoryBreakdown,
    paymentMethodBreakdown,
    monthCategory,
    topTransactions
  };
}

/**
 * 產生月報表 Sheet（寫入「月報表」分頁）
 * 固定收入/支出欄位直接從 Recurring 表讀取計劃金額，不依賴 auto-apply 是否已執行
 */
function handleGenerateMonthlyReport(body) {
  const startYm = body.startYm || '';  // 格式 'YYYY-MM'，空表示全部
  const endYm   = body.endYm   || '';

  const ss = SpreadsheetApp.openById(getProp('SPREADSHEET_ID'));
  const sheetName = '月報表';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }

  const allTxns = readAllRows('TRANSACTIONS');
  const allRecurring = readAllRows('RECURRING');
  // 只取啟用中的固定收支
  const activeRecurring = allRecurring.filter(r => String(r.is_active).toUpperCase() === 'TRUE');

  // 取得所有月份並排序（從 Transactions 取），依範圍篩選
  const monthSet = new Set();
  allTxns.forEach(r => { if (r.date && r.date.length >= 7) monthSet.add(r.date.substring(0, 7)); });
  let months = Array.from(monthSet).sort();
  if (startYm) months = months.filter(ym => ym >= startYm);
  if (endYm)   months = months.filter(ym => ym <= endYm);

  // 寫入標題
  sheet.appendRow(['月份', '實際收入', '實際支出', '結餘', '計劃固定收入', '計劃固定支出', '日常收入', '日常支出']);

  months.forEach(ym => {
    const mt = allTxns.filter(r => r.date && r.date.startsWith(ym));
    const income  = mt.filter(r => r.type === 'income' ).reduce((s, r) => s + (Number(r.amount)||0), 0);
    const expense = mt.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount)||0), 0);

    // 從 Recurring 表計算該月份應有的固定金額（建立時間 <= 該月份）
    const fixedIncome = activeRecurring
      .filter(r => r.type === 'income' && String(r.created_at || '').substring(0, 7) <= ym)
      .reduce((s, r) => s + (Number(r.amount)||0), 0);
    const fixedExpense = activeRecurring
      .filter(r => r.type === 'expense' && String(r.created_at || '').substring(0, 7) <= ym)
      .reduce((s, r) => s + (Number(r.amount)||0), 0);

    sheet.appendRow([
      ym,
      income,
      expense,
      income - expense,
      fixedIncome,
      fixedExpense,
      income  - fixedIncome,
      expense - fixedExpense
    ]);
  });

  // 加粗標題列
  sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  sheet.setFrozenRows(1);

  return { sheetName, months: months.length };
}

/**
 * 月底自動執行月報表（time-driven trigger 呼叫）
 */
function autoMonthlyReport() {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  // 只在月底最後一天執行
  if (tomorrow.getDate() !== 1) return;
  handleGenerateMonthlyReport({});
  Logger.log('月報表自動產生完成：' + Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
}

/**
 * 設定月底自動執行 Trigger（在 GAS 編輯器手動執行一次即可）
 */
function setupMonthlyReportTrigger() {
  // 清除舊的同名 trigger
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoMonthlyReport') ScriptApp.deleteTrigger(t);
  });
  // 每天 23:00 執行，函式內部判斷是否為月底
  ScriptApp.newTrigger('autoMonthlyReport')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .create();
  Logger.log('✓ 月報表自動 Trigger 設定完成（每天 23:00 執行，月底才產生報表）');
}
