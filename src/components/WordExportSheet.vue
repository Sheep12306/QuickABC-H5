<template>
  <Teleport to="body">
    <div v-if="open" class="word-export-mask" @click.self="$emit('close')">
      <section class="word-export-sheet" role="dialog" aria-modal="true" aria-label="导出单词">
        <div class="word-export-handle"></div>

        <header class="word-export-head">
          <div class="word-export-heading">
            <h2 class="word-export-title">导出单词</h2>
            <p class="word-export-sub">{{ dateLabel }} · 共 {{ words.length }} 个单词</p>
          </div>
          <button class="word-export-close" type="button" aria-label="关闭" @click="$emit('close')">
            <AppIcon name="close" />
          </button>
        </header>

        <div class="export-mode" role="group" aria-label="显示内容">
          <button
            v-for="item in modes"
            :key="item.key"
            class="export-mode-btn"
            :class="{ active: mode === item.key }"
            type="button"
            @click="mode = item.key"
          >{{ item.label }}</button>
        </div>

        <div class="export-paper" role="group" aria-label="纸张大小">
          <button
            v-for="item in papers"
            :key="item.key"
            class="export-paper-btn"
            :class="{ active: paper === item.key }"
            type="button"
            @click="paper = item.key"
          >
            <span class="export-paper-label">{{ item.label }}</span>
            <span class="export-paper-sub">{{ item.sub }}</span>
          </button>
        </div>

        <div class="export-preview">
          <div v-for="(page, pageIndex) in quizPages" :key="pageIndex" class="preview-page">
            <template v-if="pageIndex === 0">
              <h3 class="preview-title">{{ date }} 测验</h3>
              <div class="preview-meta">
                <span>姓名：{{ name || '____________' }}</span>
                <span>得分：____________</span>
              </div>
            </template>
            <div class="preview-rows">
              <div v-for="(row, rowIndex) in page.rows" :key="rowIndex" class="preview-row">
                <template v-for="side in [0, 1]" :key="side">
                  <div class="preview-word-cell" :class="{ 'preview-word-cell--right': side === 1 }">
                    <template v-if="row[side]">
                      <span class="preview-num">{{ row[side].number }}.</span>
                      <span v-if="mode !== 'hideWord'" class="preview-word">{{ row[side].word.en }}</span>
                      <span v-else class="preview-word preview-blank"></span>
                    </template>
                  </div>
                  <div class="preview-meaning">
                    {{ row[side] && mode !== 'hideTranslation' ? meaningOf(row[side].word) : '' }}
                  </div>
                </template>
              </div>
            </div>
            <div class="preview-foot">
              第 {{ pageIndex + 1 }} / {{ quizPages.length }} 页 · 共 {{ words.length }} 词
            </div>
          </div>
        </div>

        <div class="export-actions">
          <button class="export-btn primary" type="button" @click="exportWord">
            <AppIcon name="download" />
            下载 Word
          </button>
          <button class="export-btn" type="button" @click="exportPdf">
            <AppIcon name="file-text" />
            打印 / 保存 PDF
          </button>
        </div>
        <p class="export-note">默认导出 Word，可直接编辑；PDF 在打印窗口选择「另存为 PDF」。</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import wx from '@/mp/wx';
import {
  buildQuizPages,
  downloadQuizDoc,
  formatDateLabel,
  printQuiz,
} from '@/utils/wordExport';

const props = defineProps({
  open: { type: Boolean, default: false },
  date: { type: String, default: '' },
  words: { type: Array, default: () => [] },
  name: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const modes = [
  { key: 'all', label: '单词 + 翻译' },
  { key: 'hideTranslation', label: '隐藏翻译' },
  { key: 'hideWord', label: '隐藏单词' },
];

// A5 是 A4 的一半（A3 是 A4 的两倍）；一页固定两列，词数保持 5 的倍数。
const papers = [
  { key: 'a4', label: 'A4', sub: '每页 20 词 · 2 列单词' },
  { key: 'a5', label: 'A5（A4 的一半）', sub: '每页 10 词 · 2 列单词' },
];

const mode = ref('all');
const paper = ref('a4');

watch(
  () => props.open,
  (open) => {
    if (open) mode.value = 'all';
  }
);

const dateLabel = computed(() => formatDateLabel(props.date) || props.date);
const quizPages = computed(() => buildQuizPages(props.words, paper.value));

function meaningOf(word) {
  return [word.part, word.meaning].filter(Boolean).join(' ');
}

function exportOptions() {
  return {
    name: props.name,
    hideTranslation: mode.value === 'hideTranslation',
    hideWord: mode.value === 'hideWord',
    paper: paper.value,
  };
}

function exportWord() {
  if (!props.words.length) return;
  downloadQuizDoc(props.words, props.date, exportOptions());
  wx.showToast({ title: '已开始下载 Word', icon: 'none' });
  emit('close');
}

function exportPdf() {
  if (!props.words.length) return;
  const opened = printQuiz(props.words, props.date, exportOptions());
  if (!opened) {
    downloadQuizDoc(props.words, props.date, exportOptions());
    wx.showToast({ title: '打印窗口被拦截，已改为下载 Word', icon: 'none' });
  }
  emit('close');
}
</script>

<style scoped>
.word-export-mask {
  position: fixed;
  inset: 0;
  z-index: 9990;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(28, 39, 29, 0.42);
  animation: mp-fade-in 0.18s ease;
}

.word-export-sheet {
  width: min(100%, 480px);
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  padding: 0.233rem 0.419rem calc(0.4rem + env(safe-area-inset-bottom));
  border-radius: 0.5rem 0.5rem 0 0;
  background: #f8f7f0;
  color: var(--page-ink);
  font-family: var(--font-ui);
  box-shadow: 0 -0.279rem 1.163rem rgba(28, 39, 29, 0.16);
  animation: mp-slide-up 0.22s ease;
}

.word-export-handle {
  flex: none;
  width: 0.907rem;
  height: 0.093rem;
  margin: 0 auto 0.233rem;
  border-radius: 0.233rem;
  background: #d3d3ca;
}

.word-export-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.2rem;
  padding: 0 0.047rem 0.233rem;
}

.word-export-heading {
  min-width: 0;
}

.word-export-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 0.465rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--page-ink);
}

