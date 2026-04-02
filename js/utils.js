/**
 * utils.js — 前端工具函式
 */

const Utils = {
  /**
   * 格式化金額（加千分位，前置 $）
   */
  formatAmount(amount, showSign = false) {
    const n = Math.abs(Number(amount) || 0);
    const str = n.toLocaleString('zh-TW');
    if (showSign) return (amount < 0 ? '-' : '+') + ' $' + str;
    return '$' + str;
  },

  /**
   * 格式化日期
   * @param {string} dateStr - YYYY-MM-DD
   * @param {'short'|'medium'|'long'} format
   */
  formatDate(dateStr, format = 'medium') {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ['日','一','二','三','四','五','六'];
    const wd = weekdays[date.getDay()];
    if (format === 'short') return `${m}/${d}`;
    if (format === 'long')  return `${y} 年 ${m} 月 ${d} 日（${wd}）`;
    return `${m}/${d}（${wd}）`;
  },

  /**
   * 今天的 YYYY-MM-DD
   */
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  /**
   * 年月字串 YYYY-MM
   */
  yearMonth(year, month) {
    return `${year}-${String(month).padStart(2,'0')}`;
  },

  /**
   * 解析年月字串
   */
  parseYearMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return { year: y, month: m };
  },

  /**
   * 取得上/下個月
   */
  prevMonth(year, month) {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  },
  nextMonth(year, month) {
    if (month === 12) return { year: year + 1, month: 1 };
    return { year, month: month + 1 };
  },

  /**
   * 截斷字串
   */
  truncate(str, maxLen = 20) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
  },

  /**
   * 防抖
   */
  debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 圖片壓縮（Canvas resize）
   * @param {File|Blob} file
   * @param {number} maxPx - 最大邊長
   * @param {number} quality - JPEG 品質 0-1
   * @returns {Promise<{base64: string, mimeType: string}>}
   */
  compressImage(file, maxPx = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
            else       { w = Math.round(w * maxPx / h); h = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg', dataUrl });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * 取得月份顯示名稱
   */
  monthLabel(year, month) {
    const now = new Date();
    const ny = now.getFullYear(), nm = now.getMonth() + 1;
    if (year === ny && month === nm) return `${month} 月（本月）`;
    return `${year} 年 ${month} 月`;
  },

  /**
   * 數字加逗號
   */
  numberWithCommas(n) {
    return Number(n || 0).toLocaleString('zh-TW');
  }
};
