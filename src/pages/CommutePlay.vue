<template>
<div class="player-page page-commute-play"><div class="player-card"><div v-if="!ttsAvailable && !loading && !errorMsg" class="tts-notice"><span >🔇 语音合成暂未接入，当前为占位播放</span></div><div class="player-status"><span class="status-label">{{finished ? '今日复习完成' : phaseLabel}}</span><span v-if="streak > 0 && !finished" class="status-streak">🔥 已连续 {{streak}} 天</span></div><template v-if="!finished"><div v-if="currentWord" class="word-display"><span class="word-text">{{currentWord.word}}</span><span v-if="currentWord.phonetic" class="word-phonetic">{{currentWord.phonetic}}</span><span :class="&quot;word-meaning &quot; + (phase === 'zh' ? 'show' : '')">{{phase === 'zh' ? currentWord.meaning : '•••'}}</span></div><div v-else class="word-display morning"><span class="morning-icon">🎧</span><span class="morning-text">{{ type === 'morning' ? '英语早报播报中' : '准备开始复习' }}</span></div><div v-if="total > 0" class="progress-wrap"><mp-progress class="player-progress" :percent="progressPercent" stroke-width="6" active-color="#43A047" background-color="rgba(67,160,71,0.12)" /><span class="progress-text">{{phase === 'morning' ? '早报' : (currentIndex + 1) + ' / ' + total}}</span></div><div class="controls"><div @click="mp('prevWord', $event)" class="ctrl-btn"><span class="ctrl-icon">⏮</span></div><div @click="mp('togglePlay', $event)" class="ctrl-btn main"><span class="ctrl-icon main-icon">{{playing ? '⏸' : '▶'}}</span></div><div @click="mp('nextWord', $event)" class="ctrl-btn"><span class="ctrl-icon">⏭</span></div></div><div v-if="!playing" style="text-align:center;font-size:0.26rem;color:#8A9B8B;margin-top:0.2rem;">点击 ▶ 开始播放</div></template><template v-else><div class="finish-box"><span class="finish-emoji">🎉</span><span class="finish-title">今日复习完成</span><div class="finish-row"><span class="finish-label">复习单词</span><span class="finish-value">{{total}} 个</span></div><div class="finish-row"><span class="finish-label">学习时长</span><span class="finish-value">{{durationText}}</span></div><div class="finish-row"><span class="finish-label">连续学习</span><span class="finish-value">{{streak}} 天</span></div><div class="finish-btns"><div @click="mp('goBack', $event)" class="finish-btn ghost"><span class="finish-btn-text">返回</span></div><div @click="mp('restart', $event)" class="finish-btn solid"><span class="finish-btn-text">再听一遍</span></div></div></div></template><div v-if="!finished" class="mode-row"><div v-for="(item, index) in modes" :key="item.key" @click="mp('changeMode', $event)" :class="&quot;mode-chip &quot; + (mode === item.key ? 'active' : '')" :data-mode="item.key">{{item.label}}</div></div></div><div v-if="loading" class="loading"><span >加载中…</span></div><div v-if="errorMsg" class="error"><span class="error-text">{{errorMsg}}</span><div @click="mp('goBack', $event)" class="err-back"><span class="err-back-text">返回</span></div></div></div>
</template>

<script>
import api from '@/utils/api';
import tts from '@/utils/tts';
import commute from '@/utils/commute';
import { createPage } from '@/mp/page';





const PAUSE_MS = { fast: 1000, normal: 3000, slow: 5000 };
const MODES = [
  { key: 'fast', label: '快速' },
  { key: 'normal', label: '标准' },
  { key: 'slow', label: '慢速' },
];

