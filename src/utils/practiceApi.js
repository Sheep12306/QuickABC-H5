// 「四六级词汇卷」AI 出卷的接口配置。
// 只影响 /api/practice/generate 这一个接口，其它功能（登录、词书、复习等）不受影响。
import wx from '@/mp/wx';

const KEY_API_KEY = 'practiceApiKey';
const KEY_BASE_URL = 'practiceApiBase';
const KEY_MODEL = 'practiceApiModel';

export const DEFAULT_PRACTICE_MODEL = 'claude-opus-5-5';
export const DEFAULT_PRACTICE_BASE = 'https://api.anthropic.com';

function read(key) {
  const value = wx.getStorageSync(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function getPracticeApiSettings() {
  return {
    apiKey: read(KEY_API_KEY),
    baseUrl: read(KEY_BASE_URL),
    model: read(KEY_MODEL),
  };
}

export function savePracticeApiSettings(patch = {}) {
  const write = (key, value) => {
    const next = typeof value === 'string' ? value.trim() : '';
    if (next) wx.setStorageSync(key, next);
    else wx.removeStorageSync(key);
  };

  if ('apiKey' in patch) write(KEY_API_KEY, patch.apiKey);
  if ('baseUrl' in patch) write(KEY_BASE_URL, patch.baseUrl);
  if ('model' in patch) write(KEY_MODEL, patch.model);

  return getPracticeApiSettings();
}

// 设置页展示用：不留完整 Key
export function maskApiKey(apiKey) {
  const value = String(apiKey || '');
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
