// H5 登录：浏览器没有 wx.login，因此用设备 ID 换取账号
// 后端需要部署 /api/auth/h5-login（见 server-patch/）
import { reactive } from 'vue';
import api from './api';
import wx from '@/mp/wx';

const DEVICE_KEY = 'h5_device_id';

export const authState = reactive({
  ready: false,
  loggedIn: false,
  error: '',
});

export function getDeviceId() {
  let id = wx.getStorageSync(DEVICE_KEY);
  if (!id) {
    id =
      (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
      `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    wx.setStorageSync(DEVICE_KEY, id);
  }
  return id;
}

function persistLogin(data) {
  const { token, user } = data;
  const stored = {
    ...user,
    nickName: user.nickname || user.nickName || '',
    avatarUrl: api.resolveAvatarUrl(user.avatar || user.avatarUrl || ''),
    avatar: user.avatar || '',
  };
  wx.setStorageSync('token', token);
  wx.setStorageSync('userInfo', stored);
  wx.setStorageSync('openid', user.openid);
  wx.setStorageSync('userId', user.id);
  wx.setStorageSync('hasWechatLogin', true);
  wx.setStorageSync('checkInDays', user.checkInDays || 0);
  wx.setStorageSync('userLevel', user.level || 1);
  authState.loggedIn = true;
  authState.error = '';
  return stored;
}

export async function ensureLogin(userInfo) {
  const token = wx.getStorageSync('token');
  if (token) {
    authState.loggedIn = true;
    authState.ready = true;
    return { ok: true, cached: true };
  }
  try {
    const res = await api.h5Login(getDeviceId(), userInfo);
    if (res.code === 200 && res.data) {
      persistLogin(res.data);
      authState.ready = true;
      return { ok: true, user: res.data.user };
    }
    authState.error = res.msg || '登录失败';
  } catch (err) {
    const message = (err && err.message) || '登录失败';
    authState.error =
      message === 'Not Found'
        ? '后端尚未部署 H5 登录接口'
        : /Failed to fetch|NetworkError|Load failed|aborted/i.test(message)
          ? '无法连接服务器'
          : message;
  }
  authState.ready = true;
  return { ok: false, error: authState.error };
}

export function logout() {
  ['token', 'userInfo', 'openid', 'userId', 'hasWechatLogin'].forEach((k) => wx.removeStorageSync(k));
  authState.loggedIn = false;
}
