<template>
  <div class="export-page page-export-words">
    <p class="export-hint">选择要导出的学习日期，生成当天单词测验</p>

    <div v-if="dates.length" class="export-list">
      <button
        v-for="item in dates"
        :key="item.date"
        class="export-card"
        :class="{ 'export-card--today': item.isToday }"
        type="button"
        @click="mp('openDate', $event)"
        :data-date="item.date"
      >
        <span class="export-card-main">
          <span class="export-date">{{ item.date }}</span>
          <span class="export-meta">{{ item.weekday }} · 共 {{ item.count }} 个单词</span>
        </span>
        <span v-if="item.isToday" class="export-badge">今天</span>
        <AppIcon name="chevron-right" class="export-chevron" />
      </button>
    </div>

    <div v-else class="export-empty">
      <AppSketch name="paper" class="export-empty-icon" />
      <p class="export-empty-title">还没有可导出的学习记录</p>
      <p class="export-empty-sub">背完单词后，每天的学习记录会按日期保存在这里</p>
    </div>

    <WordExportSheet
      :open="sheetOpen"
      :date="selectedDate"
      :words="selectedWords"
      :name="exportName"
      @close="closeSheet"
    />
  </div>
</template>

<script>
import { createPage } from '@/mp/page';
import WordExportSheet from '@/components/WordExportSheet.vue';
import { collectAvailableDates, collectWordsForDate } from '@/utils/wordExport';

const ExportWordsPage = createPage({
    data: {
      dates: [],
      exportName: '',
      sheetOpen: false,
      selectedDate: '',
      selectedWords: []
    },

    onLoad() {
      this.loadExportName();
      this.loadDates();
    },

    onShow() {
      this.loadExportName();
      this.loadDates();
    },

    loadExportName() {
      try {
        const userInfo = wx.getStorageSync('userInfo') || {};
        this.setData({
          exportName: userInfo.nickName || userInfo.nickname || userInfo.name || ''
        });
      } catch (err) {
        // ignore
      }
    },

    loadDates() {
      const book = wx.getStorageSync('currentBook') || {};
      const bookId = book && book.id ? book.id : '';
      try {
        this.setData({ dates: collectAvailableDates({ bookId }) });
      } catch (err) {
        console.error('读取导出日期失败:', err);
        this.setData({ dates: [] });
      }
    },

    openDate(e) {
      const date = e && e.currentTarget && e.currentTarget.dataset.date;
      if (!date) return;
      const item = this.$data.dates.find((row) => row.date === date);
      if (!item || !item.count) {
        wx.showToast({ title: '该日期没有学习记录', icon: 'none' });
        return;
      }

      const book = wx.getStorageSync('currentBook') || {};
      const fallbackIds = book && book.id ? [book.id] : [];
      const { words } = collectWordsForDate({ date, bookIds: fallbackIds });
      if (!words.length) {
        wx.showToast({ title: '该日期没有学习记录', icon: 'none' });
        return;
      }
      this.setData({
        selectedDate: date,
        selectedWords: words,
        sheetOpen: true
      });
    },

    closeSheet() {
      this.setData({ sheetOpen: false });
    }
  });

// createPage 只转交 Page 配置，局部组件需要手动挂到返回的组件对象上。
ExportWordsPage.components = { WordExportSheet };

export default ExportWordsPage;
</script>
