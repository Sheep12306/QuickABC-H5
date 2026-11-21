// 小程序 WXML/WXSS/JS → Vue SFC + CSS + 页面 JS 的自动迁移脚本
// 用法：
//   npm run port                                  # 输出到 port-out/，供人工比对，不改 src
//   node scripts/port.mjs --in-place --force      # 写回 src（跳过手写页面，不覆盖 app-base.css）
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/alex/WeChatProjects/miniprogram-1/miniprogram';
const PROJECT = 'C:/Users/alex/Desktop/QuickABC-H5';
const IN_PLACE = process.argv.includes('--in-place') && process.argv.includes('--force');
const OUT = IN_PLACE ? path.join(PROJECT, 'src') : path.join(PROJECT, 'port-out');

if (process.argv.includes('--in-place') && !process.argv.includes('--force')) {
  console.error('--in-place 会覆盖生成页，请确认后追加 --force 再执行。');
  process.exit(1);
}

// 这些页面已在 H5 手写重做，回写时跳过，避免覆盖字体 token / AppIcon / 新交互。
const HAND_WRITTEN_IDS = new Set([
  'index',
  'discover',
  'my',
  'learn',
  'review',
  'new-word-review',
  'settings',
]);

if (!fs.existsSync(SRC)) {
  console.error(`小程序源码不存在：${SRC}`);
  process.exit(1);
}

const PAGES = [
  { id: 'index', name: 'Home', dir: 'pages/index/index', title: '快背单词', tab: true },
  { id: 'discover', name: 'Discover', dir: 'pages/discover/discover', title: '发现', tab: true },
  { id: 'my', name: 'My', dir: 'pages/my/my', title: '我的', tab: true },
  { id: 'learn', name: 'Learn', dir: 'pages/learn/learn', title: '学习' },
  { id: 'review', name: 'Review', dir: 'pages/review/review', title: '复习' },
  { id: 'new-word-review', name: 'NewWordReview', dir: 'pages/new-word-review/new-word-review', title: '错词本' },
  { id: 'review-mode', name: 'ReviewMode', dir: 'pages/review-mode/review-mode', title: '抗遗忘复习' },
  { id: 'review-date', name: 'ReviewDate', dir: 'pages/review-date/review-date', title: '抗遗忘打卡' },
  { id: 'test-list', name: 'TestList', dir: 'pages/test-list/test-list', title: '单词听写' },
  { id: 'dictation', name: 'Dictation', dir: 'pages/dictation/dictation', title: '听写' },
  { id: 'vocab-detail', name: 'VocabDetail', dir: 'pages/vocab-Detail/vocab-Detail', title: '词汇量' },
  { id: 'vocab-test', name: 'VocabTest', dir: 'pages/vocab-Test/vocab-Test', title: '词汇测试' },
  { id: 'study-setting', name: 'StudySetting', dir: 'pages/studySetting/studySetting', title: '学习设置' },
  { id: 'study-record', name: 'StudyRecord', dir: 'pages/studyRecord/studyRecord', title: '打卡日历' },
  { id: 'level-answer', name: 'LevelAnswer', dir: 'pages/levelAnswer/levelAnswer', title: '语法闯关' },
  { id: 'exam-select', name: 'ExamSelect', dir: 'pages/examSelect/examSelect', title: '选择考试范围' },
  { id: 'exam-answer', name: 'ExamAnswer', dir: 'pages/examAnswer/examAnswer', title: '模拟考试' },
  { id: 'study-plan', name: 'StudyPlan', dir: 'pages/study-plan/study-plan', title: '学习计划' },
  { id: 'commute', name: 'CommuteHome', dir: 'pages/commute/index', title: '通勤英语' },
  { id: 'commute-play', name: 'CommutePlay', dir: 'pages/commute/play', title: '通勤播放' },
  { id: 'profile', name: 'Profile', dir: 'pages/profile/profile', title: '个人资料' },
  { id: 'settings', name: 'Settings', dir: 'pages/settings/settings', title: '设置' },
  { id: 'game', name: 'Game', dir: 'pages/game/game', title: '游戏' },
  { id: 'course-detail', name: 'CourseDetail', dir: 'pages/course-detail/course-detail', title: '课程详情' },
];

