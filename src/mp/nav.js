// 小程序页面路径 → H5 路由 的映射与导航栈
// 这样原始页面代码里的 wx.navigateTo({ url: '/pages/xxx/xxx?...' }) 可以原样运行。

export const ROUTE_MAP = {
  '/pages/index/index': '/',
  '/pages/discover/discover': '/discover',
  '/pages/my/my': '/my',
  '/pages/learn/learn': '/learn',
  '/pages/review/review': '/review',
  '/pages/new-word-review/new-word-review': '/new-word-review',
  '/pages/review-mode/review-mode': '/review-mode',
  '/pages/review-date/review-date': '/review-date',
  '/pages/test-list/test-list': '/test-list',
  '/pages/dictation/dictation': '/dictation',
  '/pages/vocab-Detail/vocab-Detail': '/vocab-detail',
  '/pages/vocab-Test/vocab-Test': '/vocab-test',
  '/pages/studySetting/studySetting': '/study-setting',
  '/pages/studyRecord/studyRecord': '/study-record',
  '/pages/levelAnswer/levelAnswer': '/level-answer',
  '/pages/examSelect/examSelect': '/exam-select',
  '/pages/examAnswer/examAnswer': '/exam-answer',
  '/pages/wordBookList/wordBookList': '/word-book-list',
  '/pages/study-plan/study-plan': '/study-plan',
  '/pages/checkin-poster/checkin-poster': '/checkin-poster',
  '/pages/commute/index': '/commute',
  '/pages/commute/play': '/commute/play',
  '/pages/vocab-paper/vocab-paper': '/vocab-paper',
  '/pages/profile/profile': '/profile',
  '/pages/settings/settings': '/settings',
  '/pages/game/game': '/game',
  '/pages/course-detail/course-detail': '/course-detail',
};

let router = null;

// 导航栈：保存每次进入页面的 fullPath（与 route.fullPath 对齐）
let stack = [];

// fullPath → 页面组件实例（路由卸载后仍保留引用，供 getCurrentPages 使用）
const registry = new Map();

export function setRouter(r) {
  router = r;
}

export function initStack(fullPath) {
  stack = [fullPath || '/'];
}

export function getStack() {
  return stack;
}

// 浏览器前进/后退时同步导航栈
export function syncStack(fullPath) {
  if (!fullPath) return;
  if (stack[stack.length - 1] === fullPath) return;
  const idx = stack.lastIndexOf(fullPath);
  if (idx !== -1) {
    stack = stack.slice(0, idx + 1);
    return;
  }
  stack.push(fullPath);
}

export function registerPage(vm) {
  if (!vm || !vm.$route) return;
  registry.set(vm.$route.fullPath, vm);
}

export function getCurrentPages() {
  return stack.map((fp) => registry.get(fp)).filter(Boolean);
}

export function parseMpUrl(url) {
  const raw = String(url || '');
  const qIndex = raw.indexOf('?');
  const rawPath = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const rawQuery = qIndex === -1 ? '' : raw.slice(qIndex + 1);
  const query = {};
  rawQuery
    .split('&')
    .filter(Boolean)
    .forEach((pair) => {
      const i = pair.indexOf('=');
      const k = decodeURIComponent(i === -1 ? pair : pair.slice(0, i));
      // 注意：保留原始（未解码）值，页面代码会自行 decodeURIComponent
      const v = i === -1 ? '' : pair.slice(i + 1);
      query[k] = v;
    });
  return { mpPath: rawPath, path: ROUTE_MAP[rawPath] || rawPath, query };
}

// 兼容 wx.navigateTo({ url, success, fail })
function normalizeNavArgs(options) {
  if (typeof options === 'string') return { url: options };
  return options || {};
}

export function navigateTo(options = {}) {
  const { url, success, fail } = normalizeNavArgs(options);
  if (!router) return;
  const { path, query } = parseMpUrl(url);
  if (!ROUTE_MAP[path] && !path.startsWith('/')) return fail && fail({ errMsg: '页面不存在' });
  const resolved = router.resolve({ path, query });
  router
    .push({ path, query })
    .then(() => {
      if (stack[stack.length - 1] !== resolved.fullPath) stack.push(resolved.fullPath);
      success && success({});
    })
    .catch((err) => {
      // 重复进入同一路由时 vue-router 会 reject，但页面其实已经可用
      if (err && err.name === 'NavigationDuplicated') {
        if (stack[stack.length - 1] !== resolved.fullPath) stack.push(resolved.fullPath);
        success && success({});
      } else {
        console.error('[wx.navigateTo] 跳转失败', path, err);
        fail && fail(err);
      }
    });
}

export function redirectTo(options = {}) {
  const { url, success, fail } = normalizeNavArgs(options);
  if (!router) return;
  const { path, query } = parseMpUrl(url);
  const resolved = router.resolve({ path, query });
  router
    .replace({ path, query })
    .then(() => {
      if (stack.length) stack[stack.length - 1] = resolved.fullPath;
      else stack = [resolved.fullPath];
      success && success({});
    })
    .catch((err) => fail && fail(err));
}

export function switchTab(options = {}) {
  const { url, success } = normalizeNavArgs(options);
  if (!router) return;
  const { path, query } = parseMpUrl(url);
  const resolved = router.resolve({ path, query });
  router.replace({ path, query }).then(() => {
    stack = [resolved.fullPath];
    success && success({});
  });
}

export function navigateBack({ delta = 1, success } = {}) {
  if (!router) return;
  const n = Math.max(1, Number(delta) || 1);
  if (stack.length > n) {
    stack.splice(stack.length - n, n);
    router.back();
  } else if (stack.length > 1) {
    stack = [stack[0]];
    router.back();
  } else {
    router.replace('/');
  }
  success && success({});
}

// 供 App 导航栏使用
export function canGoBack() {
  return stack.length > 1;
}
