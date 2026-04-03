/**
 * Receipt.gs — 收據 AI 識別
 * 直接使用 Gemini 原生視覺能力，不需要 Cloud Vision API
 * 只需設定 Script Properties: GEMINI_API_KEY
 */

function handleScanReceipt(body) {
  const userId      = body.user_id     || '';
  const imageBase64 = body.imageBase64 || '';
  const mimeType    = body.mimeType    || 'image/jpeg';

  if (!imageBase64) throw new Error('Missing imageBase64');

  const geminiKey = getProp('GEMINI_API_KEY');
  if (!geminiKey) {
    _logReceipt(userId, '', JSON.stringify({ error: 'no_gemini_key' }), 'failed', '未設定 GEMINI_API_KEY', '');
    return { success: false, error: '後端未設定 Gemini API Key，請聯絡管理員' };
  }

  // gemini-1.5-flash：確認對此 API Key 可用的穩定版本
  const GEMINI_MODEL = 'gemini-1.5-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;

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

  const geminiPayload = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64
          }
        },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096
    }
  };

  // 呼叫 Gemini，過載時自動重試一次（換備用模型）
  function _callGemini(url, payload) {
    return UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  }

  let geminiRes, geminiData;
  try {
    geminiRes = _callGemini(geminiUrl, geminiPayload);
    geminiData = JSON.parse(geminiRes.getContentText());

    // 若遇到 503 過載，自動 retry 一次（用備用模型）
    if (geminiData.error && geminiData.error.code === 503) {
      Utilities.sleep(2000);
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`;
      geminiRes  = _callGemini(fallbackUrl, geminiPayload);
      geminiData = JSON.parse(geminiRes.getContentText());
    }
  } catch(e) {
    _logReceipt(userId, '', '', 'failed', 'Gemini fetch 失敗: ' + e.message, '');
    return { success: false, error: 'AI 服務連線失敗，請稍後再試' };
  }

  // 檢查 API 回應是否有錯誤
  if (geminiData.error) {
    const errMsg = geminiData.error.message || JSON.stringify(geminiData.error);
    _logReceipt(userId, '', '', 'failed', 'Gemini API 錯誤: ' + errMsg, '');
    return { success: false, error: 'AI 暫時忙碌，請稍後再試一次' };
  }

  let parsed = null;
  let parsedStr = '';
  try {
    let text = geminiData.candidates[0].content.parts[0].text.trim();
    // 移除可能的 markdown code block
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(text);
    parsedStr = JSON.stringify(parsed);
  } catch(e) {
    const rawText = JSON.stringify(geminiData).substring(0, 500);
    _logReceipt(userId, rawText, '', 'failed', 'JSON 解析失敗: ' + e.message, '');
    return {
      success: false,
      error: 'AI 解析結果格式有誤，請手動輸入'
    };
  }

  const logId = _logReceipt(userId, '(via Gemini vision)', parsedStr, 'success', '', '');

  return {
    success: true,
    logId,
    merchantName:       parsed.merchantName      || '',
    amount:             parsed.amount            || null,
    date:               parsed.date              || null,
    taxType:            parsed.taxType           || null,
    items:              parsed.items             || [],
    suggestedCategory:  parsed.suggestedCategory || '其他',
    confidence:         parsed.confidence        || 0
  };
}

function _logReceipt(userId, rawText, parsedResult, status, errorMsg, transactionId) {
  const id = generateId('rcpt');
  try {
    appendRow('RECEIPT_LOG', {
      log_id:          id,
      user_id:         userId,
      raw_ocr_text:    String(rawText || '').substring(0, 3000),
      parsed_result:   String(parsedResult || '').substring(0, 3000),
      status:          status,
      error_message:   errorMsg,
      transaction_id:  transactionId,
      created_at:      nowIso()
    });
  } catch(e) {
    // log 寫入失敗不影響主流程
  }
  return id;
}
