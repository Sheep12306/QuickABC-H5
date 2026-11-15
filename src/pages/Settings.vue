<template>
<div class="settings-container page-settings" :style="&quot;background:&quot; + (cardThemes[themeIdx].bg) + &quot;;&quot;"><div class="settings-group"><div @click="mp('clearCache', $event)" class="settings-item"><div class="settings-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">D</span></div><span class="settings-label">清除缓存</span><span class="settings-arrow">></span></div><div @click="mp('showAbout', $event)" class="settings-item"><div class="settings-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">A</span></div><span class="settings-label">关于快背单词</span><span class="settings-arrow">></span></div><div @click="mp('showFeedback', $event)" class="settings-item settings-item-last"><div class="settings-icon-circle" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="settings-icon-inner" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">F</span></div><span class="settings-label">意见反馈</span><span class="settings-arrow">></span></div></div><div class="version-info"><span class="version-text">快背单词 v1.0.0</span><span class="version-sub">H5 版 · Powered by Vue 3</span></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
    data: {
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
    }
  });

</script>
