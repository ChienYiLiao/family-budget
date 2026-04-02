/**
 * Dashboard.gs — Dashboard 彙總資料
 */

function handleGetDashboard(params) {
  const tz    = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const year  = params.year  ? parseInt(params.year)  : parseInt(today.substring(0, 4));
  const month = params.month ? parseInt(params.month) : parseInt(today.substring(5, 7));
  const ym    = `${year}-${String(month).padStart(2,'0')}`;

  const allTxns = readAllRows('TRANSACTIONS');

  // 今日
  const todayTxns = allTxns.filter(r => r.date === today);
  const todayExpense = todayTxns
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const todayIncome = todayTxns
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 當月
  const monthTxns = allTxns.filter(r => r.date && r.date.startsWith(ym));
  const monthExpense = monthTxns
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const monthIncome = monthTxns
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 當月支出按類別匯總
  const expenseTxns = monthTxns.filter(r => r.type === 'expense');
  const categoryMap = {};
  expenseTxns.forEach(r => {
    const cat = r.category || '其他';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(r.amount) || 0);
  });
  const expenseByCategory = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: monthExpense > 0 ? Math.round(amount / monthExpense * 1000) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // 每日支出
  const dailyMap = {};
  expenseTxns.forEach(r => {
    dailyMap[r.date] = (dailyMap[r.date] || 0) + (Number(r.amount) || 0);
  });
  const dailyExpense = Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 最近 10 筆記帳
  const recentTxns = [...allTxns]
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, 10);

  return {
    today: {
      date: today,
      totalExpense: todayExpense,
      totalIncome: todayIncome,
      transactions: todayTxns.slice(0, 5)
    },
    currentMonth: {
      year,
      month,
      totalExpense: monthExpense,
      totalIncome: monthIncome,
      netAmount: monthIncome - monthExpense,
      expenseByCategory,
      dailyExpense
    },
    recentTransactions: recentTxns
  };
}
