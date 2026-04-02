/**
 * Stats.gs — 統計分析資料
 */

function handleGetStats(params) {
  const allTxns = readAllRows('TRANSACTIONS');
  const userId = params.userId || null;
  const txns = userId ? allTxns.filter(r => r.user_id === userId) : allTxns;

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
