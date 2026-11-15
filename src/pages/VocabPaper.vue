<template>
  <div class="paper-container page-vocab-paper">
    <!-- 出卷设置 -->
    <div v-if="!paper" class="paper-setup">
      <div class="paper-intro">
        <div class="paper-intro-title">四六级词汇卷</div>
        <div class="paper-intro-desc">
          按你的单词生成一套 CET 风格试卷：Part I 选词填空 + Part II 阅读理解 + 答案解析，可直接打印。
        </div>
      </div>

      <div class="level-tabs">
        <button
          v-for="item in levels"
          :key="item.id"
          type="button"
          class="level-tab"
          :class="[{ active: level === item.id }, item.id]"
          @click="level = item.id"
        >
          <span class="level-name">{{ item.name }}</span>
          <span class="level-sub">{{ item.sub }}</span>
        </button>
      </div>

      <div class="words-panel">
        <div class="panel-head">
          <span class="panel-title">目标单词 <em :class="{ warn: wordCount < 5 || wordCount > 30 }">{{ wordCount }}</em></span>
          <button type="button" class="panel-action" @click="fillFromLocal">填入今日单词</button>
        </div>
        <textarea
          v-model="wordInput"
          class="words-input"
          rows="8"
          placeholder="每行一个单词，建议 10-20 个，至少 5 个，最多 30 个。&#10;&#10;例如：&#10;abundant adj. 丰富的&#10;ambiguous 模糊的&#10;compensate"
          @input="fillHint = ''"
        ></textarea>
        <div v-if="fillHint" class="fill-hint">{{ fillHint }}</div>
        <div class="panel-tip">
          单词来自今日学习记录时可自动填入；也可以手动粘贴，释义可省略。5-30 个单词最适合生成一份自然、可做的试卷。
        </div>
      </div>

      <div v-if="error" class="paper-error">{{ error }}</div>

      <button type="button" class="generate-btn" :disabled="loading || wordCount < 5 || wordCount > 30" @click="generate">
        <template v-if="loading">
          <span class="loading-dot"></span>
          AI 正在出卷 {{ elapsed }}s
        </template>
        <template v-else>生成{{ levelName }}词汇卷</template>
      </button>
      <div v-if="loading" class="loading-tip">完整试卷约需 20-60 秒，请保持页面打开。</div>

      <div class="sample-entry">
        <button type="button" class="sample-btn" @click="loadSample(level)">查看{{ levelName }}示例试卷</button>
      </div>

      <div v-if="history.length" class="paper-history">
        <div class="history-head">
          <span>历史试卷</span>
          <button type="button" class="history-clear" @click="clearHistory">清空</button>
        </div>
        <button
          v-for="item in history"
          :key="item.id"
          type="button"
          class="history-item"
          @click="openHistory(item)"
        >
          <span class="history-level" :class="item.level">{{ item.level === 'cet4' ? '四级' : '六级' }}</span>
          <span class="history-date">{{ formatDate(item.createdAt) }}</span>
          <span class="history-words">{{ item.words.length }} 词</span>
          <span class="history-arrow">›</span>
        </button>
      </div>
    </div>

    <!-- 试卷 -->
    <div v-else class="paper-view">
      <div class="paper-toolbar">
        <button type="button" class="tool-btn" @click="backToSetup">← 重新出卷</button>
        <div class="toolbar-meta">
          <span class="toolbar-level" :class="level">{{ levelName }}</span>
          <span v-if="isSample" class="toolbar-sample">示例</span>
        </div>
        <button type="button" class="tool-btn primary" @click="printPaper">打印 / 保存 PDF</button>
      </div>

      <article class="paper-sheet">
        <h1 class="paper-title">Daily Practice</h1>
        <div class="paper-completion">
          <span>完成日期：____________</span>
          <span>正确率：____________</span>
        </div>

        <section class="paper-part">
          <h2 class="part-title">Part I 选词填空</h2>
          <p class="paper-directions">{{ paper.cloze.directions }}</p>

          <div class="word-bank">
            <div v-for="item in paper.cloze.wordBank" :key="item.key" class="bank-item">
              <span class="bank-key">{{ item.key }}</span>
              <span class="bank-word" v-html="richWord(item.word)"></span>
            </div>
          </div>

          <div class="cloze-passage">
            <p v-for="(para, index) in clozeParagraphs" :key="index" v-html="para"></p>
          </div>
        </section>

        <section class="paper-part">
          <h2 class="part-title">Part II Reading Comprehension</h2>
          <p class="paper-directions">{{ paper.reading.directions }}</p>

          <div class="reading-passage">
            <p v-for="(para, index) in paper.reading.paragraphs" :key="index" v-html="richText(para)"></p>
          </div>

          <div class="reading-questions">
            <div v-for="q in paper.reading.questions" :key="q.id" class="question-block">
              <p class="question-text" v-html="richText(`${q.id}. ${q.question}`)"></p>
              <div class="question-options">
                <div v-for="opt in q.options" :key="opt.key" class="option-row" v-html="richText(`${opt.key}) ${opt.text}`)"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="paper-answers">
          <h2 class="part-title answer-title">答案与解析</h2>

          <h3 class="answer-subtitle">Part I 选词填空</h3>
          <div v-for="item in paper.cloze.answers" :key="item.id" class="answer-item">
            <p class="answer-line">{{ item.id }}. {{ item.answer }}</p>
            <p class="answer-note">{{ item.explanation }}</p>
          </div>

          <h3 class="answer-subtitle">Part II Reading Comprehension</h3>
          <div v-for="q in paper.reading.questions" :key="q.id" class="answer-item">
            <p class="answer-line">{{ q.id }}. {{ q.answer }}</p>
            <p class="answer-locator">答案定位：第{{ q.paragraph }}段第{{ q.sentence }}句</p>
            <p class="answer-note">{{ q.rationale }}</p>
          </div>

          <h3 class="answer-subtitle">本日词汇覆盖</h3>
          <div class="coverage-list">
            <span
              v-for="item in paper.coverage"
              :key="item.word"
              class="coverage-item"
              :class="{ missed: !item.covered }"
              :title="item.where"
            >
              {{ item.word }}<template v-if="item.where"> · {{ item.where }}</template>
            </span>
          </div>
        </section>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import wx from '@/mp/wx';
