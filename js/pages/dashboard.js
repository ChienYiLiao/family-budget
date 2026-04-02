/**
 * dashboard.js — Dashboard 頁面
 */

const DashboardPage = (() => {
  let _chartPie = null;
  let _chartBar = null;
  const PAGE_ID = 'page-dashboard';

  function show() {
    _render();
    _loadData();
  }

  function hide() {
    // Chart.js 實例在重新渲染時銷毀
  }

  function _render() {
    const page = document.getElementById(PAGE_ID);
    const user = State.getState().currentUser;
    const now = new Date();
    const month = now.getMonth() + 1;

    page.innerHTML = `
      <div class="dashboard-header" style="padding:16px 16px 0;">
        <div>
          <div class="dashboard-greeting">嗨，${user?.displayName || ''}！👋</div>
          <div class="dashboard-date">${now.getFullYear()} 年 ${month} 月</div>
        </div>
        <button class="btn btn-icon" id="dash-scan-btn" title="掃描收據">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
            <rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
        </button>
      </div>

      <!-- 主摘要卡 -->
      <div style="padding:0 16px;">
        <div class="summary-card" id="dash-summary">
          <div class="summary-label">本月支出</div>
          <div class="summary-amount" id="dash-month-expense">載入中...</div>
          <div class="summary-row">
            <div class="summary-sub">
              <div class="summary-sub-label">本月收入</div>
              <div class="summary-sub-amount" id="dash-month-income">—</div>
            </div>
            <div class="summary-sub">
              <div class="summary-sub-label">結餘</div>
              <div class="summary-sub-amount" id="dash-month-net">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 今日 + 結餘 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">今日支出</div>
          <div class="stat-value amount-expense" id="dash-today-expense">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">今日收入</div>
          <div class="stat-value amount-income" id="dash-today-income">—</div>
        </div>
      </div>

      <!-- 支出類別圓餅圖 -->
      <div style="padding:0 16px;">
        <div class="card section">
          <div class="card-header">
            <div class="card-title">支出類別</div>
          </div>
          <div class="chart-container" style="display:flex;align-items:center;gap:16px;padding:0;">
            <div style="flex:0 0 140px;height:140px;position:relative;">
              <canvas id="dash-pie-chart"></canvas>
            </div>
            <div id="dash-legend" style="flex:1;font-size:12px;"></div>
          </div>
        </div>
      </div>

      <!-- 每日支出長條圖 -->
      <div style="padding:0 16px;">
        <div class="card section">
          <div class="card-header">
            <div class="card-title">每日支出趨勢</div>
          </div>
          <div style="height:160px;position:relative;">
            <canvas id="dash-bar-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- 最近記帳 -->
      <div style="padding:0 16px 16px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">最近記帳</div>
            <a href="#history" style="font-size:12px;color:var(--color-primary);font-weight:600;">全部 →</a>
          </div>
          <div id="dash-recent-list" class="txn-list">
            <div class="loader-spinner" style="margin:16px auto;width:24px;height:24px;"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dash-scan-btn').onclick = () => Router.navigate('scan');
  }

  async function _loadData() {
    try {
      const now = new Date();
      const data = await API.getDashboard(now.getFullYear(), now.getMonth() + 1);
      _updateSummary(data);
      _renderPieChart(data.currentMonth.expenseByCategory);
      _renderBarChart(data.currentMonth.dailyExpense, data.currentMonth.year, data.currentMonth.month);
      _renderRecentList(data.recentTransactions);
    } catch (err) {
      Toast.error('Dashboard 載入失敗');
      document.getElementById('dash-month-expense').textContent = '錯誤';
    }
  }

  function _updateSummary(data) {
    const { today, currentMonth } = data;
    document.getElementById('dash-month-expense').textContent = Utils.formatAmount(currentMonth.totalExpense);
    document.getElementById('dash-month-income').textContent  = Utils.formatAmount(currentMonth.totalIncome);
    document.getElementById('dash-month-net').textContent     = Utils.formatAmount(currentMonth.netAmount);
    document.getElementById('dash-today-expense').textContent = Utils.formatAmount(today.totalExpense);
    document.getElementById('dash-today-income').textContent  = Utils.formatAmount(today.totalIncome);
  }

  function _renderPieChart(categories) {
    if (!categories || categories.length === 0) {
      document.getElementById('dash-legend').innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">本月尚無支出記錄</div>';
      return;
    }
    const top5 = categories.slice(0, 5);
    const colors = ['#6c63ff','#ff6b6b','#4caf88','#f59e0b','#3b82f6'];

    if (_chartPie) { _chartPie.destroy(); _chartPie = null; }
    const ctx = document.getElementById('dash-pie-chart');
    if (!ctx) return;

    _chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top5.map(c => c.category),
        datasets: [{
          data: top5.map(c => c.amount),
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });

    // 圖例
    document.getElementById('dash-legend').innerHTML = top5.map((c, i) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="width:10px;height:10px;border-radius:2px;background:${colors[i]};flex-shrink:0;"></div>
        <span style="flex:1;color:var(--color-text);">${c.category}</span>
        <span style="font-weight:700;color:var(--color-expense);">${c.percentage}%</span>
      </div>
    `).join('');
  }

  function _renderBarChart(dailyData, year, month) {
    if (_chartBar) { _chartBar.destroy(); _chartBar = null; }
    const ctx = document.getElementById('dash-bar-chart');
    if (!ctx) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dataMap = {};
    (dailyData || []).forEach(d => {
      const day = parseInt(d.date.split('-')[2]);
      dataMap[day] = d.amount;
    });
    const amounts = labels.map(d => dataMap[d] || 0);

    _chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(d => `${d}`),
        datasets: [{
          data: amounts,
          backgroundColor: '#6c63ff40',
          borderColor: '#6c63ff',
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => Utils.formatAmount(ctx.raw) }
        }},
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { grid: { color: '#f0f0f8' }, ticks: { font: { size: 10 }, callback: v => v > 0 ? `$${v/1000}k` : '$0' } }
        }
      }
    });
  }

  function _renderRecentList(txns) {
    const el = document.getElementById('dash-recent-list');
    if (!el) return;
    if (!txns || txns.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-desc">尚無記帳記錄</div></div>';
      return;
    }
    el.innerHTML = txns.map(t => _renderTxnItem(t)).join('');
  }

  function _renderTxnItem(t) {
    const emoji = CONFIG.getCategoryEmoji(t.category);
    const isExpense = t.type === 'expense';
    const user = CONFIG.USERS[t.user_id];
    const userEmoji = user ? user.emoji : '👤';
    return `
      <div class="txn-item">
        <div class="txn-cat-icon">${emoji}</div>
        <div class="txn-info">
          <div class="txn-category">${t.category || '其他'}</div>
          <div class="txn-note">${t.note || t.merchant_name || Utils.formatDate(t.date)}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount ${isExpense ? 'expense' : 'income'}">
            ${isExpense ? '-' : '+'}${Utils.formatAmount(t.amount)}
          </div>
          <div class="txn-meta">${userEmoji} ${Utils.formatDate(t.date, 'short')}</div>
        </div>
      </div>
    `;
  }

  return { show, hide };
})();
