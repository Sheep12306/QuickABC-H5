<template>
<div class="vocab-container page-word-book-list" :style="&quot;background:&quot; + (cardThemes[themeIdx].bg) + &quot;;&quot;"><div class="vocab-top"><span class="vocab-title">生词本</span><div class="top-spacer"></div><div @click="mp('toggleSearch', $event)" class="top-action"><span class="top-action-text" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">搜索</span></div><div @click="mp('addNewWord', $event)" class="top-action"><span class="top-action-text" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">添加</span></div></div><div v-if="showSearch" class="search-bar"><input @input="mp('onSearchInput', $event)" @keyup.enter="mp('onSearchConfirm', $event)" class="search-input" placeholder="按英文搜索生词..." :value="searchKeyword" :autofocus="showSearch" /><span @click="mp('toggleSearch', $event)" class="search-cancel">取消</span></div><div v-if="vocabList.length > 0" class="vocab-stats"><span class="stats-text">共 {{vocabList.length}} 个生词</span><span v-if="vocabList.length > 0" @click="mp('batchDelete', $event)" class="stats-action">批量管理</span></div><div v-if="vocabList.length > 0" class="vocab-scroll mp-scroll-y" data-scroll-y="1"><div v-for="(item, index) in vocabList" :key="item.en" class="vocab-card" :data-index="index"><div @click="mp('viewWordDetail', $event)" class="vocab-card-left" :data-index="index"><span class="vocab-en">{{item.en}}</span><div class="vocab-meta"><span class="vocab-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{item.phonetic}}]</span><span v-if="item.part" class="vocab-part">{{item.part}}</span></div><span class="vocab-meaning">{{item.part}} {{item.meaning}}</span></div><div class="vocab-card-right"><div @click="mp('markMastered', $event)" class="vocab-action mastered" :data-index="index" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="vocab-action-text" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">掌握</span></div><div @click="mp('deleteWord', $event)" class="vocab-action delete" :data-index="index"><span class="vocab-action-text delete-text">删除</span></div></div></div><div class="scroll-bottom-space"></div></div><div v-else class="vocab-empty"><div class="empty-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="empty-icon-text" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">V</span></div><span class="empty-title">暂无生词</span><span class="empty-desc">快去添加你的第一个生词吧</span><div @click="mp('addNewWord', $event)" class="empty-add-btn" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="empty-add-text">添加生词</span></div></div><div v-if="batchMode" class="batch-bar"><div @click="mp('selectAllWords', $event)" class="batch-select-all"><span class="batch-all-text">{{allSelected ? '取消全选' : '全选'}}</span></div><span class="batch-count">已选 {{selectedCount}} 个</span><div v-if="selectedCount > 0" @click="mp('batchDeleteConfirm', $event)" class="batch-delete-btn"><span class="batch-delete-text">删除选中</span></div><div @click="mp('exitBatchMode', $event)" class="batch-cancel"><span class="batch-cancel-text">完成</span></div></div><div v-if="showAddModal" @click="mp('hideAddModal', $event)" class="mask"></div><div v-if="showAddModal" class="add-modal"><span class="modal-title">添加生词</span><input @input="mp('onEnInput', $event)" class="modal-input" placeholder="输入英文单词" :value="newWordEn" /><input @input="mp('onPhoneticInput', $event)" class="modal-input" placeholder="输入音标（可选）" :value="newWordPhonetic" /><input @input="mp('onMeaningInput', $event)" class="modal-input" placeholder="输入释义" :value="newWordMeaning" /><div class="modal-btns"><div @click="mp('hideAddModal', $event)" class="modal-btn cancel"><span >取消</span></div><div @click="mp('confirmAddWord', $event)" class="modal-btn confirm" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span >确认添加</span></div></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
    data: {
      vocabList: [],
      filteredList: [],
      searchKeyword: '',
      showSearch: false,
      showAddModal: false,
      batchMode: false,
      allSelected: false,
      selectedCount: 0,
      selectedIndices: [],
      newWordEn: '',
      newWordPhonetic: '',
      newWordMeaning: '',
      themeColors: [
        { accent: '#43A047', light: '#E8F5E9' },
        { accent: '#00897B', light: '#E0F2F1' },
        { accent: '#F57C00', light: '#FFF3E0' },
        { accent: '#7B1FA2', light: '#F3E5F5' },
        { accent: '#1976D2', light: '#E3F2FD' }
      ],
      themeIdx: 0,
      cardThemes: [
        { bg: 'linear-gradient(175deg, #C8E6C9 0%, #E8F5E9 30%, #F1F8F4 100%)' },
        { bg: 'linear-gradient(175deg, #B2DFDB 0%, #E0F2F1 30%, #F1F8F7 100%)' },
        { bg: 'linear-gradient(175deg, #FFE0B2 0%, #FFF3E0 30%, #FFF8F5 100%)' },
        { bg: 'linear-gradient(175deg, #E1BEE7 0%, #F3E5F5 30%, #F8F4FA 100%)' },
        { bg: 'linear-gradient(175deg, #BBDEFB 0%, #E3F2FD 30%, #F5F8FC 100%)' }
      ]
    },

    onLoad() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.loadVocabList();
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.loadVocabList();
    },

    loadVocabList() {
      try {
        const newWords = wx.getStorageSync('newWords') || [];
        const vocabList = Array.isArray(newWords) ? newWords : [];
        vocabList.sort((a, b) => {
          const tA = a.addedTime ? new Date(a.addedTime).getTime() : 0;
          const tB = b.addedTime ? new Date(b.addedTime).getTime() : 0;
          return tB - tA;
        });
        this.setData({ vocabList, filteredList: vocabList });
      } catch (e) {
        this.setData({ vocabList: [], filteredList: [] });
      }
    },

    // 搜索
    toggleSearch() {
      const show = !this.$data.showSearch;
      this.setData({ showSearch: show, searchKeyword: show ? this.$data.searchKeyword : '' });
      if (!show) {
        this.setData({ filteredList: this.$data.vocabList });
      }
    },

    onSearchInput(e) {
      const keyword = e.detail.value;
      this.setData({ searchKeyword: keyword });
      if (keyword.trim()) {
        const filtered = this.$data.vocabList.filter(w =>
          w.en && w.en.toLowerCase().includes(keyword.toLowerCase())
        );
        this.setData({ filteredList: filtered });
      } else {
        this.setData({ filteredList: this.$data.vocabList });
      }
    },

    onSearchConfirm() {
      // search already performed in onSearchInput
    },

    // 查看单词详情 - 进入复习
    viewWordDetail(e) {
      if (this.$data.batchMode) {
        this.toggleSelectWord(e);
        return;
      }
      const index = e.currentTarget.dataset.index;
      const word = this.$data.filteredList[index];
      if (word && word.en) {
        const words = JSON.stringify([word]);
        wx.navigateTo({
          url: `/pages/review/review?bookId=1&group=1&words=${encodeURIComponent(words)}`
        });
      }
    },

    // 标记为已掌握
    markMastered(e) {
      const index = e.currentTarget.dataset.index;
      const word = this.$data.filteredList[index];
      const vocabList = this.$data.vocabList.filter(w => w.en !== word.en);
      wx.setStorageSync('newWords', vocabList);
      this.setData({ vocabList });
      this.applySearchFilter();
      wx.showToast({ title: '已标记为掌握', icon: 'success' });
    },

    // 删除单个
    deleteWord(e) {
      const that = this;
      const index = e.currentTarget.dataset.index;
      const word = this.$data.filteredList[index];
      wx.showModal({
        title: '确认删除',
        content: `确定要删除 "${word.en}" 吗？`,
        success(res) {
          if (res.confirm) {
            const vocabList = that.$data.vocabList.filter(w => w.en !== word.en);
            wx.setStorageSync('newWords', vocabList);
            that.setData({ vocabList });
            that.applySearchFilter();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      });
    },

    applySearchFilter() {
      const keyword = this.$data.searchKeyword;
      if (keyword.trim()) {
        const filtered = this.$data.vocabList.filter(w =>
          w.en && w.en.toLowerCase().includes(keyword.toLowerCase())
        );
        this.setData({ filteredList: filtered });
      } else {
        this.setData({ filteredList: this.$data.vocabList });
      }
    },

    // 批量管理
    batchDelete() {
      if (this.$data.vocabList.length === 0) return;
      this.setData({
        batchMode: true,
        selectedIndices: [],
        selectedCount: 0,
        allSelected: false
      });
    },

    toggleSelectWord(e) {
      const index = e.currentTarget.dataset.index;
      let selected = [...this.$data.selectedIndices];
      const pos = selected.indexOf(index);
      if (pos > -1) {
        selected.splice(pos, 1);
      } else {
        selected.push(index);
      }
      this.setData({
        selectedIndices: selected,
        selectedCount: selected.length,
        allSelected: selected.length === this.$data.filteredList.length
      });
    },

    selectAllWords() {
      if (this.$data.allSelected) {
        this.setData({ selectedIndices: [], selectedCount: 0, allSelected: false });
      } else {
        const all = this.$data.filteredList.map((_, i) => i);
        this.setData({ selectedIndices: all, selectedCount: all.length, allSelected: true });
      }
    },

    batchDeleteConfirm() {
      const that = this;
      if (this.$data.selectedCount === 0) return;
      wx.showModal({
        title: '确认批量删除',
        content: `确定要删除选中的 ${this.$data.selectedCount} 个生词吗？`,
        success(res) {
          if (res.confirm) {
            const indices = that.$data.selectedIndices.sort((a, b) => b - a);
            const vocabList = [...that.$data.vocabList];
            const filtered = that.$data.filteredList;
            indices.forEach(i => {
              const word = filtered[i];
              const realIdx = vocabList.findIndex(w => w.en === word.en);
              if (realIdx > -1) vocabList.splice(realIdx, 1);
            });
            wx.setStorageSync('newWords', vocabList);
            that.setData({
              vocabList,
              batchMode: false,
              selectedIndices: [],
              selectedCount: 0
            });
            that.applySearchFilter();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      });
    },

    exitBatchMode() {
      this.setData({
        batchMode: false,
        selectedIndices: [],
        selectedCount: 0,
        allSelected: false
      });
    },

    // 添加生词
    addNewWord() {
      this.setData({
        showAddModal: true,
        newWordEn: '',
        newWordPhonetic: '',
        newWordMeaning: ''
      });
    },

    hideAddModal() {
      this.setData({ showAddModal: false });
    },

    onEnInput(e) { this.setData({ newWordEn: e.detail.value }); },
    onPhoneticInput(e) { this.setData({ newWordPhonetic: e.detail.value }); },
    onMeaningInput(e) { this.setData({ newWordMeaning: e.detail.value }); },

    confirmAddWord() {
      const { newWordEn, newWordMeaning, newWordPhonetic } = this.$data;
      if (!newWordEn.trim()) {
        wx.showToast({ title: '请输入英文单词', icon: 'none' });
        return;
      }
      if (!newWordMeaning.trim()) {
        wx.showToast({ title: '请输入释义', icon: 'none' });
        return;
      }

      const vocabList = this.$data.vocabList;
      const exists = vocabList.some(w => w.en === newWordEn.trim());
      if (exists) {
        wx.showToast({ title: '该单词已存在', icon: 'none' });
        return;
      }

      vocabList.unshift({
        en: newWordEn.trim(),
        phonetic: newWordPhonetic.trim(),
        meaning: newWordMeaning.trim(),
        addedTime: new Date().toISOString()
      });

      wx.setStorageSync('newWords', vocabList);
      this.setData({
        vocabList,
        showAddModal: false,
        newWordEn: '',
        newWordPhonetic: '',
        newWordMeaning: ''
      });
      this.applySearchFilter();
      wx.showToast({ title: '添加成功', icon: 'success' });
    }
  });

</script>
