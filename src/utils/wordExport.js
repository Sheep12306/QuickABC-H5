// 单词测验导出：按日期汇总 dailyLearnedWords_<bookId>_<date>，生成
// 「日期 + 测验」的简洁试卷版式，可下载 Word 或打开打印窗口另存 PDF。
// 全部在本地完成，不经过后端。
import wx from '@/mp/wx';

const PREFIX = 'dailyLearnedWords_';
const DATE_PATTERN = /(\d{4}-\d{2}-\d{2})$/;
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function todayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateLabel(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(key || '');
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

export function weekdayLabel(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return '';
  return WEEKDAYS[date.getDay()] || '';
}

function storageKeys() {
  try {
    return (wx.getStorageInfoSync() || {}).keys || [];
  } catch (err) {
    return [];
  }
}

function normalizeWord(raw) {
  if (!raw) return null;
  const en = String(raw.en || raw.word || '').trim();
  if (!en) return null;
  return {
    id: raw.id != null ? raw.id : null,
    en,
    phonetic: String(raw.phonetic || '').trim(),
    part: String(raw.part || '').trim(),
    meaning: String(raw.meaning || '').trim(),
  };
}

// 汇总某一天所有词书的单词，按拼写去重并排序。
// bookId / bookIds 仅作为拿不到 storage key 列表时的兜底。
export function collectWordsForDate({ date, bookId, bookIds = [] } = {}) {
  const day = date || todayKey();
  const suffix = `_${day}`;
  let keys = storageKeys().filter(
    (key) => key.indexOf(PREFIX) === 0 && key.endsWith(suffix)
  );

  if (!keys.length) {
    const ids = bookId ? [bookId] : bookIds;
    keys = Array.from(new Set(ids.filter(Boolean).map((id) => `${PREFIX}${id}_${day}`)));
  }
  if (bookId) {
    keys = keys.filter((key) => key.indexOf(`${PREFIX}${bookId}_`) === 0);
  }

  const merged = new Map();
  keys.forEach((key) => {
    let list;
    try {
      list = wx.getStorageSync(key);
    } catch (err) {
      list = null;
    }
    if (!Array.isArray(list)) return;
    list.forEach((raw) => {
      const word = normalizeWord(raw);
      if (!word) return;
      const dedupeKey = word.en.toLowerCase();
      if (!merged.has(dedupeKey)) merged.set(dedupeKey, word);
    });
  });

  const words = Array.from(merged.values()).sort((a, b) =>
    a.en.localeCompare(b.en, 'en', { sensitivity: 'base' })
  );

  return { date: day, words };
}

// 列出本机有学习记录的日期（倒序），供导出页选择。
export function collectAvailableDates({ bookId } = {}) {
  const dates = new Set();
  const keys = storageKeys();

  if (keys.length) {
    keys.forEach((key) => {
      if (key.indexOf(PREFIX) !== 0) return;
      const match = key.match(DATE_PATTERN);
      if (match) dates.add(match[1]);
    });
  } else if (bookId) {
    // 拿不到 key 列表时，按当前词书兜底扫描最近 90 天。
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.add(todayKey(date));
    }
  }

  const today = todayKey();
  return Array.from(dates)
    .sort()
    .reverse()
    .map((date) => {
      // 只把 bookId 当兜底来源，不要过滤掉其他词书当天的单词。
      const { words } = collectWordsForDate({ date, bookIds: bookId ? [bookId] : [] });
      return {
        date,
        count: words.length,
        weekday: weekdayLabel(date),
        isToday: date === today,
      };
    })
    .filter((item) => item.count > 0);
}

function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => map[ch]);
}

function wordMeaning(word) {
  return [word.part, word.meaning].filter(Boolean).join(' ');
}

// 纸张与分页：一页固定左右两列，词数取 5 的倍数（一组 5 个）。
// A4：每页 20 词（两列 × 10 行，4 组）；A5：每页 10 词（两列 × 5 行，2 组）。
const PAPER_CONFIG = {
  a4: {
    key: 'a4',
    label: 'A4',
    size: '21cm 29.7cm',
    margin: '14mm',
    perPage: 20,
    titleSize: '18pt',
    metaSize: '11pt',
    numSize: '9.5pt',
    wordSize: '11.5pt',
    meaningSize: '10pt',
    rowHeight: '22mm',
  },
  a5: {
    key: 'a5',
    label: 'A5',
    size: '14.8cm 21cm',
    margin: '12mm',
    perPage: 10,
    titleSize: '15pt',
    metaSize: '9.5pt',
    numSize: '8.5pt',
    wordSize: '10pt',
    meaningSize: '9pt',
    rowHeight: '26mm',
  },
};

export function paperConfig(paper) {
  return PAPER_CONFIG[paper === 'a5' ? 'a5' : 'a4'];
}

// 按纸张把单词切成页：每页左右两列，每行两个词，编号跨页连续。
export function buildQuizPages(words, paper = 'a4') {
  const config = paperConfig(paper);
  const pages = [];
  for (let offset = 0; offset < words.length; offset += config.perPage) {
    const slice = words.slice(offset, offset + config.perPage);
    const rows = [];
    for (let index = 0; index < slice.length; index += 2) {
      rows.push([
        { word: slice[index], number: offset + index + 1 },
        index + 1 < slice.length
          ? { word: slice[index + 1], number: offset + index + 2 }
          : null,
      ]);
    }
    pages.push({ rows, count: slice.length });
  }
  return pages;
}

