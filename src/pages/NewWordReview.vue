<template>
<div class="review-container page-new-word-review"><div class="review-top"><span class="review-subtitle">{{currentWord ? currentIndex + 1 : 0}}/{{totalWords || 0}}</span></div><div class="word-area"><div v-if="currentWord" class="word-main"><div class="word-display"><span class="word-en">{{currentWord.en}}</span><div class="word-meta"><span class="word-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{currentWord.phonetic}}]</span><div @click="mp('playCurrentAudio', $event)" class="audio-icon" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><AppIcon name="volume" class="audio-glyph" /></div></div></div><div :class="&quot;answer-area &quot; + (showAnswer ? 'show' : 'hide')"><div class="meaning-text">{{currentWord.part}} {{currentWord.meaning}}</div><div v-if="showAnswer && currentMarkedAsKnow" @click="mp('correctToDontKnow', $event)" class="correct-btn"><span >更正为不认识</span></div></div><div v-if="!hasMadeChoice" class="action-buttons"><div @click="mp('markDontKnow', $event)" class="btn-action btn-dont-know"><span >仍不认识</span></div><div @click="mp('markKnow', $event)" class="btn-action btn-know" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span >已掌握</span></div></div><div v-if="hasMadeChoice" class="next-btn-area"><div @click="mp('nextWord', $event)" class="btn-next" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span >{{currentIndex < totalWords - 1 ? '下一个' : '继续复习'}}</span></div></div></div><div v-else class="empty-tip"><AppIcon name="check" class="empty-state-icon" /><span>暂无错词，继续加油！</span></div></div><div class="stats-section"><div class="stats-row"><div class="stat-item"><span class="stat-value">{{knowCount || 0}}</span><span class="stat-label">已掌握</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-value">{{totalWords || 0}}</span><span class="stat-label">需复习</span></div><div class="stat-divider"></div><div @click="mp('shuffleWords', $event)" class="stat-item"><span class="stat-value" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="refresh" /></span><span class="stat-label">随机复习</span></div></div></div></div>
</template>

<script>

import { createPage } from '@/mp/page';

