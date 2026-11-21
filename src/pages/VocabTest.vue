<template>
<div class="test-bg page-vocab-test"><div v-if="phase === 'loading'" class="test-loading"><div class="loading-card"><span class="loading-text">正在生成测试题目...</span></div></div><div v-if="phase === 'testing' && currentWord" class="test-quiz"><div class="quiz-top"><span class="quiz-progress">{{currentIndex + 1}} / {{words.length}}</span><div class="quiz-progress-bar"><div class="quiz-progress-fill" :style="&quot;width:&quot; + ((currentIndex + 1) / words.length * 100) + &quot;%;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"></div></div><span class="quiz-accuracy-hint">已答 {{answeredCount}} 题，测越多越准</span></div><div :class="&quot;quiz-card &quot; + (showMeaning ? 'revealed' : '')"><span class="quiz-word">{{currentWord.word}}</span><span class="quiz-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{currentWord.phonetic}}]</span><div class="quiz-reveal"><template v-if="showMeaning"><div class="reveal-divider"></div><span class="quiz-meaning">{{currentWord.part}} {{currentWord.meaning}}</span></template></div></div><div class="quiz-actions"><div @click="mp('selectAnswer', $event)" :class="&quot;quiz-btn know &quot; + (lastAnswer === 'know' ? 'picked' : '') + &quot; &quot; + (showMeaning && lastAnswer === 'know' ? 'glow-green' : '')" data-answer="know"><span class="quiz-btn-label">认识</span></div><div @click="mp('selectAnswer', $event)" :class="&quot;quiz-btn dont-know &quot; + (lastAnswer === 'dontKnow' ? 'picked' : '') + &quot; &quot; + (showMeaning && lastAnswer === 'dontKnow' ? 'glow-red' : '')" data-answer="dontKnow"><span class="quiz-btn-label">不认识</span></div><div @click="mp('selectAnswer', $event)" :class="&quot;quiz-btn fuzzy &quot; + (lastAnswer === 'fuzzy' ? 'picked' : '') + &quot; &quot; + (showMeaning && lastAnswer === 'fuzzy' ? 'glow-orange' : '')" data-answer="fuzzy"><span class="quiz-btn-label">模糊</span></div></div></div><div v-if="phase === 'checkpoint'" class="test-checkpoint"><div class="checkpoint-card"><span class="checkpoint-icon"><AppIcon name="target" /></span><span class="checkpoint-title">已测试 {{answeredCount}} 个单词</span><span class="checkpoint-desc">测的单词越多，词汇量估算越准确。还剩 {{words.length - answeredCount}} 个词未测。</span><div class="checkpoint-actions"><div @click="mp('stopAndSubmit', $event)" class="checkpoint-btn stop"><span class="checkpoint-btn-text">就测到这里</span></div><div @click="mp('continueTest', $event)" class="checkpoint-btn goon" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="checkpoint-btn-text" style="color:#fff;">继续测试</span></div></div></div></div><div v-if="phase === 'result'" class="test-result"><div class="result-header"><span class="result-badge" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon :name="levelBadge" /></span><span class="result-title">{{levelName}}</span><span class="result-vocab" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{estimatedVocab}}</span><span class="result-vocab-label">估算词汇量 · 基于 {{totalCount}} 个单词</span></div><div class="result-books"><span class="result-section-title">各阶段认识率</span><div v-for="(item, index) in bookResults" :key="item.bookId" class="book-bar-item"><div class="book-bar-info"><span class="book-bar-name">{{item.bookName}}</span><span class="book-bar-rate" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{item.rate}}%</span></div><div class="book-bar-track"><div class="book-bar-fill" :style="&quot;width:&quot; + (item.rate) + &quot;%;background:&quot; + (item.rate >= 80 ? '#326d43' : item.rate >= 50 ? '#FF9800' : '#F44336') + &quot;;&quot;"></div></div></div></div><div v-if="recommendations.length > 0" class="result-recommend"><span class="result-section-title">推荐学习</span><div v-for="(item, index) in recommendations" :key="item.bookId" class="recommend-item"><span class="recommend-name">{{item.bookName}}</span><span class="recommend-tip" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">认识率 {{item.rate}}%</span></div></div><div class="result-actions"><div @click="mp('retryTest', $event)" class="retry-btn" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="retry-text">重新测试</span></div><div @click="mp('goBack', $event)" class="back-btn"><span class="back-text">返回</span></div></div></div></div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';



const CHECKPOINT_AT = 30;

function getLevel(vocab) {
  if (vocab < 500)  return { name: '词汇新手', badge: 'leaf' };
  if (vocab < 1500) return { name: '词汇初学者', badge: 'book-open' };
  if (vocab < 3000) return { name: '词汇小能手', badge: 'star' };
  if (vocab < 5000) return { name: '词汇高手', badge: 'flame' };
  if (vocab < 8000) return { name: '词汇大师', badge: 'gem' };
  return { name: '词汇专家', badge: 'crown' };
}

