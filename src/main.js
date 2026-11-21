import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import wx, { getApp } from './mp/wx';
import { setRouter, initStack, getCurrentPages } from './mp/nav';
import MpProgress from './components/MpProgress.vue';
import AppIcon from './components/AppIcon.vue';
import AppSketch from './components/AppSketch.vue';
import { ensureLogin } from './utils/auth';
import api from './utils/api';

import './styles/global.css';
// 首屏页面的样式（其余页面样式由 router.js 按需加载）
import './styles/pages/index.css';

// 让页面代码里的小程序全局变量可用
window.wx = wx;
window.getApp = getApp;
window.getCurrentPages = getCurrentPages;

setRouter(router);
initStack(router.currentRoute.value.fullPath);

const app = createApp(App);
app.component('MpProgress', MpProgress);
app.component('AppIcon', AppIcon);
app.component('AppSketch', AppSketch);
app.use(router);

const autoLogin = import.meta.env.VITE_AUTO_LOGIN !== 'false';
const bootPromise = autoLogin ? ensureLogin().catch(() => null) : Promise.resolve(null);

// 首屏不再等待登录完成：先挂载界面，登录在后台进行。
// 尚未拿到 token 时，api 请求会自动等登录结束（最多 10 秒），
// 登录成功后 App 会重新挂载当前页面，让页面读到最新的本地登录态。
api.setAuthGate(
  Promise.race([
    bootPromise,
    new Promise((resolve) => setTimeout(resolve, 10000)),
  ])
);

app.mount('#app');
