// 运行时冒烟测试：连接已开启远程调试的 Edge/Chrome
// 先启动浏览器：
//   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --remote-debugging-port=9333 --no-first-run --user-data-dir=/tmp/edge-qa about:blank
// 再运行：node scripts/smoke.mjs / 9000
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CONNECT_URL = process.env.CONNECT_URL || 'http://127.0.0.1:9333';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const route = process.argv[2] || '/';
const waitMs = Number(process.argv[3] || 9000);

const browser = await puppeteer.connect({
  browserURL: CONNECT_URL,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
const errors = [];
const logs = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => {
  if (!req.url().includes('favicon')) logs.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText || ''}`);
});

await page.goto(BASE + '/#' + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise((r) => setTimeout(r, waitMs));

const text = await page.evaluate(() => document.body.innerText.slice(0, 1200));
const htmlLen = await page.evaluate(() => document.body.innerHTML.length);
await page.screenshot({ path: 'smoke.png' });

const report = [
  `ROUTE ${route}`,
  '--- body text ---',
  text || '(empty)',
  '--- html length --- ' + htmlLen,
  '--- page errors ---',
  errors.length ? errors.join('\n') : '(none)',
  '--- console warnings/errors ---',
  logs.length ? logs.slice(0, 40).join('\n') : '(none)',
].join('\n');
fs.writeFileSync('smoke.log', report);
console.log(report);
process.exit(0);
