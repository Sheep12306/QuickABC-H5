<template>
  <div class="discover-page page-shell">
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">发现</h1>
      </div>
      <button class="discover-search" type="button" aria-label="搜索单词" title="搜索单词" @click="mp('openSearch', $event)">
        <AppIcon name="search" class="discover-search-icon" />
      </button>
    </header>

    <section class="quick-stack" aria-label="练习入口">
      <button class="quick-card quick-card--commute" type="button" @click="mp('enterCommute', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">听英语</span>
        </span>
        <AppSketch name="commute" class="quick-card-art" />
      </button>

      <button class="quick-card quick-card--paper" type="button" @click="mp('enterPaper', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">做测验</span>
        </span>
        <AppSketch name="paper" class="quick-card-art" />
      </button>

      <button class="quick-card quick-card--grammar" type="button" @click="mp('enterGrammarTrain', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">练语法</span>
        </span>
        <AppSketch name="grammar" :stroke-width="6" class="quick-card-art" />
      </button>

      <button class="quick-card quick-card--dictation" type="button" @click="mp('goTestList', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">听单词</span>
        </span>
        <AppSketch name="dictation" class="quick-card-art" />
      </button>
    </section>

    <section class="page-section">
      <div class="section-head">
        <h2 class="section-title">专项训练</h2>
      </div>
      <div class="quiet-list">
        <button class="quiet-row" type="button" @click="mp('enterGrammarTrain', $event)">
          <AppSketch name="grammar" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">语法训练</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
        <button class="quiet-row" type="button" @click="mp('enterReadingTrain', $event)">
          <AppSketch name="reading" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">阅读提升</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
        <button class="quiet-row" type="button" @click="mp('goTestList', $event)">
          <AppSketch name="dictation" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">单词听写</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
      </div>
    </section>

  </div>
</template>

<script>
import { createPage } from '@/mp/page';

export default createPage({
  data: {},

  openSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  enterGrammarTrain() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  enterReadingTrain() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goTestList() {
    wx.navigateTo({ url: '/pages/test-list/test-list' });
  },

  enterCommute() {
    wx.navigateTo({ url: '/pages/commute/index' });
  },

  enterPaper() {
    wx.navigateTo({ url: '/pages/vocab-paper/vocab-paper' });
  },
});
</script>
