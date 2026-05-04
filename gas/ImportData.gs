/**
 * ImportData.gs — 歷史資料一次性匯入工具
 *
 * 使用方式：
 *  1. 先把 TRANSACTIONS Sheet 的資料列清空（保留第一列 header）
 *  2. 在 GAS 編輯器上方選擇 importHistoricalData 函式
 *  3. 點「執行」
 *  4. 完成後此檔案可刪除
 *
 * 注意：2026/4 的資料（如 Potato corner、牛排等）若已透過 App 記帳，
 *       請先刪除 Sheets 中的重複記錄，再執行此函式。
 */

function importHistoricalData() {
  const ss = SpreadsheetApp.openById(getProp('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('TRANSACTIONS');
  if (!sheet) {
    sheet = ss.insertSheet('TRANSACTIONS');
  }

  const headers = ['transaction_id','user_id','type','amount','category',
                   'payment_method','note','merchant_name','items','receipt_source','date','created_at'];

  // 若 sheet 是空的，先寫入 header
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const now = new Date().toISOString();
  const P = 'user_pigpig';  // 胖胖
  const G = 'user_gungun';  // 滾滾
  const S = 'shared';        // 滾&胖 共同
  const CASH = 'cash';
  const CC   = 'credit_card';
  const BT   = 'bank_transfer';

  let i = 1;
  function r(date, uid, type, amount, cat, pay, note) {
    return ['txn_imp_' + String(i++).padStart(4,'0'),
            uid, type, amount, cat, pay, note, '', '', 'import', date, now];
  }

  const data = [
    // ================================================================
    // record_1：每月固定薪資與固定支出
    // 薪水→25日，房貸/租→5日，其他→15日
    // ================================================================

    // ── 1月 ────────────────────────────────────────────────────────
    r('2026-01-25',G,'income', 49198,'薪水', BT,  '薪水-滾滾'),
    r('2026-01-25',P,'income', 83494,'薪水', BT,  '薪水-豬豬'),
    r('2026-01-05',G,'expense',28120,'房貸', BT,  '房貸'),
    r('2026-01-05',P,'expense',22000,'房租', BT,  '房租'),
    r('2026-01-15',G,'expense', 1341,'其他', CC,  '管理費'),
    r('2026-01-15',P,'expense',  173,'水費',  CC,  '水費'),
    r('2026-01-15',P,'expense',  854,'電費',  CC,  '電費'),
    r('2026-01-15',P,'expense',  129,'瓦斯費',CC,  '瓦斯費'),
    r('2026-01-15',G,'expense',  599,'其他', CC,  '電話費-滾滾'),
    r('2026-01-15',P,'expense', 1039,'其他', CC,  '電話費-豬豬'),
    r('2026-01-15',G,'expense',  860,'保險', BT,  '保險費'),
    r('2026-01-15',P,'expense', 9000,'投資', BT,  '定期定額-證券'),
    r('2026-01-15',G,'expense', 3000,'投資', BT,  '存錢筒'),

    // ── 2月 ────────────────────────────────────────────────────────
    r('2026-02-25',G,'income', 53977,'薪水', BT,  '薪水-滾滾'),
    r('2026-02-25',P,'income', 85994,'薪水', BT,  '薪水-豬豬'),
    r('2026-02-05',G,'expense',28120,'房貸', BT,  '房貸'),
    r('2026-02-05',P,'expense',22000,'房租', BT,  '房租'),
    r('2026-02-15',G,'expense', 1341,'其他', CC,  '管理費'),
    r('2026-02-15',G,'expense',  219,'水費',  CC,  '水費'),
    r('2026-02-15',G,'expense',  985,'電費',  CC,  '電費'),
    r('2026-02-15',G,'expense',  606,'瓦斯費',CC,  '瓦斯費'),
    r('2026-02-15',G,'expense',  605,'其他', CC,  '電話費-滾滾'),
    r('2026-02-15',P,'expense', 1065,'其他', CC,  '電話費-豬豬'),
    r('2026-02-15',G,'expense',  860,'保險', BT,  '保險費'),
    r('2026-02-15',P,'expense', 9000,'投資', BT,  '定期定額-證券'),
    r('2026-02-15',G,'expense', 3000,'投資', BT,  '存錢筒'),

    // ── 3月 ────────────────────────────────────────────────────────
    r('2026-03-25',G,'income', 49002,'薪水', BT,  '薪水-滾滾'),
    r('2026-03-25',P,'income', 87421,'薪水', BT,  '薪水-豬豬'),
    r('2026-03-05',G,'expense',28120,'房貸', BT,  '房貸'),
    r('2026-03-05',P,'expense',22000,'房租', BT,  '房租'),
    r('2026-03-15',G,'expense', 1341,'其他', CC,  '管理費'),
    r('2026-03-15',P,'expense',   54,'水費',  CC,  '水費'),
    r('2026-03-15',P,'expense',  785,'電費',  CC,  '電費'),
    r('2026-03-15',P,'expense',  153,'瓦斯費',CC,  '瓦斯費'),
    r('2026-03-15',G,'expense',  860,'保險', BT,  '保險費'),
    r('2026-03-15',P,'expense', 9000,'投資', BT,  '定期定額-證券'),
    r('2026-03-15',G,'expense', 3000,'投資', BT,  '存錢筒'),

    // ── 4月（只有房租 15000 + 投資 9000）──────────────────────────
    r('2026-04-05',P,'expense',15000,'房租', BT,  '房租'),
    r('2026-04-15',P,'expense', 9000,'投資', BT,  '定期定額-證券'),

    // ================================================================
    // record_2：每日記帳
    // ================================================================

    // ── 2026/1 ─────────────────────────────────────────────────────
    r('2026-01-01',P,'expense',  500,'三餐', CASH,'豬豬W01公司吃午餐'),
    r('2026-01-02',G,'expense',  130,'三餐', CASH,'滾滾ㄉ午餐-三杯雞便當'),
    r('2026-01-02',P,'income',  1000,'投資', CASH,'2026/01滾給胖的證券錢'),
    r('2026-01-02',G,'expense', 1000,'投資', CASH,'2026/01滾給胖的證券錢'),
    r('2026-01-02',S,'expense', 1148,'加油', CC,  '加油'),
    r('2026-01-02',S,'expense',  285,'飲料', CC,  '星巴克巧克力'),
    r('2026-01-03',P,'expense',   90,'停車費', CC,  '秀泰停車'),
    r('2026-01-03',P,'expense', 1018,'三餐', CC,  '秀泰吃雞湯火鍋'),
    r('2026-01-03',P,'expense',   55,'點心', CC,  '麥當勞玉米濃湯妹妹想喝'),
    r('2026-01-03',P,'expense',  200,'停車費', CC,  '打網咖停車'),
    r('2026-01-03',P,'expense',  310,'三餐', CC,  '打網咖+吃晚餐'),
    r('2026-01-04',P,'expense',  500,'三餐', CASH,'豬豬W02公司吃午餐'),
    r('2026-01-04',S,'expense',  640,'加油', CC,  '加油'),
    r('2026-01-04',P,'expense',  100,'飲料', CC,  '買咖啡'),
    r('2026-01-05',G,'expense',   75,'三餐', CC,  '滾滾ㄉ午餐-拌拌乾拉麵'),
    r('2026-01-05',S,'expense',  285,'飲料', CC,  '星巴克'),
    r('2026-01-05',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-01-06',G,'expense',   65,'三餐', CC,  '滾滾ㄉ午餐-皮蛋瘦肉粥'),
    r('2026-01-06',S,'expense', 2990,'玩樂', CC,  '傳說對決儲值'),
    r('2026-01-07',G,'expense',  110,'三餐', CC,  '滾滾ㄉ午餐-滷味'),
    r('2026-01-07',S,'expense',   98,'日用品',CC,  '浴室掛勾'),
    r('2026-01-07',S,'expense',  743,'衣物', CC,  '買健檢用的貼身衣物'),
    r('2026-01-08',G,'expense',  120,'三餐', CASH,'滾滾ㄉ午餐-蒜泥白肉便當'),
    r('2026-01-10',S,'expense', 3162,'日用品',CC,  '一蘭拉麵通關囉'),
    r('2026-01-10',S,'expense',  620,'三餐', CC,  '一蘭拉麵'),
    r('2026-01-10',S,'expense',  892,'衣物', CC,  '豬豬的衣服'),
    r('2026-01-10',S,'expense',  298,'點心', CC,  'Potato corner'),
    r('2026-01-11',S,'expense', 1662,'日用品',CC,  '家樂福買便當菜跟晚餐'),
    r('2026-01-11',S,'expense',  379,'日用品',CC,  '蝦皮-洗臉巾+掛勾貼片'),
    r('2026-01-12',P,'expense',  105,'三餐', CASH,'午餐便當'),
    r('2026-01-13',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-01-13',P,'expense',  280,'飲料', CC,  '南港買星巴克給媽媽'),
    r('2026-01-14',S,'expense', 1221,'加油', CC,  '加油'),
    r('2026-01-14',G,'expense',  100,'三餐', CC,  '滾滾ㄉ午餐-酸辣湯餃'),
    r('2026-01-14',P,'expense',  105,'三餐', CASH,'酸辣湯餃+小菜'),
    r('2026-01-15',S,'expense',   70,'飲料', CC,  '鮮茶道-橙香金萱'),
    r('2026-01-15',S,'expense',   70,'三餐', CC,  '八方酸辣湯'),
    r('2026-01-15',S,'expense',  117,'三餐', CASH,'阿財鍋貼'),
    r('2026-01-15',S,'expense',   50,'點心', CASH,'淡水-雞蛋糕'),
    r('2026-01-15',S,'expense',  630,'禮物', CASH,'淡水-媽媽的餅'),
    r('2026-01-15',S,'expense',  255,'三餐', CC,  '麻醬麵/滷肉飯'),
    r('2026-01-15',P,'expense',  185,'三餐', CC,  '媽媽吃頂呱呱'),
    r('2026-01-15',P,'expense',  180,'點心', CC,  '泡芙爺爺'),
    r('2026-01-16',G,'expense',  115,'三餐', CC,  '滾滾ㄉ午餐-滷味'),
    r('2026-01-16',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-01-16',S,'expense',  689,'加油', CC,  '加油'),
    r('2026-01-18',P,'expense',  150,'飲料', CC,  '小茶齋飲料'),
    r('2026-01-18',P,'expense',  397,'三餐', CC,  'Uber-Curry'),
    r('2026-01-19',S,'expense',   95,'加油', CC,  '小朋友加油'),
    r('2026-01-19',S,'expense', 1137,'加油', CC,  '花生米加油'),
    r('2026-01-19',G,'expense',   85,'三餐', CASH,'滾滾ㄉ午餐-炒麵+米漿'),
    r('2026-01-19',G,'expense',   20,'停車費', CASH,'南港展覽館場勘停車'),
    r('2026-01-19',G,'expense',  499,'日用品',CASH,'雨傘'),
    r('2026-01-20',G,'expense',   75,'三餐', CC,  '滾滾ㄉ午餐-拌拌乾拉麵'),
    r('2026-01-22',P,'expense',  200,'三餐', CASH,'豬豬在公司的午餐+昨天忘記寄了'),
    r('2026-01-22',P,'expense', 2500,'禮物', BT,  '給媽媽的AirPod'),
    r('2026-01-22',S,'expense',  413,'三餐', CC,  '龍鹹酥雞'),
    r('2026-01-23',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-01-24',S,'expense',   59,'日用品',CC,  '滾滾坐墊'),
    r('2026-01-24',S,'expense', 1517,'三餐', CC,  '跟Chuck吃瀧厚牛排'),
    r('2026-01-25',S,'expense',  585,'三餐', CC,  '福勝亭'),
    r('2026-01-25',S,'expense',  178,'點心', CC,  '豬豬的糖果'),
    r('2026-01-25',S,'expense',  780,'三餐', CC,  '布娜飛'),
    r('2026-01-25',S,'expense',  850,'日用品',CC,  '家樂福'),
    r('2026-01-26',P,'expense',  110,'飲料', CC,  '可不可'),
    r('2026-01-26',S,'expense',  337,'三餐', CC,  '朱記'),
    r('2026-01-27',P,'expense',  105,'三餐', CASH,'公司午餐便當'),
    r('2026-01-27',S,'expense',  726,'三餐', CC,  '尼尼義大利麵'),
    r('2026-01-28',P,'expense',  125,'三餐', CASH,'午餐便當'),
    r('2026-01-28',G,'expense',  120,'三餐', CASH,'滾滾ㄉ午餐-蒜泥白肉'),
    r('2026-01-29',G,'expense',   90,'三餐', CASH,'滾滾ㄉ午餐-炒麵和小菜'),
    r('2026-01-29',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-01-30',S,'expense',  225,'三餐', CASH,'早安有喜'),
    r('2026-01-30',S,'expense',  386,'三餐', CC,  '遠雄鐵板燒'),
    r('2026-01-30',P,'expense',  150,'飲料', CC,  '豬豬的咖啡'),
    r('2026-01-30',S,'expense',  528,'三餐', CC,  '晚餐（遠雄原宿廚房焗烤很慢）'),
    r('2026-01-30',G,'expense',  220,'禮物', CC,  'LINE禮物-大豐生日'),
    r('2026-01-30',P,'expense',  380,'禮物', CC,  '給二哥生日禮物（星巴克Line禮物）'),
    r('2026-01-31',P,'expense',  860,'三餐', CC,  '養雞場'),
    r('2026-01-31',P,'expense',  542,'叫車', CC,  '從一中街搭車回家'),
    r('2026-01-31',P,'expense', 1000,'玩樂', CC,  '連莊排球隊周邊商品'),
    r('2026-01-31',P,'expense',  105,'飲料', CC,  '清心'),

    // ── 2026/2 ─────────────────────────────────────────────────────
    r('2026-02-01',P,'expense',  282,'飲料', CC,  '布萊恩紅茶'),
    r('2026-02-01',S,'expense', 1414,'加油', CC,  '加油'),
    r('2026-02-02',S,'expense',  449,'日用品',CC,  '全聯外送'),
    r('2026-02-03',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-02-03',P,'expense',  100,'三餐', CASH,'炒飯'),
    r('2026-02-04',G,'expense',  130,'三餐', CASH,'滾滾ㄉ午餐-蔥爆牛肉便當'),
    r('2026-02-04',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-02-04',P,'expense',  139,'三餐', CC,  '麥當勞'),
    r('2026-02-05',P,'expense',  125,'三餐', CASH,'午餐便當'),
    r('2026-02-05',G,'expense',50000,'其他', BT,  '學貸-115年'),
    r('2026-02-05',S,'expense',  837,'三餐', CC,  '春水堂'),
    r('2026-02-07',S,'expense', 1000,'三餐', CASH,'跟明旗吃晚餐'),
    r('2026-02-07',S,'expense',  283,'三餐', CC,  '早安有喜'),
    r('2026-02-08',S,'expense',   71,'停車費', CC,  '南港醫院停車'),
    r('2026-02-09',P,'expense', 9761,'藥物', CC,  '猛健樂2.5mg'),
    r('2026-02-10',G,'expense',  280,'飲料', CC,  '熱可可兩杯'),
    r('2026-02-10',S,'expense',  566,'日用品',CC,  '日本出遊豬豬手冊'),
    r('2026-02-11',G,'expense',  450,'看診', CASH,'滾滾上病看診250+多拿藥200'),
    r('2026-02-11',G,'expense',  139,'三餐', CC,  '玉米濃湯+喉糖'),
    r('2026-02-11',P,'expense',   60,'停車費', CASH,'香山看顯微鏡停車'),
    r('2026-02-12',G,'expense',  110,'三餐', CC,  '滾滾ㄉ午餐-滷味'),
    r('2026-02-13',P,'expense', 1007,'加油', CC,  '禮拜一加油'),
    r('2026-02-13',P,'expense',  755,'加油', CC,  '花生米加油'),
    r('2026-02-13',P,'expense',  100,'三餐', CASH,'禮拜四吃炒飯'),
    r('2026-02-13',P,'expense',   89,'三餐', CC,  '禮拜三吃午餐'),
    r('2026-02-13',G,'expense',   75,'三餐', CC,  '滾滾ㄉ午餐-拌拌乾拉麵'),
    r('2026-02-13',S,'expense',  365,'三餐', CC,  '鬍鬚張'),
    r('2026-02-14',S,'expense',  913,'三餐', CC,  'Brun不然'),
    r('2026-02-14',S,'expense',   90,'禮物', CASH,'姊姊水果店-果凍'),
    r('2026-02-14',S,'expense',  100,'拜拜', CASH,'伸港媽祖廟拜拜'),
    r('2026-02-15',P,'expense', 2422,'禮物', CC,  '小米-監視器跟毛球'),
    r('2026-02-15',P,'expense',   20,'停車費', CC,  'NOVA停車'),
    r('2026-02-15',P,'expense',  576,'禮物', CC,  'NOVA-記憶卡'),
    r('2026-02-16',P,'expense',   62,'飲料', CC,  '氣泡水'),
    r('2026-02-17',P,'expense',  170,'禮物', CC,  '全家-買妹妹的食物'),
    r('2026-02-17',P,'expense',  500,'禮物', CC,  '妹妹湯姆熊'),
    r('2026-02-17',P,'expense',  155,'飲料', CC,  '迷客夏'),
    r('2026-02-17',P,'expense',  215,'飲料', CC,  '得正'),
    r('2026-02-18',S,'expense', 1490,'禮物', CC,  '爸爸車子的導航買斷'),
    r('2026-02-18',S,'expense',  300,'飲料', CC,  '大家的飲料-茶海'),
    r('2026-02-19',P,'expense',  261,'飲料', CC,  '全家旁邊的迷克夏'),
    r('2026-02-19',P,'expense',   80,'停車費', CC,  '鹿港停車'),
    r('2026-02-19',G,'expense',  761,'三餐', CC,  '家裡吃麥當勞'),
    r('2026-02-20',P,'expense', 1932,'三餐', CC,  '嘉義在飯店吃火鍋'),
    r('2026-02-20',P,'expense', 1694,'三餐', CC,  '台南湯咖喱'),
    r('2026-02-21',P,'expense',  110,'飲料', CC,  '可不可'),
    r('2026-02-21',P,'expense',  150,'停車費', CC,  '虎尾停車'),
    r('2026-02-21',P,'expense', 1224,'加油', CC,  '花生米加油'),
    r('2026-02-23',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-02-23',G,'expense',   75,'三餐', CC,  '滾滾ㄉ午餐-拌拌乾拉麵'),
    r('2026-02-23',G,'expense',   70,'飲料', CASH,'翡翠柳橙'),
    r('2026-02-24',G,'expense',  100,'三餐', CC,  '滾滾ㄉ午餐-酸辣湯餃'),
    r('2026-02-24',P,'expense',  100,'三餐', CASH,'昨天吃麵忘記記帳了'),
    r('2026-02-24',P,'expense',  105,'三餐', CASH,'便當'),
    r('2026-02-25',S,'expense',  102,'加油', CC,  '小朋友加油'),
    r('2026-02-25',P,'expense', 1133,'加油', CC,  '花生米加油'),
    r('2026-02-25',G,'expense',   58,'三餐', CC,  '滾滾ㄉ晚餐-家樂福炒飯'),
    r('2026-02-26',P,'expense',  185,'三餐', CASH,'昨天麥當勞忘記記帳惹'),
    r('2026-02-26',G,'expense',  130,'三餐', CC,  '滾滾ㄉ午餐-滷味'),
    r('2026-02-27',S,'expense', 1000,'加油', CASH,'小朋友保養'),
    r('2026-02-27',S,'expense',  300,'飲料', CC,  '可不可'),
    r('2026-02-27',S,'expense',   60,'停車費', CC,  '二哥家旁邊停車費'),
    r('2026-02-28',P,'expense',  105,'飲料', CC,  '遠雄咖啡-冰美式'),
    r('2026-02-28',S,'expense',   67,'飲料', CC,  '龜記-柳橙翡翠'),
    r('2026-02-28',S,'expense',  480,'三餐', CC,  '遠雄拉麵'),
    r('2026-02-28',P,'expense',   75,'飲料', CC,  'cama美式'),

    // ── 2026/3 ─────────────────────────────────────────────────────
    r('2026-03-02',P,'expense', 1040,'加油', CC,  '花生米加油'),
    r('2026-03-03',P,'expense',  105,'三餐', CASH,'便當午餐'),
    r('2026-03-03',S,'expense',  150,'點心', CC,  '湯圓'),
    r('2026-03-03',P,'expense',  220,'飲料', CC,  '買飲料'),
    r('2026-03-04',S,'expense',  902,'三餐', CC,  '鼎泰豐'),
    r('2026-03-04',S,'expense',  247,'日用品',CC,  '沐浴乳'),
    r('2026-03-06',S,'expense',  135,'三餐', CC,  '小滾吃井飯'),
    r('2026-03-06',S,'expense',  229,'三餐', CC,  '豬豬吃三商'),
    r('2026-03-06',P,'expense', 9761,'藥物', CC,  '猛健樂7.5mg'),
    r('2026-03-06',S,'expense',  205,'叫車', CC,  'Uber'),
    r('2026-03-07',P,'expense',  200,'看診', CASH,'洗牙掛號'),
    r('2026-03-07',P,'expense',   40,'停車費', CC,  '看牙齒停車'),
    r('2026-03-08',P,'income',  1000,'投資', CASH,'2026/03滾給胖的證券錢'),
    r('2026-03-08',G,'expense', 1000,'投資', CASH,'2026/03滾給胖的證券錢'),
    r('2026-03-08',P,'expense',  869,'三餐', CC,  '跟媽媽吃莫凡彼'),
    r('2026-03-08',P,'expense', 1200,'加油', CC,  '花生米加油'),
    r('2026-03-09',P,'expense',  100,'三餐', CASH,'魯排骨便當'),
    r('2026-03-10',G,'expense',  109,'飲料', CC,  '請皓羽哥喝咖啡'),
    r('2026-03-10',G,'expense',   89,'三餐', CC,  '滾滾ㄉ午餐-全家蛋包飯'),
    r('2026-03-10',P,'expense',  105,'三餐', CASH,'豬豬午餐吃的便當'),
    r('2026-03-12',P,'expense',  100,'三餐', CASH,'吃辣辣的麵'),
    r('2026-03-12',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-03-12',G,'expense',  130,'三餐', CASH,'滾滾ㄉ午餐-無骨三杯雞便當'),
    r('2026-03-13',P,'expense',   85,'三餐', CASH,'豬豬的午餐是米干'),
    r('2026-03-13',P,'expense', 1377,'禮物', CC,  '棒球帽跟棒球'),
    r('2026-03-14',S,'expense',  858,'三餐', CC,  '京都勝牛'),
    r('2026-03-14',S,'expense',  495,'禮物', CC,  '書敏的小新系列拼圖磁鐵'),
    r('2026-03-14',S,'expense',  335,'日用品',CC,  '薄荷糖、維生素D、衛生棉'),
    r('2026-03-14',S,'expense',   15,'點心', CASH,'給豬豬的巧克力'),
    r('2026-03-14',S,'expense',  200,'停車費', CC,  'Lalaport停車'),
    r('2026-03-15',S,'expense',  360,'三餐', CC,  '丸龜'),
    r('2026-03-15',S,'expense',   80,'三餐', CASH,'蝦子鍋貼'),
    r('2026-03-15',S,'expense',   70,'三餐', CASH,'滷味（米血+豬頭皮）'),
    r('2026-03-15',S,'expense',   30,'三餐', CASH,'薯條'),
    r('2026-03-15',S,'expense',   35,'三餐', CC,  '酸辣湯'),
    r('2026-03-16',P,'expense',   80,'三餐', CASH,'麻醬麵+滷蛋'),
    r('2026-03-16',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-03-16',S,'expense',  480,'三餐', CC,  '蝦仁飯飯'),
    r('2026-03-17',S,'expense',  540,'三餐', CC,  '藏壽司'),
    r('2026-03-17',P,'expense',  115,'飲料', CC,  'Starbucks'),
    r('2026-03-18',G,'expense',   13,'三餐', CASH,'御飯糰和純粹喝（扣50禮券）'),
    r('2026-03-18',S,'expense',   80,'停車費', CC,  '宏匯廣場停車費兩天份'),
    r('2026-03-18',P,'expense',  190,'三餐', CASH,'午餐炒飯+可不可'),
    r('2026-03-18',S,'expense',  144,'三餐', CC,  '丸龜'),
    r('2026-03-18',S,'expense',  310,'飲料', CC,  '星巴克'),
    r('2026-03-20',S,'expense', 1367,'三餐', CC,  '昨天的乾杯燒肉'),
    r('2026-03-20',P,'expense', 1550,'加油', CC,  '花生米加油'),
    r('2026-03-20',P,'expense',   90,'三餐', CASH,'米干'),
    r('2026-03-21',S,'expense', 1273,'三餐', CC,  '布納菲'),
    r('2026-03-21',P,'expense',  150,'飲料', CC,  'Cama'),
    r('2026-03-21',S,'expense', 1300,'玩樂', CASH,'湯姆熊'),
    r('2026-03-21',S,'expense',  300,'玩樂', CASH,'湯姆熊'),
    r('2026-03-21',P,'expense', 1614,'其他', CC,  '交通罰單'),
    r('2026-03-22',S,'expense',  560,'三餐', CC,  '十二月'),
    r('2026-03-23',S,'expense',  550,'飲料', CC,  '全家大拿鐵12杯'),
    r('2026-03-23',S,'expense', 1087,'加油', CC,  '花生米加油'),
    r('2026-03-23',P,'expense',  105,'三餐', CASH,'午餐便當'),
    r('2026-03-23',S,'expense',  175,'飲料', CC,  '天仁茗茶'),
    r('2026-03-24',P,'expense',   90,'飲料', CC,  '可不可'),
    r('2026-03-24',P,'expense',  100,'三餐', CASH,'辣辣的麵'),
    r('2026-03-24',S,'expense', 1514,'三餐', CC,  'Wachen'),
    r('2026-03-26',P,'expense',  300,'看診', CC,  '眼科掛號+領藥'),
    r('2026-03-26',S,'expense',  280,'三餐', BT,  '牛肉麵+牛肉湯餃'),
    r('2026-03-26',P,'expense',  120,'飲料', CC,  'Cama-美式'),
    r('2026-03-26',P,'expense', 9761,'藥物', CC,  '猛健樂5mg'),
    r('2026-03-26',S,'expense', 1538,'三餐', CC,  '布納飛'),
    r('2026-03-27',P,'expense', 1498,'加油', CC,  '花生米加油'),
    r('2026-03-27',P,'expense', 2499,'玩樂', CC,  '中華職棒網路收看年費'),
    r('2026-03-27',S,'expense',  250,'三餐', CC,  '雞肉麵疙瘩'),
    r('2026-03-29',P,'expense',   22,'三餐', CC,  '跟媽媽吃頂呱呱，Linepoint折抵'),
    r('2026-03-29',P,'expense',  270,'三餐', CC,  '小順豐焗烤跟妹妹吃'),
    r('2026-03-29',P,'expense',  150,'飲料', CC,  '紅太陽飲料店'),
    r('2026-03-29',P,'expense', 1160,'加油', CC,  '花生米加油'),
    r('2026-03-31',P,'expense',  100,'三餐', CC,  '辣辣地麵'),
    r('2026-03-31',P,'expense',  109,'飲料', CC,  '可不可'),
    r('2026-03-31',S,'expense',  390,'三餐', CC,  '繼光香香雞+鍋貼套餐'),
    r('2026-03-31',S,'expense',  257,'飲料', CC,  'Starbucks'),

    // ── 2026/4（記得先確認 App 是否已記過相同資料）──────────────
    r('2026-04-01',S,'expense',  362,'三餐', CC,  '丸龜'),
    r('2026-04-02',P,'expense',   80,'三餐', CASH,'酸辣湯餃'),
    r('2026-04-02',P,'expense', 2640,'大眾運輸',CC,'4/9高鐵出差板橋-台南來回高鐵票'),
    r('2026-04-02',S,'expense',  278,'三餐', CC,  'Potato corner'),
    r('2026-04-02',S,'expense',   50,'停車費', CC,  '裕隆城停車'),
    r('2026-04-03',S,'expense',  682,'三餐', CC,  '牛排'),
    r('2026-04-03',P,'expense',  110,'飲料', CC,  'cafein莊園黑咖啡'),
    r('2026-04-03',S,'expense',  261,'日用品',CC,  '康是美'),
    r('2026-04-03',G,'expense', 3300,'霧眉', CASH,'用眉毛'),
    r('2026-04-03',S,'expense',  309,'飲料', CC,  '大茗'),
  ];

  // 寫入 Sheet
  if (data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
  }

  const msg = '✓ 匯入完成！共 ' + data.length + ' 筆記錄';
  Logger.log(msg);
  ss.toast(msg, '歷史資料匯入', 5);
  return { imported: data.length };
}

/**
 * 修正已匯入資料的類別欄位（只需執行一次）
 * 問題：importHistoricalData() 將薪水/房貸/房租 的 category 設為「其他」，導致統計篩選失效
 * 修正：依 note 欄位對應回正確的 category
 */
function fixImportedCategories() {
  const ss = SpreadsheetApp.openById(getProp('SPREADSHEET_ID'));
  const sheet = ss.getSheetByName('TRANSACTIONS');
  if (!sheet) { Logger.log('找不到 TRANSACTIONS sheet'); return; }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const catIdx = headers.indexOf('category');
  const noteIdx = headers.indexOf('note');
  const srcIdx  = headers.indexOf('receipt_source');

  // note → 正確 category 對應表
  const noteToCategory = {
    '薪水-滾滾': '薪水',
    '薪水-豬豬': '薪水',
    '房貸':      '房貸',
    '房租':      '房租'
  };

  // note 包含「停車」關鍵字的項目也修正為停車費
  const parkingKeyword = '停車';

  let updated = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][srcIdx] !== 'import') continue;
    const note    = data[i][noteIdx];
    const currCat = data[i][catIdx];
    let newCat = noteToCategory[note];
    // 備註包含「停車」且目前類別為「其他」→ 改為停車費
    if (!newCat && String(note).includes(parkingKeyword) && currCat === '其他') {
      newCat = '停車費';
    }
    if (newCat && currCat !== newCat) {
      sheet.getRange(i + 1, catIdx + 1).setValue(newCat);
      updated++;
    }
  }

  const msg = '✓ 修正完成！共更新 ' + updated + ' 筆資料的類別';
  Logger.log(msg);
  ss.toast(msg, '類別修正', 5);
  return updated;
}

/**
 * 診斷：列出四月份所有交易及其 receipt_source（執行後看 Log）
 */
function diagApril() {
  const ym = '2026-04';
  const allTxns = readAllRows('TRANSACTIONS');
  const monthTxns = allTxns.filter(t => String(t.date || '').startsWith(ym));
  Logger.log(`四月份共 ${monthTxns.length} 筆交易：`);
  monthTxns.forEach(t => {
    Logger.log(`  ${t.date} | ${t.user_id} | ${t.category} | ${t.note} | $${t.amount} | src:${t.receipt_source}`);
  });
}

/**
 * 清除重複的固定收支記帳（一次性執行）
 *
 * 識別邏輯：
 *   - note 以「固定收入：」或「固定支出：」開頭 = 月底 Trigger 自動套用的項目
 *   - 若同月同 category（不限 user_id）還有其他非自動套用的記帳 → 刪除自動套用那筆
 *   - 若某 category 只有自動套用、沒有對應的手動記帳 → 保留（例如：房屋保險）
 *
 * 執行前請先執行 diagApril() 確認 Log，再執行此函式。
 */
function fixDuplicateRecurring(targetYm) {
  const ym = targetYm || '2026-04';
  const allTxns = readAllRows('TRANSACTIONS');
  const monthTxns = allTxns.filter(t => String(t.date || '').startsWith(ym));

  Logger.log(`[fixDuplicateRecurring] 掃描 ${ym}，共 ${monthTxns.length} 筆`);

  // 判斷是否為月底 Trigger 自動套用（note 以「固定收入：」或「固定支出：」開頭）
  const isAutoApplied = t => {
    const note = String(t.note || '');
    return note.startsWith('固定收入：') || note.startsWith('固定支出：');
  };

  const autoOnes  = monthTxns.filter(t => isAutoApplied(t));
  const otherOnes = monthTxns.filter(t => !isAutoApplied(t));

  // 收集所有「有手動記帳」的 category（不限 user_id）
  const categoriesWithManual = new Set(otherOnes.map(t => t.category));

  // 自動套用的項目中，若同 category 有對應的手動記帳 → 加入刪除清單
  const toDelete = autoOnes.filter(t => categoriesWithManual.has(t.category));
  const toKeep   = autoOnes.filter(t => !categoriesWithManual.has(t.category));

  Logger.log(`準備刪除 ${toDelete.length} 筆重複的自動套用記帳：`);
  toDelete.forEach(t => Logger.log(`  刪除 → ${t.date} | ${t.user_id} | ${t.category} | ${t.note} | $${t.amount}`));

  Logger.log(`保留 ${toKeep.length} 筆無對應手動記帳的自動套用記帳：`);
  toKeep.forEach(t => Logger.log(`  保留 → ${t.date} | ${t.category} | ${t.note} | $${t.amount}`));

  if (toDelete.length === 0) {
    Logger.log('沒有需要清除的重複項目');
    return;
  }

  toDelete.forEach(t => deleteRow('TRANSACTIONS', 'transaction_id', t.transaction_id));
  Logger.log(`✓ 清除完成，共刪除 ${toDelete.length} 筆`);
  SpreadsheetApp.getActiveSpreadsheet().toast(`已清除 ${toDelete.length} 筆重複記帳`, '完成', 5);
}