export default createPage({
  data: {
    themeIdx: 0,
    themeColors: [
      { accent: '#326d43', light: '#e6efe2' },
      { accent: '#2f6f6a', light: '#e2efed' },
      { accent: '#a9692c', light: '#f6e9da' },
      { accent: '#6f5686', light: '#eee7f4' },
      { accent: '#3c6382', light: '#e6edf2' }
    ],
    cardThemes: [
      { bg: 'linear-gradient(175deg, #C8E6C9 0%, #e6efe2 30%, #F1F8F4 100%)' },
      { bg: 'linear-gradient(175deg, #B2DFDB 0%, #e2efed 30%, #F1F8F7 100%)' },
      { bg: 'linear-gradient(175deg, #FFE0B2 0%, #f6e9da 30%, #FFF8F5 100%)' },
      { bg: 'linear-gradient(175deg, #E1BEE7 0%, #eee7f4 30%, #F8F4FA 100%)' },
      { bg: 'linear-gradient(175deg, #BBDEFB 0%, #e6edf2 30%, #F5F8FC 100%)' }
    ],

    phase: 'loading',
    words: [],
    currentIndex: 0,
    currentWord: null,
    answers: {},
    showMeaning: false,
    lastAnswer: '',
    answeredCount: 0,

    // 结果
    estimatedVocab: 0,
    bookResults: [],
    recommendations: [],
    totalCount: 0,
    levelName: '',
    levelBadge: '',
  },

  onLoad() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    this.startTest();
  },

  onShow() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
  },

  async startTest() {
    wx.showLoading({ title: '生成题目...' });
    try {
      const res = await api.startVocabTest();
      if (res.code === 200 && res.data) {
        const words = res.data.words || [];
        if (words.length === 0) {
          wx.showToast({ title: '暂无词书数据', icon: 'none' });
          return;
        }
        this.setData({
          words,
          phase: 'testing',
          currentIndex: 0,
          currentWord: words[0],
          answers: {},
          showMeaning: false,
          answeredCount: 0,
        });
      } else {
        wx.showToast({ title: res.msg || '生成失败', icon: 'none' });
      }
    } catch (err) {
      console.error('start test failed', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  selectAnswer(e) {
    if (this.$data.showMeaning) return; // 已经答过了
    const { answer } = e.currentTarget.dataset;
    const word = this.$data.currentWord;
    if (!word) return;

    this.$data.answers[word.id] = answer;
    const cnt = Object.keys(this.$data.answers).length;

    this.setData({
      answers: this.$data.answers,
      answeredCount: cnt,
      showMeaning: true,
      lastAnswer: answer,
    });

    // 答完后1.5秒自动跳到下一题
    const idx = this.$data.currentIndex;
    setTimeout(() => {
      if (this.$data.phase !== 'testing') return;

      // 到达 checkpoint
      if (cnt >= CHECKPOINT_AT && !this.$data._checkpointShown) {
        this.setData({ phase: 'checkpoint', _checkpointShown: true });
        return;
      }

      // 到达最后一题
      if (idx >= this.$data.words.length - 1) {
        this.submitTest();
        return;
      }

      // 下一题
      const nextIdx = idx + 1;
      this.setData({
        currentIndex: nextIdx,
        currentWord: this.$data.words[nextIdx],
        showMeaning: false,
        lastAnswer: '',
      });
    }, 1500);
  },

  continueTest() {
    const idx = this.$data.currentIndex;
    if (idx >= this.$data.words.length - 1) {
      this.submitTest();
      return;
    }
    const nextIdx = idx + 1;
    this.setData({
      phase: 'testing',
      currentIndex: nextIdx,
      currentWord: this.$data.words[nextIdx],
      showMeaning: false,
      lastAnswer: '',
    });
  },

  async stopAndSubmit() {
    await this.submitTest();
  },

  async submitTest() {
    const cnt = Object.keys(this.$data.answers).length;
    if (cnt === 0) {
      wx.showToast({ title: '请先作答', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '统计中...' });
    try {
      const answers = Object.entries(this.$data.answers).map(([wordId, answer]) => ({
        wordId: parseInt(wordId), answer,
      }));

      const res = await api.submitVocabTest(answers);
      if (res.code === 200 && res.data) {
        const d = res.data;
        const level = getLevel(d.estimatedVocab || 0);
        this.setData({
          phase: 'result',
          estimatedVocab: d.estimatedVocab || 0,
          bookResults: d.bookResults || [],
          recommendations: d.recommendations || [],
          totalCount: d.totalCount || 0,
          levelName: level.name,
          levelBadge: level.badge,
        });
        wx.setStorageSync('lastVocabScore', d.estimatedVocab);
        let history = wx.getStorageSync('vocabHistory') || [];
        history.unshift({ testTime: d.testTime, score: d.estimatedVocab });
        wx.setStorageSync('vocabHistory', history);
      } else {
        wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
      }
    } catch (err) {
      console.error('submit failed', err);
      wx.showToast({ title: '提交失败，请检查网络', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goBack() { wx.navigateBack(); },

  retryTest() {
    this.setData({ phase: 'loading', words: [], currentIndex: 0, answers: {}, _checkpointShown: false });
    this.startTest();
  },
});

</script>
