// 每日打卡：按「组」计算目标，今日已完成组数达到目标后自动打卡。
// 不再有手动打卡按钮，也不再生成打卡分享海报。
import wx from '@/mp/wx';
import api from '@/utils/api';
import { dateKey, GROUP_SIZE } from '@/utils/ebbinghaus';

export const CHECKIN_GOAL_KEY = 'checkInGoalGroups';
export const DEFAULT_CHECKIN_GOAL = 2;
export const MAX_CHECKIN_GOAL = 10;

function normalizeGoal(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CHECKIN_GOAL;
  return Math.min(n, MAX_CHECKIN_GOAL);
}

export function getCheckInGoal() {
  return normalizeGoal(wx.getStorageSync(CHECKIN_GOAL_KEY));
}

export function setCheckInGoal(value) {
  const goal = normalizeGoal(value);
  wx.setStorageSync(CHECKIN_GOAL_KEY, goal);
  return goal;
}

function currentBookId() {
  const book = wx.getStorageSync('currentBook') || {};
  return book && book.id ? String(book.id) : '';
}

// 今日已背完的组数（按当天学习记录里的 dayGroups 去重统计）。
export function countTodayGroups(bookId = currentBookId()) {
  if (!bookId) return 0;
  const record = wx.getStorageSync(`learnRecord_${bookId}`) || {};
  if (!record || record.day !== dateKey()) return 0;
  const groups = Array.isArray(record.dayGroups) ? record.dayGroups : [];
  return new Set(groups.map(Number)).size;
}

export function getCheckInState(bookId) {
  const goal = getCheckInGoal();
  return {
    goal,
    goalWords: goal * GROUP_SIZE,
    groups: countTodayGroups(bookId),
    checkedToday: wx.getStorageSync('lastCheckDate') === dateKey(),
    days: Number(wx.getStorageSync('checkInDays')) || 0,
  };
}

// 今日组数达到目标即自动打卡；同一天只记一次。
// 学习页每完成一组时调用，进入「我的」页时也会兜底调用。
export async function maybeAutoCheckIn({ bookId, groups } = {}) {
  const today = dateKey();
  const goal = getCheckInGoal();
  const todayGroups = typeof groups === 'number' ? groups : countTodayGroups(bookId);
  const days = Number(wx.getStorageSync('checkInDays')) || 0;
  const checkedToday = wx.getStorageSync('lastCheckDate') === today;
  const state = { goal, goalWords: goal * GROUP_SIZE, groups: todayGroups, checkedToday, days };

  if (checkedToday || todayGroups < goal) {
    return { ...state, checked: false };
  }

  const newDays = days + 1;
  wx.setStorageSync('checkInDays', newDays);
  wx.setStorageSync('lastCheckDate', today);
  api.saveStudyData({ checkInDays: newDays }).catch(() => {});

  return { ...state, days: newDays, checkedToday: true, checked: true };
}
