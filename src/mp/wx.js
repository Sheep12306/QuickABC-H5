// 浏览器端 wx API 兼容层
// 只实现本项目用到的能力：存储、请求、导航、UI 反馈、音频、选图等。
import { reactive } from 'vue';
import {
  navigateTo,
  redirectTo,
  switchTab,
  navigateBack,
  getCurrentPages,
} from './nav';

const STORAGE_PREFIX = 'quickabc:';
const fileMap = new Map();

export const uiState = reactive({
  toast: null,
  loading: false,
  loadingText: '加载中...',
  modal: null,
  actionSheet: null,
});

let toastTimer = null;
let loadingCount = 0;

export const appInstance = {
  globalData: reactive({
    cardThemeIndex: 0,
    token: null,
    userInfo: null,
    profileUpdated: null,
  }),
};

export function getApp() {
  return appInstance;
}

// ---------------- storage ----------------
function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined';
  } catch (e) {
    return false;
  }
}

function getStorageSync(key) {
  if (!storageAvailable()) return '';
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (raw === null) {
    // 兼容历史数据（未加前缀）
    const legacy = localStorage.getItem(key);
    if (legacy === null) return '';
    try {
      return JSON.parse(legacy);
    } catch (e) {
      return legacy;
    }
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}

function setStorageSync(key, value) {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('setStorageSync failed', e);
  }
}

function removeStorageSync(key) {
  if (!storageAvailable()) return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}

function clearStorageSync() {
  if (!storageAvailable()) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

function getStorageInfoSync() {
  const keys = [];
  if (storageAvailable()) {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(STORAGE_PREFIX)) keys.push(k.slice(STORAGE_PREFIX.length));
    });
  }
  return { keys, currentSize: 0, limitSize: 10240 };
}

// ---------------- UI ----------------
function showToast(options = {}) {
  const duration = options.duration || 1500;
  uiState.toast = { title: options.title || '', icon: options.icon || 'none' };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    uiState.toast = null;
  }, duration);
}

function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  uiState.toast = null;
}

function showLoading(options = {}) {
  loadingCount += 1;
  uiState.loadingText = options.title || '加载中...';
  uiState.loading = true;
}

function hideLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) uiState.loading = false;
}

function showModal(options = {}) {
  uiState.modal = {
    title: options.title || '',
    content: options.content || '',
    editable: !!options.editable,
    placeholderText: options.placeholderText || '',
    value: options.content || '',
    confirmText: options.confirmText || '确定',
    cancelText: options.cancelText || '取消',
    showCancel: options.showCancel !== false,
    success: options.success,
    fail: options.fail,
  };
}

function closeModal(confirmed) {
  const modal = uiState.modal;
  if (!modal) return;
  const content = modal.editable ? modal.value : modal.content;
  uiState.modal = null;
  const res = confirmed ? { confirm: true, cancel: false, content } : { confirm: false, cancel: true, content };
  if (modal.success) modal.success(res);
}

function showActionSheet(options = {}) {
  uiState.actionSheet = {
    itemList: options.itemList || [],
    itemColor: options.itemColor || '',
    success: options.success,
    fail: options.fail,
  };
}

export { closeModal, closeActionSheet };

function closeActionSheet(tapIndex) {
  const sheet = uiState.actionSheet;
  if (!sheet) return;
  uiState.actionSheet = null;
  if (tapIndex === null) {
    if (sheet.fail) sheet.fail({ errMsg: 'showActionSheet:fail cancel' });
  } else if (sheet.success) {
    sheet.success({ tapIndex });
  }
}

// ---------------- audio ----------------
class MpAudioContext {
  constructor() {
    this._audio = new Audio();
    this._audio.preload = 'auto';
    this._onEnded = null;
    this._onError = null;
    this._onPlay = null;
    this._onStop = null;
    this._onPause = null;
    this._destroyed = false;
    this._audio.addEventListener('ended', () => !this._destroyed && this._onEnded && this._onEnded());
    this._audio.addEventListener('play', () => !this._destroyed && this._onPlay && this._onPlay());
    this._audio.addEventListener('pause', () => !this._destroyed && this._onPause && this._onPause());
    this._audio.addEventListener('error', () => {
      if (!this._destroyed && this._onError) this._onError({ errMsg: 'audio playback error' });
    });
  }
  get src() {
    return this._audio.src;
  }
  set src(v) {
    this._audio.src = v;
  }
  get paused() {
    return this._audio.paused;
  }
  get duration() {
    return this._audio.duration;
  }
  play() {
    const p = this._audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (!this._destroyed && this._onError) {
          this._onError({ errMsg: '浏览器阻止了自动播放，请点击播放按钮' });
        }
      });
    }
  }
  pause() {
    this._audio.pause();
  }
  stop() {
    try {
      this._audio.pause();
      this._audio.currentTime = 0;
    } catch (e) {
      /* ignore */
    }
    if (!this._destroyed && this._onStop) this._onStop();
  }
  destroy() {
    this._destroyed = true;
    try {
      this._audio.pause();
      this._audio.src = '';
    } catch (e) {
      /* ignore */
    }
    this._onEnded = null;
    this._onError = null;
    this._onPlay = null;
    this._onStop = null;
    this._onPause = null;
  }
  onEnded(fn) {
    this._onEnded = fn;
  }
  onError(fn) {
    this._onError = fn;
  }
  onPlay(fn) {
    this._onPlay = fn;
  }
  onStop(fn) {
    this._onStop = fn;
  }
  onPause(fn) {
    this._onPause = fn;
  }
}

