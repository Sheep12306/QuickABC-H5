import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import wx, { getApp } from './mp/wx';
import { setRouter, initStack, getCurrentPages } from './mp/nav';
import MpProgress from './components/MpProgress.vue';
import AppIcon from './components/AppIcon.vue';
import AppSketch from './components/AppSketch.vue';
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

// 登录态由 router.beforeEach 判定：没有 token 会跳到 /login。
app.mount('#app');