export default createPage({
  data: {
    type: 'review',
    mode: 'normal',
    modes: MODES,
    playing: false,
    loading: true,
    finished: false,
    errorMsg: '',
    ttsAvailable: false,
    phase: '',
    phaseLabel: '',
    currentWord: null,
    currentIndex: 0,
    total: 0,
    progressPercent: 0,
    streak: 0,
    durationText: '',
  },

  onLoad(options) {
    const type = options.type || 'review';
    const mode = options.mode || wx.getStorageSync('commuteMode') || 'normal';
    this.setData({ type, mode });
    this._destroyed = false;
    this._startTime = Date.now();
    this.loadData();
  },

  onUnload() {
    this._destroyed = true;
    this.cleanupAudio();
  },

  cleanupAudio() {
    if (this.pauseTimer) { clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    if (this.audioTimer) { clearTimeout(this.audioTimer); this.audioTimer = null; }
    if (this.audioCtx) { try { this.audioCtx.destroy(); } catch (e) {} this.audioCtx = null; }
  },

  async loadData() {
    try {
      const res = await api.getCommuteToday();
      if (res.code !== 200) throw new Error(res.msg || '加载失败');
      const data = res.data;
      this._commuteData = data;
      const reviewWords = commute.getReviewWords();
      this._reviewWords = reviewWords;
      this.setData({
        mode: data.mode || this.$data.mode,
        streak: data.streak,
        total: reviewWords.length,
        ttsAvailable: tts.isAvailable(),
        loading: false,
      });

      // 复习类型且无词时，提示后返回
      if ((this.$data.type === 'review' || this.$data.type === 'full') && reviewWords.length === 0) {
        wx.showToast({ title: '暂无待复习单词', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }

      this.buildQueue(this.$data.type, data, reviewWords);
      // 等待用户点击播放按钮（浏览器自动播放限制）
      this.setData({ playing: false });
    } catch (err) {
      const msg = err.message || '加载失败';
      this.setData({
        loading: false,
        errorMsg: /Failed to fetch|NetworkError|Load failed/i.test(msg) ? '网络连接失败，请稍后重试' : msg
      });
    }
  },

  buildQueue(type, data, reviewWords) {
    const queue = [];
    if (type === 'morning' || type === 'full') {
      const m = data.morning || {};
      queue.push({ text: m.greetingEn, lang: 'en_US', phase: 'morning' });
      queue.push({ text: m.dateEn, lang: 'en_US', phase: 'morning' });
      queue.push({ text: m.quoteEn, lang: 'en_US', phase: 'morning' });
      queue.push({ text: m.quoteCn, lang: 'zh_CN', phase: 'morning' });
      queue.push({ text: m.leadEn, lang: 'en_US', phase: 'morning' });
    }
    if (type === 'review' || type === 'full') {
      (reviewWords || []).forEach((w, i) => {
        queue.push({ text: w.word, lang: 'en_US', phase: 'en1', word: w, index: i });
        queue.push({ text: w.word, lang: 'en_US', phase: 'en2', word: w, index: i });
        queue.push({ text: w.meaning, lang: 'zh_CN', phase: 'zh', word: w, index: i });
      });
    }
    this._queue = queue;
  },

  startPlayback() {
    this._paused = false;
    this.setData({ playing: true, finished: false });
    this._startTime = Date.now();
    this.playStep(0);
  },

  async playStep(i) {
    if (this._destroyed) return;
    const queue = this._queue;
    if (!queue || i >= queue.length) {
      this.onQueueFinished();
      return;
    }
    this._currentStep = i;
    const step = queue[i];
    this.setData({
      phase: step.phase,
      phaseLabel: this.phaseText(step),
      currentWord: step.word || null,
      currentIndex: step.index != null ? step.index : 0,
    });
    if (step.index != null && this.$data.total > 0) {
      const done = step.phase === 'zh' ? step.index + 1 : step.index;
      this.setData({ progressPercent: Math.round(done / this.$data.total * 100) });
    }

    let url = null;
    try {
      url = await tts.textToSpeech(step.text, step.lang);
    } catch (e) {
      console.warn('TTS 失败，跳过：', step.text, e);
      url = null;
    }
    if (this._destroyed || this._currentStep !== i) return;

    if (url) {
      this.playUrl(url, () => this.advance(i));
    } else {
      // 占位模式：无音频，按估算时长模拟推进，链路照常跑通
      this.audioTimer = setTimeout(() => this.advance(i), this.estimateDuration(step));
    }
  },

  // 占位模式下估算「朗读」时长（毫秒），接入真实音频后不再使用
  estimateDuration(step) {
    if (step.phase === 'morning') return 1500;
    return 1200;
  },

  phaseText(step) {
    if (step.phase === 'morning') return '英语早报';
    if (step.phase === 'zh') return '中文释义';
    return '英文单词';
  },

  playUrl(url, onEnded) {
    const ctx = wx.createInnerAudioContext();
    this.audioCtx = ctx;
    ctx.src = url;
    ctx.onEnded(() => { if (this.audioCtx === ctx) onEnded(); });
    ctx.onError(() => { if (this.audioCtx === ctx) onEnded(); });
    ctx.play();
  },

  advance(finishedStep) {
    if (this._destroyed || this._paused) return;
    const step = this._queue[finishedStep];
    let pauseMs = 800;
    if (step && (step.phase === 'en1' || step.phase === 'en2')) {
      pauseMs = PAUSE_MS[this.$data.mode] || 3000;
    }
    this.pauseTimer = setTimeout(() => {
      this.playStep(finishedStep + 1);
    }, pauseMs);
  },

  onQueueFinished() {
    if (this._destroyed) return;
    this.setData({
      playing: false,
      finished: true,
      phase: '',
      phaseLabel: '',
      progressPercent: 100,
    });
    const duration = Math.round((Date.now() - this._startTime) / 1000);
    this.setData({ durationText: this.formatDuration(duration) });
    if (this.$data.type === 'review' || this.$data.type === 'full') {
      api.completeCommuteReview(this.$data.total, duration).then(res => {
        if (res.code === 200) this.setData({ streak: res.data.streak });
      }).catch(() => {});
    }
  },

  formatDuration(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m > 0) return `${m} 分 ${sec} 秒`;
    return `${sec} 秒`;
  },

  // ---- 控制 ----
  togglePlay() {
    if (this.$data.playing) this.pausePlayback();
    else this.resumePlayback();
  },

  pausePlayback() {
    this._paused = true;
    if (this.pauseTimer) { clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    if (this.audioTimer) { clearTimeout(this.audioTimer); this.audioTimer = null; }
    if (this.audioCtx) { try { this.audioCtx.stop(); } catch (e) {} }
    this.setData({ playing: false });
  },

  resumePlayback() {
    this._paused = false;
    this.setData({ playing: true });
    const start = this._currentStep != null ? this._currentStep : 0;
    this.playStep(start);
  },

  nextWord() {
    const queue = this._queue;
    if (!queue || !queue.length) return;
    let target = (this._currentStep == null ? 0 : this._currentStep) + 1;
    while (target < queue.length && queue[target].phase !== 'en1') target++;
    if (target >= queue.length) return;
    this.jumpTo(target);
  },

  prevWord() {
    const queue = this._queue;
    if (!queue || !queue.length) return;
    let target = (this._currentStep == null ? 0 : this._currentStep) - 1;
    while (target >= 0 && queue[target].phase !== 'en1') target--;
    if (target < 0) target = 0;
    this.jumpTo(target);
  },

  jumpTo(i) {
    if (this.pauseTimer) { clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    if (this.audioTimer) { clearTimeout(this.audioTimer); this.audioTimer = null; }
    if (this.audioCtx) { try { this.audioCtx.stop(); } catch (e) {} }
    this._currentStep = i;
    this.playStep(i);
  },

  changeMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.$data.mode) return;
    this.setData({ mode });
    wx.setStorageSync('commuteMode', mode);
    api.saveCommuteSettings(mode).catch(() => {});
    if (this.$data.playing && this._currentStep != null) {
      if (this.pauseTimer) { clearTimeout(this.pauseTimer); this.pauseTimer = null; }
      if (this.audioTimer) { clearTimeout(this.audioTimer); this.audioTimer = null; }
      if (this.audioCtx) { try { this.audioCtx.stop(); } catch (e) {} }
      this.playStep(this._currentStep);
    }
  },

  restart() {
    this.setData({ finished: false });
    this.buildQueue(this.$data.type, this._commuteData, this._reviewWords);
    this.startPlayback();
  },

  goBack() {
    wx.navigateBack();
  },
});

</script>
