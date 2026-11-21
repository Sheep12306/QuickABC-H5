<template>
  <div class="search-page page-shell">
    <header class="search-header">
      <div class="search-box">
        <AppIcon name="search" class="search-box-icon" />
        <input
          ref="inputRef"
          v-model="keyword"
          class="search-input"
          type="search"
          placeholder="搜索单词，如 abundant"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @input="onInput"
        />
        <button v-if="keyword" class="search-clear" type="button" aria-label="清空" @click="clear">
          <AppIcon name="close" />
        </button>
      </div>
    </header>

    <p class="search-scope">搜索全部词书（四级 / 六级），同一单词只显示一次</p>

    <div v-if="loading" class="search-state">搜索中…</div>
    <div v-else-if="error" class="search-state search-state--error">{{ error }}</div>
    <div v-else-if="!keyword.trim()" class="search-state">输入英文单词开始搜索</div>
    <div v-else-if="!results.length" class="search-state">没有找到「{{ keyword.trim() }}」</div>
    <div v-else class="search-results">
      <button
        v-for="item in results"
        :key="item.word"
        class="search-item"
        type="button"
        @click="play(item.word)"
      >
        <span class="search-item-main">
          <span class="search-item-head">
            <span class="search-word">{{ item.word }}</span>
            <span v-if="item.phonetic" class="search-phonetic">[{{ item.phonetic }}]</span>
            <span class="search-audio" aria-hidden="true"><AppIcon name="volume" /></span>
          </span>
          <span class="search-meaning">{{ item.part }} {{ item.meaning }}</span>
          <span v-if="item.books && item.books.length" class="search-books">
            <span v-for="book in item.books" :key="book" class="search-book">{{ shortBook(book) }}</span>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import wx from '@/mp/wx';
import api from '@/utils/api';

const keyword = ref('');
const results = ref([]);
const loading = ref(false);
const error = ref('');
const inputRef = ref(null);

let debounceTimer = null;
let requestId = 0;
let audio = null;

function clear() {
  keyword.value = '';
  results.value = [];
  error.value = '';
  loading.value = false;
  requestId += 1;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function onInput() {
  const q = keyword.value.trim();
  error.value = '';
  if (debounceTimer) clearTimeout(debounceTimer);

  if (!q) {
    results.value = [];
    loading.value = false;
    requestId += 1;
    return;
  }

  debounceTimer = setTimeout(() => search(q), 260);
}

async function search(q) {
  const id = ++requestId;
  loading.value = true;
  try {
    const res = await api.searchWords(q, 30);
    if (id !== requestId) return;
    if (!res || res.code !== 200) throw new Error((res && res.msg) || '搜索失败');
    results.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    if (id !== requestId) return;
    results.value = [];
    error.value = '搜索失败，请稍后重试';
  } finally {
    if (id === requestId) loading.value = false;
  }
}

function shortBook(name) {
  return String(name || '').replace('英语词汇', '').replace('词汇', '') || name;
}

function play(word) {
  if (!word) return;
  try {
    if (audio) {
      try { audio.stop(); } catch (e) {}
      try { audio.destroy(); } catch (e) {}
    }
    audio = wx.createInnerAudioContext();
    audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    audio.play();
    audio.onError(() => {});
  } catch (e) {
    // 发音失败不影响搜索
  }
}

onMounted(async () => {
  await nextTick();
  if (inputRef.value) inputRef.value.focus();
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (audio) {
    try { audio.stop(); } catch (e) {}
    try { audio.destroy(); } catch (e) {}
    audio = null;
  }
});
</script>
