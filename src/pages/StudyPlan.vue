<template>
<div class="plan-bg page-study-plan" :style="&quot;background:&quot; + (cardThemes[themeIdx].bg) + &quot;;&quot;"><div class="plan-header"><span class="plan-title">学习计划</span><span class="plan-desc">设置每日背单词目标，达成后即可打卡</span></div><div class="goal-card"><span class="goal-label">当前每日目标</span><div class="goal-display" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="goal-num">{{dailyGoal}}</span><span class="goal-unit">词 / 天</span></div><span class="goal-hint">目标必须是 5 的倍数</span></div><div class="options-card"><span class="options-title">快速选择</span><div class="options-grid"><div v-for="(item, index) in quickOptions" :key="item" @click="mp('selectGoal', $event)" :class="&quot;option-btn &quot; + (dailyGoal === item ? 'active' : '')" :data-goal="item" :style="(dailyGoal === item ? 'background:' + themeColors[themeIdx].accent + ';color:#fff;' : '')"><span class="option-text">{{item}} 词</span></div></div></div><div class="custom-card"><span class="custom-label">自定义目标</span><div class="custom-row"><input @input="mp('onCustomInput', $event)" class="custom-input" type="number" placeholder="输入5的倍数" :value="dailyGoal" /><span class="custom-unit">词 / 天</span></div><div @click="mp('saveCustom', $event)" class="custom-save" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="custom-save-text">保存</span></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
  data: {
    themeIdx: 0,
    themeColors: [
      { accent: '#43A047', light: '#E8F5E9' },
      { accent: '#00897B', light: '#E0F2F1' },
      { accent: '#F57C00', light: '#FFF3E0' },
      { accent: '#7B1FA2', light: '#F3E5F5' },
      { accent: '#1976D2', light: '#E3F2FD' }
    ],
    cardThemes: [
      { bg: 'linear-gradient(175deg, #C8E6C9 0%, #E8F5E9 30%, #F1F8F4 100%)' },
      { bg: 'linear-gradient(175deg, #B2DFDB 0%, #E0F2F1 30%, #F1F8F7 100%)' },
      { bg: 'linear-gradient(175deg, #FFE0B2 0%, #FFF3E0 30%, #FFF8F5 100%)' },
      { bg: 'linear-gradient(175deg, #E1BEE7 0%, #F3E5F5 30%, #F8F4FA 100%)' },
      { bg: 'linear-gradient(175deg, #BBDEFB 0%, #E3F2FD 30%, #F5F8FC 100%)' }
    ],
    dailyGoal: 20,
    quickOptions: [5, 10, 15, 20, 25, 30, 40, 50]
  },

  onLoad() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    const goal = wx.getStorageSync('dailyGoal') || 20;
    this.setData({ dailyGoal: goal });
  },

  onShow() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
  },

  selectGoal(e) {
    const goal = parseInt(e.currentTarget.dataset.goal);
    if (isNaN(goal) || goal < 5 || goal % 5 !== 0) return;
    this.setData({ dailyGoal: goal });
    wx.setStorageSync('dailyGoal', goal);
    wx.showToast({ title: '每日目标已设为 ' + goal + ' 词', icon: 'success', duration: 1200 });
  },

  onCustomInput(e) {
    this.setData({ customValue: parseInt(e.detail.value) || 0 });
  },

  saveCustom() {
    const val = this.$data.customValue;
    if (!val || val < 5 || val % 5 !== 0) {
      wx.showToast({ title: '请输入5的倍数（最小5）', icon: 'none' });
      return;
    }
    this.setData({ dailyGoal: val });
    wx.setStorageSync('dailyGoal', val);
    wx.showToast({ title: '每日目标已设为 ' + val + ' 词', icon: 'success', duration: 1200 });
  },

  goBack() {
    wx.navigateBack();
  }
});

</script>
