<template>
<div class="plan-bg page-study-plan"><div class="plan-header"><span class="plan-title">学习计划</span><span class="plan-desc">设置每日打卡目标（按组计算），达成后自动打卡</span></div><div class="goal-card"><span class="goal-label">当前每日目标</span><div class="goal-display" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="goal-num">{{dailyGoal}}</span><span class="goal-unit">组 / 天</span></div><span class="goal-hint">每组 {{groupSize}} 个单词，约 {{dailyGoal * groupSize}} 词 / 天</span></div><div class="options-card"><span class="options-title">快速选择</span><div class="options-grid"><div v-for="(item, index) in quickOptions" :key="item" @click="mp('selectGoal', $event)" :class="&quot;option-btn &quot; + (dailyGoal === item ? 'active' : '')" :data-goal="item" :style="(dailyGoal === item ? 'background:' + themeColors[themeIdx].accent + ';color:#fff;' : '')"><span class="option-text">{{item}} 组</span></div></div></div><div class="custom-card"><span class="custom-label">自定义目标</span><div class="custom-row"><input @input="mp('onCustomInput', $event)" class="custom-input" type="number" placeholder="1 - 10 组" :value="dailyGoal" /><span class="custom-unit">组 / 天</span></div><div @click="mp('saveCustom', $event)" class="custom-save" :style="&quot;background:&quot; + themeColors[themeIdx].accent + &quot;;&quot;"><span class="custom-save-text">保存</span></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';
import { GROUP_SIZE } from '@/utils/ebbinghaus';
import {
  getCheckInGoal,
  maybeAutoCheckIn,
  setCheckInGoal,
  MAX_CHECKIN_GOAL
} from '@/utils/checkin';

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
    dailyGoal: 2,
    groupSize: GROUP_SIZE,
    quickOptions: [1, 2, 3, 4, 5, 6, 8, 10]
  },

  onLoad() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    this.setData({ dailyGoal: getCheckInGoal() });
  },

  onShow() {
    this.setData({
      themeIdx: getApp().globalData.cardThemeIndex || 0,
      dailyGoal: getCheckInGoal()
    });
  },

  async applyGoal(goal) {
    const saved = setCheckInGoal(goal);
    this.setData({ dailyGoal: saved });
    const result = await maybeAutoCheckIn();
    wx.showToast({
      title: result.checked ? '目标已达成，已自动打卡' : '每日目标已设为 ' + saved + ' 组',
      icon: 'none',
      duration: 1500
    });
  },

  selectGoal(e) {
    const goal = parseInt(e.currentTarget.dataset.goal, 10);
    if (!Number.isInteger(goal) || goal < 1 || goal > MAX_CHECKIN_GOAL) return;
    this.applyGoal(goal);
  },

  onCustomInput(e) {
    this.setData({ customValue: parseInt(e.detail.value, 10) || 0 });
  },

  saveCustom() {
    const val = this.$data.customValue;
    if (!Number.isInteger(val) || val < 1 || val > MAX_CHECKIN_GOAL) {
      wx.showToast({ title: `请输入 1 - ${MAX_CHECKIN_GOAL} 之间的组数`, icon: 'none' });
      return;
    }
    this.applyGoal(val);
  },

  goBack() {
    wx.navigateBack();
  }
});

</script>
