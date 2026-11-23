import { createRouter, createWebHashHistory } from 'vue-router';

import Home from './pages/Home.vue';
import { isLoggedIn } from './utils/auth';

// 首屏只静态打包首页；其余页面按路由懒加载，各自生成独立 chunk。
// 页面样式也跟随路由按需加载，避免首屏一次性引入全部 26 个页面的 CSS。
const pageLoaders = {
  login: () => import('./pages/Login.vue'),
  register: () => import('./pages/Register.vue'),
  'forgot-password': () => import('./pages/ForgotPassword.vue'),
  discover: () => import('./pages/Discover.vue'),
  my: () => import('./pages/My.vue'),
  learn: () => import('./pages/Learn.vue'),
  review: () => import('./pages/Review.vue'),
  'new-word-review': () => import('./pages/NewWordReview.vue'),
  'review-mode': () => import('./pages/ReviewMode.vue'),
  'review-date': () => import('./pages/ReviewDate.vue'),
  'test-list': () => import('./pages/TestList.vue'),
  dictation: () => import('./pages/Dictation.vue'),
  'vocab-detail': () => import('./pages/VocabDetail.vue'),
  'vocab-test': () => import('./pages/VocabTest.vue'),
  'study-setting': () => import('./pages/StudySetting.vue'),
  'study-record': () => import('./pages/StudyRecord.vue'),
  'level-answer': () => import('./pages/LevelAnswer.vue'),
  'exam-select': () => import('./pages/ExamSelect.vue'),
  'exam-answer': () => import('./pages/ExamAnswer.vue'),
  'study-plan': () => import('./pages/StudyPlan.vue'),
  commute: () => import('./pages/CommuteHome.vue'),
  'commute-play': () => import('./pages/CommutePlay.vue'),
  'vocab-paper': () => import('./pages/VocabPaper.vue'),
  'export-words': () => import('./pages/ExportWords.vue'),
  search: () => import('./pages/Search.vue'),
  profile: () => import('./pages/Profile.vue'),
  settings: () => import('./pages/Settings.vue'),
  game: () => import('./pages/Game.vue'),
  'course-detail': () => import('./pages/CourseDetail.vue'),
};

// 懒加载的样式加载器（不会在首屏被打包）
const cssLoaders = import.meta.glob('./styles/pages/*.css');

function page(key) {
  return async () => {
    const cssLoader = cssLoaders[`./styles/pages/${key}.css`];
    const [mod] = await Promise.all([
      pageLoaders[key](),
      cssLoader ? cssLoader() : Promise.resolve(),
    ]);
    return mod.default || mod;
  };
}

const routes = [
  { path: '/login', name: 'login', component: page('login'), meta: { title: '登录', public: true, guestOnly: true, auth: true } },
  { path: '/register', name: 'register', component: page('register'), meta: { title: '注册', public: true, guestOnly: true, auth: true } },
  { path: '/forgot-password', name: 'forgot-password', component: page('forgot-password'), meta: { title: '找回密码', public: true, guestOnly: true, auth: true } },
  { path: '/', name: 'home', component: Home, meta: { title: '快背单词', tab: true } },
  { path: '/discover', name: 'discover', component: page('discover'), meta: { title: '发现', tab: true } },
  { path: '/my', name: 'my', component: page('my'), meta: { title: '我的', tab: true } },
  { path: '/learn', name: 'learn', component: page('learn'), meta: { title: '学习' } },
  { path: '/review', name: 'review', component: page('review'), meta: { title: '复习' } },
  { path: '/new-word-review', name: 'new-word-review', component: page('new-word-review'), meta: { title: '错词本' } },
  { path: '/review-mode', name: 'review-mode', component: page('review-mode'), meta: { title: '抗遗忘复习' } },
  { path: '/review-date', name: 'review-date', component: page('review-date'), meta: { title: '抗遗忘打卡' } },
  { path: '/test-list', name: 'test-list', component: page('test-list'), meta: { title: '单词听写' } },
  { path: '/dictation', name: 'dictation', component: page('dictation'), meta: { title: '听写' } },
  { path: '/vocab-detail', name: 'vocab-detail', component: page('vocab-detail'), meta: { title: '词汇量' } },
  { path: '/vocab-test', name: 'vocab-test', component: page('vocab-test'), meta: { title: '词汇测试' } },
  { path: '/study-setting', name: 'study-setting', component: page('study-setting'), meta: { title: '学习设置' } },
  { path: '/study-record', name: 'study-record', component: page('study-record'), meta: { title: '打卡日历' } },
  { path: '/level-answer', name: 'level-answer', component: page('level-answer'), meta: { title: '语法闯关' } },
  { path: '/exam-select', name: 'exam-select', component: page('exam-select'), meta: { title: '选择考试范围' } },
  { path: '/exam-answer', name: 'exam-answer', component: page('exam-answer'), meta: { title: '模拟考试' } },
  { path: '/study-plan', name: 'study-plan', component: page('study-plan'), meta: { title: '学习计划' } },
  { path: '/commute', name: 'commute', component: page('commute'), meta: { title: '通勤英语' } },
  { path: '/commute/play', name: 'commute-play', component: page('commute-play'), meta: { title: '通勤播放' } },
  { path: '/vocab-paper', name: 'vocab-paper', component: page('vocab-paper'), meta: { title: '四六级词汇卷' } },
  { path: '/export-words', name: 'export-words', component: page('export-words'), meta: { title: '导出单词' } },
  { path: '/search', name: 'search', component: page('search'), meta: { title: '搜索单词' } },
  { path: '/profile', name: 'profile', component: page('profile'), meta: { title: '个人资料' } },
  { path: '/settings', name: 'settings', component: page('settings'), meta: { title: '设置' } },
  { path: '/game', name: 'game', component: page('game'), meta: { title: '游戏' } },
  { path: '/course-detail', name: 'course-detail', component: page('course-detail'), meta: { title: '课程详情' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 未登录只能访问登录 / 注册 / 找回密码；已登录访问这些页面则回首页。
router.beforeEach((to) => {
  const loggedIn = isLoggedIn();
  if (!to.meta.public && !loggedIn) {
    const redirect = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {};
    return { path: '/login', query: redirect };
  }
  if (to.meta.guestOnly && loggedIn) return { path: '/' };
  return true;
});

export default router;