.word-export-sub {
  margin: 0.09rem 0 0;
  font-size: 0.256rem;
  line-height: 1.4;
  color: #8c9187;
}

.word-export-close {
  flex: none;
  display: grid;
  place-items: center;
  width: 0.56rem;
  height: 0.56rem;
  margin-top: -0.047rem;
  color: #8c9187;
  font-size: 0.349rem;
}

/* ---- 显示方式：显示全部 / 隐藏翻译 / 隐藏单词 ---- */
.export-mode {
  flex: none;
  display: flex;
  gap: 0.12rem;
  padding: 0 0.047rem 0.233rem;
}

.export-mode-btn {
  flex: 1 1 0;
  min-height: 0.6rem;
  border: 1px solid #e0dfd4;
  border-radius: 0.2rem;
  background: #fffefa;
  color: #6f7569;
  font-family: var(--font-ui);
  font-size: 0.256rem;
  font-weight: 600;
}

.export-mode-btn.active {
  border-color: var(--page-green);
  background: var(--page-green);
  color: #fff;
}

.export-mode-btn:active {
  opacity: 0.82;
}

/* ---- 纸张大小：A4 / A5（A4 的一半） ---- */
.export-paper {
  flex: none;
  display: flex;
  gap: 0.12rem;
  padding: 0 0.047rem 0.233rem;
}

.export-paper-btn {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.04rem;
  min-height: 0.7rem;
  border: 1px solid #e0dfd4;
  border-radius: 0.2rem;
  background: #fffefa;
  color: #6f7569;
  font-family: var(--font-ui);
}

.export-paper-btn.active {
  border-color: var(--page-green);
  background: var(--page-green);
  color: #fff;
}

.export-paper-btn:active {
  opacity: 0.82;
}

.export-paper-label {
  font-size: 0.27rem;
  font-weight: 700;
  line-height: 1.3;
}

.export-paper-sub {
  font-size: 0.216rem;
  line-height: 1.3;
  color: #8c9187;
}

.export-paper-btn.active .export-paper-sub {
  color: rgba(255, 255, 255, 0.78);
}

/* ---- 试卷预览：每页左右两列 ---- */
.export-preview {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 0.047rem;
  padding: 0.326rem 0.349rem 0.256rem;
  border: 1px solid #e7e5da;
  border-radius: 0.24rem;
  background: #fff;
}

.preview-title {
  margin: 0 0 0.233rem;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0.03rem;
  color: #1f2a22;
}

.preview-page + .preview-page {
  margin-top: 0.326rem;
  padding-top: 0.326rem;
  border-top: 1px dashed #d5d3c7;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.2rem;
  padding-bottom: 0.14rem;
  border-bottom: 1.5px solid #333;
  font-family: var(--font-ui);
  font-size: 0.233rem;
  color: #333;
}

.preview-rows {
  padding-top: 0.09rem;
}

/* 四列：左单词 | 左翻译 | 右单词 | 右翻译 */
.preview-row {
  display: grid;
  grid-template-columns: 1.1fr 1.25fr 1.1fr 1.25fr;
  column-gap: 0.12rem;
  align-items: baseline;
  padding: 0.14rem 0;
  border-bottom: 1px dashed #e7e5da;
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-word-cell {
  display: flex;
  align-items: baseline;
  gap: 0.06rem;
  min-width: 0;
}

.preview-word-cell--right {
  padding-left: 0.14rem;
  border-left: 1px dashed #d5d3c7;
}

.preview-num {
  flex: none;
  font-family: var(--font-num);
  font-size: 0.216rem;
  color: #a5a89d;
}

.preview-word {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-word);
  font-size: 0.29rem;
  font-weight: 600;
  line-height: 1.35;
  color: #1f2a22;
  word-break: break-word;
}

.preview-blank {
  display: inline-block;
  width: 85%;
  height: 0.29rem;
  border-bottom: 1px dotted #8f9389;
}

.preview-meaning {
  min-width: 0;
  text-align: left;
  font-family: var(--font-ui);
  font-size: 0.233rem;
  line-height: 1.4;
  color: #4f574c;
  word-break: break-word;
}

.preview-foot {
  margin-top: 0.16rem;
  text-align: right;
  font-family: var(--font-ui);
  font-size: 0.216rem;
  color: #a5a89d;
}

/* ---- 导出按钮 ---- */
.export-actions {
  flex: none;
  display: flex;
  gap: 0.2rem;
  margin-top: 0.326rem;
}

.export-btn {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.09rem;
  height: 0.8rem;
  border: 1px solid #e0dfd4;
  border-radius: 0.24rem;
  background: #fffefa;
  color: #4f574c;
  font-size: 0.302rem;
  font-weight: 600;
}

.export-btn .app-icon {
  font-size: 0.326rem;
}

.export-btn.primary {
  border-color: var(--page-green);
  background: var(--page-green);
  color: #fff;
  box-shadow: 0 0.12rem 0.34rem rgba(50, 109, 67, 0.18);
}

.export-btn:active {
  opacity: 0.82;
}

.export-note {
  flex: none;
  margin: 0.2rem 0 0;
  text-align: center;
  font-size: 0.233rem;
  line-height: 1.5;
  color: #a5a89d;
}
</style>
