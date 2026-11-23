<template>
  <div
    class="my-page page-shell"
    :style="{ '--accent': themeColors[themeIdx].accent, '--accent-soft': themeColors[themeIdx].light }"
  >
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">我的</h1>
        <p class="page-subtitle">记录每一次小小的进步</p>
      </div>
      <button class="my-settings" type="button" aria-label="设置" title="设置" @click="mp('goToSetting', $event)">
        <AppSketch name="sliders" :stroke-width="8" class="my-settings-icon" />
      </button>
    </header>

    <section class="profile-card">
      <button class="avatar-wrap" type="button" aria-label="编辑资料" @click="mp('goToProfile', $event)">
        <img
          class="avatar"
          :src="isLogin && userInfo.avatarUrl ? userInfo.avatarUrl : '/images/logo.png'"
          alt=""
        />
        <span v-if="isLogin" class="avatar-edit" aria-hidden="true">
          <AppSketch name="pencil" :stroke-width="12" />
        </span>
      </button>

      <div class="profile-body">
        <button class="profile-name-row" type="button" @click="mp('goToProfile', $event)">
          <span class="profile-name">{{ isLogin ? userInfo.nickName || '同学' : '未登录用户' }}</span>
          <AppSketch v-if="isLogin" name="pencil" :stroke-width="12" class="profile-edit" />
        </button>
        <div v-if="isLogin" class="profile-meta">
          <span class="level-pill" title="等级由累计学习课时决定">Lv.{{ userLevel }}</span>
          <span class="phone-link">{{ userPhone || '未绑定手机号' }}</span>
          <span
            class="hours-pill"
            :title="'剩余课时 ' + (lessonHours === null ? '--' : lessonHours) + '，由管理员发放'"
          >
            <AppIcon name="clock" />
            {{ lessonHours === null ? '--' : lessonHours }}<small>课时</small>
          </span>
        </div>
        <span v-else class="profile-hint">登录后同步学习记录</span>
      </div>

      <button v-if="!isLogin" class="login-btn" type="button" @click="mp('goLogin', $event)">
        登录 / 注册
      </button>
      <button v-else class="profile-enter" type="button" aria-label="查看资料" @click="mp('goToProfile', $event)">
        <AppIcon name="chevron-right" />
      </button>
    </section>

    <section class="stats-card">
      <button class="stat-cell" type="button" @click="mp('checkInStats', $event)">
        <span class="stat-num">{{ streakDays }}<small>天</small></span>
        <span class="stat-label">连续打卡</span>
      </button>
      <div class="stat-cell">
        <span class="stat-num">{{ todayWords }}</span>
        <span class="stat-label">累计已背</span>
      </div>
      <button class="stat-cell" type="button" @click="mp('goToVocabDetail', $event)">
        <span class="stat-num">{{ totalWords || lastVocabScore }}</span>
        <span class="stat-label">当前词汇量</span>
      </button>
    </section>

    <section class="quick-stack" aria-label="学习入口">
      <button class="quick-card quick-card--test" type="button" @click="mp('goToVocabTest', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">测词汇</span>
          <span class="quick-card-meta">{{ vocabCaption() }}</span>
        </span>
        <AppSketch name="gauge" class="quick-card-art" />
      </button>

      <button class="quick-card quick-card--plan" type="button" @click="mp('goToStudyPlan', $event)">
        <span class="quick-card-text">
          <span class="quick-card-title">做计划</span>
          <span class="quick-card-meta">按计划推进</span>
        </span>
        <AppSketch name="plan" class="quick-card-art" />
      </button>
    </section>

    <section class="page-section">
      <div class="section-head">
        <h2 class="section-title">今日打卡</h2>
      </div>
      <div class="quiet-list">
        <button class="quiet-row" type="button" @click="mp('goToExportWords', $event)">
          <AppSketch name="download" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">导出单词</span>
          <span class="quiet-meta">选日期 · Word / PDF</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
        <button class="quiet-row" type="button" @click="mp('checkInStats', $event)">
          <AppSketch name="calendar" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">打卡日历</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <h2 class="section-title">偏好设置</h2>
      </div>
      <div class="quiet-list">
        <button class="quiet-row" type="button" @click="mp('goToStudySetting', $event)">
          <AppSketch name="book" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">学习设置</span>
          <AppIcon name="chevron-right" class="quiet-chevron" />
        </button>
        <div class="quiet-row" @click="mp('nextTheme', $event)">
          <AppSketch name="palette" :stroke-width="8" class="row-sketch" />
          <span class="quiet-label">个性换肤</span>
          <span class="skin-controls">
            <button class="skin-arrow" type="button" aria-label="上一个主题" @click.stop="mp('prevTheme', $event)">
              <AppIcon name="chevron-left" />
            </button>
            <span class="skin-dot"></span>
            <span class="skin-name">{{ cardThemes[themeIdx].name }}</span>
            <button class="skin-arrow" type="button" aria-label="下一个主题" @click.stop="mp('nextTheme', $event)">
              <AppIcon name="chevron-right" />
            </button>
          </span>
        </div>
      </div>
    </section>

    <footer class="my-footer">快背单词 · 当前主题「{{ cardThemes[themeIdx].name }}」</footer>
  </div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';
