// H5 登录：手机号 + 密码。注册与找回密码走同一套后端接口。
import { reactive } from 'vue';
import api from './api';
import wx from '@/mp/wx';

const AUTH_KEYS = ['token', 'userInfo', 'openid', 'userId', 'hasWechatLogin', 'activeLessonSession'];

export const authState = reactive({
  ready: true,
  loggedIn: !!wx.getStorageSync('token'),
  error: '',
});

export function isLoggedIn() {
  return !!wx.getStorageSync('token');
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
  // lessonLevel 由后端按累计课时计算；旧接口没有该字段时回退到 level。
  wx.setStorageSync('userLevel', user.lessonLevel || user.level || 1);
  if (user.phone) wx.setStorageSync('userPhone', user.phone);
  authState.loggedIn = true;
  authState.ready = true;
  authState.error = '';
  return stored;
}

function friendlyError(err) {
  const message = (err && err.message) || '请求失败';
  if (/Failed to fetch|NetworkError|Load failed|aborted/i.test(message)) {
    return '无法连接服务器，请检查网络';
  }
  return message;
}

async function authenticate(action) {
  authState.error = '';
  try {
    const res = await action();
    if (res && res.code === 200 && res.data) {
      persistLogin(res.data);
      return { ok: true, user: res.data.user };
    }
    authState.error = (res && res.msg) || '登录失败';
  } catch (err) {
    authState.error = friendlyError(err);
  }
  return { ok: false, error: authState.error };
}

export function login(phone, password) {
  return authenticate(() => api.phoneLogin(phone, password));
}

export function register({ phone, password, nickname, grade, birthday }) {
  return authenticate(() => api.register({ phone, password, nickname, grade, birthday }));
}

export async function requestPasswordReset(phone, note) {
  try {
    const res = await api.requestPasswordReset(phone, note);
    if (res.code === 200) return { ok: true, message: res.msg };
    return { ok: false, error: res.msg || '提交失败' };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export function logout() {
  AUTH_KEYS.forEach((k) => wx.removeStorageSync(k));
  authState.loggedIn = false;
  authState.error = '';
}
