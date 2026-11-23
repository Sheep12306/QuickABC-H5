// 课时会话：1 课时 = 60 分钟，按整数课时扣除。
// 会话保存在本地，刷新页面时按 endsAt 继续倒计时，避免重复扣费。
import wx from '@/mp/wx';

export const LESSON_SESSION_KEY = 'activeLessonSession';
export const MINUTES_PER_HOUR = 60;

export function normalizeLessonHours(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function formatLessonClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function readActiveLessonSession({ bookId } = {}) {
  let session;
  try {
    session = wx.getStorageSync(LESSON_SESSION_KEY);
  } catch (err) {
    return null;
  }
  if (!session || !session.sessionId || !session.endsAt) return null;

  const userId = wx.getStorageSync('userId') || '';
  if (session.userId && userId && String(session.userId) !== String(userId)) {
    clearLessonSession();
    return null;
  }
  if (Number(session.endsAt) <= Date.now()) {
    clearLessonSession();
    return null;
  }
  if (bookId && session.bookId && String(session.bookId) !== String(bookId)) {
    return null;
  }
  return session;
}

export function saveLessonSession(session) {
  try {
    wx.setStorageSync(LESSON_SESSION_KEY, session);
  } catch (err) {
    // 本地存储失败不影响本次计时
  }
}

export function clearLessonSession() {
  try {
    wx.removeStorageSync(LESSON_SESSION_KEY);
  } catch (err) {
    // ignore
  }
}

// 把后端会话转成本地结构。优先用 remainingSeconds，避免客户端时钟偏差。
export function sessionFromServer(raw, { bookId, userId } = {}) {
  if (!raw) return null;
  const sessionId = raw.id || raw.sessionId;
  if (!sessionId) return null;

  const hours = normalizeLessonHours(raw.hours, 0);
  const minutes = Number(raw.minutes) > 0 ? Number(raw.minutes) : hours * MINUTES_PER_HOUR;
  const remaining = Number(raw.remainingSeconds);
  let endsAt = NaN;
  if (Number.isFinite(remaining) && remaining >= 0) {
    endsAt = Date.now() + remaining * 1000;
  } else if (raw.endsAt) {
    endsAt = new Date(raw.endsAt).getTime();
  }
  if (!Number.isFinite(endsAt) || endsAt <= Date.now()) return null;

  return {
    sessionId,
    userId: userId || wx.getStorageSync('userId') || '',
    bookId: raw.bookId || bookId || '',
    hours: hours || Math.round(minutes / MINUTES_PER_HOUR),
    minutes,
    startedAt: raw.startedAt || '',
    endsAt,
  };
}

// 后端返回最新余额时，同步本地用户缓存，首页/我的页立刻能看到。
export function setStoredLessonHours(value) {
  const hours = normalizeLessonHours(value, null);
  if (hours === null) return;
  try {
    const stored = wx.getStorageSync('userInfo') || {};
    stored.lessonHours = hours;
    wx.setStorageSync('userInfo', stored);
  } catch (err) {
    // ignore
  }
}