import api from '@/utils/api';

const HISTORY_KEY = 'vocabPaperHistory';
const MAX_HISTORY = 8;

const levels = [
  { id: 'cet4', name: '大学英语四级', sub: 'CET-4' },
  { id: 'cet6', name: '大学英语六级', sub: 'CET-6' },
];

const route = useRoute();
const level = ref(route.query.level === 'cet4' ? 'cet4' : 'cet6');
const wordInput = ref('');
const loading = ref(false);
const elapsed = ref(0);
const error = ref('');
const paper = ref(null);
const paperWords = ref([]);
const isSample = ref(false);
const history = ref([]);
const fillHint = ref('');
let timer = null;

const levelName = computed(() => (level.value === 'cet4' ? '四级' : '六级'));

const parsedWords = computed(() => parseWords(wordInput.value));
const wordCount = computed(() => parsedWords.value.length);

const bankTargets = computed(() => {
  if (!paper.value) return paperWords.value;
  const set = new Set(paperWords.value.map((w) => String(w).toLowerCase()));
  (paper.value.cloze.wordBank || []).forEach((item) => {
    if (item.isTarget && item.word) set.add(String(item.word).toLowerCase());
  });
  return Array.from(set);
});

const clozeParagraphs = computed(() => {
  if (!paper.value) return [];
  return String(paper.value.cloze.passage || '')
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para) => renderCloze(para));
});

