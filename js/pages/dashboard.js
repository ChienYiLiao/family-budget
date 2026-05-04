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
        <button class="btn btn-secondary" id="dash-scan-btn"
                style="display:flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
            <rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
          掃描收據
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
      <div style="padding:0 16px;">
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

      <!-- 使用說明書 -->
      <div style="padding:8px 16px 32px;">
        <div style="border-top:2px dashed var(--color-border);margin-bottom:16px;"></div>
        <div class="card" style="background:var(--color-bg-elevated);border:1px solid var(--color-border);">
          <div class="card-header" style="cursor:pointer;padding-bottom:12px;" onclick="DashboardPage._toggleGuide()">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">📖</span>
              <div>
                <div class="card-title" style="font-size:15px;">使用說明書</div>
                <div style="font-size:11px;color:var(--color-text-muted);margin-top:1px;">點擊展開功能介紹</div>
              </div>
            </div>
            <div id="dash-guide-arrow" style="color:var(--color-text-muted);font-size:14px;transition:transform 0.2s;">▼</div>
          </div>
          <div id="dash-guide-body" style="display:none;">
            ${_guideHTML()}
          </div>
        </div>
      </div>
    `;

    document.getElementById('dash-scan-btn').onclick = () => Router.navigate('scan');
  }

  async function _loadData() {
    _autoApplyOnce();
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

  // 每天首次開啟 Dashboard 時靜默套用固定收支（有重複保護，不影響已手動記帳的項目）
  function _autoApplyOnce() {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('lastApplyDate') === today) return;
    const now = new Date();
    API.applyRecurring(now.getFullYear(), now.getMonth() + 1)
      .then(() => localStorage.setItem('lastApplyDate', today))
      .catch(() => {});
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
    const colors = ['#9b8fb0','#c28a8a','#7aaa8e','#c4a87a','#7a9ab5'];

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
          backgroundColor: 'rgba(155,143,176,0.2)',
          borderColor: '#9b8fb0',
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
          y: { grid: { color: '#2e2d3a' }, ticks: { font: { size: 10 }, callback: v => v > 0 ? `$${v/1000}k` : '$0' } }
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
    const userEmoji = CONFIG.getUserDisplay(t.user_id);
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

  function _guideHTML() {
    const sections = [
      {
        icon: '✏️', title: '手動記帳',
        desc: '點擊底部「記帳」按鈕，選擇支出或收入，填入金額、類別、支付方式與日期後按「確認記帳」。記帳時可切換「👤 個人」或「👫 共同」，共同消費會在記錄中同時顯示兩人的 emoji。'
      },
      {
        icon: '📷', title: '掃描收據',
        desc: '點擊底部「掃描」按鈕，拍攝或上傳收據圖片，AI 會自動識別金額、店名、日期與品項，確認後一鍵帶入記帳表單。首次使用時會提示輸入 Google AI Studio API Key，輸入後自動記住，不需重複輸入。'
      },
      {
        icon: '🔁', title: '固定收支（手動確認 + 月底自動入帳）',
        desc: '每個月可到「記帳」→「🔁 固定」Tab 手動點擊確認，金額可修改後送出。若當月忘記點擊，系統會在每月最後一天 23:00 自動將所有未記帳的固定項目入帳，確保不漏記。同月只會記一次，不會重複。'
      },
      {
        icon: '⚙️', title: '固定收支管理',
        desc: '點「記帳」→「🔁 固定」Tab，點右上角「管理 →」進入管理頁面，可新增、啟用/停用、刪除固定項目。固定收入項目下方有「本月調整」連結，可在薪水等金額有變動時直接修改當月實際金額。'
      },
      {
        icon: '📋', title: '歷史記錄',
        desc: '點底部「記錄」查看每月記帳明細，可依類型與類別篩選，左右箭頭切換月份。點擊單筆記帳可查看詳情（含記帳對象）或刪除。'
      },
      {
        icon: '📊', title: '統計分析',
        desc: '點底部「統計」查看豬豬／滾滾／共同的收支對比、月趨勢圖、支付方式佔比、類別排名與本期 Top 10 大額消費。預設只看當月，可拉「從」選單調整區間。勾選「排除房貸/房租」可排除大額固定支出讓類別分析更直覺；勾選「排除固定收支項目」可排除所有固定收支看純日常開銷。點「產生月報表」可選月份範圍後匯出至 Google Sheets。'
      },
      {
        icon: '🖼️', title: '更換頭像',
        desc: '回到登入畫面，長按自己的頭像即可從相機拍攝或從相簿選擇，裁切後直接套用，無需上傳至後端。'
      }
    ];
    return `
      <div style="padding-top:4px;padding-bottom:4px;">
        ${sections.map(s => `
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-border);">
            <div style="font-size:22px;flex-shrink:0;width:28px;text-align:center;">${s.icon}</div>
            <div>
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${s.title}</div>
              <div style="font-size:13px;color:var(--color-text-muted);line-height:1.6;">${s.desc}</div>
            </div>
          </div>
        `).join('')}
        <div style="text-align:center;padding-top:12px;font-size:12px;color:var(--color-text-muted);">
          有問題找豬豬 🐷
        </div>
      </div>
    `;
  }

  function _toggleGuide() {
    const body  = document.getElementById('dash-guide-body');
    const arrow = document.getElementById('dash-guide-arrow');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display  = isOpen ? 'none' : 'block';
    if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  }

  return { show, hide, _toggleGuide };
})();
