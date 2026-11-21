<template>
<div class="commute-page page-commute"><div class="hero"><span class="hero-greeting">Good Morning</span><span v-if="morning" class="hero-date">{{morning.dateCn}}</span><div v-if="morning" class="hero-quote"><span class="quote-en">“{{morning.quoteEn}}”</span><span class="quote-cn">{{morning.quoteCn}}</span></div></div><div @click="mp('startMorning', $event)" class="task-card"><div class="task-icon"><AppIcon name="headphones" /></div><div class="task-info"><span class="task-title">英语早报</span><span class="task-desc">日期 · 每日一句 · 复习引导</span></div><span class="task-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('startReview', $event)" class="task-card"><div class="task-icon"><AppIcon name="headphones" /></div><div class="task-info"><span class="task-title">昨日单词复习</span><span class="task-desc">{{wordCount}} 个单词待复习</span></div><span class="task-arrow"><AppIcon name="chevron-right" /></span></div><div class="mode-section"><span class="section-title">播放速度</span><div class="mode-row"><div v-for="(item, index) in modes" :key="item.key" @click="mp('changeMode', $event)" :class="&quot;mode-item &quot; + (mode === item.key ? 'active' : '')" :data-mode="item.key"><span class="mode-label">{{item.label}}</span><span class="mode-desc">{{item.desc}}</span></div></div></div><div @click="mp('startReview', $event)" class="start-btn"><span class="start-btn-text">开始复习</span></div><div v-if="streak > 0" class="streak-tip"><AppIcon name="flame" class="streak-icon" /> 已连续学习 {{streak}} 天</div><div v-if="loading" class="loading"><span >加载中…</span></div><div v-if="errorMsg" class="error"><span >{{errorMsg}}</span></div></div>
</template>

<script>
import api from '@/utils/api';
import commute from '@/utils/commute';
import { createPage } from '@/mp/page';




const MODES = [
  { key: 'fast', label: '快速', desc: '1秒间隔' },
  { key: 'normal', label: '标准', desc: '3秒间隔' },
  { key: 'slow', label: '慢速', desc: '5秒间隔' },
];

export default createPage({
  data: {
    mode: 'normal',
    modes: MODES,
    morning: null,
    wordCount: 0,
    streak: 0,
    loading: true,
    errorMsg: '',
  },

  onLoad() {
    this.setData({ mode: wx.getStorageSync('commuteMode') || 'normal' });
  },

  onShow() {
    this.loadToday();
    // H5 不再自动跳转播放（浏览器要求用户手势才能出声）
  },

  async loadToday() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await api.getCommuteToday();
      if (res.code !== 200) throw new Error(res.msg || '加载失败');
      const data = res.data;
      this.setData({
        morning: data.morning,
        wordCount: commute.getReviewWords().length,
        streak: data.streak,
        mode: wx.getStorageSync('commuteMode') || data.mode || 'normal',
        loading: false,
      });
    } catch (err) {
      const msg = err.message || '加载失败';
      this.setData({
        loading: false,
        errorMsg: /Failed to fetch|NetworkError|Load failed/i.test(msg) ? '网络连接失败，请稍后重试' : msg
      });
    }
  },

  // 每天首次打开通勤听力自动播一遍晨报；当天后续打开不再触发
  maybeAutoPlayMorning() {
    const todayStr = commute.formatDate(new Date());
    if (wx.getStorageSync('commute_morning_played') === todayStr) return;
    wx.setStorageSync('commute_morning_played', todayStr);
    wx.navigateTo({
      url: `/pages/commute/play?type=morning&mode=${this.$data.mode}`,
    });
  },

  changeMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.$data.mode) return;
    this.setData({ mode });
    wx.setStorageSync('commuteMode', mode);
    api.saveCommuteSettings(mode).catch(() => {});
  },

  goPlay(type) {
    wx.navigateTo({
      url: `/pages/commute/play?type=${type}&mode=${this.$data.mode}`,
    });
  },

  startMorning() {
    this.goPlay('morning');
  },

  startReview() {
    this.goPlay('review');
  },
});

</script>
