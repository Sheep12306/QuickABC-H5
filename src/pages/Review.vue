<template>
<div class="review-container page-review"><div class="review-top"><span class="review-title">{{mixTitle}}</span><span class="review-subtitle">{{masteredCount || 0}}/{{totalWords || 0}}</span><div class="top-spacer"></div><button type="button" @click="mp('shuffleWords', $event)" class="nav-shuffle" aria-label="打乱顺序" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><AppIcon name="refresh" class="shuffle-icon" /><span class="shuffle-label">打乱顺序</span></button></div><div class="word-area"><div v-if="currentWord" class="word-main"><div class="word-display"><span class="word-en">{{currentWord.en}}</span><div class="word-meta"><span class="word-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{currentWord.phonetic}}]</span><div @click="mp('playCurrentAudio', $event)" class="audio-icon" :style="&quot;background:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><AppIcon name="volume" class="audio-glyph" /></div></div></div><div :class="&quot;answer-area &quot; + (showAnswer ? 'show' : 'hide')"><div class="meaning-text">{{currentWord.part}} {{currentWord.meaning}}</div><div v-if="showAnswer && currentMarkedAsKnow" @click="mp('correctToDontKnow', $event)" class="correct-btn"><span >更正为不认识</span></div></div><div v-if="!hasMadeChoice" class="action-buttons"><div @click="mp('markDontKnow', $event)" class="btn-action btn-dont-know"><span >不认识</span></div><div @click="mp('markKnow', $event)" class="btn-action btn-know" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span >认识</span></div></div><div v-if="hasMadeChoice && (currentIndex < (reviewWords || []).length - 1 || tempUnknowWords.length > 0)" class="next-btn-area"><div @click="mp('nextWord', $event)" class="btn-next" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"><span >下一个</span></div></div></div><div v-else class="empty-tip"><AppIcon name="book-open" class="empty-state-icon" /><span>暂无复习单词</span></div></div><div class="stats-section"><div class="stats-row"><div class="stat-item"><span class="stat-value">{{knowCount || 0}}</span><span class="stat-label">已掌握</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-value">{{dontKnowCount || 0}}</span><span class="stat-label">需复习</span></div><div class="stat-divider"></div><div @click="mp('oneClickAllReview', $event)" class="stat-item stat-item--action"><span class="stat-value">{{allWordCount || mixReviewTotal || 0}}</span><span class="stat-label">全盘复习</span></div></div></div></div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';

function parseGroups(value) {
  if (!value) return [];
  return Array.from(new Set(
    String(value)
      .split(',')
      .map(item => parseInt(item, 10))
      .filter(item => Number.isInteger(item) && item > 0)
  )).sort((a, b) => a - b);
}

function uniqueNumbers(list) {
  return Array.from(new Set(
    (Array.isArray(list) ? list : [])
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0)
  )).sort((a, b) => a - b);
}

function wordKey(word) {
  if (!word) return '';
  return word.id != null ? `id:${word.id}` : `en:${word.en || ''}`;
}

function todayKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default createPage({
  data: {
    mixTitle: '',
    currentWord: null,
    currentIndex: 0,
    reviewWords: [],
    originGroupWords: [],
    allWords: [],
    tempUnknowWords: [],
    totalWords: 0,
    todayIndex: 1,
    learnedGroupList: [],
    selectedMixGroups: [],
    showMixPicker: false,
    bookId: 1,
    knowCount: 0,
    dontKnowCount: 0,
    masteredCount: 0,
    showAnswer: false,
    answerTimer: null,
    hasMadeChoice: false,
    currentMarkedAsKnow: false,
    currentGroup: 1,
    selectedGroups: [],
    mixReviewTotal: 0,
    mixGroupCount: 1,
    todayGroupList: [],
    allWordCount: 0,
    isLoading: false,
    themeColors: [
      { accent: '#326d43', light: '#e6efe2' },
      { accent: '#2f6f6a', light: '#e2efed' },
      { accent: '#a9692c', light: '#f6e9da' },
      { accent: '#6f5686', light: '#eee7f4' },
      { accent: '#3c6382', light: '#e6edf2' }
    ],
    themeIdx: 0,
    remainingCount: 1,
    reviewedGroups: []
  },

  onLoad: function (options) {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });

    const bookId = options.bookId ? parseInt(options.bookId) : 1;
    const group = options.group ? parseInt(options.group) : 1;
    const todayIndex = options.todayIndex ? parseInt(options.todayIndex) : 1;
    const safeTodayIndex = todayIndex === 0 ? 1 : todayIndex;
    const groups = parseGroups(options.groups);
    const allGroups = parseGroups(options.allGroups);
    const learnedGroupList = groups.length
      ? groups
      : (allGroups.length
        ? []
        : (options.learnedGroupList ? JSON.parse(options.learnedGroupList) : [safeTodayIndex]));
    const todayGroupList = allGroups.length ? allGroups : learnedGroupList;
    let allWordCount = parseInt(options.allWordCount, 10) || 0;

    if (!allWordCount) {
      const dailyWords = wx.getStorageSync(`dailyLearnedWords_${bookId}_${todayKey()}`) || [];
      allWordCount = Array.isArray(dailyWords) ? dailyWords.length : 0;
    }

    this._reviewedSet = new Set();
    this._completed = false;
    this._tapLock = false;
    this._lastMarkPromise = null;
    this._fullReviewLoading = false;

    this.setData({
      bookId,
      currentGroup: group,
      selectedGroups: [group],
      todayIndex: safeTodayIndex,
      learnedGroupList,
      todayGroupList,
      allWordCount,
      isLoading: true,
      remainingCount: 1
    });

    if (groups.length) {
      this.loadGroupsFromServer(bookId, groups);
    } else if (allGroups.length) {
      // 今天的组都已复习：页面先留空，由「全盘复习」按钮加载今日全部单词。
      this.setWords([], [], true);
    } else if (options.words) {
      this.loadWordsFromParam(options.words, group);
    } else {
      this.loadFullGroupWords(bookId, group);
    }

    this.updateMixTitle();
  },

  // 按组取单词：优先服务器，缺组时回退本地缓存。
  fetchGroupWords: async function (bookId, groups) {
    const localWords = (group) => {
      const cached = wx.getStorageSync(`learnedWords_${bookId}_${group}`) || [];
      return (Array.isArray(cached) ? cached : []).map(word => ({
        ...word,
        belongGroup: group
      }));
    };

    const words = [];
    const seen = new Set();
    const push = (word, group) => {
      if (!word || (!word.en && !word.word)) return;
      const key = wordKey(word);
      if (seen.has(key)) return;
      seen.add(key);
      words.push({ ...word, belongGroup: Number(word.belongGroup || group) });
    };

    try {
      const res = await api.getReviewWords(bookId, groups);
      const groupList = res && res.code === 200 && res.data && Array.isArray(res.data.groups)
        ? res.data.groups
        : [];

      groups.forEach(group => {
        const remote = groupList.find(item => Number(item.groupNum) === Number(group));
        if (remote && Array.isArray(remote.words) && remote.words.length) {
          remote.words.forEach(word => push(word, group));
        } else {
          localWords(group).forEach(word => push(word, group));
        }
      });
    } catch (err) {
      console.error('加载复习单词失败，尝试本地缓存:', err);
      groups.forEach(group => {
        localWords(group).forEach(word => push(word, group));
      });
    }

    return words;
  },

  // 今日待复习组：只加载今天还没复习过的组。
  loadGroupsFromServer: async function (bookId, groups) {
    const words = await this.fetchGroupWords(bookId, groups);
    this.setWords(words, groups);
  },

  loadWordsFromParam: function (wordsParam, group) {
    try {
      const parsed = JSON.parse(decodeURIComponent(wordsParam));
      this.setWords(parsed, [group]);
    } catch (err) {
      console.error('解析复习数据失败:', err);
      this.setWords([], [group]);
    }
  },

  normalizeWord: function (word, group) {
    return {
      id: word.id || word._id,
      en: word.en || word.word || '',
      phonetic: word.phonetic || '',
      part: word.part || '',
      meaning: word.meaning || word.translation || '',
      consecutiveKnowCount: 0,
      lastStatus: 'unknown',
      belongGroup: Number(word.belongGroup || group) || 1,
      clickCount: word.clickCount || 0
    };
  },

  setWords: function (words, groups, silent) {
    const normalized = (Array.isArray(words) ? words : [])
      .filter(word => word && (word.en || word.word))
      .map(word => this.normalizeWord(word, groups[0]));

    if (!normalized.length) {
      this.setData({
        originGroupWords: [],
        reviewWords: [],
        allWords: [],
        totalWords: 0,
        currentWord: null,
        knowCount: 0,
        dontKnowCount: 0,
        masteredCount: 0,
        mixReviewTotal: 0,
        isLoading: false
      });
      if (!silent) {
        wx.showToast({ title: '暂无待复习单词', icon: 'none' });
      }
      return;
    }

    this.setData({
      originGroupWords: normalized.map(word => ({ ...word })),
      reviewWords: normalized.map(word => ({ ...word })),
      allWords: normalized.map(word => ({ ...word })),
      totalWords: normalized.length,
      currentIndex: 0,
      currentWord: null,
      knowCount: 0,
      dontKnowCount: normalized.length,
      masteredCount: 0,
      tempUnknowWords: [],
      showAnswer: false,
      hasMadeChoice: false,
      currentMarkedAsKnow: false,
      mixGroupCount: groups.length,
      mixReviewTotal: normalized.length,
      allWordCount: this.$data.allWordCount || normalized.length,
      isLoading: false
    }, () => {
      this.setData({ currentWord: this.$data.reviewWords[0] || null });
    });

    this.updateMixTitle();
  },

  updateMixTitle: function () {
    const groups = uniqueNumbers(this.$data.learnedGroupList);
    let mixTitle = '复习检测';

    if (groups.length > 1) {
      const continuous = groups[groups.length - 1] - groups[0] + 1 === groups.length;
      mixTitle = continuous
        ? `第${groups[0]}–${groups[groups.length - 1]}组复习`
        : `第${groups.join('、')}组复习`;
    } else if (groups.length === 1) {
      mixTitle = `第${groups[0]}组复习`;
    }

    this.setData({ mixTitle });
  },

  getGroups: function () {
    const groups = uniqueNumbers(this.$data.learnedGroupList);
    if (groups.length) return groups;
    return uniqueNumbers((this.$data.allWords || []).map(word => word.belongGroup));
  },

  getWordStreak: function (word) {
    const key = wordKey(word);
    const target = (this.$data.allWords || []).find(item => wordKey(item) === key);
    return target ? (target.consecutiveKnowCount || 0) : 0;
  },

  calcStats: function () {
    const allWords = this.$data.allWords || [];
    const mastered = allWords.filter(word => (word.consecutiveKnowCount || 0) >= 2).length;
    this.setData({
      knowCount: mastered,
      dontKnowCount: Math.max(0, allWords.length - mastered),
      masteredCount: mastered
    });
  },

  updateWordStatus: function (status) {
    const allWords = [...this.$data.allWords];
    const reviewWords = [...this.$data.reviewWords];
    const currentWord = reviewWords[this.$data.currentIndex];
    if (!currentWord) return;

    const key = wordKey(currentWord);
    const wordInAll = allWords.find(word => wordKey(word) === key);
    if (!wordInAll) return;

    if (status === 'know') {
      wordInAll.consecutiveKnowCount = (wordInAll.consecutiveKnowCount || 0) + 1;
      wordInAll.lastStatus = 'know';
    } else {
      wordInAll.consecutiveKnowCount = 0;
      wordInAll.lastStatus = 'dontKnow';
    }

    this.setData({ allWords, reviewWords }, () => {
      this.calcStats();
      this.checkReviewCompletion();
    });
  },

  // 认识：连续两次才算掌握；第一次认识后重新排队，等待第二次确认。
  markKnow: function () {
    if (!this.$data.currentWord || this.$data.hasMadeChoice || this._tapLock) return;
    this._tapLock = true;

    this.setData({
      showAnswer: true,
      hasMadeChoice: true,
      currentMarkedAsKnow: true
    }, () => {
      this.playCurrentAudio();
    });

    const currentWord = this.$data.currentWord;
    this.updateWordStatus('know');

    if (this.getWordStreak(currentWord) < 2) {
      this.addToTempUnknowWords(currentWord);
    }

    this.setData({
      answerTimer: setTimeout(() => this.nextWord(), 2000)
    });
  },

  // 不认识：连续次数清零，重新排队。
  markDontKnow: function () {
    if (!this.$data.currentWord || this.$data.hasMadeChoice || this._tapLock) return;
    this._tapLock = true;

    const currentWord = this.$data.currentWord;

    this.setData({
      showAnswer: true,
      hasMadeChoice: true,
      currentMarkedAsKnow: false
    }, () => {
      this.playCurrentAudio();
    });

    this.updateWordStatus('dontKnow');
    this.addToTempUnknowWords(currentWord);
    this.saveWrongWordToLocal(currentWord);

    api.addWrongWord(currentWord).then(res => {
      console.log('wrong word saved:', res);
    }).catch(err => {
      console.error('wrong word save failed:', err);
    });

    this.setData({
      answerTimer: setTimeout(() => this.nextWord(), 2000)
    });
  },

  correctToDontKnow: function () {
    if (!this.$data.currentWord) return;
    if (this.$data.answerTimer) {
      clearTimeout(this.$data.answerTimer);
      this.setData({ answerTimer: null });
    }

    this.updateWordStatus('dontKnow');
    this.addToTempUnknowWords(this.$data.currentWord);
    this.saveWrongWordToLocal(this.$data.currentWord);

    this.setData({
      currentMarkedAsKnow: false
    });
  },

  saveWrongWordToLocal: function (word) {
    try {
      if (!word || !word.en) return;

      let wrongWords = wx.getStorageSync('wrong_words') || [];
      if (!Array.isArray(wrongWords)) wrongWords = [];
      if (wrongWords.some(item => item.en === word.en)) return;

      wrongWords.push({
        en: word.en || '',
        phonetic: word.phonetic || '',
        part: word.part || '',
        meaning: word.meaning || '',
        addTime: new Date().getTime()
      });
      wx.setStorageSync('wrong_words', wrongWords);
    } catch (err) {
      console.error('本地缓存记录错词失败:', err);
    }
  },

  addToTempUnknowWords: function (word) {
    const tempUnknowWords = this.$data.tempUnknowWords || [];
    const key = wordKey(word);
    if (!tempUnknowWords.some(item => wordKey(item) === key)) {
      tempUnknowWords.push({ ...word });
      this.setData({ tempUnknowWords });
    }
  },

  nextWord: function () {
    if (this._completed) return;

    const { currentIndex, reviewWords, tempUnknowWords } = this.$data;
    if (this.$data.answerTimer) {
      clearTimeout(this.$data.answerTimer);
      this.setData({ answerTimer: null });
    }

    const currentWord = reviewWords[currentIndex];
    if (currentWord) {
      this.checkGroupCompletion(currentWord.belongGroup);
    }

    if (currentIndex < reviewWords.length - 1) {
      this.goToWord(currentIndex + 1);
    } else if (tempUnknowWords.length > 0) {
      const newReviewWords = [...reviewWords, ...tempUnknowWords];
      this.setData({
        reviewWords: newReviewWords,
        tempUnknowWords: []
      }, () => {
        this.goToWord(currentIndex + 1);
      });
    } else {
      this.checkReviewCompletion();
    }
  },

  goToWord: function (index) {
    if (this._completed) return;
    this._tapLock = false;
    this.setData({
      currentWord: this.$data.reviewWords[index],
      currentIndex: index,
      showAnswer: false,
      hasMadeChoice: false,
      currentMarkedAsKnow: false
    });
  },

  checkGroupCompletion: function (group) {
    const target = Number(group);
    const words = (this.$data.allWords || []).filter(word => Number(word.belongGroup) === target);
    if (words.length && words.every(word => (word.consecutiveKnowCount || 0) >= 2)) {
      this.markGroupsAsReviewed([target]);
    }
  },

  markGroupsAsReviewed: function (groups) {
    if (!this._reviewedSet) this._reviewedSet = new Set();
    const next = uniqueNumbers(groups).filter(group => !this._reviewedSet.has(group));
    if (!next.length) return this._lastMarkPromise;

    next.forEach(group => this._reviewedSet.add(group));
    this.setData({ reviewedGroups: Array.from(this._reviewedSet).sort((a, b) => a - b) });

    // 每次上报全部已复习组，前面某次请求失败时后续会自动补上。
    this._lastMarkPromise = api.markGroupsReviewed(
      this.$data.bookId,
      Array.from(this._reviewedSet).sort((a, b) => a - b)
    ).catch(err => {
      console.error('同步复习状态失败:', err);
    });
    return this._lastMarkPromise;
  },

  checkReviewCompletion: function () {
    if (this._completed) return;

    const allWords = this.$data.allWords || [];
    const allMastered = allWords.length > 0
      && allWords.every(word => (word.consecutiveKnowCount || 0) >= 2);
    if (!allMastered || (this.$data.tempUnknowWords || []).length > 0) return;

    this._completed = true;

    // 只标记本次真正加载到单词的组，避免某个组取词失败也被当成已复习。
    const loadedGroups = uniqueNumbers(allWords.map(word => word.belongGroup));

    // 尽量等复习状态写完再返回；网络慢时也不让用户干等。
    const sync = Promise.resolve(this.markGroupsAsReviewed(loadedGroups)).catch(() => {});
    const timeout = new Promise(resolve => setTimeout(resolve, 1200));

    Promise.race([sync, timeout]).finally(() => {
      // 期间如果点了「全盘复习」加入新单词，就取消这次自动返回。
      if (!this._completed) return;
      wx.showToast({ title: '今日复习完成', icon: 'success', duration: 1500 });
      this._backTimer = setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1500);
    });
  },

  // 全盘复习：把今天学过的所有组（含已复习过的组）加入当前复习队列。
  oneClickAllReview: async function () {
    if (this._fullReviewLoading) return;
    if (this.$data.isLoading) {
      wx.showToast({ title: '正在加载复习单词', icon: 'none' });
      return;
    }

    const bookId = this.$data.bookId;
    const todayGroups = uniqueNumbers(this.$data.todayGroupList);
    if (!todayGroups.length) {
      wx.showToast({ title: '今天还没有学过的单词', icon: 'none' });
      return;
    }

    this._fullReviewLoading = true;
    wx.showLoading({ title: '加载今日单词' });

    try {
      const fetched = await this.fetchGroupWords(bookId, todayGroups);
      if (!fetched.length) {
        wx.showToast({ title: '没有可加入的单词', icon: 'none' });
        return;
      }

      const existingKeys = new Set((this.$data.allWords || []).map(wordKey));
      const newWords = [];
      fetched.forEach(word => {
        const normalized = this.normalizeWord(word, word.belongGroup || todayGroups[0]);
        const key = wordKey(normalized);
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        newWords.push(normalized);
      });

      if (!newWords.length) {
        wx.showToast({ title: '今天学过的单词都已在复习里', icon: 'none' });
        return;
      }

      const allWords = [...this.$data.allWords, ...newWords.map(word => ({ ...word }))];
      const reviewWords = [...this.$data.reviewWords, ...newWords.map(word => ({ ...word }))];
      const originWords = [...this.$data.originGroupWords, ...newWords.map(word => ({ ...word }))];
      const mastered = allWords.filter(word => (word.consecutiveKnowCount || 0) >= 2).length;

      if (this._backTimer) {
        clearTimeout(this._backTimer);
        this._backTimer = null;
      }
      this._completed = false;

      const patch = {
        allWords,
        reviewWords,
        originGroupWords: originWords,
        totalWords: allWords.length,
        knowCount: mastered,
        dontKnowCount: Math.max(0, allWords.length - mastered),
        masteredCount: mastered,
        mixReviewTotal: allWords.length,
        allWordCount: allWords.length,
        learnedGroupList: uniqueNumbers([...(this.$data.learnedGroupList || []), ...todayGroups]),
        mixTitle: '今日全盘复习'
      };

      // 从「今天已全部复习」的空页面进入全盘复习时，初始化第一个单词。
      if (!this.$data.currentWord) {
        this._tapLock = false;
        patch.currentIndex = 0;
        patch.currentWord = reviewWords[0] || null;
        patch.showAnswer = false;
        patch.hasMadeChoice = false;
        patch.currentMarkedAsKnow = false;
      }

      this.setData(patch);

      wx.showToast({ title: `已加入 ${newWords.length} 个今日单词`, icon: 'none' });
    } catch (err) {
      console.error('全盘复习加载失败:', err);
      wx.showToast({ title: '加载今日单词失败', icon: 'none' });
    } finally {
      this._fullReviewLoading = false;
      wx.hideLoading();
    }
  },

  loadFullGroupWords: async function (bookId, group) {
    const originWords = await this.getWordsFromDB(bookId, group);
    this.setWords(originWords, [group]);
  },

  getWordsFromDB: async function (bookId, group) {
    try {
      const resRecord = await api.getLearnedWordIds(bookId, group);
      const learnedWordIds = resRecord && resRecord.code === 200 && resRecord.data
        ? (resRecord.data.wordIds || [])
        : [];
      if (!learnedWordIds.length) return [];

      const resWords = await api.getWordsByIds(learnedWordIds);
      if (resWords && resWords.code === 200 && Array.isArray(resWords.data)) {
        return resWords.data.map(word => ({
          id: word.id,
          en: word.word || word.en,
          phonetic: word.phonetic || '',
          part: word.part || '',
          meaning: word.meaning || word.translation || '',
          belongGroup: group
        }));
      }
      return [];
    } catch (err) {
      console.error('查询复习单词失败:', err);
      return [];
    }
  },

  playWordAudio: function (word) {
    if (!word) return;

    if (this.innerAudioContext) {
      this.innerAudioContext.stop();
    }
    this.innerAudioContext = wx.createInnerAudioContext();

    const voiceUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    this.innerAudioContext.src = voiceUrl;
    this.innerAudioContext.play();

    this.innerAudioContext.onError((err) => {
      console.log('发音失败:', err);
      wx.showToast({ title: '发音失败', icon: 'none' });
    });
  },

  playCurrentAudio: function () {
    if (this.$data.currentWord && this.$data.currentWord.en) {
      this.playWordAudio(this.$data.currentWord.en);
    }
  },

  shuffleWords: function () {
    if (this.$data.answerTimer) {
      clearTimeout(this.$data.answerTimer);
    }
    this._tapLock = false;

    const reviewWords = [...this.$data.reviewWords];
    for (let i = reviewWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviewWords[i], reviewWords[j]] = [reviewWords[j], reviewWords[i]];
    }
    this.setData({
      reviewWords,
      currentWord: reviewWords[0] || null,
      currentIndex: 0,
      showAnswer: false,
      hasMadeChoice: false,
      currentMarkedAsKnow: false,
      answerTimer: null
    });
    wx.showToast({ title: '已打乱顺序', icon: 'success' });
  },

  prevWord: function () {
    if (this.$data.currentIndex > 0) {
      if (this.$data.answerTimer) clearTimeout(this.$data.answerTimer);
      this.goToWord(this.$data.currentIndex - 1);
    }
  },

  goBack: function () {
    this.getGroups().forEach(group => this.checkGroupCompletion(group));
    wx.navigateBack();
  },

  onShow: function () {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
  },

  onUnload: function () {
    if (this.$data.answerTimer) {
      clearTimeout(this.$data.answerTimer);
    }
    if (this._backTimer) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
    }
    if (this.innerAudioContext) {
      try { this.innerAudioContext.stop(); } catch (e) {}
      try { this.innerAudioContext.destroy(); } catch (e) {}
      this.innerAudioContext = null;
    }
  }
});
</script>