// ---------------- WXML ----------------
function parseAttrs(str) {
  const attrs = [];
  let i = 0;
  while (i < str.length) {
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) break;
    const start = i;
    while (i < str.length && !/[\s=]/.test(str[i])) i++;
    const name = str.slice(start, i);
    while (i < str.length && /\s/.test(str[i])) i++;
    let value = null;
    if (str[i] === '=') {
      i++;
      while (i < str.length && /\s/.test(str[i])) i++;
      const q = str[i];
      if (q === '"' || q === "'") {
        i++;
        const end = str.indexOf(q, i);
        value = str.slice(i, end);
        i = end + 1;
      } else {
        const st = i;
        while (i < str.length && !/\s/.test(str[i])) i++;
        value = str.slice(st, i);
      }
    }
    if (name) attrs.push({ name, value });
  }
  return attrs;
}

// 在文本节点里找下一个标签起始的 <，跳过 {{ ... }} 表达式中的比较运算符
function findNextTagIndex(s, start) {
  let i = start;
  let depth = 0;
  while (i < s.length) {
    if (s.startsWith('{{', i)) {
      depth++;
      i += 2;
      continue;
    }
    if (depth > 0 && s.startsWith('}}', i)) {
      depth--;
      i += 2;
      continue;
    }
    if (depth === 0 && s[i] === '<') return i;
    i++;
  }
  return -1;
}

function parseWxml(source) {
  const s = source.replace(/<!--[\s\S]*?-->/g, '');
  const root = { type: 'root', children: [] };
  const stack = [root];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '<') {
      if (s.startsWith('</', i)) {
        const end = s.indexOf('>', i);
        const name = s.slice(i + 2, end).trim();
        let j = stack.length - 1;
        while (j > 0 && stack[j].name !== name) j--;
        if (j > 0) stack.length = j;
        i = end + 1;
      } else {
        let j = i + 1;
        let quote = null;
        while (j < s.length) {
          const ch = s[j];
          if (quote) {
            if (ch === quote) quote = null;
          } else if (ch === '"' || ch === "'") quote = ch;
          else if (ch === '>') break;
          j++;
        }
        let inner = s.slice(i + 1, j);
        const selfClosing = /\/\s*$/.test(inner);
        if (selfClosing) inner = inner.replace(/\/\s*$/, '');
        const sp = inner.search(/\s/);
        const tagName = sp === -1 ? inner : inner.slice(0, sp);
        const attrStr = sp === -1 ? '' : inner.slice(sp + 1);
        const node = { type: 'element', name: tagName, attrs: parseAttrs(attrStr), children: [] };
        stack[stack.length - 1].children.push(node);
        if (!selfClosing) stack.push(node);
        i = j + 1;
      }
    } else {
      const next = findNextTagIndex(s, i);
      const text = s.slice(i, next === -1 ? s.length : next);
      if (text.trim()) stack[stack.length - 1].children.push({ type: 'text', text });
      i = next === -1 ? s.length : next;
    }
  }
  return root;
}

function attrMap(attrs) {
  const map = {};
  attrs.forEach((a) => {
    map[a.name] = a.value;
  });
  return map;
}

function interpolationExpr(value) {
  const re = /\{\{([\s\S]*?)\}\}/g;
  let m;
  let has = false;
  let last = 0;
  const parts = [];
  while ((m = re.exec(value))) {
    has = true;
    const literal = value.slice(last, m.index);
    if (literal) parts.push(JSON.stringify(literal));
    parts.push(`(${m[1].trim()})`);
    last = m.index + m[0].length;
  }
  if (!has) return null;
  const tail = value.slice(last);
  if (tail) parts.push(JSON.stringify(tail));
  return parts.length ? parts.join(' + ') : "''";
}

