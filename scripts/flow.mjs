// 端到端交互流程测试（后端不可达时也能跑通本地逻辑）
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9333',
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
});

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
const today = await page.evaluate(() => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
});
await page.evaluate(
  ({ today }) => {
    localStorage.setItem('quickabc:currentBook', JSON.stringify({ id: 11, name: '四级英语词汇', totalWords: 100, progress: 3 }));
    localStorage.setItem(
      'quickabc:dailyLearnedWords_11_' + today,
      JSON.stringify([
        { id: 1001, en: 'apple', phonetic: '/ˈæpl/', part: 'n.', meaning: '苹果' },
        { id: 1002, en: 'banana', phonetic: '/bəˈnɑːnə/', part: 'n.', meaning: '香蕉' },
      ])
    );
    localStorage.setItem('quickabc:checkInDays', 3);
  },
  { today }
);

// 首页 → 抗遗忘复习
await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'domcontentloaded' });
await sleep(7000);
await page.evaluate(() => [...document.querySelectorAll('.feature-item')].find((b) => b.innerText.includes('复习')).click());
await sleep(800);
let hash = await page.evaluate(() => location.hash);
check('首页 → 复习列表', hash.includes('/review-mode'), hash);
let body = await page.evaluate(() => document.body.innerText);
check('复习列表显示日期卡片', body.includes(today) && body.includes('共2个单词'));

// 进入抗遗忘打卡
await page.evaluate(() => document.querySelector('.mode-card').click());
await sleep(800);
hash = await page.evaluate(() => location.hash);
body = await page.evaluate(() => document.body.innerText);
check('复习列表 → 打卡页', hash.includes('/review-date') && body.includes(today), hash);
check('打卡页显示第一个单词', body.includes('apple'));

// 认识 → 下一个 → 认识
await page.evaluate(() => [...document.querySelectorAll('.btn-action')].find((b) => b.innerText.includes('认识')).click());
await sleep(400);
let state = await page.evaluate(() => ({
  answer: document.querySelector('.answer-area').className.includes('show'),
  meaning: document.body.innerText.includes('苹果'),
}));
check('点击认识显示释义', state.answer && state.meaning, JSON.stringify(state));
await page.evaluate(() => document.querySelector('.btn-next').click());
await sleep(300);
body = await page.evaluate(() => document.body.innerText);
check('切换到第二个单词', body.includes('banana') && body.includes('2/2'));
await page.evaluate(() => [...document.querySelectorAll('.btn-action')].find((b) => b.innerText.includes('认识')).click());
await sleep(400);
const hasTip = await page.evaluate(() => !!document.querySelector('.checkin-guide'));
check('最后一个单词提示打卡', hasTip);

// 打卡 → 返回列表，检查次数 +1
await page.evaluate(() => document.querySelector('.checkin-area').click());
await sleep(1800);
hash = await page.evaluate(() => location.hash);
body = await page.evaluate(() => document.body.innerText);
check('打卡后返回复习列表', hash.includes('/review-mode'), hash);
check('复习列表打卡次数更新', body.includes('1'), body.slice(0, 80).replace(/\n/g, ' | '));

// 听写：播放按钮
await page.goto('http://127.0.0.1:4173/#/test-list?bookId=11', { waitUntil: 'domcontentloaded' });
await sleep(7000);
await page.evaluate(() => document.querySelector('.mode-card').click());
await sleep(1000);
body = await page.evaluate(() => document.body.innerText);
check('听写页加载真实单词', body.includes('apple') && body.includes('1/2'));
const playClicked = await page.evaluate(() => {
  const btn = document.querySelector('.bar-play');
  if (!btn) return false;
  btn.click();
  return true;
});
await sleep(1200);
const playing = await page.evaluate(() => {
  const shape = document.querySelector('.play-shape');
  return { pause: shape && shape.classList.contains('pause'), toast: document.querySelector('.mp-toast')?.innerText || '' };
});
check('听写播放按钮响应', playClicked && (playing.pause || playing.toast.length > 0), JSON.stringify(playing));

await page.screenshot({ path: 'flow.png' });
const report = results.join('\n') + '\n--- page errors ---\n' + (errors.length ? errors.slice(0, 10).join('\n') : '(none)');
fs.writeFileSync('flow.log', report);
console.log(report);
process.exit(0);
