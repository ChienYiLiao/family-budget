/**
 * Receipt.gs — 收據 AI 識別（Google Vision OCR + Gemini 解析）
 */

function handleScanReceipt(body) {
  const userId      = body.user_id    || '';
  const imageBase64 = body.imageBase64 || '';  // 純 base64，不含 data:image/xxx;base64, 前綴
  const mimeType    = body.mimeType   || 'image/jpeg';

  if (!imageBase64) throw new Error('Missing imageBase64');

  const visionKey = getProp('VISION_API_KEY');
  const geminiKey = getProp('GEMINI_API_KEY');

  // Step 1: Google Vision API — OCR 文字擷取
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`;
  const visionPayload = {
    requests: [{
      image: { content: imageBase64 },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
    }]
  };
  const visionRes = UrlFetchApp.fetch(visionUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(visionPayload),
    muteHttpExceptions: true
  });
  const visionData = JSON.parse(visionRes.getContentText());

  let rawText = '';
  try {
    rawText = visionData.responses[0].fullTextAnnotation.text || '';
  } catch(_) {
    rawText = '';
  }

  if (!rawText) {
    _logReceipt(userId, '', JSON.stringify({ error: 'no_text' }), 'failed', '無法識別文字', '');
    return { success: false, error: '無法從圖片中識別文字，請確認圖片清晰度' };
  }

  // Step 2: Gemini API — 結構化解析
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
  const prompt = `你是一個繁體中文發票/收據解析助手。
以下是從收據 OCR 掃描的文字，請從中提取結構化資訊。

OCR 文字：
---
${rawText}
---

請以 JSON 格式回傳以下資訊（所有欄位都必須填寫，無法辨識的欄位填 null）：
{
  "merchantName": "店家名稱（字串）",
  "amount": 總金額數字（不含貨幣符號，純數字，無法辨識填 null）,
  "date": "交易日期（YYYY-MM-DD 格式，無法辨識則填 null）",
  "taxType": "含稅/未稅/免稅（無法辨識填 null）",
  "items": [
    { "name": "品項名稱", "price": 單價數字, "quantity": 數量數字 }
  ],
  "suggestedCategory": "從以下分類選一個最合適的：三餐/飲料/點心/看診/藥物/日用品/加油/叫車/大眾運輸/衣物/化妝品/包包/3C產品/禮物/剪頭髮/霧眉/玩樂/投資/拜拜/其他",
  "confidence": 整體辨識信心分數（0.0 到 1.0）
}

只回傳 JSON，不要包含任何其他說明文字或 markdown 語法。`;

  const geminiPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  };
  const geminiRes = UrlFetchApp.fetch(geminiUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(geminiPayload),
    muteHttpExceptions: true
  });
  const geminiData = JSON.parse(geminiRes.getContentText());

  let parsed = null;
  let parsedStr = '';
  try {
    let text = geminiData.candidates[0].content.parts[0].text.trim();
    // 移除可能的 markdown code block
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(text);
    parsedStr = JSON.stringify(parsed);
  } catch(e) {
    _logReceipt(userId, rawText, '', 'failed', 'Gemini 解析失敗: ' + e.message, '');
    return {
      success: false,
      error: 'AI 解析失敗，請手動輸入',
      rawText
    };
  }

  const logId = _logReceipt(userId, rawText, parsedStr, 'success', '', '');

  return {
    success: true,
    logId,
    merchantName:       parsed.merchantName || '',
    amount:             parsed.amount || null,
    date:               parsed.date   || null,
    taxType:            parsed.taxType || null,
    items:              parsed.items   || [],
    suggestedCategory:  parsed.suggestedCategory || '其他',
    confidence:         parsed.confidence || 0,
    rawText
  };
}

function _logReceipt(userId, rawText, parsedResult, status, errorMsg, transactionId) {
  const id = generateId('rcpt');
  appendRow('RECEIPT_LOG', {
    log_id:          id,
    user_id:         userId,
    raw_ocr_text:    rawText.substring(0, 5000),  // 避免超過 cell 限制
    parsed_result:   parsedResult.substring(0, 5000),
    status,
    error_message:   errorMsg,
    transaction_id:  transactionId,
    created_at:      nowIso()
  });
  return id;
}
