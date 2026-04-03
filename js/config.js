/**
 * config.js — 全域設定
 * 部署前必須填入 GAS_URL
 */

const CONFIG = {
  // ── 部署後填入 Google Apps Script Web App URL ──────────────────────────────
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyXAdgP6YSh23E1jCFsETwdptSxUyPH9uDdcmnv5b95gQADaAKfR3S4nlspGPi19k3_pw/exec',

  // ── Google AI Studio API Key（前端直接呼叫 Gemini，不經過 GAS）───────────
  GEMINI_API_KEY: 'AIzaSyAhxC7heJD02Hc-MhpWIxF6CB9wbasa8Rs',

  // ── 使用者設定 ─────────────────────────────────────────────────────────────
  USERS: {
    user_pigpig: {
      displayName: '豬豬',
      defaultAvatar: 'assets/default-avatars/pigpig.png',
      emoji: '🐷'
    },
    user_gungun: {
      displayName: '滾滾',
      defaultAvatar: 'assets/default-avatars/gungun.png',
      emoji: '🧚‍♀️'
    }
  },

  // ── 支出類別（含 emoji） ───────────────────────────────────────────────────
  EXPENSE_CATEGORIES: [
    { name: '三餐',   emoji: '🍱' },
    { name: '飲料',   emoji: '🧋' },
    { name: '點心',   emoji: '🍰' },
    { name: '看診',   emoji: '🏥' },
    { name: '藥物',   emoji: '💊' },
    { name: '日用品', emoji: '🛒' },
    { name: '加油',   emoji: '⛽' },
    { name: '叫車',   emoji: '🚗' },
    { name: '大眾運輸', emoji: '🚇' },
    { name: '衣物',   emoji: '👕' },
    { name: '化妝品', emoji: '💄' },
    { name: '包包',   emoji: '👜' },
    { name: '3C產品', emoji: '📱' },
    { name: '禮物',   emoji: '🎁' },
    { name: '剪頭髮', emoji: '✂️' },
    { name: '霧眉',   emoji: '✨' },
    { name: '玩樂',   emoji: '🎮' },
    { name: '投資',   emoji: '📈' },
    { name: '拜拜',   emoji: '🙏' },
    { name: '水費',   emoji: '💧' },
    { name: '電費',   emoji: '⚡' },
    { name: '瓦斯費', emoji: '🔥' },
    { name: '保險',   emoji: '🛡️' },
    { name: '其他',   emoji: '📦' }
  ],

  // ── 收入類別 ──────────────────────────────────────────────────────────────
  INCOME_CATEGORIES: [
    { name: '獎金',   emoji: '💰' },
    { name: '代墊',   emoji: '💸' },
    { name: '員購',   emoji: '🏷️' },
    { name: '投資',   emoji: '📈' },
    { name: '其他',   emoji: '💵' }
  ],

  // ── 支付方式 ──────────────────────────────────────────────────────────────
  PAYMENT_METHODS: [
    { key: 'cash',          label: '現金',  emoji: '💵' },
    { key: 'credit_card',   label: '信用卡', emoji: '💳' },
    { key: 'easy_card',     label: '悠遊卡', emoji: '🎫' },
    { key: 'bank_transfer', label: '轉帳',  emoji: '🏦' }
  ],

  // ── 固定支出類別 ──────────────────────────────────────────────────────────
  RECURRING_EXPENSE_CATEGORIES: [
    { name: '房貸',       emoji: '🏠' },
    { name: '房租',       emoji: '🔑' },
    { name: '電話費',     emoji: '📱' },
    { name: '定期定額股票', emoji: '📊' },
    { name: '現金儲蓄',   emoji: '🐷' }
  ],

  // ── 固定收入類別 ──────────────────────────────────────────────────────────
  RECURRING_INCOME_CATEGORIES: [
    { name: '薪水',     emoji: '💼' },
    { name: '投資收益', emoji: '📈' }
  ]
};

// 快速查找 emoji 的 helper
CONFIG.getCategoryEmoji = function(name) {
  const all = [...CONFIG.EXPENSE_CATEGORIES, ...CONFIG.INCOME_CATEGORIES,
               ...CONFIG.RECURRING_EXPENSE_CATEGORIES, ...CONFIG.RECURRING_INCOME_CATEGORIES];
  const found = all.find(c => c.name === name);
  return found ? found.emoji : '📦';
};

CONFIG.getPaymentLabel = function(key) {
  const found = CONFIG.PAYMENT_METHODS.find(p => p.key === key);
  return found ? found.label : key;
};

CONFIG.getPaymentEmoji = function(key) {
  const found = CONFIG.PAYMENT_METHODS.find(p => p.key === key);
  return found ? found.emoji : '';
};
