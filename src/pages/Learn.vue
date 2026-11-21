<template>
<div class="learn-container page-learn"><div class="learn-header"><div class="nav-left"><span class="group-text">第{{currentGroup}}组<span class="today-badge"> 已背{{todayLearned}}</span></span></div><div class="nav-right"><button type="button" @click="mp('handleReviewButton', $event)" class="nav-review"><span class="review-text">复习检测</span><span v-if="pendingReviewCount" class="review-badge">{{pendingReviewCount}}</span></button></div></div><div class="words-section"><div class="words-list"><div v-for="(item, index) in currentWords" :key="item.id" @click="mp('handleWordTap', $event)" class="word-card" :data-index="index" :style="&quot;border-color:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><div class="word-main"><span class="word-en">{{item.en}}</span><span v-if="item.clickCount >= 1" class="word-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{item.phonetic}}]</span></div><div :class="&quot;word-info &quot; + (item.clickCount === 2 ? 'show' : 'hide')"><div class="word-part"><span class="part-meaning">{{item.part}} {{item.meaning}}</span></div></div><div class="click-indicator"><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 1 ? 'active' : '')" :style="(item.clickCount >= 1 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 2 ? 'active' : '')" :style="(item.clickCount >= 2 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 3 ? 'active' : '')" :style="(item.clickCount >= 3 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div></div></div></div></div><div class="bottom-controls"><div @click="mp('preGroup', $event)" :class="&quot;btn-control &quot; + (currentGroup <= (dayStartGroup || 1) ? 'disabled' : '')"><span >上一组</span></div><div @click="mp('nextGroup', $event)" :class="&quot;btn-control btn-control--primary &quot; + (!canNext ? 'disabled' : '')"><span >下一组</span></div></div></div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';
import { maybeAutoCheckIn } from '@/utils/checkin';

const GROUP_SIZE = 5;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function uniqueNumbers(list) {
  return Array.from(new Set(
    (Array.isArray(list) ? list : [])
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0)
  )).sort((a, b) => a - b);
}

