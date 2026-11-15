<template>
<div class="my-container page-my" :style="&quot;background:&quot; + (cardThemes[themeIdx].bg) + &quot;;&quot;"><div class="user-info-section"><div class="avatar-info"><div @click="mp('goToProfile', $event)" class="avatar-wrap"><img class="avatar" :src="isLogin ? userInfo.avatarUrl : '/images/avatar.png'" /><div v-if="isLogin" class="avatar-edit-tip"><span class="avatar-edit-icon">✎</span></div></div><div class="user-base"><div @click="mp('goToProfile', $event)" class="user-name-row"><span class="user-name">{{isLogin ? userInfo.nickName : '未登录用户'}}</span><span v-if="isLogin" class="user-name-edit" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">✎</span></div><div v-if="isLogin" class="user-level" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">Lv.{{userLevel}}</div><span v-if="isLogin" @click="mp('showPhoneModal', $event)" class="phone-bind-text">
          {{userPhone || '绑定手机号'}}
        </span><div v-if="!isLogin" @click="mp('wechatAuthLogin', $event)" class="onekey-login-btn" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span class="login-btn-text">H5 登录</span></div></div></div></div><div class="stats-row"><div class="stat-card stat-main"><span class="stat-num" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{todayWords}}</span><span class="stat-label">累计已背</span></div><div @click="mp('goToVocabDetail', $event)" class="stat-card stat-main"><span class="stat-num" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{totalWords}}</span><span class="stat-label">当前词汇量</span></div></div><div class="tools-section"><span class="section-title">学习工具</span><div class="tools-grid"><div @click="mp('goToVocabTest', $event)" class="tool-item"><div class="tool-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="tool-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">T</span></div><span class="tool-label">词汇测试</span></div><div @click="mp('goToStudyPlan', $event)" class="tool-item"><div class="tool-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="tool-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">P</span></div><span class="tool-label">学习计划</span></div><div @click="mp('checkInStats', $event)" class="tool-item"><div class="tool-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="tool-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">C</span></div><span class="tool-label">打卡日历</span></div></div></div><div class="data-list-section"><div @click="mp('goToWrongWords', $event)" class="data-list-item"><div class="dl-icon-circle wrong-icon"><span class="dl-icon-inner">W</span></div><span class="dl-label">我的错词</span><span class="dl-value">{{wrongWordsCount}}个</span><span class="dl-arrow">></span></div><div @click="mp('goToVocabBook', $event)" class="data-list-item"><div class="dl-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="dl-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">V</span></div><span class="dl-label">我的生词本</span><span class="dl-value">{{vocabBookCount}}个</span><span class="dl-arrow">></span></div><div @click="mp('goToDictationRecords', $event)" class="data-list-item data-list-item-last"><div class="dl-icon-circle dictation-icon"><span class="dl-icon-inner">D</span></div><span class="dl-label">听写记录</span><span class="dl-value">{{dictationCount}}条</span><span class="dl-arrow">></span></div></div><div class="setting-section"><div @click="mp('goToStudySetting', $event)" class="setting-item"><div class="setting-icon-circle study" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="setting-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">S</span></div><span class="setting-name">学习设置</span><span class="setting-arrow">></span></div><div @click="mp('nextTheme', $event)" class="setting-item"><div class="setting-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="setting-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">T</span></div><span class="setting-name">个性换肤</span><div class="skin-controls"><span @click.stop="mp('prevTheme', $event)" class="skin-arrow">◀</span><span class="setting-value skin-name" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">{{cardThemes[themeIdx].name}}</span><span @click.stop="mp('nextTheme', $event)" class="skin-arrow">▶</span></div></div><div @click="mp('goToSetting', $event)" class="setting-item"><div class="setting-icon-circle config"><span class="setting-icon-inner config-icon">C</span></div><span class="setting-name">设置</span><span class="setting-arrow">></span></div></div><div class="theme-footer"><span class="theme-foot-text">当前主题: {{cardThemes[themeIdx].name || '默认'}}</span></div></div>
