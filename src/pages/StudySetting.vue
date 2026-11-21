<template>
<div class="setting-container page-study-setting"><div class="setting-card"><div class="setting-icon-wrap" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><span class="setting-icon" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="settings" /></span></div><span class="setting-tip">学习设置功能开发中...</span><span class="setting-sub">敬请期待更多个性化学习选项</span></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

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
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    goBack() {
      wx.navigateBack();
    }
  });

</script>
