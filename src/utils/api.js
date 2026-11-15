// 后端 API（由小程序 utils/api.js 迁移，wx.request → fetch）
import wx from '@/mp/wx';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://115.29.149.87:3001/api').replace(/\/$/, '');
const SERVER_BASE = (
  import.meta.env.VITE_SERVER_BASE || API_BASE.replace(/\/api$/, '')
).replace(/\/$/, '');

export function resolveAvatarUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return SERVER_BASE + url;
  return url;
}

// 登录进行中的 Promise：未拿到 token 时，请求先等它结束再发，
// 这样首屏可以立即渲染，同时避免启动阶段因缺少 token 请求失败。
let authGate = null;

export function setAuthGate(promise) {
  authGate = promise || null;
}

async function waitForAuth() {
  if (!authGate || getToken()) return;
  try {
    await authGate;
  } catch (e) {
    // 登录失败时继续请求，由后端返回 401，与旧行为一致
  }
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function buildHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, path, data, options = {}) {
  if (!options.skipAuthGate) await waitForAuth();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = Number(options.timeout) > 0 ? Number(options.timeout) : 20000;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: buildHeaders(),
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: controller ? controller.signal : undefined,
    });
    const text = await res.text();
    if (res.status === 404) {
      throw new Error('Not Found');
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { code: res.status, msg: (text || '请求失败').slice(0, 120) };
    }
    if (res.status === 401 || body.code === 401) {
      wx.removeStorageSync('token');
      throw new Error(body.msg || '登录已过期');
    }
    if (!res.ok) {
      throw new Error(body.msg || `请求失败 (${res.status})`);
    }
    return body;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const api = {
  resolveAvatarUrl,
  setAuthGate,

  // 认证（小程序保留；H5 使用 h5Login）
  login: (code, userInfo) => request('POST', '/auth/login', { code, userInfo }),
  // 登录请求本身不能等待 authGate，否则会互相等待
  h5Login: (deviceId, userInfo) =>
    request('POST', '/auth/h5-login', { deviceId, userInfo }, { skipAuthGate: true }),
  getUserInfo: () => request('GET', '/auth/userinfo'),

  // 单词书
  getAllWordBooks: () => request('GET', '/wordbooks'),

  // 单词
  getWordsByBookId: ({ bookId, groupNum = 1, groupSize = 5 }) =>
    request('GET', `/wordbooks/${bookId}/words?groupNum=${groupNum}&groupSize=${groupSize}`),
  getWordsByIds: (wordIds) => request('POST', '/words/batch', { wordIds }),

  // 学习进度
  getBookLearningData: (bookId) => request('GET', `/study/progress/${bookId}`),

  // 已学单词
  getLearnedWordIds: (bookId, groupNum) =>
    request('GET', `/study/learned-words/${bookId}?groupNum=${groupNum}`),
  saveLearnedWords: (bookId, groupNum, wordIds) =>
    request('PUT', `/study/learned-words/${bookId}`, { groupNum, wordIds }),

  // 学习记录
  getLearnRecord: (bookId) => request('GET', `/study/learn-record/${bookId}`),
  saveLearnRecord: (bookId, learnRecord) =>
    request('PUT', `/study/learn-record/${bookId}`, { learnRecord }),

  // 用户
  getProfile: () => request('GET', '/user/profile'),
  saveProfile: (userInfo) => request('PUT', '/user/profile', { userInfo }),
  uploadAvatar: async (file) => {
    await waitForAuth();
    const form = new FormData();
    form.append('avatar', file);
    const headers = buildHeaders();
    delete headers['Content-Type'];
    const res = await fetch(API_BASE + '/user/avatar', {
      method: 'POST',
      headers,
      body: form,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('解析失败');
    }
  },
  getStudyData: () => request('GET', '/user/study-data'),
  saveStudyData: (data) => request('PUT', '/user/study-data', data),

  // 词汇测试
  getVocabTestRecords: () => request('GET', '/vocab-test/records'),
  saveVocabTestRecord: (score, testTime) => request('POST', '/vocab-test/records', { score, testTime }),
  startVocabTest: () => request('GET', '/vocab-test/start'),
  submitVocabTest: (answers) => request('POST', '/vocab-test/submit', { answers }),

  // 错词 + 题库
  getWrongWords: () => request('GET', '/wrong-words'),
  addWrongWord: (word) => request('POST', '/wrong-words', { word }),
  deleteWrongWord: (id) => request('DELETE', `/wrong-words/${id}`),
  getQuestionList: (scopeIds) => request('GET', `/questions?scopeIds=${scopeIds.join(',')}`),

  // 四六级词汇卷（后端调用 Claude 实时生成，耗时较长）
  generatePracticePaper: ({ level, words }) =>
    request('POST', '/practice/generate', { level, words }, { timeout: 180000 }),

  // 通勤英语
  getCommuteToday: () => request('GET', '/commute/today'),
  saveCommuteSettings: (mode) => request('POST', '/commute/settings', { mode }),
  completeCommuteReview: (wordCount, duration) =>
    request('POST', '/commute/complete', { wordCount, duration }),
  getCommuteTts: (text, lang) =>
    request('POST', '/commute/tts', { text, lang })
      .then((res) => {
        if (res && res.code === 200 && res.data && res.data.url) {
          return SERVER_BASE + res.data.url;
        }
        return null;
      })
      .catch(() => null),
};

export { API_BASE, SERVER_BASE };
export default api;