// ---------------- network ----------------
async function request(options = {}) {
  const { url, method = 'GET', data, header = {}, success, fail } = options;
  try {
    const init = { method, headers: { ...header } };
    if (data !== undefined && method !== 'GET') {
      init.body = typeof data === 'string' ? data : JSON.stringify(data);
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, init);
    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch (e) {
      /* keep text */
    }
    const res = { statusCode: response.status, data: body, header: {} };
    response.headers.forEach((v, k) => {
      res.header[k] = v;
    });
    success && success(res);
    return res;
  } catch (err) {
    fail && fail({ errMsg: err.message || 'request:fail' });
    throw err;
  }
}

async function uploadFile(options = {}) {
  const { url, filePath, name = 'file', header = {}, success, fail } = options;
  try {
    const file = fileMap.get(filePath) || filePath;
    const form = new FormData();
    form.append(name, file);
    const response = await fetch(url, { method: 'POST', headers: { ...header }, body: form });
    const text = await response.text();
    success && success({ statusCode: response.status, data: text });
  } catch (err) {
    fail && fail({ errMsg: err.message || 'uploadFile:fail' });
  }
}

// ---------------- 媒体 / 文件 ----------------
function chooseMedia(options = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    document.body.removeChild(input);
    if (!file) {
      options.fail && options.fail({ errMsg: 'chooseMedia:fail cancel' });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    fileMap.set(objectUrl, file);
    options.success &&
      options.success({
        tempFiles: [{ tempFilePath: objectUrl, tempFile: file, size: file.size }],
      });
  });
  input.click();
}

function cropImage(options = {}) {
  // 浏览器端不做裁剪，直接透传
  setTimeout(() => options.success && options.success({ tempFilePath: options.src }), 0);
}

function saveImageToPhotosAlbum(options = {}) {
  const { filePath, success, fail } = options;
  try {
    const a = document.createElement('a');
    a.href = filePath;
    a.download = `quickabc-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success && success({});
  } catch (err) {
    fail && fail({ errMsg: err.message });
  }
}

function speechSynthesis(options = {}) {
  try {
    if (!('speechSynthesis' in window)) return options.fail && options.fail({ errMsg: 'unsupported' });
    const utter = new SpeechSynthesisUtterance(options.content || '');
    utter.lang = options.lang === 'zh_CN' ? 'zh-CN' : 'en-US';
    utter.onend = () => options.success && options.success();
    utter.onerror = () => options.fail && options.fail({ errMsg: 'tts error' });
    window.speechSynthesis.speak(utter);
  } catch (err) {
    options.fail && options.fail({ errMsg: err.message });
  }
}

function getUserProfile() {
  return Promise.reject(new Error('H5 端请使用 H5 登录'));
}

function getSystemInfoSync() {
  return {
    platform: 'h5',
    system: navigator.userAgent,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  };
}

export const wx = {
  // 存储
  getStorageSync,
  setStorageSync,
  removeStorageSync,
  clearStorageSync,
  getStorageInfoSync,
  getStorage: (opts = {}) =>
    opts.success && opts.success({ data: opts.key ? getStorageSync(opts.key) : getStorageWithPrefix() }),
  setStorage: (opts = {}) => {
    setStorageSync(opts.key, opts.data);
    opts.success && opts.success({});
  },

  // 导航
  navigateTo,
  redirectTo,
  switchTab,
  navigateBack,
  reLaunch: ({ url, success }) => {
    redirectTo({ url, success: success && (() => success({})) });
  },
  getCurrentPages,

  // UI
  showToast,
  hideToast,
  showLoading,
  hideLoading,
  showModal,
  showActionSheet,

  // 网络
  request,
  uploadFile,

  // 音频
  createInnerAudioContext: () => new MpAudioContext(),

  // 媒体
  chooseMedia,
  cropImage,
  saveImageToPhotosAlbum,
  openSetting: (opts = {}) => opts.success && opts.success({}),

  // 语音
  speechSynthesis,

  // 登录（H5 由 utils/auth 处理，这里只兜底）
  login: (opts = {}) => {
    setTimeout(() => opts.success && opts.success({ code: 'h5' }), 0);
  },
  getUserProfile,

  // 系统
  getSystemInfoSync,
  getWindowInfo: getSystemInfoSync,

  // 其他空实现
  hideShareMenu: () => {},
  showShareMenu: () => {},
  setNavigationBarTitle: () => {},
  nextTick: (fn) => setTimeout(fn, 0),
};

function getStorageWithPrefix() {
  const out = {};
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => {
      out[k.slice(STORAGE_PREFIX.length)] = getStorageSync(k.slice(STORAGE_PREFIX.length));
    });
  return out;
}

export default wx;
