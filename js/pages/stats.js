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
      <div class="stats-filter" style="margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600;color:var(--color-text-muted);">從</div>
        <select class="form-input" id="stats-start-year" style="flex:1;padding:8px 12px;" onchange="StatsPage._load()">
          ${[thisYear-1, thisYear].map(y=>`<option value="${y}" ${y===s.year?'selected':''}>${y}</option>`).join('')}
        </select>
        <select class="form-input" id="stats-start-month" style="flex:1;padding:8px 12px;" onchange="StatsPage._load()">
          ${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===s.month?'selected':''}>${m} 月</option>`).join('')}
        </select>
        <div style="font-size:13px;font-weight:600;color:var(--color-text-muted);">至 ${thisYear}/${thisMonth}</div>
      </div>
      <!-- 固定收支 toggle -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 12px;background:var(--color-bg-card);border-radius:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;font-size:13px;color:var(--color-text-muted);">
          <input type="checkbox" id="stats-exclude-recurring" onchange="StatsPage._load()" style="width:16px;height:16px;accent-color:var(--color-primary);">
          排除固定收支項目
        </label>
        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="StatsPage._generateReport()">產生月報表</button>
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

      <!-- 單項消費 Top 10 -->
      <div class="card section">
        <div class="card-header">
          <div class="card-title">本期最大消費 Top 10</div>
        </div>
        <div id="stats-top-txns"></div>
      </div>
    `;
  }

  async function _load() {
    const startYear  = parseInt(document.getElementById('stats-start-year').value);
    const startMonth = parseInt(document.getElementById('stats-start-month').value);
    const now = new Date();
    const endYear = now.getFullYear(), endMonth = now.getMonth() + 1;
    const excludeRecurring = document.getElementById('stats-exclude-recurring')?.checked ? 'true' : 'false';

    Loader.show('統計中...');
    try {
      const data = await API.getStats({ startYear, startMonth, endYear, endMonth, excludeRecurring });
      _renderTrendChart(data.monthlyTrend);
      _renderPayChart(data.paymentMethodBreakdown);
      _renderCategoryRank(data.categoryBreakdown);
      _renderTopTransactions(data.topTransactions);
    } catch(err) {
      Toast.error('載入失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  function _generateReport() {
    const now = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    // 建立月份範圍選擇 Modal
    const id = 'report-range-modal';
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'modal-overlay';
      overlay.onclick = e => { if (e.target === overlay) Modal.hide(id); };
      document.body.appendChild(overlay);
    }

    const yearOpts = [thisYear - 2, thisYear - 1, thisYear]
      .map(y => `<option value="${y}" ${y === thisYear - 1 ? 'selected' : ''}>${y}</option>`).join('');
    const monthOpts = Array.from({length: 12}, (_, i) => i + 1)
      .map(m => `<option value="${m}" ${m === 1 ? 'selected' : ''}>${m} 月</option>`).join('');
    const endMonthOpts = Array.from({length: 12}, (_, i) => i + 1)
      .map(m => `<option value="${m}" ${m === thisMonth ? 'selected' : ''}>${m} 月</option>`).join('');
    const endYearOpts = [thisYear - 2, thisYear - 1, thisYear]
      .map(y => `<option value="${y}" ${y === thisYear ? 'selected' : ''}>${y}</option>`).join('');

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">產生月報表</div>
        <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;line-height:1.6;">
          選擇要產生的月份範圍。每次產生會覆蓋整張報表，資料來源為交易記錄，隨時可重新產生。
        </div>
        <div class="form-group">
          <div class="form-label">起始月份</div>
          <div style="display:flex;gap:8px;">
            <select class="form-input" id="rpt-start-year" style="flex:1;">${yearOpts}</select>
            <select class="form-input" id="rpt-start-month" style="flex:1;">${monthOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">結束月份</div>
          <div style="display:flex;gap:8px;">
            <select class="form-input" id="rpt-end-year" style="flex:1;">${endYearOpts}</select>
            <select class="form-input" id="rpt-end-month" style="flex:1;">${endMonthOpts}</select>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;">
          <button class="btn btn-secondary btn-block" onclick="Modal.hide('${id}')">取消</button>
          <button class="btn btn-primary btn-block" onclick="StatsPage._confirmGenerateReport()">產生</button>
        </div>
      </div>
    `;
    Modal.show(id);
  }

  async function _confirmGenerateReport() {
    const startYear  = parseInt(document.getElementById('rpt-start-year').value);
    const startMonth = parseInt(document.getElementById('rpt-start-month').value);
    const endYear    = parseInt(document.getElementById('rpt-end-year').value);
    const endMonth   = parseInt(document.getElementById('rpt-end-month').value);

    const startYm = `${startYear}-${String(startMonth).padStart(2,'0')}`;
    const endYm   = `${endYear}-${String(endMonth).padStart(2,'0')}`;

    if (startYm > endYm) { Toast.error('起始月份不能晚於結束月份'); return; }

    Modal.hide('report-range-modal');
    Loader.show('產生月報表中...');
    try {
      const result = await API.generateMonthlyReport({ startYm, endYm });
      Toast.success(`月報表已產生！共 ${result.months} 個月`);
    } catch(err) {
      Toast.error('產生失敗：' + err.message);
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

    const colorMap = { cash: '#f59e0b', credit_card: '#3b82f6', easy_card: '#10b981', bank_transfer: '#a855f7' };
    const labelMap = { cash: '現金', credit_card: '信用卡', easy_card: '悠遊卡', bank_transfer: '轉帳' };

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

  function _renderTopTransactions(txns) {
    const el = document.getElementById('stats-top-txns');
    if (!el) return;
    if (!txns || !txns.length) {
      el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">尚無資料</div>';
      return;
    }
    el.innerHTML = txns.map((t, i) => {
      const emoji = CONFIG.getCategoryEmoji(t.category);
      const user  = CONFIG.USERS[t.user_id];
      const userEmoji = user ? user.emoji : '👤';
      const label = t.note || t.category;
      return `
        <div class="txn-item" style="margin-bottom:6px;">
          <div style="font-size:13px;font-weight:700;color:var(--color-text-muted);width:20px;text-align:center;">${i+1}</div>
          <div class="txn-cat-icon" style="margin-left:4px;">${emoji}</div>
          <div class="txn-info">
            <div class="txn-category">${label}</div>
            <div class="txn-note">${t.date} ${userEmoji}</div>
          </div>
          <div class="txn-amount expense">-${Utils.formatAmount(t.amount)}</div>
        </div>
      `;
    }).join('');
  }

  return { show, hide, _load, _generateReport, _confirmGenerateReport };
})();