function parseWords(text) {
  const seen = new Set();
  const out = [];
  String(text || '')
    .split(/\r?\n|;|；/)
    .forEach((line) => {
      let value = line.trim().replace(/^\d+\s*[.、)]\s*/, '');
      if (!value) return;
      const match = value.match(/^([A-Za-z][A-Za-z'’-]*)\s*(.*)$/);
      if (!match) return;
      const word = match[1];
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const meaning = match[2]
        .replace(/^[-—:：|｜,，\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
      out.push({ word, meaning, phonetic: '' });
    });
  return out;
}

function pushWord(out, seen, word) {
  const en = word && (word.en || word.word);
  if (!en || typeof en !== 'string') return;
  const clean = en.trim();
  if (!/^[A-Za-z][A-Za-z' -]{0,40}$/.test(clean)) return;
  const key = clean.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  const meaning = [word.part, word.meaning].filter(Boolean).join(' ').trim();
  out.push({ word: clean, meaning, phonetic: word.phonetic || '' });
}

function storageKeys() {
  try {
    return (wx.getStorageInfoSync() || {}).keys || [];
  } catch (e) {
    return [];
  }
}

// Learn 页按天缓存：dailyLearnedWords_<bookId>_<YYYY-MM-DD>
function collectTodayWords() {
  const out = [];
  const seen = new Set();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const suffix = `_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  storageKeys()
    .filter((key) => key.indexOf('dailyLearnedWords_') === 0 && key.endsWith(suffix))
    .forEach((key) => {
      const list = wx.getStorageSync(key);
      if (Array.isArray(list)) list.forEach((word) => pushWord(out, seen, word));
    });
  // 一天学了超过 30 个时取最近的 30 个
  return out.slice(-30);
}

// 今日没有记录时的兜底：历年 learnedWords 缓存 + 生词本 + 错词本
function collectRecentWords() {
  const out = [];
  const seen = new Set();
  storageKeys()
    .filter((key) => key.indexOf('learnedWords_') === 0)
    .forEach((key) => {
      const list = wx.getStorageSync(key);
      if (Array.isArray(list)) list.forEach((word) => pushWord(out, seen, word));
    });
  ['newWords', 'wrong_words'].forEach((key) => {
    const list = wx.getStorageSync(key);
    if (Array.isArray(list)) list.forEach((word) => pushWord(out, seen, word));
  });
  return out.slice(0, 30);
}

function applyWords(list, isToday) {
  wordInput.value = list.map((item) => (item.meaning ? `${item.word} ${item.meaning}` : item.word)).join('\n');
  fillHint.value = isToday
    ? `已填入今日学习的 ${list.length} 个单词。`
    : `今天还没有 H5 学习记录，已填入最近学过/生词本中的 ${list.length} 个单词。`;
}

function fillFromLocal() {
  const today = collectTodayWords();
  const list = today.length ? today : collectRecentWords();
  if (!list.length) {
    error.value = '本地还没有学习记录，请手动输入或粘贴单词。';
    fillHint.value = '';
    return;
  }
  error.value = '';
  applyWords(list, today.length > 0);
}

function explainError(err) {
  const message = String((err && err.message) || '出卷失败');
  if (/Not Found/i.test(message)) {
    return '后端尚未部署出卷接口，请参考 server-patch/README.md 部署后重试；也可以先查看示例试卷。';
  }
  if (/Failed to fetch|NetworkError|Load failed|ERR_CONNECTION|aborted|abort/i.test(message)) {
    return '无法连接出卷服务，请检查网络或后端服务后重试。';
  }
  return message;
}

async function generate() {
  if (loading.value) return;
  const words = parseWords(wordInput.value);
  if (words.length < 5) {
    error.value = '至少需要 5 个有效英文单词。';
    return;
  }
  if (words.length > 30) {
    error.value = '一次最多 30 个单词，请减少后再试。';
    return;
  }

  error.value = '';
  loading.value = true;
  elapsed.value = 0;
  const startedAt = Date.now();
  timer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000);
  }, 1000);

  try {
    const res = await api.generatePracticePaper({ level: level.value, words });
    if (!res || res.code !== 200 || !res.data || !res.data.paper) {
      throw new Error((res && res.msg) || '出卷失败');
    }
    const data = res.data.paper;
    if (!data.cloze || !data.reading) throw new Error('试卷内容不完整，请重试');
    showPaper(data, words.map((w) => w.word), false);
    saveHistory(data, words.map((w) => w.word), level.value);
  } catch (err) {
    error.value = explainError(err);
  } finally {
    loading.value = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
}

function showPaper(data, words, sample) {
  paper.value = data;
  paperWords.value = Array.isArray(words) ? words : [];
  isSample.value = !!sample;
  const scroller = document.querySelector('.page-scroll');
  if (scroller) scroller.scrollTop = 0;
}

function backToSetup() {
  paper.value = null;
  isSample.value = false;
  error.value = '';
  const scroller = document.querySelector('.page-scroll');
  if (scroller) scroller.scrollTop = 0;
}

async function loadSample(targetLevel) {
  level.value = targetLevel === 'cet4' ? 'cet4' : 'cet6';
  error.value = '';
  try {
    const mod = await import('@/data/practiceSamples');
    const data = mod.SAMPLE_PAPERS[level.value];
    if (!data) throw new Error('示例试卷不存在');
    const words = (data.coverage || []).filter((item) => item.covered).map((item) => item.word);
    showPaper(data, words, true);
  } catch (e) {
    error.value = '示例试卷加载失败，请重试。';
  }
}

function printPaper() {
  window.print();
}

function loadHistory() {
  const list = wx.getStorageSync(HISTORY_KEY);
  history.value = Array.isArray(list) ? list.slice(0, MAX_HISTORY) : [];
}

function saveHistory(data, words, paperLevel) {
  const entry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    level: paperLevel,
    words,
    paper: data,
  };
  const list = [entry, ...history.value.filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY);
  history.value = list;
  wx.setStorageSync(HISTORY_KEY, list);
}

function openHistory(item) {
  if (!item || !item.paper) return;
  level.value = item.level === 'cet4' ? 'cet4' : 'cet6';
  error.value = '';
  showPaper(item.paper, item.words || [], false);
}

function clearHistory() {
  history.value = [];
  wx.removeStorageSync(HISTORY_KEY);
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------- 富文本渲染（转义 + 目标词加粗 + 空格占位） ----------
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function isTargetToken(token, targetSet) {
  const lower = token.toLowerCase();
  if (targetSet.has(lower)) return true;
  const suffixes = ['s', 'es', 'ed', 'ing', 'd'];
  return suffixes.some((suffix) => {
    if (!lower.endsWith(suffix)) return false;
    const base = lower.slice(0, -suffix.length);
    return targetSet.has(base) || targetSet.has(`${base}e`);
  });
}

function richText(text, targets) {
  const list = targets || paperWords.value;
  if (!list || !list.length) return escapeHtml(text);
  const targetSet = new Set(list.map((word) => String(word).toLowerCase()));
  const source = String(text);
  let result = '';
  let last = 0;
  const re = /[A-Za-z][A-Za-z'’-]*/g;
  let match;
  while ((match = re.exec(source))) {
    result += escapeHtml(source.slice(last, match.index));
    const token = match[0];
    if (isTargetToken(token, targetSet)) {
      result += `<strong class="paper-target">${escapeHtml(token)}</strong>`;
    } else {
      result += escapeHtml(token);
    }
    last = match.index + token.length;
  }
  result += escapeHtml(source.slice(last));
  return result;
}

function richWord(word) {
  return richText(word, bankTargets.value);
}

function renderCloze(text) {
  // 兼容模型在 [n] 后面又写了字面下划线的情况，避免出现两条横线
  const normalized = String(text)
    .replace(/(\[\d+\])\s*_{2,}/g, '$1')
    .replace(/_{2,}\s*(\[\d+\])/g, '$1');
  return normalized
    .split(/(\[\d+\])/g)
    .map((part) => {
      const blank = part.match(/^\[(\d+)\]$/);
      if (blank) {
        return `<span class="paper-blank"><span class="blank-num">${blank[1]}</span><span class="blank-line"></span></span>`;
      }
      return richText(part);
    })
    .join('');
}

onMounted(() => {
  loadHistory();
  const today = collectTodayWords();
  const list = today.length ? today : collectRecentWords();
  if (list.length) applyWords(list, today.length > 0);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