export default createPage({
  data: {
    currentWords: [],
    currentGroup: 1,
    dayStartGroup: 1,
    dayGroups: [],
    reviewedGroups: [],
    pendingReviewCount: 0,
    canNext: false,
    isLoading: false,
    bookId: '',
    currentBook: {},
    todayLearned: 0,
    groupSize: GROUP_SIZE,
    themeColors: [
      { accent: '#326d43', light: '#e6efe2', progressBg: 'rgba(50,109,67,0.12)' },
      { accent: '#2f6f6a', light: '#e2efed', progressBg: 'rgba(47,111,106,0.10)' },
      { accent: '#a9692c', light: '#f6e9da', progressBg: 'rgba(169,105,44,0.10)' },
      { accent: '#6f5686', light: '#eee7f4', progressBg: 'rgba(111,86,134,0.10)' },
      { accent: '#3c6382', light: '#e6edf2', progressBg: 'rgba(60,99,130,0.10)' }
    ],
    themeIdx: 0,
    lastWordIndex: 0,
    lastGroup: 1
  },

  innerAudioContext: null,

  onLoad: async function (options) {
    const bookId = options.bookId || '';
    if (!bookId) {
      wx.showToast({ title: '未选择单词书', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      bookId: String(bookId),
      currentBook: wx.getStorageSync('currentBook') || {},
      themeIdx: getApp().globalData.cardThemeIndex || 0
    });

    this._entryGroup = parseInt(options.startGroup, 10) || 0;
    this._flushing = false;
    this._touched = false;
    this.setupAudio();
    this.bindPagehide();
    this.loadTodayLearned();
    await this.initProgress();
  },

  onShow: function () {
    const themeIdx = getApp().globalData.cardThemeIndex || 0;
    if (themeIdx !== this.$data.themeIdx) {
      this.setData({ themeIdx });
    }
    this.loadTodayLearned();
    this.tryAutoCheckIn();
  },

  // 今日完成的组数达到「打卡目标」即自动打卡（同一天只记一次）。
  tryAutoCheckIn: async function () {
    if (!this._record) return;
    this.ensureToday();
    const groups = uniqueNumbers(this._record.dayGroups).length;
    const result = await maybeAutoCheckIn({ bookId: this.$data.bookId, groups });
    if (result.checked) {
      wx.showToast({
        title: `今日目标达成，已自动打卡 · 累计 ${result.days} 天`,
        icon: 'none',
        duration: 2500
      });
    }
  },

  setupAudio: function () {
    this.innerAudioContext = wx.createInnerAudioContext();
    this.innerAudioContext.onPlay(() => console.log('audio play'));
    this.innerAudioContext.onStop(() => console.log('audio stop'));
    this.innerAudioContext.onEnded(() => console.log('audio ended'));
  },

  // 学习进度以服务器为准。本地记录只在本机离线/请求失败时兜底。
  initProgress: async function () {
    const { bookId } = this.$data;
    let record = null;
    let serverOk = false;

    try {
      const res = await api.getLearnRecord(bookId);
      if (res && res.code === 200) {
        serverOk = true;
        record = res.data && res.data.learnRecord ? res.data.learnRecord : null;
      }
    } catch (err) {
      console.error('读取学习记录失败:', err);
    }

    if (!serverOk) {
      record = wx.getStorageSync(`learnRecord_${bookId}`) || null;
    }

    const today = dateKey(new Date());
    let isNewDay = false;

    if (!record) {
      const start = this._entryGroup || 1;
      record = {
        day: today,
        lastGroup: start,
        lastWordIndex: 0,
        learnedWords: [],
        dayStartGroup: start,
        dayGroups: [],
        reviewedGroups: []
      };
      isNewDay = true;
    } else {
      record.dayGroups = uniqueNumbers(record.dayGroups);
      record.reviewedGroups = uniqueNumbers(record.reviewedGroups);

      // 服务端返回的记录已经按当天归一化；只有本地兜底记录需要自己判断跨天。
      if (!serverOk && record.day !== today) {
        const start = Math.max(this._entryGroup || 0, Number(record.lastGroup) || 1, 1);
        record = {
          ...record,
          day: today,
          lastGroup: start,
          lastWordIndex: 0,
          learnedWords: [],
          dayStartGroup: start,
          dayGroups: [],
          reviewedGroups: []
        };
        isNewDay = true;
      }
    }

    const resume = Math.max(
      Number(record.lastGroup) || 1,
      Number(record.dayStartGroup) || 1,
      this._entryGroup || 0,
      1
    );
    if (resume > (Number(record.lastGroup) || 1)) {
      record.lastGroup = resume;
    }
    // 今天还没学完任何组时，进入的组就是今天的第一组。
    if (!record.dayGroups.length && resume > (Number(record.dayStartGroup) || 1)) {
      record.dayStartGroup = resume;
    }

    this._record = record;
    this.applyRecordToData(resume);
    this.loadWords(resume);
    this.saveLocalDraft();

    if (isNewDay) {
      await this.saveRecord();
    }
  },

  applyRecordToData: function (group) {
    const record = this._record || {};
    this.setData({
      currentGroup: group,
      lastGroup: Number(record.lastGroup) || group,
      dayStartGroup: Number(record.dayStartGroup) || 1,
      dayGroups: uniqueNumbers(record.dayGroups),
      reviewedGroups: uniqueNumbers(record.reviewedGroups),
      pendingReviewCount: this.getPendingGroups().length
    });
  },

  refreshReviewState: function () {
    const record = this._record || {};
    this.setData({
      dayStartGroup: Number(record.dayStartGroup) || 1,
      dayGroups: uniqueNumbers(record.dayGroups),
      reviewedGroups: uniqueNumbers(record.reviewedGroups),
      lastGroup: Number(record.lastGroup) || this.$data.lastGroup,
      pendingReviewCount: this.getPendingGroups().length
    });
  },

  getPendingGroups: function () {
    const record = this._record || {};
    const reviewed = new Set(uniqueNumbers(record.reviewedGroups));
    return uniqueNumbers(record.dayGroups).filter(group => !reviewed.has(group));
  },

  ensureToday: function () {
    const record = this._record;
    if (!record) return;
    const today = dateKey(new Date());
    if (!record.day || record.day === today) return;

    const start = Number(this.$data.currentGroup) || Number(record.lastGroup) || 1;
    record.day = today;
    record.dayStartGroup = start;
    record.dayGroups = [];
    record.reviewedGroups = [];
    record.lastGroup = Math.max(start, Number(record.lastGroup) || 1);
    this.refreshReviewState();
  },

  loadTodayLearned: async function () {
    const { bookId } = this.$data;
    if (!bookId) return;
    try {
      const res = await api.getBookLearningData(bookId);
      if (res && res.code === 200) {
        const todayLearned = res.data.todayLearned || 0;
        this.setData({ todayLearned });
      }
    } catch (e) {
      // ignore
    }
  },

  playWordAudio: function (word) {
    if (!word) {
      wx.showToast({ title: '单词为空', icon: 'none' });
      return;
    }

    if (this.innerAudioContext) {
      this.innerAudioContext.stop();
    } else {
      this.setupAudio();
    }

    const encodeWord = encodeURIComponent(word.trim());
    const voiceUrl = `https://dict.youdao.com/dictvoice?audio=${encodeWord}&type=1`;

    this.innerAudioContext.src = voiceUrl;
    this.innerAudioContext.play();

    this.innerAudioContext.onError((err) => {
      console.error('audio error:', err);
      wx.showToast({ title: `发音失败: ${err.errMsg}`, icon: 'none', duration: 2000 });
      wx.speechSynthesis({
        lang: 'en_US',
        content: word,
        success: () => console.log('tts ok'),
        fail: (err) => console.error('tts fail:', err)
      });
    });
  },

  loadWords: function (group) {
    this._touched = false;
    this.setData({ isLoading: true });

    this.loadWordsWithState(group).then((realWords) => {
      if (realWords.length > 0) {
        this.setData({
          currentWords: realWords,
          currentGroup: group,
          canNext: realWords.every(word => word.learned),
          isLoading: false
        });
      } else {
        wx.showToast({ title: '该分组暂无单词', icon: 'none' });
        this.useMockWords(group);
      }
      this.afterLoadGroup(group);
    }).catch((err) => {
      console.error('load words failed:', err);
      wx.showToast({ title: '加载失败，使用本地单词', icon: 'none' });
      this.useMockWords(group);
      this.afterLoadGroup(group);
    });
  },

  loadWordsWithState: async function (group) {
    const [realWords, learnedIds] = await Promise.all([
      this.loadWordsFromDB(group),
      this.loadLearnedIds(group)
    ]);
    const learnedSet = new Set(uniqueNumbers(learnedIds));
    return realWords.map(word => {
      const learned = learnedSet.has(Number(word.id));
      return {
        ...word,
        learned,
        clickCount: learned ? 2 : 0
      };
    });
  },

  loadLearnedIds: async function (group) {
    const { bookId } = this.$data;
    try {
      const res = await api.getLearnedWordIds(bookId, group);
      if (res && res.code === 200 && res.data) {
        if (Array.isArray(res.data)) {
          return res.data.map(item => item.wordId || item.id || item);
        }
        if (Array.isArray(res.data.wordIds)) {
          return res.data.wordIds;
        }
      }
    } catch (err) {
      // 服务端不可用时回退到本地缓存
    }

    const cached = wx.getStorageSync(`learnedWords_${bookId}_${group}`) || [];
    return Array.isArray(cached) ? cached.map(word => word.id) : [];
  },

  loadWordsFromDB: function (group) {
    return new Promise(async (resolve, reject) => {
      try {
        const { bookId, groupSize } = this.$data;

        const res = await api.getWordsByBookId({
          bookId: bookId.toString(),
          groupNum: group,
          groupSize: groupSize
        });

        const resultData = res.data || [];
        resolve(resultData.map(word => ({
          id: word.id,
          en: word.word || word.en,
          phonetic: word.phonetic || '',
          part: word.part || word.pos || '',
          meaning: word.meaning || word.translation || '',
          clickCount: 0,
          learned: false
        })));
      } catch (err) {
        reject(err);
      }
    });
  },

  useMockWords: function (group) {
    const mockWords = [
      { id: 1, en: 'favorite', phonetic: '/ˈfeɪvərɪt/', part: 'adj./n.', meaning: '最喜爱的' },
      { id: 2, en: 'foreigner', phonetic: '/ˈfɒrənə(r)/', part: 'n.', meaning: '外国人' },
      { id: 3, en: 'curly', phonetic: '/ˈkɜːrli/', part: 'adj.', meaning: '卷曲的' },
      { id: 4, en: 'subject', phonetic: '/ˈsʌbdʒɪkt/', part: 'n.', meaning: '主题' },
      { id: 5, en: 'drawer', phonetic: '/drɔː(r)/', part: 'n.', meaning: '抽屉' }
    ].map(word => ({ ...word, clickCount: 0, learned: false }));

    this.setData({
      currentWords: mockWords,
      currentGroup: group,
      canNext: false,
      isLoading: false
    });
  },

  afterLoadGroup: function (group) {
    const record = this._record;
    if (record && group > (Number(record.lastGroup) || 1)) {
      record.lastGroup = group;
    }
    this.setData({
      lastGroup: Math.max(Number(this.$data.lastGroup) || 1, group)
    });
    this.saveLocalDraft();
  },

  checkCanNext: function () {
    const { currentWords } = this.$data;
    this.setData({
      canNext: currentWords.length > 0 && currentWords.every(word => word.learned)
    });
  },

  isGroupComplete: function () {
    const { currentWords } = this.$data;
    return currentWords.length > 0 && currentWords.every(word => word.learned);
  },

  handleWordTap: function (e) {
    const index = e.currentTarget.dataset.index;
    const currentWords = this.$data.currentWords;
    const currentWord = currentWords[index];

    if (!currentWord) return;

    this._touched = true;

    if (currentWord.en) {
      this.playWordAudio(currentWord.en);
    }

    // 点击循环：1 看音标 → 2 看释义（算学完）→ 3 → 回到 1。
    // 学完状态只增不减：点满两次后即使循环回 1，仍算学过并进入复习检测。
    let nextClickCount = (currentWord.clickCount || 0) + 1;
    if (nextClickCount > 3) {
      nextClickCount = 1;
    }
    currentWord.clickCount = nextClickCount;
    if (nextClickCount >= 2) {
      currentWord.learned = true;
    }

    this.setData({
      currentWords,
      lastWordIndex: index
    });

    this.checkCanNext();

    // 本组刚学完就先计入「今日待复习」，服务器落盘仍等到下一组/退出时。
    if (this.isGroupComplete() && this._record) {
      this._record.dayGroups = uniqueNumbers([
        ...(this._record.dayGroups || []),
        this.$data.currentGroup
      ]);
      this.refreshReviewState();
      this.tryAutoCheckIn();
    }

    this.saveLocalDraft();
  },

  nextGroup: async function () {
    if (!this.$data.canNext) {
      wx.showToast({ title: '请先点开本组所有单词的释义', icon: 'none' });
      return;
    }

    const group = this.$data.currentGroup;
    const totalWords = Number(this.$data.currentBook.totalWords) || 0;
    const totalGroups = totalWords > 0
      ? Math.ceil(totalWords / (this.$data.groupSize || GROUP_SIZE))
      : 0;
    const isLastGroup = totalGroups > 0 && group >= totalGroups;

    await this.persistGroup(group, {
      completed: this.isGroupComplete() && this._touched,
      advance: !isLastGroup
    });

    if (isLastGroup) {
      wx.showToast({ title: '已经是最后一组', icon: 'none' });
      return;
    }

    this.loadWords(group + 1);
  },

  preGroup: async function () {
    const min = Number(this.$data.dayStartGroup) || 1;
    if (this.$data.currentGroup <= min) {
      wx.showToast({ title: `今天从第${min}组开始`, icon: 'none' });
      return;
    }

    if (this._touched) {
      await this.persistGroup(this.$data.currentGroup, {
        completed: this.isGroupComplete(),
        advance: false
      });
    }
    this.loadWords(this.$data.currentGroup - 1);
  },

  // 一组学完后统一保存：组单词、今日区间、续学位置一次上传。
  persistGroup: async function (group, options = {}) {
    const { completed = false, advance = false, keepalive = false } = options;
    const bookId = this.$data.bookId;

    this.ensureToday();
    const record = this._record || {};
    const words = group === this.$data.currentGroup
      ? (this.$data.currentWords || []).filter(word => word.learned)
      : [];

    if (!words.length) {
      if (advance) {
        record.lastGroup = Math.max(Number(record.lastGroup) || 1, group + 1);
        this._record = record;
        await this.saveRecord({ keepalive });
      }
      return;
    }

    const ids = uniqueNumbers(words.map(word => word.id));

    this.appendLocalGroupWords(group, words);

    if (completed) {
      record.dayGroups = uniqueNumbers([...(record.dayGroups || []), group]);
    }
    record.lastGroup = advance
      ? Math.max(Number(record.lastGroup) || 1, group + 1)
      : Math.max(Number(record.lastGroup) || 1, group);
    record.lastWordIndex = 0;
    record.learnedWords = ids;
    record.day = dateKey(new Date());
    this._record = record;

    this.refreshReviewState();
    this.saveLocalDraft();

    const tasks = [
      api.saveLearnedWords(bookId, group, ids, { keepalive }).catch(err => {
        console.error('保存本组单词失败:', err);
      }),
      this.saveRecord({ keepalive })
    ];
    await Promise.all(tasks);

    if (!keepalive) {
      await this.loadTodayLearned();
    }
  },

  appendLocalGroupWords: function (group, words) {
    const { bookId } = this.$data;
    const fullWords = (this.$data.currentWords || [])
      .filter(word => word.learned)
      .map(word => ({ ...word, clickCount: 2 }));

    wx.setStorageSync(`learnedWords_${bookId}_${group}`, fullWords);

    const today = dateKey(new Date());
    const key = `dailyLearnedWords_${bookId}_${today}`;
    const oldWords = wx.getStorageSync(key) || [];
    const merged = new Map();
    [...(Array.isArray(oldWords) ? oldWords : []), ...fullWords].forEach(word => {
      if (word && word.id != null) merged.set(word.id, word);
    });
    wx.setStorageSync(key, Array.from(merged.values()));
  },

  saveRecord: async function (options = {}) {
    const record = this._record;
    if (!record) return;

    record.day = dateKey(new Date());
    wx.setStorageSync(`learnRecord_${this.$data.bookId}`, record);

    try {
      const res = await api.saveLearnRecord(this.$data.bookId, record, options);
      const saved = res && res.data && (res.data.learnRecord || res.data);
      if (saved && saved.day) {
        this._record = saved;
        this.refreshReviewState();
      }
    } catch (err) {
      console.error('保存学习记录失败:', err);
    }
  },

  saveLocalDraft: function () {
    const record = this._record;
    if (!record) return;

    wx.setStorageSync(`learnRecord_${this.$data.bookId}`, {
      ...record,
      currentGroup: this.$data.currentGroup,
      learnedWordIds: (this.$data.currentWords || [])
        .filter(word => word.learned)
        .map(word => word.id),
      savedAt: Date.now()
    });
  },

  handleReviewButton: async function () {
    if (this.$data.isLoading) return;

    this.ensureToday();
    const group = this.$data.currentGroup;
    const complete = this.isGroupComplete();
    const completedToday = complete && this._touched;

    if (completedToday) {
      const record = this._record || {};
      record.dayGroups = uniqueNumbers([...(record.dayGroups || []), group]);
      this._record = record;
      this.refreshReviewState();
    }

    const currentHasLearned = (this.$data.currentWords || []).some(word => word.learned);

    if (currentHasLearned) {
      await this.persistGroup(group, { completed: completedToday, advance: false });
    } else if (completedToday) {
      await this.saveRecord();
    }

    const pending = this.getPendingGroups();

    // 今日全部学过的组，供复习页的「全盘复习」使用（包含已复习过的组）。
    const allGroups = uniqueNumbers([
      ...((this._record && this._record.dayGroups) || []),
      ...(this._touched && currentHasLearned ? [group] : [])
    ]);
    const dailyKey = `dailyLearnedWords_${this.$data.bookId}_${dateKey(new Date())}`;
    const dailyWords = wx.getStorageSync(dailyKey) || [];
    const allWordCount = Array.isArray(dailyWords) ? dailyWords.length : 0;
    const fullGroups = allGroups.length ? allGroups : pending;
    const that = this;

    // 没有待复习组时，仍允许进入页面做「全盘复习」。
    if (!pending.length) {
      if (!allGroups.length) {
        wx.showToast({ title: '今天还没有学完的组', icon: 'none' });
        return;
      }

      wx.showModal({
        title: '全盘复习',
        content: '今天没有待复习组了，是否把今天学过的所有单词加入复习？',
        success(res) {
          if (!res.confirm) return;
          that.saveLocalDraft();
          wx.navigateTo({
            url: `/pages/review/review?bookId=${that.$data.bookId}&groups=&allGroups=${allGroups.join(',')}&allWordCount=${allWordCount}`,
            fail: (err) => {
              console.error('nav to review failed:', err);
              wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
            }
          });
        }
      });
      return;
    }

    wx.showModal({
      title: '复习检测',
      content: `将复习今天第 ${pending.join('、')} 组，共 ${pending.length} 组，确认吗？`,
      success(res) {
        if (!res.confirm) return;
        that.saveLocalDraft();
        wx.navigateTo({
          url: `/pages/review/review?bookId=${that.$data.bookId}&groups=${pending.join(',')}&allGroups=${fullGroups.join(',')}&allWordCount=${allWordCount}`,
          fail: (err) => {
            console.error('nav to review failed:', err);
            wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
          }
        });
      }
    });
  },

  flushProgress: async function (keepalive = false) {
    if (!this._record || this._flushing) return;
    this._flushing = true;

    try {
      if (!this._touched) {
        this.saveLocalDraft();
        return;
      }

      const group = this.$data.currentGroup;
      const words = (this.$data.currentWords || []).filter(word => word.learned);

      if (words.length) {
        await this.persistGroup(group, {
          completed: this.isGroupComplete(),
          advance: false,
          keepalive
        });
      } else {
        this.saveLocalDraft();
        await this.saveRecord({ keepalive });
      }
    } finally {
      this._flushing = false;
    }
  },

  bindPagehide: function () {
    if (typeof window === 'undefined') return;
    this._onPagehide = () => {
      this.saveLocalDraft();
      this.flushProgress(true);
    };
    window.addEventListener('pagehide', this._onPagehide);
  },

  unbindPagehide: function () {
    if (typeof window !== 'undefined' && this._onPagehide) {
      window.removeEventListener('pagehide', this._onPagehide);
      this._onPagehide = null;
    }
  },

  onHide: function () {
    this.flushProgress();
  },

  onUnload: function () {
    this.flushProgress();
    this.unbindPagehide();
    if (this.innerAudioContext) {
      try {
        this.innerAudioContext.stop();
        this.innerAudioContext.destroy();
        this.innerAudioContext = null;
      } catch (err) {
        console.error('destroy audio failed:', err);
      }
    }
  }
});
</script>
