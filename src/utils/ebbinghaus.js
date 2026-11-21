// 艾宾浩斯抗遗忘复习：日期卡片状态、分组与本地数据读取。
// 首页的「待复习」数量和抗遗忘复习列表共用这里的规则，避免两边算得不一样。
import wx from '@/mp/wx';

export const GROUP_SIZE = 5;

// 第 n 次打卡对应「距上次复习的天数」。完成 MAX_CHECKINS 次后按原有逻辑清理该日期卡片。
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 90, 120, 180];
export const MAX_CHECKINS = REVIEW_INTERVALS.length;

export const STATUS_LABEL = {
  due: '未打卡',
  checked: '已打卡',
  notDue: '无需打卡',
};

// 列表展示顺序：今天该打的排最前，其次今天已打，最后是不用打的。
export const STATUS_ORDER = ['due', 'checked', 'notDue'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!matched) return null;
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
}

// 按本地自然日计算天数差，避免时区/夏令时造成的小数偏差。
export function daysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function groupCountOf(wordCount) {
  return Math.max(1, Math.ceil((Number(wordCount) || 0) / GROUP_SIZE));
}

// 单张日期卡片的状态：
// - 今天打过卡 -> checked（已打卡，当天不能再打）
// - 距上次打卡（没打过则以学习日期为基准）已到下一个艾宾浩斯节点 -> due（去打卡）
// - 否则 notDue（无需打卡）
export function reviewStatus(item, todayStr = dateKey()) {
  const checkCount = Number(item && item.checkCount) || 0;
  const learnedDate = item && item.date;
  const lastCheckInDate = (item && item.lastCheckInDate) || '';
  const checkedToday = lastCheckInDate === todayStr;
  const interval = checkCount < MAX_CHECKINS ? REVIEW_INTERVALS[checkCount] : null;
  const baseDate = lastCheckInDate || learnedDate;
  const elapsed = daysBetween(baseDate, todayStr);
  const due = interval !== null && elapsed >= interval;

  let status = 'notDue';
  if (checkedToday) status = 'checked';
  else if (due) status = 'due';

  return { status, checkedToday, due, interval, elapsed };
}

export function decorateItems(items, todayStr = dateKey()) {
  const decorated = (Array.isArray(items) ? items : []).map((item) => {
    const state = reviewStatus(item, todayStr);
    return {
      ...item,
      ...state,
      statusLabel: STATUS_LABEL[state.status],
      groupCount: groupCountOf((item.words || []).length),
      canReview: state.status === 'due',
    };
  });

  // 最近的日期排前面，和原来的列表顺序保持一致。
  decorated.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  decorated.forEach((item, index) => {
    item.listIndex = index;
  });
  return decorated;
}

export function buildReviewGroups(items) {
  return STATUS_ORDER
    .map((key) => ({
      key,
      label: STATUS_LABEL[key],
      items: items.filter((item) => item.status === key),
    }))
    .filter((group) => group.items.length > 0);
}

// 读取某本词书的全部抗遗忘日期卡片。
// 单词来自 Learn 页写入的 dailyLearnedWords_<bookId>_<date>，打卡元数据来自 dateWords_<bookId>。
export function loadReviewItems(bookId) {
  const todayStr = dateKey();
  const savedList = wx.getStorageSync(`dateWords_${bookId}`);
  const savedMap = new Map();
  (Array.isArray(savedList) ? savedList : []).forEach((saved) => {
    if (saved && saved.date) savedMap.set(saved.date, saved);
  });

  const prefix = `dailyLearnedWords_${bookId}_`;
  let keys = [];
  try {
    keys = (wx.getStorageInfoSync().keys || []).filter((key) => key.startsWith(prefix));
  } catch (err) {
    keys = [];
  }
  if (!keys.length) {
    // 拿不到 key 列表时退回逐日扫描，覆盖最长复习周期。
    for (let i = 0; i < 400; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      keys.push(prefix + dateKey(day));
    }
  }

  const rawItems = [];
  keys.forEach((key) => {
    const date = key.slice(prefix.length);
    if (!parseDateKey(date)) return;
    const words = wx.getStorageSync(key);
    if (!Array.isArray(words) || !words.length) return;

    const saved = savedMap.get(date) || {};
    const checkCount = Number(saved.checkCount) || 0;
    // 达到 10 次的卡片按原有逻辑清理，不再展示。
    if (checkCount >= MAX_CHECKINS) return;

    rawItems.push({
      date,
      words,
      checkCount,
      lastCheckInDate: saved.lastCheckInDate || '',
      isCheckIn: !!saved.isCheckIn,
    });
  });

  const items = decorateItems(rawItems, todayStr);
  return { todayStr, items };
}

// 首页「抗遗忘」入口的待复习词数。
export function countDueWords(items) {
  return items.reduce(
    (total, item) => (item.status === 'due' ? total + (item.words || []).length : total),
    0
  );
}