export default createPage({
    data: {
      wrongWordsList: [],
      currentIndex: 0,
      totalWords: 0,
      currentWord: null,
      showAnswer: false,
      hasMadeChoice: false,
      currentMarkedAsKnow: false,
      knowCount: 0,
      dontKnowCount: 0,
      isWrongWordMode: false,
      themeColors: [
        { accent: '#326d43', light: '#e6efe2' },
        { accent: '#2f6f6a', light: '#e2efed' },
        { accent: '#a9692c', light: '#f6e9da' },
        { accent: '#6f5686', light: '#eee7f4' },
        { accent: '#3c6382', light: '#e6edf2' }
      ],
      themeIdx: 0
    },

    onLoad(options) {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
      // 每个词在本轮复习中的连续「认识」次数：连续两次才移出错词本
      this._knowStreak = {};
      const { bookId, words, isWrongWordMode } = options;
      this.setData({ isWrongWordMode: isWrongWordMode === 'true' });

      if (this.$data.isWrongWordMode) {
        this.loadWrongWordsFromLocal();
      } else if (words && words !== '[]') {
        try {
          const realWords = JSON.parse(decodeURIComponent(words));
          this.setData({
            wrongWordsList: realWords,
            totalWords: realWords.length,
            currentWord: realWords[0] || null
          });
        } catch (e) {
          this.setData({ wrongWordsList: [], totalWords: 0, currentWord: null });
        }
      }
    },

    // 加载本地错词缓存
    loadWrongWordsFromLocal() {
      try {
        this._knowStreak = {};
        let wrongWords = wx.getStorageSync('wrong_words') || [];
        if (!Array.isArray(wrongWords)) {
          wrongWords = [];
          wx.setStorageSync('wrong_words', []);
        }

        if (wrongWords.length === 0) {
          this.setData({ wrongWordsList: [], totalWords: 0, currentWord: null });
          return;
        }

        const formattedList = wrongWords.map(item => ({
          en: item.en || '',
          phonetic: item.phonetic || '',
          meaning: item.meaning || '',
          part: item.part || ''
        }));

        this.setData({
          wrongWordsList: formattedList,
          totalWords: formattedList.length,
          currentIndex: 0,
          currentWord: formattedList[0] || null,
          knowCount: 0,
          dontKnowCount: formattedList.length
        }, () => {
          if (formattedList.length > 0) {
            this.playCurrentAudio();
          }
        });
      } catch (err) {
        console.error('加载错词失败：', err);
        this.setData({ wrongWordsList: [], totalWords: 0, currentWord: null });
      }
    },

    // 单词唯一键：错词本按 en 去重
    wordKey(word) {
      return (word && word.en) || '';
    },

    // 标记为认识 — 连续两次认识才移出错词本；第一次认识后重新排队
    markKnow() {
      if (!this.$data.currentWord || this.$data.hasMadeChoice || this._tapLock) return;
      this._tapLock = true;

      const word = this.$data.currentWord;
      const key = this.wordKey(word);
      const streak = (this._knowStreak[key] || 0) + 1;
      this._knowStreak[key] = streak;
      const mastered = streak >= 2;

      this.setData({
        hasMadeChoice: true,
        currentMarkedAsKnow: true,
        showAnswer: true,
        knowCount: this.$data.isWrongWordMode
          ? this.$data.knowCount
          : this.$data.knowCount + 1,
        dontKnowCount: Math.max(0, this.$data.dontKnowCount - 1)
      }, () => {
        this.playCurrentAudio();
        if (!this.$data.isWrongWordMode) return;
        if (mastered) {
          this.setData({
            answerTimer: setTimeout(() => {
              this.removeWrongWord();
            }, 2000)
          });
        } else {
          wx.showToast({ title: '再认识一次即可掌握', icon: 'none', duration: 1500 });
          this.setData({
            answerTimer: setTimeout(() => {
              this.nextWord();
            }, 2000)
          });
        }
      });
    },

    // 标记为不认识 — 保留该词并打断连续认识，2秒后移到下一个
    markDontKnow() {
      if (!this.$data.currentWord || this.$data.hasMadeChoice || this._tapLock) return;
      this._tapLock = true;

      this._knowStreak[this.wordKey(this.$data.currentWord)] = 0;

      this.setData({
        showAnswer: true,
        hasMadeChoice: true,
        currentMarkedAsKnow: false,
        dontKnowCount: this.$data.dontKnowCount + 1
      }, () => {
        this.playCurrentAudio();
        this.setData({
          answerTimer: setTimeout(() => {
            this.nextWord();
          }, 2000)
        });
      });
    },

    // 更正为不认识：撤回认识并打断连续次数；该词仍在列表中，不再重复插入
    correctToDontKnow() {
      if (!this.$data.currentWord) return;
      if (this.$data.answerTimer) {
        clearTimeout(this.$data.answerTimer);
        this.setData({ answerTimer: null });
      }

      const word = this.$data.currentWord;
      const key = this.wordKey(word);
      this._knowStreak[key] = 0;
      this._tapLock = false;

      if (this.$data.isWrongWordMode) {
        const exists = this.$data.wrongWordsList.some(item => this.wordKey(item) === key);
        if (exists) {
          this.setData({ currentMarkedAsKnow: false });
        } else {
          const newList = [word, ...this.$data.wrongWordsList];
          wx.setStorageSync('wrong_words', newList);
          this.setData({
            wrongWordsList: newList,
            totalWords: newList.length,
            currentMarkedAsKnow: false
          });
        }
      } else {
        this.setData({
          currentMarkedAsKnow: false,
          knowCount: Math.max(0, this.$data.knowCount - 1)
        });
      }
    },

    // 移除已掌握的错词
    removeWrongWord() {
      if (this.$data.answerTimer) {
        clearTimeout(this.$data.answerTimer);
        this.setData({ answerTimer: null });
      }

      const { wrongWordsList, currentIndex, currentWord } = this.$data;
      if (!currentWord || wrongWordsList.length === 0) return;

      const key = this.wordKey(currentWord);
      const newWrongList = wrongWordsList.filter(item => this.wordKey(item) !== key);
      wx.setStorageSync('wrong_words', newWrongList);
      delete this._knowStreak[key];

      if (newWrongList.length === 0) {
        this.setData({
          wrongWordsList: [],
          totalWords: 0,
          currentWord: null,
          hasMadeChoice: false,
          showAnswer: false,
          currentMarkedAsKnow: false,
          knowCount: this.$data.knowCount + 1,
          dontKnowCount: 0
        });
        this._tapLock = false;
        wx.showToast({ title: '所有错词已掌握！', icon: 'success', duration: 2000 });
        setTimeout(() => wx.navigateBack(), 2000);
        return;
      }

      const newIndex = currentIndex >= newWrongList.length ? newWrongList.length - 1 : currentIndex;

      this.setData({
        wrongWordsList: newWrongList,
        totalWords: newWrongList.length,
        currentIndex: newIndex,
        currentWord: newWrongList[newIndex] || null,
        hasMadeChoice: false,
        showAnswer: false,
        currentMarkedAsKnow: false,
        knowCount: this.$data.knowCount + 1,
        dontKnowCount: Math.max(0, this.$data.dontKnowCount - 1)
      });
      this._tapLock = false;
    },

    // 下一个单词
    nextWord() {
      if (this.$data.answerTimer) {
        clearTimeout(this.$data.answerTimer);
        this.setData({ answerTimer: null });
      }

      const nextIndex = this.$data.currentIndex + 1;
      const isLastWord = nextIndex >= this.$data.totalWords;

      if (isLastWord) {
        if (this.$data.isWrongWordMode && this.$data.totalWords > 0) {
          wx.showToast({ title: '已过一轮，继续加油！', icon: 'none', duration: 1500 });
          this.setData({
            currentIndex: 0,
            currentWord: this.$data.wrongWordsList[0] || null,
            hasMadeChoice: false,
            showAnswer: false,
            currentMarkedAsKnow: false
          });
          this._tapLock = false;
          return;
        }
        wx.showToast({ title: '已完成', icon: 'none' });
        return;
      }

      const newWord = this.$data.wrongWordsList[nextIndex];
      this._tapLock = false;
      this.setData({
        currentIndex: nextIndex,
        currentWord: newWord || null,
        hasMadeChoice: false,
        showAnswer: false,
        currentMarkedAsKnow: false
      });
    },

    // 上一个单词
    prevWord() {
      const prevIndex = this.$data.currentIndex - 1;
      if (prevIndex < 0) return;
      this.setData({
        currentIndex: prevIndex,
        currentWord: this.$data.wrongWordsList[prevIndex] || null,
        hasMadeChoice: false,
        showAnswer: false,
        currentMarkedAsKnow: false
      });
    },

    // 打乱顺序，从第一个开始复习
    shuffleWords() {
      if (this.$data.totalWords === 0) return;
      const list = [...this.$data.wrongWordsList];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      if (this.$data.answerTimer) {
        clearTimeout(this.$data.answerTimer);
        this.setData({ answerTimer: null });
      }
      this._tapLock = false;
      this.setData({
        wrongWordsList: list,
        currentIndex: 0,
        currentWord: list[0] || null,
        hasMadeChoice: false,
        showAnswer: false,
        currentMarkedAsKnow: false
      });
      wx.showToast({ title: '已打乱复习顺序', icon: 'success', duration: 1200 });
    },

    // 播放当前单词发音
    playCurrentAudio() {
      if (this.$data.currentWord && this.$data.currentWord.en) {
        this.playWordAudio(this.$data.currentWord.en);
      }
    },

    // 播放单词发音
    playWordAudio(word) {
      if (!word) return;
      if (this.innerAudioContext) {
        try { this.innerAudioContext.stop(); } catch (e) {}
        try { this.innerAudioContext.destroy(); } catch (e) {}
      }
      try {
        const innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext = innerAudioContext;
        innerAudioContext.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
        innerAudioContext.play();
        innerAudioContext.onError((err) => {
          console.error('发音失败:', err);
        });
      } catch (err) {
        console.error('发音加载失败:', err);
      }
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    onUnload() {
      if (this.innerAudioContext) {
        try { this.innerAudioContext.stop(); } catch (e) {}
        try { this.innerAudioContext.destroy(); } catch (e) {}
      }
      if (this.$data.answerTimer) {
        clearTimeout(this.$data.answerTimer);
      }
    },

    goBack() {
      wx.navigateBack();
    }
  });
</script>