// 导出试卷 HTML：标题「日期 测验」，副标题左姓名右得分，
// 正文固定左右两列，编号单词在左、翻译在右。
// hideTranslation / hideWord 用于生成默写或看中文写英文的测验。
export function buildQuizHtml(words, date, options = {}) {
  const day = date || todayKey();
  const name = String(options.name || '').trim();
  const hideTranslation = !!options.hideTranslation;
  const hideWord = !!options.hideWord;
  const config = paperConfig(options.paper);
  const pages = buildQuizPages(words, config.key);
  const total = words.length;

  // 一行四列：左单词 | 左翻译 | 右单词 | 右翻译。
  const renderPair = (item, rightSide = false) => {
    const wordClass = rightSide ? 'word word--right' : 'word';
    if (!item) return `<td class="${wordClass}"></td><td class="meaning"></td>`;
    const meaning = hideTranslation ? '' : escapeHtml(wordMeaning(item.word));
    const word = hideWord ? '<span class="blank"></span>' : escapeHtml(item.word.en);
    return `<td class="${wordClass}"><span class="num">${item.number}.</span> ${word}</td><td class="meaning">${meaning}</td>`;
  };

  const pagesHtml = pages
    .map((page, pageIndex) => {
      const rows = page.rows
        .map(([left, right]) => `<tr>${renderPair(left)}${renderPair(right, true)}</tr>`)
        .join('\n');
      // 同一次打印只在本日期的首页显示标题、姓名和得分，后续页直接接单词表。
      const head = pageIndex === 0
        ? `<h1>${escapeHtml(day)} 测验</h1>
  <table class="meta">
    <tr>
      <td class="name">姓名：${name ? escapeHtml(name) : '____________'}</td>
      <td class="score">得分：____________</td>
    </tr>
  </table>
  `
        : '';
      return `<section class="quiz-page">
  ${head}<table class="words">
    ${rows}
  </table>
  <div class="page-foot">第 ${pageIndex + 1} / ${pages.length} 页 · 共 ${total} 词</div>
</section>`;
    })
    .join('\n<div class="page-break"></div>\n');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(day)} 测验</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
  @page WordSection1 { size: ${config.size}; margin: ${config.margin}; }
  @page { size: ${config.size}; margin: ${config.margin}; }
  div.WordSection1 { page: WordSection1; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #1f2a22;
    background: #fff;
    font-family: "Songti SC", SimSun, "Noto Serif SC", serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    margin: 0 0 12pt;
    text-align: center;
    font-size: ${config.titleSize};
    font-weight: 700;
    letter-spacing: 2pt;
  }
  table.meta {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 10pt;
  }
  table.meta td {
    padding: 0 0 7pt;
    border-bottom: 1.2pt solid #333;
    font-size: ${config.metaSize};
    vertical-align: bottom;
  }
  table.meta td.score { text-align: right; }
  table.words {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  table.words td {
    height: ${config.rowHeight};
    padding: 0 0 2pt;
    border-bottom: 0.75pt dotted #c9c9c9;
    vertical-align: bottom;
  }
  table.words td.word {
    width: 23%;
    font-family: Georgia, "Times New Roman", serif;
    font-size: ${config.wordSize};
    word-wrap: break-word;
    word-break: break-word;
  }
  table.words td.word .num {
    color: #888;
    font-family: Georgia, "Times New Roman", serif;
    font-size: ${config.numSize};
  }
  table.words td.word--right {
    padding-left: 10pt;
    border-left: 0.75pt dotted #cfcfc6;
  }
  table.words td.meaning {
    width: 27%;
    text-align: left;
    padding-left: 6pt;
    font-size: ${config.meaningSize};
    color: #333;
    word-break: break-word;
  }
  .blank {
    display: inline-block;
    width: 72%;
    height: 12pt;
    border-bottom: 0.75pt dotted #8f9389;
  }
  .page-foot {
    margin-top: 6pt;
    text-align: right;
    font-family: "Songti SC", SimSun, "Noto Serif SC", serif;
    font-size: 8pt;
    color: #999;
  }
  .quiz-page { page-break-inside: avoid; break-inside: avoid; }
  .page-break {
    height: 0;
    line-height: 0;
    page-break-before: always;
    break-before: page;
  }
  tr { page-break-inside: avoid; break-inside: avoid; }
</style>
</head>
<body>
<div class="WordSection1">
${pagesHtml}
</div>
</body>
</html>`;
}

function triggerDownload(filename, content, mime) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// 下载 Word：Word / WPS 均可直接打开、编辑和打印。
export function downloadQuizDoc(words, date, options = {}) {
  const day = date || todayKey();
  return triggerDownload(
    `${day}_单词测验.doc`,
    buildQuizHtml(words, day, options),
    'application/msword;charset=utf-8'
  );
}

// 新窗口打印，由用户在打印窗口选择「另存为 PDF」。
// 被浏览器拦截时返回 false，由调用方降级处理。
export function printQuiz(words, date, options = {}) {
  if (typeof window === 'undefined') return false;
  const day = date || todayKey();
  const win = window.open('', '_blank');
  if (!win) return false;
  try {
    win.opener = null;
  } catch (err) {
    // ignore
  }
  win.document.open();
  win.document.write(buildQuizHtml(words, day, options));
  win.document.close();
  try {
    win.focus();
  } catch (err) {
    // ignore
  }
  setTimeout(() => {
    try {
      win.print();
    } catch (err) {
      // ignore
    }
  }, 350);
  return true;
}
