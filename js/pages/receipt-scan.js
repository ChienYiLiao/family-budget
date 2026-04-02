/**
 * receipt-scan.js — 收據掃描頁面
 */

const ScanPage = (() => {
  const PAGE_ID = 'page-scan';
  let _selectedFile = null;
  let _scanResult = null;

  function show() {
    _selectedFile = null;
    _scanResult = null;
    _render();
  }

  function hide() {}

  function _render() {
    const page = document.getElementById(PAGE_ID);
    page.innerHTML = `
      <!-- 圖片預覽區 -->
      <div class="scan-area" id="scan-preview-area">
        <div class="scan-placeholder" id="scan-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
            <rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
          <p>點擊下方按鈕拍攝或上傳收據</p>
        </div>
        <img id="scan-preview-img" style="display:none;width:100%;height:240px;object-fit:contain;">
      </div>

      <!-- 操作按鈕 -->
      <div class="scan-actions">
        <button class="btn btn-secondary" onclick="ScanPage._pickImage('camera')">
          📷 拍攝
        </button>
        <button class="btn btn-secondary" onclick="ScanPage._pickImage('gallery')">
          🖼️ 從相簿上傳
        </button>
      </div>

      <!-- 辨識按鈕 -->
      <button class="btn btn-primary btn-block" id="scan-submit-btn" disabled
              onclick="ScanPage._doScan()" style="margin-bottom:16px;opacity:0.5;">
        🔍 開始 AI 識別
      </button>

      <!-- 識別結果 -->
      <div id="scan-result-area" style="display:none;">
        <div class="scan-result">
          <div class="scan-result-title">識別結果</div>
          <div id="scan-result-items"></div>
        </div>
        <div style="display:flex;gap:12px;">
          <button class="btn btn-secondary btn-block" onclick="ScanPage._rescan()">重新掃描</button>
          <button class="btn btn-primary btn-block"   onclick="ScanPage._useResult()">使用此結果記帳</button>
        </div>
      </div>
    `;
    page.classList.add('active');
  }

  function _pickImage(source) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      _selectedFile = file;
      // 顯示預覽
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('scan-placeholder').style.display = 'none';
        const img = document.getElementById('scan-preview-img');
        img.src = ev.target.result;
        img.style.display = 'block';
        // 啟用掃描按鈕
        const btn = document.getElementById('scan-submit-btn');
        btn.disabled = false;
        btn.style.opacity = '1';
        // 隱藏舊結果
        document.getElementById('scan-result-area').style.display = 'none';
        _scanResult = null;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function _doScan() {
    if (!_selectedFile) return;
    const user = State.getState().currentUser;
    if (!user) { Toast.error('請先選擇使用者'); return; }

    Loader.show('AI 識別中...\n約需 5-10 秒');
    try {
      const { base64, mimeType } = await Utils.compressImage(_selectedFile, 1200, 0.85);
      const result = await API.scanReceipt(user.userId, base64, mimeType);

      if (!result.success) {
        Toast.error(result.error || '識別失敗');
        return;
      }

      _scanResult = result;
      _renderResult(result);
    } catch (err) {
      Toast.error('掃描失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  function _renderResult(r) {
    const area = document.getElementById('scan-result-area');
    const items = document.getElementById('scan-result-items');

    const rows = [
      { key: '店家名稱', val: r.merchantName || '—' },
      { key: '金額',     val: r.amount != null ? Utils.formatAmount(r.amount) : '—' },
      { key: '日期',     val: r.date || '—' },
      { key: '稅別',     val: r.taxType || '—' },
      { key: '建議類別', val: r.suggestedCategory || '其他' },
      { key: '辨識信心', val: r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—' }
    ];

    items.innerHTML = rows.map(row => `
      <div class="scan-result-item">
        <span class="scan-result-key">${row.key}</span>
        <span class="scan-result-val">${row.val}</span>
      </div>
    `).join('');

    // 品項列表
    if (r.items && r.items.length > 0) {
      items.innerHTML += `
        <div style="margin-top:12px;">
          <div class="scan-result-title">品項明細</div>
          ${r.items.map(it => `
            <div class="scan-result-item">
              <span class="scan-result-key">${it.name}</span>
              <span class="scan-result-val">${it.quantity || 1} × $${it.price || 0}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    area.style.display = 'block';
  }

  function _rescan() {
    _selectedFile = null;
    _scanResult = null;
    document.getElementById('scan-placeholder').style.display = 'flex';
    document.getElementById('scan-preview-img').style.display = 'none';
    document.getElementById('scan-result-area').style.display = 'none';
    const btn = document.getElementById('scan-submit-btn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }

  function _useResult() {
    if (!_scanResult) return;
    // 帶資料到新增記帳頁
    State.setState({
      pendingTxn: {
        type:           'expense',
        amount:         _scanResult.amount || '',
        category:       _scanResult.suggestedCategory || '其他',
        date:           _scanResult.date || Utils.today(),
        merchant_name:  _scanResult.merchantName || '',
        note:           _scanResult.merchantName || '',
        payment_method: 'cash'
      }
    });
    Router.navigate('add');
  }

  return { show, hide, _pickImage, _doScan, _rescan, _useResult };
})();