function wholeInterpolation(value) {
  const m = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value || '');
  return m ? m[1].trim() : null;
}

// Vue 模板属性用双引号包裹，表达式内的双引号需要转成 HTML 实体
function attrExpr(expr) {
  return expr.replace(/"/g, '&quot;');
}

const TAG_MAP = {
  view: 'div',
  text: 'span',
  image: 'img',
  block: 'template',
  'scroll-view': 'div',
  progress: 'mp-progress',
  button: 'button',
  input: 'input',
  label: 'label',
  canvas: 'canvas',
  'checkbox-group': 'div',
  checkbox: 'input',
  picker: 'div',
  form: 'form',
};

const EVENT_MAP = {
  bindtap: 'click',
  catchtap: 'click',
  bindinput: 'input',
  bindconfirm: 'keyup.enter',
  bindchange: 'change',
  bindblur: 'blur',
  bindfocus: 'focus',
  bindlongpress: 'contextmenu',
  catchlongpress: 'contextmenu',
};

function renderNode(node, ctx) {
  if (node.type === 'text') return node.text;
  if (node.type === 'root') return node.children.map((c) => renderNode(c, ctx)).join('');

  const attrs = node.attrs;
  const map = attrMap(attrs);
  const tag = TAG_MAP[node.name] || node.name;

  const forExpr = wholeInterpolation(map['wx:for']);
  const forItem = map['wx:for-item'] || 'item';
  const forIndex = map['wx:for-index'] || 'index';
  const ifExpr = wholeInterpolation(map['wx:if']);
  const elifExpr = wholeInterpolation(map['wx:elif']);
  const isElse = map['wx:else'] !== undefined;
  const keyRaw = map['wx:key'];
  const isRoot = !!node.__isRoot;

  const outAttrs = [];

  // 事件
  attrs.forEach((a) => {
    if (EVENT_MAP[a.name]) {
      if (!a.value) return;
      const isCatch = a.name.startsWith('catch');
      let ev = EVENT_MAP[a.name];
      if (ev === 'contextmenu') ev = 'contextmenu.prevent';
      outAttrs.push(`@${ev}${isCatch && ev === 'click' ? '.stop' : ''}="mp('${a.value}', $event)"`);
    }
  });

  // 普通属性
  attrs.forEach((a) => {
    const n = a.name;
    if (n.startsWith('wx:') || EVENT_MAP[n]) return;
    if (['mode', 'scroll-y', 'scroll-x', 'hover-class', 'open-type', 'confirm-type', 'range', 'canvas-id', 'show-scrollbar', 'enhanced', 'bindscroll'].includes(n)) return;

    if (n === 'class') {
      let expr = interpolationExpr(a.value || '');
      if (isRoot) {
        if (expr) expr = `${expr} + ' page-${ctx.id}'`;
        else expr = null;
      }
      if (expr) outAttrs.push(`:class="${attrExpr(expr)}"`);
      else outAttrs.push(`class="${a.value || ''}${isRoot ? ` page-${ctx.id}` : ''}"`);
      return;
    }
    if (n === 'style') {
      const expr = interpolationExpr(a.value || '');
      if (expr) outAttrs.push(`:style="${attrExpr(expr)}"`);
      else outAttrs.push(`style="${a.value}"`);
      return;
    }
    if (n === 'focus') {
      const whole = wholeInterpolation(a.value);
      if (whole !== null) outAttrs.push(`:autofocus="${attrExpr(whole)}"`);
      return;
    }
    if (n === 'value' || n === 'checked' || n === 'disabled' || n === 'src' || n === 'placeholder' || n === 'maxlength' || n === 'type') {
      const whole = wholeInterpolation(a.value);
      if (whole !== null) {
        // 对 input value 使用 v-model 兼容小程序受控行为
        outAttrs.push(`:${n}="${attrExpr(whole)}"`);
      } else {
        outAttrs.push(`${n}${a.value !== null ? `="${a.value}"` : ''}`);
      }
      return;
    }
    if (n === 'activeColor' || n === 'backgroundColor') {
      const whole = wholeInterpolation(a.value);
      const prop = n === 'activeColor' ? 'active-color' : 'background-color';
      if (whole !== null) outAttrs.push(`:${prop}="${attrExpr(whole)}"`);
      else outAttrs.push(`${prop}="${a.value}"`);
      return;
    }
    if (n === 'stroke-width' || n === 'percent') {
      const whole = wholeInterpolation(a.value);
      if (whole !== null) outAttrs.push(`:${n}="${attrExpr(whole)}"`);
      else outAttrs.push(`${n}="${a.value}"`);
      return;
    }
    if (n === 'data-words' || n === 'data-record') {
      const whole = wholeInterpolation(a.value);
      if (whole !== null) {
        outAttrs.push(`:${n}-json="JSON.stringify(${attrExpr(whole)})"`);
        return;
      }
    }
    if (n.startsWith('data-') || n === 'id') {
      const whole = wholeInterpolation(a.value);
      if (whole !== null) outAttrs.push(`:${n}="${attrExpr(whole)}"`);
      else if (a.value !== null) outAttrs.push(`${n}="${a.value}"`);
      return;
    }
    if (n === 'placeholder-style' || n === 'cursor-spacing') return;
    // 其余静态属性
    if (a.value !== null) outAttrs.push(`${n}="${a.value}"`);
    else outAttrs.push(n);
  });

  // scroll-view 滚动能力
  if (node.name === 'scroll-view') {
    if (map['scroll-y'] !== undefined) outAttrs.push('data-scroll-y="1"');
    if (map['scroll-x'] !== undefined) outAttrs.push('data-scroll-x="1"');
  }

  const childCtx = {
    ...ctx,
    loopItem: forExpr ? forItem : ctx.loopItem,
    loopIndex: forExpr ? forIndex : ctx.loopIndex,
  };

  const children = node.children.map((c) => renderNode(c, childCtx)).join('');

  if (forExpr) {
    let keyExpr = idxExpr(keyRaw, forItem, forIndex);
    const loopAttrs = [`v-for="(${forItem}, ${forIndex}) in ${forExpr}"`];
    if (keyExpr) loopAttrs.push(`:key="${keyExpr}"`);

    if (ifExpr !== null) {
      const inner = `<${tag} v-if="${ifExpr}" ${outAttrs.join(' ')}>${children}</${tag}>`;
      return `<template ${loopAttrs.join(' ')}>${inner}</template>`;
    }
    return `<${tag} ${loopAttrs.join(' ')} ${outAttrs.join(' ')}>${children}</${tag}>`;
  }

  const directives = [];
  if (ifExpr !== null) directives.push(`v-if="${ifExpr}"`);
  else if (elifExpr !== null) directives.push(`v-else-if="${elifExpr}"`);
  else if (isElse) directives.push('v-else');

  const all = [...directives, ...outAttrs].join(' ');
  if (tag === 'template') {
    return `<template ${all}>${children}</template>`;
  }
  if (node.name === 'progress') {
    return `<${tag} ${all} />`;
  }
  if (node.name === 'image' || node.name === 'input' || node.name === 'br') {
    return `<${tag} ${all} />`;
  }
  return `<${tag} ${all}>${children}</${tag}>`;
}

function idxExpr(keyRaw, item, index) {
  if (!keyRaw) return '';
  if (keyRaw === '*this') return item;
  if (keyRaw === 'index') return index;
  // wx:key="id" / wx:key="word"
  if (/^[A-Za-z_$][\w$]*$/.test(keyRaw)) return `${item}.${keyRaw}`;
  return '';
}

function convertWxml(source, id) {
  const tree = parseWxml(source);
  const first = tree.children.find((c) => c.type === 'element');
  if (first) first.__isRoot = true;
  // 给 scroll-view 补滚动样式类
  const walk = (node) => {
    if (node.type !== 'element') return;
    const map = attrMap(node.attrs);
    if (node.name === 'scroll-view') {
      const clsIdx = node.attrs.findIndex((a) => a.name === 'class');
      const extra = map['scroll-y'] !== undefined ? 'mp-scroll-y' : map['scroll-x'] !== undefined ? 'mp-scroll-x' : '';
      if (extra) {
        if (clsIdx !== -1) {
          const a = node.attrs[clsIdx];
          if (a.value !== null && !a.value.includes('{{')) a.value = `${a.value} ${extra}`;
        } else {
          node.attrs.push({ name: 'class', value: extra });
        }
      }
    }
    node.children.forEach(walk);
  };
  tree.children.forEach(walk);
  return renderNode(tree, { id, loopItem: 'item', loopIndex: 'index' });
}

// ---------------- WXSS ----------------
function inlineImports(css, baseDir, seen = new Set()) {
  return css.replace(/@import\s+['"]([^'"]+)['"]\s*;?/g, (m, rel) => {
    const file = path.resolve(baseDir, rel);
    if (seen.has(file) || !fs.existsSync(file)) return '';
    seen.add(file);
    return inlineImports(fs.readFileSync(file, 'utf8'), path.dirname(file), seen);
  });
}

function convertRpx(css) {
  return css.replace(/(-?\d*\.?\d+)rpx\b/g, (_, n) => {
    const v = Number(n) / 75;
    const s = v.toFixed(4).replace(/\.?0+$/, '');
    return `${s || '0'}rem`;
  });
}

function splitRules(css) {
  // 返回 [{selector, body}]，支持 @media 嵌套（原项目未使用，简单兜底）
  const rules = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    const selector = css.slice(i, brace).trim();
    let depth = 1;
    let j = brace + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(brace + 1, j - 1);
    rules.push({ selector, body });
    i = j;
  }
  return rules;
}

