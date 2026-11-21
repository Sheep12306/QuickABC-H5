<template>
<div class="detail-container page-vocab-detail"><div class="score-card"><span class="score-label">上次测试词汇量</span><span class="score-num" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{lastVocabScore || 0}}</span><div @click="mp('goToVocabTest', $event)" class="test-btn" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="test-btn-text">测试我的词汇量</span></div></div><div class="history-card"><span class="history-title">历史测试记录</span><div v-if="vocabHistory.length === 0" class="no-history"><AppIcon name="gauge" class="empty-state-icon" /><span>暂无词汇量测试记录，快去测试吧</span></div><div v-else class="history-list"><template v-for="(item, index) in vocabHistory" :key="item.id"><div v-if="index < 10" @click="mp('showRecordDetail', $event)" class="history-item" :data-record-json="JSON.stringify(item)"><div class="item-left"><span class="test-time">{{item.testTime}}</span><span class="test-desc">词汇量测试{{item.bookResults ? ' · ' + item.bookResults.length + '本书' : ''}}</span></div><span class="test-score" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{item.estimatedVocab || item.score}} 词</span></div></template></div></div></div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';



export default createPage({
    data: {
      lastVocabScore: 0,
      vocabHistory: [],
      themeColors: [
        { accent: '#326d43', light: '#e6efe2' },
        { accent: '#2f6f6a', light: '#e2efed' },
        { accent: '#a9692c', light: '#f6e9da' },
        { accent: '#6f5686', light: '#eee7f4' },
        { accent: '#3c6382', light: '#e6edf2' }
      ],
      themeIdx: 0,
      cardThemes: [
        { bg: 'linear-gradient(175deg, #C8E6C9 0%, #e6efe2 30%, #F1F8F4 100%)' },
        { bg: 'linear-gradient(175deg, #B2DFDB 0%, #e2efed 30%, #F1F8F7 100%)' },
        { bg: 'linear-gradient(175deg, #FFE0B2 0%, #f6e9da 30%, #FFF8F5 100%)' },
        { bg: 'linear-gradient(175deg, #E1BEE7 0%, #eee7f4 30%, #F8F4FA 100%)' },
        { bg: 'linear-gradient(175deg, #BBDEFB 0%, #e6edf2 30%, #F5F8FC 100%)' }
      ]
    },

    onLoad() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.getVocabTestRecords();
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    async getVocabTestRecords() {
      wx.showLoading({ title: '加载中...' });
      try {
        const res = await api.getVocabTestRecords();
        if (res.code === 200) {
          const records = res.data || [];
          const vocabHistory = records.map(record => ({
            id: record.id,
            testTime: record.testTime,
            score: record.score,
            estimatedVocab: record.estimatedVocab || record.score,
            bookResults: record.bookResults ? JSON.parse(record.bookResults) : null,
          }));
          const lastVocabScore = vocabHistory.length > 0 ? vocabHistory[0].estimatedVocab : 0;
          this.setData({ lastVocabScore, vocabHistory });
          wx.setStorageSync('lastVocabScore', lastVocabScore);
          wx.setStorageSync('vocabHistory', vocabHistory);
        } else {
          wx.showToast({ title: res.msg || '获取记录失败', icon: 'none' });
        }
      } catch (err) {
        console.error('获取词汇量测试记录失败', err);
        wx.showToast({ title: '获取记录失败', icon: 'none' });
        const lastVocabScore = wx.getStorageSync('lastVocabScore') || 0;
        const vocabHistory = wx.getStorageSync('vocabHistory') || [];
        this.setData({ lastVocabScore, vocabHistory });
      } finally {
        wx.hideLoading();
      }
    },

    showRecordDetail(e) {
      const record = e.currentTarget.dataset.record;
      if (!record || !record.bookResults) return;
      // 有详细数据才展示
    },

    goBack() {
      wx.navigateBack();
    },

    goToVocabTest() {
      wx.navigateTo({ url: '/pages/vocab-Test/vocab-Test' });
    }
  });

</script>
