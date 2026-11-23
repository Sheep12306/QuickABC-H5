<template>
<div class="settings-container page-settings"><div class="settings-group"><div class="settings-group-head"><span class="settings-group-title">四六级出题</span><span class="settings-group-desc">仅用于「四六级词汇卷」AI 出卷，不影响其他功能</span></div><div @click="mp('editApiKey', $event)" class="settings-item"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="key" /></span></div><span class="settings-label">API Key</span><span class="settings-value">{{ practiceApiKey ? '已配置 · ' + practiceApiMasked : '未配置' }}</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('editBaseUrl', $event)" class="settings-item"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="globe" /></span></div><span class="settings-label">接口地址</span><span class="settings-value">{{ practiceBase || '默认官方地址' }}</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('editModel', $event)" class="settings-item settings-item-last"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="cpu" /></span></div><span class="settings-label">模型</span><span class="settings-value">{{ practiceModel || 'claude-opus-5-5' }}</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div class="settings-note">Key 只保存在本机，出卷时随请求发送到后端；留空保存即可清除。</div></div><div class="settings-group"><div @click="mp('clearCache', $event)" class="settings-item"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="trash" /></span></div><span class="settings-label">清除缓存</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('showAbout', $event)" class="settings-item"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="info" /></span></div><span class="settings-label">关于快背单词</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('showFeedback', $event)" class="settings-item"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="message" /></span></div><span class="settings-label">意见反馈</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div><div @click="mp('doLogout', $event)" class="settings-item settings-item-last"><div class="settings-icon-circle"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="arrow-left" /></span></div><span class="settings-label">退出登录</span><span class="settings-arrow"><AppIcon name="chevron-right" /></span></div></div><div class="version-info"><span class="version-text">快背单词 v1.0.0</span><span class="version-sub">H5 版 · Powered by Vue 3</span></div></div>
</template>

<script>

import { createPage } from '@/mp/page';
import { logout } from '@/utils/auth';
import {
  DEFAULT_PRACTICE_MODEL,
  getPracticeApiSettings,
  maskApiKey,
  savePracticeApiSettings
} from '@/utils/practiceApi';

export default createPage({
    data: {
      themeColors: [
        { accent: '#326d43', light: '#e6efe2' },
        { accent: '#2f6f6a', light: '#e2efed' },
        { accent: '#a9692c', light: '#f6e9da' },
        { accent: '#6f5686', light: '#eee7f4' },
        { accent: '#3c6382', light: '#e6edf2' }
      ],
      themeIdx: 0,
      // 四六级出题接口配置（仅该板块使用）
      practiceApiKey: '',
      practiceApiMasked: '',
      practiceBase: '',
      practiceModel: '',
      cardThemes: [
        { bg: 'linear-gradient(175deg, #C8E6C9 0%, #e6efe2 30%, #F1F8F4 100%)' },
        { bg: 'linear-gradient(175deg, #B2DFDB 0%, #e2efed 30%, #F1F8F7 100%)' },
        { bg: 'linear-gradient(175deg, #FFE0B2 0%, #f6e9da 30%, #FFF8F5 100%)' },
        { bg: 'linear-gradient(175deg, #E1BEE7 0%, #eee7f4 30%, #F8F4FA 100%)' },
        { bg: 'linear-gradient(175deg, #BBDEFB 0%, #e6edf2 30%, #F5F8FC 100%)' }
      ]
    },

    onLoad() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.loadPracticeApi();
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      this.loadPracticeApi();
    },

    loadPracticeApi() {
      const settings = getPracticeApiSettings();
      this.setData({
        practiceApiKey: settings.apiKey,
        practiceApiMasked: maskApiKey(settings.apiKey),
        practiceBase: settings.baseUrl,
        practiceModel: settings.model
      });
    },

    editApiKey() {
      wx.showModal({
        title: '四六级出题 API Key',
        editable: true,
        content: '',
        placeholderText: 'sk-ant-...（留空保存可清除）',
        success: (res) => {
          if (!res.confirm) return;
          const apiKey = String(res.content || '').trim();
          savePracticeApiSettings({ apiKey });
          this.loadPracticeApi();
          wx.showToast({ title: apiKey ? 'API Key 已保存' : 'API Key 已清除', icon: 'none' });
        }
      });
    },

    editBaseUrl() {
      wx.showModal({
        title: '接口地址（可选）',
        editable: true,
        content: this.$data.practiceBase,
        placeholderText: 'https://api.anthropic.com',
        success: (res) => {
          if (!res.confirm) return;
          const baseUrl = String(res.content || '').trim();
          if (baseUrl && !/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
            wx.showToast({ title: '请输入 http(s) 开头的地址', icon: 'none' });
            return;
          }
          savePracticeApiSettings({ baseUrl });
          this.loadPracticeApi();
          wx.showToast({ title: baseUrl ? '接口地址已保存' : '已恢复默认地址', icon: 'none' });
        }
      });
    },

    editModel() {
      wx.showModal({
        title: '出卷模型（可选）',
        editable: true,
        content: this.$data.practiceModel,
        placeholderText: DEFAULT_PRACTICE_MODEL,
        success: (res) => {
          if (!res.confirm) return;
          const model = String(res.content || '').trim();
          if (model && !/^[A-Za-z0-9._-]{1,64}$/.test(model)) {
            wx.showToast({ title: '模型名只能包含字母、数字、. _ -', icon: 'none' });
            return;
          }
          savePracticeApiSettings({ model });
          this.loadPracticeApi();
          wx.showToast({ title: model ? '模型已保存' : '已恢复默认模型', icon: 'none' });
        }
      });
    },

    clearCache() {
      wx.showModal({
        title: '清除缓存',
        content: '确定要清除本地缓存数据吗？这将清除学习记录缓存，但不会影响云端数据。',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '清理中...' });
            try {
              // Keep login-related keys, clear study caches
              // H5 额外保留 token 和 deviceId，避免清缓存后被登出/换账号
              const keepKeys = ['token', 'openid', 'hasWechatLogin', 'userId', 'userInfo', 'userPhone', 'currentBook', 'h5_device_id'];
              const allKeys = wx.getStorageInfoSync().keys;
              allKeys.forEach(key => {
                if (!keepKeys.includes(key)) {
                  wx.removeStorageSync(key);
                }
              });
              wx.hideLoading();
              wx.showToast({ title: '缓存已清除', icon: 'success' });
            } catch (e) {
              wx.hideLoading();
              wx.showToast({ title: '清理失败', icon: 'none' });
            }
          }
        }
      });
    },

    showAbout() {
      wx.showModal({
        title: '关于快背单词',
        content: '快背单词是一款专注英语词汇学习的产品。支持单词书学习、错词复习、听写练习、词汇量测试等功能。\n\n版本：1.0.0（H5）',
        showCancel: false,
        confirmText: '知道了'
      });
    },

    showFeedback() {
      wx.showModal({
        title: '意见反馈',
        content: '感谢您的使用！如有任何建议或问题，欢迎通过以下方式反馈。\n\n反馈渠道开发中，敬请期待。',
        showCancel: false,
        confirmText: '知道了'
      });
    },

    doLogout() {
      wx.showModal({
        title: '退出登录',
        content: '退出后需要用手机号和密码重新登录，云端学习记录不会丢失。',
        confirmText: '退出',
        success: (res) => {
          if (!res.confirm) return;
          logout();
          wx.reLaunch({ url: '/login' });
        }
      });
    }
  });

</script>