function prefixSelector(selector, prefix) {
  if (!selector) return selector;
  if (selector.startsWith('@')) return selector;
  const out = [];
  selector
    .split(',')
    .map((sel) => sel.trim())
    .filter(Boolean)
    .forEach((sel) => {
      if (sel.startsWith(':root') || sel.startsWith('html') || sel.startsWith('body')) {
        out.push(sel);
        return;
      }
      let s = sel;
      if (s === 'page') {
        out.push(prefix);
        return;
      }
      // 仅替换独立的 checkbox 元素选择器，避免破坏 .checkbox-label 这类类名
      s = s.replace(/(^|[\s>+~,(])checkbox(?=\s|$|[:.{>,+~])/g, '$1input[type="checkbox"]');
      s = s.replace(/(^|[\s>+~,(])scroll-view(?=\s|$|[:.{>,+~])/g, '$1.mp-scroll-view');
      s = s.replace(/(^|[\s>+~,(])image(?=\s|$|[:.{>,+~])/g, '$1img');
      s = s.replace(/(^|[\s>+~,(])text(?=\s|$|[:.{>,+~])/g, '$1span');
      out.push(`${prefix} ${s}`);
      // 页面根节点同时带有 page-xxx 和原根类名，需要复合选择器才能命中
      if (s.startsWith('.')) out.push(`${prefix}${s}`);
    });
  return out.join(',\n');
}

function prefixCss(css, id) {
  const prefix = `.page-${id}`;
  return splitRules(css)
    .map(({ selector, body }) => {
      if (selector.startsWith('@media')) {
        const inner = splitRules(body)
          .map((r) => `${prefixSelector(r.selector, prefix)} {${r.body}}`)
          .join('\n');
        return `${selector} {\n${inner}\n}`;
      }
      if (selector.startsWith('@')) {
        return `${selector} {${body}}`;
      }
      return `${prefixSelector(selector, prefix)} {${body}}`;
    })
    .join('\n\n');
}

function convertWxss(dir, id) {
  const file = path.join(SRC, dir + '.wxss');
  if (!fs.existsSync(file)) return '';
  let css = inlineImports(fs.readFileSync(file, 'utf8'), path.dirname(file));
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = convertRpx(css);
  css = prefixCss(css, id).replace(/:root\s*\{/g, '.page-' + id + ' {');
  return css;
}

function convertAppWxss() {
  const file = path.join(SRC, 'app.wxss');
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = convertRpx(css);
  // 小程序的 page 选择器对应 H5 的 body（CSS 变量会向下继承）
  css = css.replace(/(^|\n)\s*page\s*\{/g, '$1body {');
  return css;
}

// ---------------- JS ----------------
const REQUIRE_MAP = {
  '../../utils/api': '@/utils/api',
  '../../utils/tts': '@/utils/tts',
  '../../utils/commute': '@/utils/commute',
  '../utils/api': '@/utils/api',
};

function convertJs(source) {
  let js = source;
  const imports = new Set();

  js = js.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g, (m, name, rel) => {
    const target = REQUIRE_MAP[rel];
    if (!target) return m;
    imports.add(`import ${name} from '${target}';`);
    return '';
  });

  js = js.replace(/\bthis\.data\b/g, 'this.$data');
  js = js.replace(/\bthat\.data\b/g, 'that.$data');
  js = js.replace(/\bPage\s*\(\s*\{/, 'export default createPage({');

  return `${Array.from(imports).join('\n')}
import { createPage } from '@/mp/page';

${js}`;
}

// ---------------- 输出 ----------------
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const componentImports = new Set();

PAGES.forEach((page) => {
  const dir = path.join(SRC, page.dir);
  const wxmlFile = dir + '.wxml';
  const jsFile = dir + '.js';

  if (IN_PLACE && HAND_WRITTEN_IDS.has(page.id)) {
    console.log(`跳过手写页面：${page.name} (${page.id})`);
    return;
  }

  if (fs.existsSync(wxmlFile)) {
    const template = convertWxml(fs.readFileSync(wxmlFile, 'utf8'), page.id);
    const js = fs.existsSync(jsFile) ? convertJs(fs.readFileSync(jsFile, 'utf8')) : 'export default {};';
    write(
      path.join(OUT, 'pages', `${page.name}.vue`),
      `<template>\n${template}\n</template>\n\n<script>\n${js}\n</script>\n`
    );
  } else {
    const js = fs.existsSync(jsFile) ? convertJs(fs.readFileSync(jsFile, 'utf8')) : 'export default {};';
    write(
      path.join(OUT, 'pages', `${page.name}.vue`),
      `<template>\n<div class="page-${page.id}"><slot /></div>\n</template>\n\n<script>\n${js}\n</script>\n`
    );
  }

  const css = convertWxss(page.dir, page.id);
  if (css) write(path.join(OUT, 'styles', 'pages', `${page.id}.css`), css);
  if (/<mp-progress/.test(fs.existsSync(wxmlFile) ? fs.readFileSync(wxmlFile, 'utf8') : '')) {
    componentImports.add('MpProgress');
  }
});

// src/styles/app-base.css 已手写维护（字体 token + 低饱和配色），不再由 app.wxss 覆盖。
// 无论哪种模式，都把小程序转换结果单独写到 port-out/app-base.css 供比对。
const appBaseOut = IN_PLACE
  ? path.join(PROJECT, 'port-out', 'app-base.css')
  : path.join(OUT, 'styles', 'app-base.css');
write(appBaseOut, convertAppWxss());

console.log('迁移完成：', PAGES.length, '个页面');
console.log('输出目录：', OUT);
if (IN_PLACE) {
  console.log('已跳过手写页面；app-base.css 生成结果写到 port-out/app-base.css，未覆盖 src。');
}

