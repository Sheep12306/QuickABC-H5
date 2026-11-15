<template>
<div class="discover-container page-discover" :style="&quot;background:&quot; + (cardThemes[themeIdx].bg) + &quot;;&quot;"><div class="top-modules"><div @click="mp('enterGrammarTrain', $event)" class="module-card"><div class="module-icon-circle grammar" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="module-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">G</span></div><div class="module-title">语法训练</div><div class="module-desc">专项突破难点</div></div><div @click="mp('enterReadingTrain', $event)" class="module-card"><div class="module-icon-circle reading"><span class="module-icon-inner" style="color:#F0A050;">R</span></div><div class="module-title">阅读提升</div><div class="module-desc">提升理解能力</div></div><div @click="mp('enterExamSelect', $event)" class="module-card"><div class="module-icon-circle exam"><span class="module-icon-inner" style="color:#42A5F5;">E</span></div><div class="module-title">模拟考</div><div class="module-desc">检验成果</div></div></div><div @click="mp('enterCommute', $event)" class="commute-module"><div class="commute-left"><div class="commute-icon-circle"><span class="commute-icon">🎧</span></div><div class="commute-info"><div class="commute-title">通勤英语</div><div class="commute-desc">通勤路上，听觉强化昨日词汇</div></div></div><div class="commute-btn"><span class="commute-btn-text">开始收听</span></div></div><div class="paper-module"><div class="paper-module-head"><div class="paper-module-icon">CET</div><div class="paper-module-info"><div class="paper-module-title">四六级词汇卷</div><div class="paper-module-desc">按今日单词生成选词填空 + 阅读理解，可打印</div></div></div><div class="paper-level-row"><button @click="mp('enterPaper', $event)" data-level="cet4" class="paper-level-btn cet4">四级出卷</button><button @click="mp('enterPaper', $event)" data-level="cet6" class="paper-level-btn cet6">六级出卷</button></div></div><div class="exam-module"><div class="exam-header"><div class="exam-title">模拟考试</div><div class="exam-desc">100 道选择题速刷，全面检验学习成果</div></div><div @click="mp('enterExamSelect', $event)" class="exam-btn" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="exam-btn-text">开始模拟考试</span></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
    data: {
      showTaskPanel: false,
      currentTasks: [],
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
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    enterGrammarTrain() {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    },

    enterReadingTrain() {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    },

    enterExamSelect() {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    },

    enterCommute() {
      wx.navigateTo({ url: '/pages/commute/index' });
    },

    enterPaper(e) {
      const level = e.currentTarget.dataset.level === 'cet4' ? 'cet4' : 'cet6';
      wx.navigateTo({ url: `/pages/vocab-paper/vocab-paper?level=${level}` });
    },

    toggleTaskPanel() {
      this.setData({ showTaskPanel: !this.$data.showTaskPanel });
    }
  });

</script>