</template>

<script>
import api from '@/utils/api';
import { ensureLogin } from '@/utils/auth';
import { createPage } from '@/mp/page';


const { resolveAvatarUrl } = api;

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
      userPhone: '',
      phoneNumbers: [],
      selectedPhone: '',

      themeColors: [
        { accent: '#43A047', light: '#E8F5E9' },
        { accent: '#00897B', light: '#E0F2F1' },
        { accent: '#F57C00', light: '#FFF3E0' },
        { accent: '#7B1FA2', light: '#F3E5F5' },
        { accent: '#1976D2', light: '#E3F2FD' }
      ],
      cardThemes: [
        { bg: 'linear-gradient(175deg, #C8E6C9 0%, #E8F5E9 30%, #F1F8F4 100%)', name: '森林' },
        { bg: 'linear-gradient(175deg, #B2DFDB 0%, #E0F2F1 30%, #F1F8F7 100%)', name: '海洋' },
        { bg: 'linear-gradient(175deg, #FFE0B2 0%, #FFF3E0 30%, #FFF8F5 100%)', name: '日落' },
        { bg: 'linear-gradient(175deg, #E1BEE7 0%, #F3E5F5 30%, #F8F4FA 100%)', name: '薰衣草' },
        { bg: 'linear-gradient(175deg, #BBDEFB 0%, #E3F2FD 30%, #F5F8FC 100%)', name: '天空' }
      ],
      themeIdx: 0,

      todayWords: 0,
      totalWords: 0,
      accuracy: 0,
      streakDays: 0,
      wrongWordsCount: 0,
      vocabBookCount: 0,
      dictationCount: 0,
      dailyGoal: 30,

      showPhoneModal: false
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
    },

    loadLocalStats() {
      try {
        this.setData({
          todayWords: wx.getStorageSync('totalLearned') || 0,
          accuracy: wx.getStorageSync('accuracy') || 0,
          streakDays: wx.getStorageSync('checkInDays') || 0,
          wrongWordsCount: (wx.getStorageSync('wrong_words') || []).length,
          vocabBookCount: (wx.getStorageSync('newWords') || []).length,
          dictationCount: (wx.getStorageSync('dictationRecords') || []).length
        });
      } catch (e) {
        // ignore
      }
    },

    showPhoneModal() {
      wx.showModal({
        title: '绑定手机号',
        editable: true,
        placeholderText: '请输入手机号',
        success: (res) => {
          if (res.confirm && res.content) {
            const phone = res.content.trim();
            if (/^1\d{10}$/.test(phone)) {
              const masked = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
              this.setData({ userPhone: masked });
              wx.setStorageSync('userPhone', phone);
              this.savePhoneToServer(phone);
              wx.showToast({ title: '绑定成功', icon: 'success' });
            } else {
              wx.showToast({ title: '手机号格式不正确', icon: 'none' });
            }
          }
        }
      });
    },

    async savePhoneToServer(phone) {
      const token = wx.getStorageSync('token');
      if (!token) return;
      try {
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.phone = phone;
        await api.saveProfile(userInfo);
      } catch (err) {
        console.error('手机号同步失败：', err);
      }
    },

    async syncDataFromServer() {
      try {
        const openid = wx.getStorageSync('openid');
        const token = wx.getStorageSync('token');
        if (!openid && !token) return;

        const userProfile = await this.pullUserProfile();
        if (userProfile && userProfile.id) {
          this.setData({
            isLogin: true,
            userId: userProfile.id,
            userInfo: {
              avatarUrl: resolveAvatarUrl(userProfile.avatar) || this.$data.userInfo.avatarUrl,
              nickName: userProfile.nickname || this.$data.userInfo.nickName,
              phone: userProfile.phone || '',
              grade: userProfile.grade || '',
              school: userProfile.school || ''
            },
            userPhone: userProfile.phone || this.$data.userPhone
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
        userPhone: wx.getStorageSync('userPhone') || '',
        checkInDays: wx.getStorageSync('checkInDays') || 0
      });
    },

    clearLoginStatus() {
      wx.removeStorageSync('hasWechatLogin');
      wx.removeStorageSync('userId');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('token');
      wx.removeStorageSync('openid');
      this.setData({
        isLogin: false,
        userId: '',
        userInfo: { avatarUrl: '', nickName: '' }
      });
    },

    async wechatAuthLogin() {
      // H5 端没有微信登录：用设备 ID + 昵称登录（需要后端 /auth/h5-login）
      try {
        const nickname = await new Promise((resolve) => {
          wx.showModal({
            title: 'H5 登录',
            editable: true,
            placeholderText: '输入昵称（可留空）',
            content: '',
            success: (res) => resolve(res.confirm ? (res.content || '').trim() : null),
            fail: () => resolve(null)
          });
        });
        if (nickname === null) return;

        wx.showLoading({ title: '登录中...' });
        const result = await ensureLogin(nickname ? { nickName: nickname } : undefined);
        if (!result.ok) throw new Error(result.error || '登录失败');

        this.setData({
          isLogin: true,
          userId: wx.getStorageSync('userId'),
          userLevel: wx.getStorageSync('userLevel') || 1,
          checkInDays: wx.getStorageSync('checkInDays') || 0
        });
        wx.showToast({ title: '登录成功', icon: 'success' });
        await this.pullUserProfile();
        await this.pullLatestStudyData();
      } catch (err) {
        console.error(err);
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
        this.clearLoginStatus();
      } finally {
        wx.hideLoading();
      }
    },

    async pullUserProfile() {
      const token = wx.getStorageSync('token');
      if (!token) return null;
      try {
        const res = await api.getUserInfo();
        if (res.code === 200 && res.data) {
          const profile = res.data;
          const userInfo = {
            avatarUrl: resolveAvatarUrl(profile.avatar) || this.$data.userInfo.avatarUrl,
            nickName: profile.nickname || this.$data.userInfo.nickName,
            phone: profile.phone || '',
            grade: profile.grade || '',
            school: profile.school || ''
          };
          this.setData({ userInfo, userPhone: profile.phone || this.$data.userPhone });
          wx.setStorageSync('userInfo', userInfo);
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
          this.setData({
            checkInDays: d.checkInDays || 0,
            lastVocabScore: d.vocabCount || 0,
            userLevel: d.level || 1
          });
          wx.setStorageSync('checkInDays', d.checkInDays || 0);
          wx.setStorageSync('userLevel', d.level || 1);
        }
      } catch (err) {
        console.error('pull study data failed', err);
      }
    },

    async saveStudyData() {
      if (!this.$data.isLogin) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      try {
        await api.saveStudyData({
          checkInDays: this.$data.checkInDays,
          vocabCount: this.$data.lastVocabScore,
          level: this.$data.userLevel
        });
      } catch (err) {
        console.error('save failed', err);
      }
    },

    async checkIn() {
      if (!this.$data.isLogin) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      wx.showLoading({ title: '打卡中...' });
      try {
        const newDays = this.$data.checkInDays + 1;
        this.setData({ checkInDays: newDays });
        wx.setStorageSync('checkInDays', newDays);
        await this.saveStudyData();
        wx.showToast({ title: '打卡成功', icon: 'success' });
      } catch (err) {
        wx.showToast({ title: '打卡失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
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
    goToWrongWords() {
      wx.navigateTo({ url: '/pages/new-word-review/new-word-review?isWrongWordMode=true' });
    },
    goToVocabBook() {
      wx.navigateTo({ url: '/pages/wordBookList/wordBookList' });
    },
    goToDictationRecords() {
      wx.showToast({ title: '功能开发中，敬请期待', icon: 'none' });
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
