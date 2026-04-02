/**
 * stats.js — 統計分析頁面
 */

const StatsPage = (() => {
  const PAGE_ID = 'page-stats';
  let _chartTrend = null;
  let _chartPay = null;

  function show() {
    _render();
    _loadData();
  }

  function hide() {
    if (_chartTrend) { _chartTrend.destroy(); _chartTrend = null; }
    if (_chartPay)   { _chartPay.destroy();   _chartPay   = null; }
  }

  function _render() {
    const now = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    // 預設顯示近 6 個月
    const startDate = Utils.prevMonth(thisYear, thisMonth);
    let s = startDate;
    for (let i = 0; i < 5; i++) s = Utils.prevMonth(s.year, s.month);

    const page = document.getElementById(PAGE_ID);
    page.innerHTML = `
      <!-- 篩選 -->
      <div class="stats-filter" style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--color-text-muted);">從</div>
        <select class="form-input" id="stats-start-year" style="flex:1;padding:8px 12px;" onchange="StatsPage._load()">
          ${[thisYear-1, thisYear].map(y=>`<option value="${y}" ${y===s.year?'selected':''}>${y}</option>`).join('')}
        </select>
        <select class="form-input" id="stats-start-month" style="flex:1;padding:8px 12px;" onchange="StatsPage._load()">
          ${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===s.month?'selected':''}>${m} 月</option>`).join('')}
        </select>
        <div style="font-size:13px;font-weight:600;color:var(--color-text-muted);">至 ${thisYear}/${thisMonth}</div>
      </div>

      <!-- 月趨勢 -->
      <div class="card section">
        <div class="card-header">
          <div class="card-title">月收支趨勢</div>
        </div>
        <div style="height:200px;position:relative;">
          <canvas id="stats-trend-chart"></canvas>
        </div>
      </div>

      <!-- 支付方式佔比 -->
      <div class="card section">
        <div class="card-header">
          <div class="card-title">支付方式佔比</div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="flex:0 0 120px;height:120px;position:relative;">
            <canvas id="stats-pay-chart"></canvas>
          </div>
          <div id="stats-pay-legend" style="flex:1;font-size:12px;"></div>
        </div>
      </div>

      <!-- 類別排名 -->
      <div class="card section">
        <div class="card-header">
          <div class="card-title">支出類別排名</div>
        </div>
        <div class="category-rank-list" id="stats-category-rank"></div>
      </div>
    `;
    page.classList.add('active');
  }

  async function _load() {
    const startYear  = parseInt(document.getElementById('stats-start-year').value);
    const startMonth = parseInt(document.getElementById('stats-start-month').value);
    const now = new Date();
    const endYear = now.getFullYear(), endMonth = now.getMonth() + 1;

    Loader.show('統計中...');
    try {
      const data = await API.getStats({ startYear, startMonth, endYear, endMonth });
      _renderTrendChart(data.monthlyTrend);
      _renderPayChart(data.paymentMethodBreakdown);
      _renderCategoryRank(data.categoryBreakdown);
    } catch(err) {
      Toast.error('載入失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  async function _loadData() {
    await _load();
  }

  function _renderTrendChart(trend) {
    if (_chartTrend) { _chartTrend.destroy(); _chartTrend = null; }
    const ctx = document.getElementById('stats-trend-chart');
    if (!ctx || !trend || !trend.length) return;

    _chartTrend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => {
          const [, m] = t.yearMonth.split('-');
          return `${parseInt(m)}月`;
        }),
        datasets: [
          {
            label: '支出',
            data: trend.map(t => t.totalExpense),
            backgroundColor: 'rgba(255,107,107,0.7)',
            borderRadius: 4
          },
          {
            label: '收入',
            data: trend.map(t => t.totalIncome),
            backgroundColor: 'rgba(76,175,136,0.7)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatAmount(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#f0f0f8' }, ticks: { font: { size: 10 }, callback: v => `$${v/1000}k` } }
        }
      }
    });
  }

  function _renderPayChart(payData) {
    if (_chartPay) { _chartPay.destroy(); _chartPay = null; }
    const ctx = document.getElementById('stats-pay-chart');
    if (!ctx || !payData || !payData.length) return;

    const colorMap = { cash: '#f59e0b', credit_card: '#3b82f6', easy_card: '#10b981' };
    const labelMap = { cash: '現金', credit_card: '信用卡', easy_card: '悠遊卡' };

    _chartPay = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: payData.map(p => labelMap[p.method] || p.method),
        datasets: [{
          data: payData.map(p => p.amount),
          backgroundColor: payData.map(p => colorMap[p.method] || '#aaa'),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });

    document.getElementById('stats-pay-legend').innerHTML = payData.map(p => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="width:10px;height:10px;border-radius:2px;background:${colorMap[p.method]||'#aaa'};flex-shrink:0;"></div>
        <span style="flex:1;">${labelMap[p.method]||p.method}</span>
        <span style="font-weight:700;">${p.percentage}%</span>
      </div>
    `).join('');
  }

  function _renderCategoryRank(cats) {
    const el = document.getElementById('stats-category-rank');
    if (!el) return;
    if (!cats || !cats.length) {
      el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">尚無資料</div>';
      return;
    }
    const max = cats[0].total;
    el.innerHTML = cats.slice(0, 10).map(c => `
      <div class="category-rank-item">
        <div style="font-size:18px;width:24px;text-align:center;">${CONFIG.getCategoryEmoji(c.category)}</div>
        <div class="category-rank-label">${c.category}</div>
        <div class="category-rank-bar-wrap">
          <div class="category-rank-bar" style="width:${max>0?Math.round(c.total/max*100):0}%"></div>
        </div>
        <div class="category-rank-amount">${Utils.formatAmount(c.total)}</div>
      </div>
    `).join('');
  }

  return { show, hide, _load };
})();
