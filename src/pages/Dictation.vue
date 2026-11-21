<template>
<div class="dictation-bg page-dictation"><div class="dictation-top"><span class="dictation-title">单词听写</span><span class="dictation-progress">{{wordProgress}}</span><div class="top-spacer"></div><div class="interval-group"><span @click="mp('selectPlayInterval', $event)" :class="&quot;interval-btn &quot; + (playInterval === 5 ? 'active' : '')" data-interval="5" :style="(playInterval === 5 ? 'background:' + themeColors[themeIdx].accent + ';color:#fff;' : '')">5s</span><span @click="mp('selectPlayInterval', $event)" :class="&quot;interval-btn &quot; + (playInterval === 10 ? 'active' : '')" data-interval="10" :style="(playInterval === 10 ? 'background:' + themeColors[themeIdx].accent + ';color:#fff;' : '')">10s</span><span @click="mp('selectPlayInterval', $event)" :class="&quot;interval-btn &quot; + (playInterval === 15 ? 'active' : '')" data-interval="15" :style="(playInterval === 15 ? 'background:' + themeColors[themeIdx].accent + ';color:#fff;' : '')">15s</span></div></div><div class="dictation-main"><div v-if="currentWord.en" class="dictation-card"><div v-if="wordsVisible" class="word-section"><span class="dict-word">{{currentWord.en}}</span><div class="dict-phonetic-row"><span class="dict-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{currentWord.phonetic}}]</span><div @click="mp('playCurrentAudio', $event)" class="audio-btn-sm" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><AppIcon name="volume" class="audio-glyph-sm" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div></div><span class="dict-meaning">{{currentWord.part}} {{currentWord.meaning}}</span></div><div v-else class="hidden-section"><span class="hidden-tip">单词已隐藏</span><span class="hidden-hint">点击下方眼睛按钮显示</span></div></div><div v-else class="empty-card"><AppIcon name="headphones" class="empty-state-icon" /><span class="empty-tip">暂无听写单词</span></div></div><div class="dictation-bar"><div @click="mp('showWordList', $event)" class="bar-item"><AppIcon name="menu" class="bar-icon" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div><div @click="mp('prevWord', $event)" class="bar-item"><AppIcon name="skip-back" class="bar-skip" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div><div @click="mp('togglePlay', $event)" class="bar-play" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><AppIcon :name="isPlaying ? 'pause' : 'play'" class="bar-play-icon" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div><div @click="mp('nextWord', $event)" class="bar-item"><AppIcon name="skip-forward" class="bar-skip" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div><div @click="mp('toggleVisible', $event)" class="bar-item"><AppIcon :name="wordsVisible ? 'eye' : 'eye-off'" class="bar-icon" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;" /></div></div><div v-if="showList" @click="mp('hideWordList', $event)" class="mask"></div><div v-if="showList" class="word-list-popup"><div class="popup-header"><span class="popup-title">{{currentDate}} 单词列表</span><button @click="mp('hideWordList', $event)" class="close-btn" type="button"><AppIcon name="close" /></button></div><div class="list-content mp-scroll-y" data-scroll-y="1"><div v-for="(item, index) in words" :key="item.id" @click="mp('selectWordFromList', $event)" class="list-item" :data-index="index"><span :class="&quot;list-en &quot; + (index===currentIndex ? 'active' : '')" :style="(index===currentIndex ? 'color:' + themeColors[themeIdx].accent + ';' : '')">{{item.en}}</span><span class="list-meaning">{{item.part}} {{item.meaning}}</span></div></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
    data: {
      currentDate: '', // 当天日期
      words: [], // 当天所有单词
      currentIndex: 0, // 当前显示的单词索引
      currentWord: {}, // 当前显示的单词
      isPlaying: false, // 自动播放状态
      playTimer: null, // 自动播放定时器
      playInterval: 5, // 默认播放间隔（秒），可选5/10/15
      wordsVisible: true, // 单词显示/隐藏状态
      showList: false, // 单词列表弹窗显示状态
      wordProgress: '0/0', // 进度文本（如 1/5）
      progressPercent: 0, // 进度条百分比
      stopAfterAll: false,
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
    innerAudioContext: null, // 音频实例
    audioPlayCount: 0, // 记录当前单词播放次数
    intervalTimer: null, // 间隔定时器（区分音频播放和间隔等待）
  
    onLoad(options) {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      // 1. 解析从test-list传递的参数
      const date = options.date || '2026-02-07';
      let words = [];
      
      try {
        const decodedWords = options.words ? decodeURIComponent(options.words) : '[]';
        words = JSON.parse(decodedWords);
        if (!Array.isArray(words) || words.length === 0) {
          throw new Error('单词列表为空或格式错误');
        }
      } catch (e) {
        console.warn('单词参数解析失败，使用兜底数据：', e);
        words = [
          { id: 1, en: 'curly', meaning: '卷曲的', phonetic: '/ˈkɜːli/' },
          { id: 2, en: 'favorite', meaning: '最喜爱的', phonetic: '/ˈfeɪvərɪt/' },
          { id: 3, en: 'foreigner', meaning: '外国人', phonetic: '/ˈfɒrənə(r)/' },
          { id: 4, en: 'handsome', meaning: '英俊的', phonetic: '/ˈhænsəm/' }
        ];
      }
  
      // 2. 初始化数据
      const initWord = words.length > 0 ? words[0] : {};
      const progress = this.calcWordProgress(0, words.length);
      
      this.setData({
        currentDate: date,
        words: words,
        currentIndex: 0,
        currentWord: initWord,
        wordProgress: progress.text,
        progressPercent: progress.percent,
        showList: false
      });
  
      // 3. 初始化音频实例
      this.innerAudioContext = wx.createInnerAudioContext();
      // 监听音频播放结束事件（核心：控制播放次数和间隔）
      this.innerAudioContext.onEnded(() => {
        this.handleAudioEnd();
      });
  
      // 4. 浏览器会拦截无用户手势的自动播放，改为提示用户点击播放按钮
      if (words.length > 0) {
        wx.showToast({ title: '点击播放按钮开始听写', icon: 'none', duration: 2000 });
      }
  
      console.log('听写页面初始化完成：', {
        日期: date,
        单词总数: words.length,
        播放间隔: this.$data.playInterval + 's'
      });
    },
  
    /**
     * 计算单词进度
     * @param {Number} currentIndex 当前索引
     * @param {Number} total 总单词数
     * @returns {Object} 进度文本+百分比
     */
    calcWordProgress(currentIndex, total) {
      if (total === 0) {
        return { text: '0/0', percent: 0 };
      }
      const currentNum = currentIndex + 1;
      return {
        text: `${currentNum}/${total}`,
        percent: (currentNum / total) * 100
      };
    },
  
    /**
     * 播放当前单词发音（重置播放次数）
     */
    playCurrentAudio() {
      if (this.$data.currentWord && this.$data.currentWord.en) {
        this.audioPlayCount = 0; // 重置播放次数
        this.playWordAudio(this.$data.currentWord.en);
      }
    },
  
    /**
     * 播放单词发音（使用有道免费语音接口）
     * @param {String} word 要发音的英文单词
     */
    playWordAudio(word) {
      if (!word) return;
  
      // 停止之前的发音，避免重叠
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
      }
  
      // 有道词典免费语音接口（无需密钥，直接调用）
      const voiceUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
      
      this.innerAudioContext.src = voiceUrl;
      this.innerAudioContext.play();
  
      // 监听发音错误
      this.innerAudioContext.onError((err) => {
        console.error('发音失败:', err);
        wx.showToast({ title: '发音失败', icon: 'none' });
      });
    },
  
    /**
     * 音频播放结束处理（核心逻辑：控制播放2次+间隔等待+读完所有暂停）
     */
    handleAudioEnd() {
      const { isPlaying, playInterval, words, currentIndex, stopAfterAll } = this.$data;
      if (!isPlaying) return;
  
      this.audioPlayCount++;
      // 第一次播放结束：再播放第二次
      if (this.audioPlayCount === 1) {
        this.playWordAudio(this.$data.currentWord.en);
      }
      // 第二次播放结束：开始间隔倒计时，然后切下一个单词
      else if (this.audioPlayCount === 2) {
        this.intervalTimer = setTimeout(() => {
          let newIndex = currentIndex + 1;
          // 判断是否是最后一个单词
          const isLastWord = newIndex >= words.length;
          
          // 如果开启了"读完所有暂停"且是最后一个单词：直接暂停
          if (stopAfterAll && isLastWord) {
            this.togglePlay(); // 暂停播放
            wx.showToast({ title: '已播放完所有单词，已暂停', icon: 'none' });
            return;
          }
          
          // 不是最后一个单词/未开启读完暂停：正常切换
          if (newIndex >= words.length) newIndex = 0;
          
          // 更新当前单词和进度
          const progress = this.calcWordProgress(newIndex, words.length);
          this.setData({
            currentIndex: newIndex,
            currentWord: words[newIndex],
            wordProgress: progress.text,
            progressPercent: progress.percent
          });
  
          // 播放新单词发音（重置次数，开始新循环）
          this.playCurrentAudio();
        }, playInterval * 1000);
      }
    },
  
    /**
     * 新增：切换"读完所有单词暂停"开关
     */
    toggleStopAfterAll() {
      const { stopAfterAll } = this.$data;
      this.setData({
        stopAfterAll: !stopAfterAll
      });
      wx.showToast({ 
        title: stopAfterAll ? '已关闭读完所有单词暂停' : '已开启读完所有单词暂停', 
        icon: 'none' 
      });
    },
  
    /**
     * 切换自动播放/暂停
     */
    togglePlay() {
      const { isPlaying, words } = this.$data;
      if (words.length === 0) return;
  
      if (isPlaying) {
        // 暂停播放：清除所有定时器+停止音频
        clearInterval(this.playTimer);
        clearTimeout(this.intervalTimer);
        if (this.innerAudioContext) {
          this.innerAudioContext.stop();
        }
        this.audioPlayCount = 0; // 重置播放次数
        this.setData({ isPlaying: false });
      } else {
        // 开始播放：立即播放当前单词（2次）
        this.setData({ isPlaying: true });
        this.playCurrentAudio();
      }
    },
  
    /**
     * 选择播放间隔（5s/10s/15s）
     * @param {Object} e 点击事件
     */
    selectPlayInterval(e) {
      const interval = parseInt(e.currentTarget.dataset.interval);
      if (interval === this.$data.playInterval) return;
  
      // 更新间隔
      this.setData({ playInterval: interval });
  
      // 如果正在播放，清除当前间隔定时器（新间隔下次生效）
      if (this.$data.isPlaying && this.intervalTimer) {
        clearTimeout(this.intervalTimer);
      }
  
      wx.showToast({ title: `已设置${interval}秒间隔`, icon: 'none' });
    },
  
    /**
     * 上一个单词
     */
    prevWord() {
      const { words, currentIndex } = this.$data;
      if (words.length === 0) return;
      
      // 切换单词时清除定时器+停止音频
      clearTimeout(this.intervalTimer);
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
      }
      this.audioPlayCount = 0;
      
      let newIndex = currentIndex - 1;
      if (newIndex < 0) newIndex = words.length - 1;
      
      const progress = this.calcWordProgress(newIndex, words.length);
      this.setData({
        currentIndex: newIndex,
        currentWord: words[newIndex],
        wordProgress: progress.text,
        progressPercent: progress.percent
      });
  
      // 播放上一个单词发音（2次）
      if (this.$data.isPlaying) {
        this.playCurrentAudio();
      }
    },
  
    /**
     * 下一个单词
     */
    nextWord() {
      const { words, currentIndex } = this.$data;
      if (words.length === 0) return;
      
      // 切换单词时清除定时器+停止音频
      clearTimeout(this.intervalTimer);
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
      }
      this.audioPlayCount = 0;
      
      let newIndex = currentIndex + 1;
      if (newIndex >= words.length) newIndex = 0;
      
      const progress = this.calcWordProgress(newIndex, words.length);
      this.setData({
        currentIndex: newIndex,
        currentWord: words[newIndex],
        wordProgress: progress.text,
        progressPercent: progress.percent
      });
  
      // 播放下一个单词发音（2次）
      if (this.$data.isPlaying) {
        this.playCurrentAudio();
      }
    },
  
    /**
     * 切换单词显示/隐藏
     */
    toggleVisible() {
      const { wordsVisible } = this.$data;
      this.setData({ wordsVisible: !wordsVisible });
      wx.showToast({
        title: wordsVisible ? '单词已隐藏' : '单词已显示',
        icon: 'none',
        duration: 1000
      });
    },
  
    /**
     * 显示单词列表
     */
    showWordList() {
      if (this.$data.words.length === 0) {
        wx.showToast({ title: '暂无单词可显示', icon: 'none' });
        return;
      }
      
      // 显示列表时暂停播放
      if (this.$data.isPlaying) {
        this.togglePlay();
      }
      this.setData({ showList: true });
    },
  
    /**
     * 隐藏单词列表
     */
    hideWordList() {
      this.setData({ showList: false });
    },
  
    /**
     * 从列表选择单词
     * @param {Object} e 点击事件
     */
    selectWordFromList(e) {
      const index = e.currentTarget.dataset.index;
      // 选择单词时清除定时器+停止音频
      clearTimeout(this.intervalTimer);
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
      }
      this.audioPlayCount = 0;
      
      const progress = this.calcWordProgress(index, this.$data.words.length);
      this.setData({
        currentIndex: index,
        currentWord: this.$data.words[index],
        wordProgress: progress.text,
        progressPercent: progress.percent,
        showList: false
      });
  
      // 播放选中单词发音（2次）
      if (this.$data.isPlaying) {
        this.playCurrentAudio();
      }
    },
  
    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    /**
     * 页面卸载时销毁音频实例和定时器
     */
    onUnload() {
      // 清除所有定时器
      if (this.playTimer) clearInterval(this.playTimer);
      if (this.intervalTimer) clearTimeout(this.intervalTimer);
      // 销毁音频实例
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
        this.innerAudioContext.destroy();
        this.innerAudioContext = null;
      }
    }
  });
</script>
