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

    if (!CONFIG.GEMINI_API_KEY) {
      Toast.error('請先在 config.js 填入 GEMINI_API_KEY');
      return;
    }

    Loader.show('AI 識別中...\n約需 5-10 秒');
    try {
      const { base64, mimeType } = await Utils.compressImage(_selectedFile, 1200, 0.85);
      const parsed = await _callGemini(base64, mimeType);

      _scanResult = {
        success:           true,
        merchantName:      parsed.merchantName      || '',
        amount:            parsed.amount            || null,
        date:              parsed.date              || null,
        taxType:           parsed.taxType           || null,
        items:             parsed.items             || [],
        suggestedCategory: parsed.suggestedCategory || '其他',
        confidence:        parsed.confidence        || 0
      };
      _renderResult(_scanResult);
    } catch (err) {
      Toast.error('掃描失敗：' + err.message);
    } finally {
      Loader.hide();
    }
  }

  async function _callGemini(base64, mimeType) {
    const key = CONFIG.GEMINI_API_KEY;
    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-flash-latest'
    ];

    const prompt = `你是一個專業的繁體中文發票/收據解析助手。
請仔細分析這張發票或收據圖片，提取所有可見的資訊。

請以 JSON 格式回傳以下資訊（所有欄位都必須填寫，無法辨識的欄位填 null）：
{
  "merchantName": "店家名稱（字串，如：全家便利商店、麥當勞）",
  "amount": 總金額數字（不含貨幣符號，純數字，例如：156），
  "date": "交易日期（YYYY-MM-DD 格式，無法辨識則填 null）",
  "taxType": "含稅/未稅/免稅（無法辨識填 null）",
  "items": [
    { "name": "品項名稱", "price": 單價數字, "quantity": 數量數字 }
  ],
  "suggestedCategory": "從以下分類選一個最合適的：三餐/飲料/點心/看診/藥物/日用品/加油/叫車/大眾運輸/衣物/化妝品/包包/3C產品/禮物/剪頭髮/霧眉/玩樂/投資/拜拜/其他",
  "confidence": 整體辨識信心分數（0.0 到 1.0）
}

注意：
- 所有文字請用繁體中文
- 金額只填數字，不要包含 NT$、$ 等符號
- 只回傳 JSON，不要包含任何其他說明文字或 markdown 語法`;

    const payload = {
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    };

    let lastError = '';
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.error) {
        const msg = data.error.message || '';
        const code = data.error.code || 0;
        // 模型不存在/已棄用 → 換下一個
        if (code === 404 || msg.includes('not found') || msg.includes('deprecated') || msg.includes('no longer')) {
          lastError = msg;
          continue;
        }
        throw new Error('Gemini 錯誤：' + msg);
      }

      let text = data.candidates[0].content.parts[0].text.trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(text);
    }
    throw new Error('所有 Gemini 模型均無法使用：' + lastError);
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
