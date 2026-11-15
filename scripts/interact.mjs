// 交互冒烟测试：验证点击、输入、弹窗、导航与本地存储
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CONNECT_URL = process.env.CONNECT_URL || 'http://127.0.0.1:9333';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const BOOT_MS = 7000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.connect({
  browserURL: CONNECT_URL,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push(msg.text());
});

const results = [];
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---------- 1. 生词本：添加生词 ----------
await page.goto(BASE + '/#/word-book-list', { waitUntil: 'domcontentloaded' });
await sleep(BOOT_MS);
await page.evaluate(() => localStorage.removeItem('quickabc:newWords'));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.top-action')].find((b) => b.innerText.includes('添加'));
  btn && btn.click();
});
await sleep(400);
const modalOpen = await page.evaluate(() => !!document.querySelector('.add-modal'));
check('生词本-打开添加弹窗', modalOpen);
const inputs = await page.$$('.add-modal .modal-input');
if (inputs.length === 3) {
  await inputs[0].type('serendipity');
  await inputs[1].type('/ˌserənˈdɪpəti/');
  await inputs[2].type('意外发现');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.modal-btn')].find((b) => b.innerText.includes('确认添加'));
    btn && btn.click();
  });
  await sleep(500);
  const body = await page.evaluate(() => document.body.innerText);
  const stored = await page.evaluate(() => localStorage.getItem('quickabc:newWords'));
  check('生词本-添加成功', body.includes('serendipity') && !!stored, body.includes('serendipity') ? '列表已更新' : '列表未出现');
} else {
  check('生词本-输入框数量', false, `找到 ${inputs.length} 个`);
}

// ---------- 2. 考试范围：勾选 ----------
await page.goto(BASE + '/#/exam-select', { waitUntil: 'domcontentloaded' });
await sleep(BOOT_MS);
await page.evaluate(() => document.querySelector('.scope-item').click());
await sleep(300);
const countText = await page.evaluate(() => document.querySelector('.count-tip').innerText);
const checked = await page.evaluate(() => document.querySelector('.scope-item input').checked);
check('考试范围-勾选并计数', countText.includes('已选1类') && checked, countText.trim());

// ---------- 3. 学习页：点击单词 ----------
await page.goto(BASE + '/#/learn?bookId=11&startGroup=1', { waitUntil: 'domcontentloaded' });
await sleep(BOOT_MS);
const wordCards = await page.$$('.word-card');
check('学习页-渲染单词', wordCards.length === 5, `${wordCards.length} 个单词`);
if (wordCards.length) {
  await wordCards[0].click();
  await sleep(200);
  await wordCards[0].click();
  await sleep(500);
  const state = await page.evaluate(() => ({
    activeDots: document.querySelectorAll('.word-card .indicator-dot.active').length,
    infoShown: document.querySelector('.word-card .word-info').className.includes('show'),
  }));
  check('学习页-点击两次显示释义', state.activeDots === 2 && state.infoShown, JSON.stringify(state));
}

// ---------- 4. 听写：带参数导航 + 数据传递 ----------
// 先回到首页，确保学习页已完成卸载写入，避免测试数据被覆盖
await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
await sleep(600);
const today = await page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});
await page.evaluate(
  ({ today }) => {
    localStorage.setItem('quickabc:currentBook', JSON.stringify({ id: 11, name: '测试词书', totalWords: 100 }));
    localStorage.setItem(
      'quickabc:dailyLearnedWords_11_' + today,
      JSON.stringify([
        { id: 9001, en: 'zebra', phonetic: '/ˈziːbrə/', part: 'n.', meaning: '斑马' },
        { id: 9002, en: 'yacht', phonetic: '/jɒt/', part: 'n.', meaning: '游艇' },
      ])
    );
  },
  { today }
);
await page.goto(BASE + '/#/test-list?bookId=11', { waitUntil: 'domcontentloaded' });
await sleep(BOOT_MS);
const listText = await page.evaluate(() => document.body.innerText);
check('听写列表-显示当日单词', listText.includes(today) && listText.includes('2个单词'));
await page.evaluate(() => document.querySelector('.mode-card').click());
await sleep(1200);
const dictationText = await page.evaluate(() => document.body.innerText);
check('听写页-接收单词参数', dictationText.includes('zebra') && dictationText.includes('1/2'), dictationText.slice(0, 80).replace(/\n/g, ' '));

// ---------- 5. 我的：登录弹窗 ----------
await page.goto(BASE + '/#/my', { waitUntil: 'domcontentloaded' });
await sleep(BOOT_MS);
const loginBtn = await page.$('.onekey-login-btn');
check('我的-显示 H5 登录按钮', !!loginBtn);
if (loginBtn) {
  await loginBtn.click();
  await sleep(400);
  const modalTitle = await page.evaluate(() => document.querySelector('.mp-modal-title')?.innerText || '');
  check('我的-打开登录弹窗', modalTitle.includes('H5 登录'), modalTitle);
  await page.evaluate(() => document.querySelector('.mp-modal-input')?.focus());
  await page.keyboard.type('测试用户');
  await page.evaluate(() => [...document.querySelectorAll('.mp-modal-btn')].find((b) => b.innerText.includes('确定'))?.click());
  await sleep(2600);
  const loginState = await page.evaluate(() => ({
    modalClosed: !document.querySelector('.mp-modal'),
    toast: document.querySelector('.mp-toast')?.innerText || '',
    body: document.body.innerText,
  }));
  check(
    '我的-登录失败有提示',
    loginState.modalClosed && (!!loginState.toast || loginState.body.includes('登录失败')),
    loginState.toast || '后端不可达时正常降级'
  );
}

await page.screenshot({ path: 'interact.png' });
const report = results.join('\n') + '\n--- page errors ---\n' + (errors.length ? errors.join('\n') : '(none)');
fs.writeFileSync('interact.log', report);
console.log(report);
process.exit(0);