import { normalizeLessonHours } from '@/utils/lesson';
import { getCheckInState, maybeAutoCheckIn } from '@/utils/checkin';


const { resolveAvatarUrl } = api;

function maskPhone(phone) {
  return String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

export default createPage({
    data: {
      userInfo: {
        avatarUrl: '',
        nickName: ''
      },
      userId: '',
      isLogin: false,
      userLevel: 1,
      checkInDays: 0,
      lastVocabScore: 0,
      lessonHours: null,
      userPhone: '',
      phoneNumbers: [],
      selectedPhone: '',

      // 首页的绿色作为默认主题色；换肤只改强调色，页面底色统一用纸张色
      themeColors: [
        { accent: '#326d43', light: '#e6efe2' },
        { accent: '#2f6f6a', light: '#e2efed' },
        { accent: '#a9692c', light: '#f6e9da' },
        { accent: '#6f5686', light: '#eee7f4' },
        { accent: '#3c6382', light: '#e6edf2' }
      ],
      cardThemes: [
        { name: '森林' },
        { name: '海洋' },
        { name: '日落' },
        { name: '薰衣草' },
        { name: '天空' }
      ],
      themeIdx: 0,

      todayWords: 0,
      totalWords: 0,
      accuracy: 0,
      streakDays: 0
    },

    onLoad() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.checkLocalLoginStatus();
      this.loadLocalStats();
      this.syncDataFromServer();
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      if (this.$data.isLogin) {
        this.pullUserProfile();
        this.pullLatestStudyData();
      }
      this.loadLocalStats();
      this.checkLocalLoginStatus();
      this.refreshCheckIn();
    },

    loadLocalStats() {
      try {
        this.setData({
          todayWords: wx.getStorageSync('totalLearned') || 0,
          totalWords: wx.getStorageSync('lastVocabScore') || 0,
          accuracy: wx.getStorageSync('accuracy') || 0,
          streakDays: wx.getStorageSync('checkInDays') || 0
        });
      } catch (e) {
        // ignore
      }
    },

    vocabCaption() {
      const count = this.$data.totalWords || this.$data.lastVocabScore;
      return count ? `${count} 词` : '测测词汇量';
    },

    goLogin() {
      wx.navigateTo({ url: '/login' });
    },

    async syncDataFromServer() {
      try {
        const openid = wx.getStorageSync('openid');
        const token = wx.getStorageSync('token');
        if (!openid && !token) return;

        const userProfile = await this.pullUserProfile();
        if (userProfile && userProfile.id) {
          const hours = normalizeLessonHours(
            userProfile.lessonHours,
            this.$data.lessonHours
          );
          this.setData({
            isLogin: true,
            userId: userProfile.id,
            lessonHours: hours,
            userInfo: {
              avatarUrl: resolveAvatarUrl(userProfile.avatar) || this.$data.userInfo.avatarUrl,
              nickName: userProfile.nickname || this.$data.userInfo.nickName,
              phone: userProfile.phone || '',
              grade: userProfile.grade || '',
              school: userProfile.school || '',
              lessonHours: hours
            },
            userPhone: maskPhone(userProfile.phone) || this.$data.userPhone
          });
          wx.setStorageSync('hasWechatLogin', true);
          wx.setStorageSync('userId', userProfile.id);
          await this.pullLatestStudyData();
        } else {
          this.clearLoginStatus();
        }
      } catch (err) {
        console.error('sync failed', err);
      }
    },

    checkLocalLoginStatus() {
      const hasLogin = wx.getStorageSync('hasWechatLogin');
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userId = wx.getStorageSync('userId') || '';
      const rawAvatar = userInfo.avatarUrl || userInfo.avatar || '';
      this.setData({
        isLogin: !!(hasLogin || token),
        userId: userId,
        userInfo: {
          avatarUrl: resolveAvatarUrl(rawAvatar),
          nickName: userInfo.nickName || userInfo.nickname || ''
        },
        userPhone: maskPhone(wx.getStorageSync('userPhone')),
        lessonHours: normalizeLessonHours(userInfo.lessonHours, null),
        userLevel: Number(wx.getStorageSync('userLevel')) || Number(userInfo.lessonLevel) || 1,
        checkInDays: wx.getStorageSync('checkInDays') || 0
      });
    },

    clearLoginStatus() {
      wx.removeStorageSync('hasWechatLogin');
      wx.removeStorageSync('userId');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('token');
      wx.removeStorageSync('openid');
      wx.removeStorageSync('userPhone');
      this.setData({
        isLogin: false,
        userId: '',
        userInfo: { avatarUrl: '', nickName: '' }
      });
    },

    async pullUserProfile() {
      const token = wx.getStorageSync('token');
      if (!token) return null;
      try {
        const res = await api.getUserInfo();
        if (res.code === 200 && res.data) {
          const profile = res.data;
          const hours = normalizeLessonHours(
            profile.lessonHours,
            this.$data.lessonHours
          );
          const lessonLevel = Number(profile.lessonLevel) || Number(profile.level) || this.$data.userLevel;
          const userInfo = {
            avatarUrl: resolveAvatarUrl(profile.avatar) || this.$data.userInfo.avatarUrl,
            nickName: profile.nickname || this.$data.userInfo.nickName,
            phone: profile.phone || '',
            grade: profile.grade || '',
            school: profile.school || '',
            lessonHours: hours,
            lessonLevel
          };
          this.setData({
            userInfo,
            lessonHours: hours,
            userLevel: lessonLevel,
            userPhone: maskPhone(profile.phone) || this.$data.userPhone
          });
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('userLevel', lessonLevel);
          return profile;
        }
      } catch (err) {
        console.error('pull profile failed', err);
      }
      return null;
    },

    async pullLatestStudyData() {
      const token = wx.getStorageSync('token');
      if (!token) return;
      try {
        const res = await api.getStudyData();
        if (res.code === 200 && res.data) {
          const d = res.data;
          const hours = normalizeLessonHours(d.lessonHours, this.$data.lessonHours);
          const lessonLevel = Number(d.lessonLevel) || Number(d.level) || 1;
          this.setData({
            checkInDays: d.checkInDays || 0,
            lastVocabScore: d.vocabCount || 0,
            totalWords: d.vocabCount || this.$data.totalWords,
            userLevel: lessonLevel,
            lessonHours: hours
          });
          wx.setStorageSync('checkInDays', d.checkInDays || 0);
          wx.setStorageSync('userLevel', lessonLevel);
          if (d.lessonHours !== undefined) {
            const stored = wx.getStorageSync('userInfo') || {};
            stored.lessonHours = hours;
            wx.setStorageSync('userInfo', stored);
          }
        }
      } catch (err) {
        console.error('pull study data failed', err);
      }
    },

    // 进入页面时兜底：若今日组数已达标但还没记打卡，自动补上
    async refreshCheckIn() {
      try {
        const result = await maybeAutoCheckIn();
        this.applyCheckInState(result, true);
      } catch (err) {
        const state = getCheckInState();
        this.applyCheckInState(state, true);
      }
    },

    applyCheckInState(state, syncDays) {
      if (!syncDays) return;
      this.setData({
        streakDays: state.days,
        checkInDays: state.days
      });
    },

    goToExportWords() {
      wx.navigateTo({ url: '/pages/export-words/export-words' });
    },

    goToProfile() {
      wx.navigateTo({ url: '/pages/profile/profile' });
    },
    checkInStats() {
      wx.navigateTo({ url: '/pages/studyRecord/studyRecord' });
    },
    goToVocabDetail() {
      wx.navigateTo({ url: '/pages/vocab-Detail/vocab-Detail' });
    },
    goToVocabTest() {
      wx.navigateTo({ url: '/pages/vocab-Test/vocab-Test' });
    },
    goToStudyPlan() {
      wx.navigateTo({ url: '/pages/study-plan/study-plan' });
    },
    goToStudySetting() {
      wx.navigateTo({ url: '/pages/studySetting/studySetting' });
    },
    goToSetting() {
      wx.navigateTo({ url: '/pages/settings/settings' });
    },
    switchTheme() {
      const total = this.$data.cardThemes.length;
      const idx = (this.$data.themeIdx + 1) % total;
      this.setData({ themeIdx: idx });
      getApp().globalData.cardThemeIndex = idx;
    },
    prevTheme() {
      const total = this.$data.cardThemes.length;
      const idx = (this.$data.themeIdx - 1 + total) % total;
      this.setData({ themeIdx: idx });
      getApp().globalData.cardThemeIndex = idx;
    },
    nextTheme() {
      this.switchTheme();
    },

    onUnload() {
      wx.hideLoading();
    }
  });
</script>
