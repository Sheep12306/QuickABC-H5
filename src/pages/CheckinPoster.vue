<template>
  <div class="poster-bg page-checkin-poster" :style="{ background: cardThemes[themeIdx].bg }">
    <div class="poster-title-row">
      <span class="poster-title">打卡成功</span>
      <span class="poster-sub">已连续打卡 {{ checkInDays }} 天，今日 {{ todayLearned }} 词</span>
    </div>

    <div class="canvas-wrap">
      <canvas ref="posterCanvas" width="750" height="1160" style="display: none"></canvas>
      <img v-if="posterPath" class="poster-preview" :src="posterPath" alt="打卡海报" />
      <div v-else style="padding: 0.8rem 0; text-align: center; color: #8a9b8b; font-size: 0.28rem">
        海报生成中…
      </div>
    </div>

    <div class="poster-actions">
      <div class="poster-btn save" @click="mp('savePoster', $event)" :style="{ background: themeColors[themeIdx].accent }">
        <span class="poster-btn-text">保存图片</span>
      </div>
      <div class="poster-btn share-btn" @click="mp('sharePoster', $event)">
        <span class="poster-btn-text">分享给好友</span>
      </div>
    </div>

    <div class="poster-back" @click="mp('goBack', $event)">
      <span class="poster-back-text">返回学习</span>
    </div>
  </div>
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
    checkInDays: 0,
    todayLearned: 0,
    currentDate: '',
    nickName: '',
    posterPath: ''
  },

  onLoad(options) {
    const themeIdx = getApp().globalData.cardThemeIndex || 0;
    const userInfo = wx.getStorageSync('userInfo') || {};
    const nickName = userInfo.nickName || userInfo.nickname || '';
    const checkInDays = parseInt(options.checkInDays) || parseInt(wx.getStorageSync('checkInDays')) || 0;
    const todayLearned = parseInt(options.todayLearned) || 0;
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    this.setData({ themeIdx, checkInDays, todayLearned, currentDate: dateStr, nickName });
    this.$nextTick(() => this.drawPoster(nickName, checkInDays, todayLearned, dateStr));
  },

  drawPoster(nickName, days, words, dateStr) {
    const canvas = this.$refs.posterCanvas;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const w = 375;
    const h = 580;
    const scale = 2;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#E8F5E9');
    bgGrad.addColorStop(0.5, '#F1F8F4');
    bgGrad.addColorStop(1, '#C8E6C9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(67,160,71,0.08)';
    ctx.beginPath();
    ctx.arc(300, 80, 120, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(67,160,71,0.05)';
    ctx.beginPath();
    ctx.arc(60, 480, 100, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#43A047';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('单词打卡', w / 2, 70);

    ctx.fillStyle = '#2C3E2D';
    ctx.font = 'normal 14px sans-serif';
    ctx.fillText('已坚持背单词', w / 2, 140);

    ctx.fillStyle = '#43A047';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(String(days), w / 2, 220);

    ctx.fillStyle = '#2C3E2D';
    ctx.font = 'normal 16px sans-serif';
    ctx.fillText('天', w / 2, 248);

    ctx.strokeStyle = 'rgba(67,160,71,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 280);
    ctx.lineTo(w - 80, 280);
    ctx.stroke();

    ctx.fillStyle = '#4A5B4B';
    ctx.font = 'normal 15px sans-serif';
    ctx.fillText('今日已背', w / 2 - 70, 320);
    ctx.fillStyle = '#43A047';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(String(words), w / 2 - 70, 362);
    ctx.fillStyle = '#4A5B4B';
    ctx.font = 'normal 14px sans-serif';
    ctx.fillText('个单词', w / 2 - 70, 384);

    ctx.fillStyle = '#4A5B4B';
    ctx.font = 'normal 15px sans-serif';
    ctx.fillText('日期', w / 2 + 70, 320);
    ctx.fillStyle = '#2C3E2D';
    ctx.font = 'normal 16px sans-serif';
    ctx.fillText(dateStr, w / 2 + 70, 356);

    ctx.fillStyle = '#8A9B8B';
    ctx.font = 'normal 13px sans-serif';
    ctx.fillText('每天坚持一点点，词汇量不断增长', w / 2, 440);

    if (nickName) {
      ctx.fillStyle = '#B0B8B0';
      ctx.font = 'normal 11px sans-serif';
      ctx.fillText(nickName + ' · QuickABC', w / 2, 480);
    }

    try {
      this.setData({ posterPath: canvas.toDataURL('image/png') });
    } catch (err) {
      console.error('生成海报失败', err);
    }
  },

  savePoster() {
    const posterPath = this.$data.posterPath;
    if (!posterPath) return;
    try {
      const a = document.createElement('a');
      a.href = posterPath;
      a.download = `quickabc-checkin-${this.$data.currentDate || Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      wx.showToast({ title: '图片已保存（或已打开）', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '保存失败，请长按图片保存', icon: 'none' });
    }
  },

  async sharePoster() {
    const shareData = {
      title: `我已坚持背单词 ${this.$data.checkInDays} 天`,
      text: '快背单词 - 每天坚持一点点，词汇量不断增长',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        wx.showToast({ title: '分享文案已复制', icon: 'success' });
      } else {
        wx.showToast({ title: '请长按海报保存后分享', icon: 'none' });
      }
    } catch (err) {
      // 用户取消分享时不提示
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
</script>
