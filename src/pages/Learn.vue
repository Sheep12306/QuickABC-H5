<template>
<div class="learn-container page-learn"><div class="learn-header"><div class="nav-left"><span class="group-text">第{{currentGroup}}组<span class="today-badge"> 已背{{todayLearned}}</span></span></div><div class="nav-right"><button type="button" @click="mp('handleReviewButton', $event)" class="nav-review"><span class="review-text">复习检测</span><span v-if="pendingReviewCount" class="review-badge">{{pendingReviewCount}}</span></button></div></div><div v-if="lessonActive" class="lesson-bar" :class="{ 'lesson-bar--expired': lessonRemainingSec <= 0 }"><AppIcon name="clock" class="lesson-bar-icon" /><span class="lesson-bar-label">{{ lessonRemainingSec > 0 ? '本课时剩余' : '本课时' }}</span><span class="lesson-bar-time">{{ lessonRemainingSec > 0 ? lessonRemainingText : '已结束' }}</span><span class="lesson-bar-credit">{{ lessonHours }} 课时</span></div><div class="words-section"><div class="words-list"><div v-for="(item, index) in currentWords" :key="item.id" @click="mp('handleWordTap', $event)" class="word-card" :data-index="index" :style="&quot;border-color:&quot; + (themeColors[themeIdx].light) + &quot;;&quot;"><div class="word-main"><span class="word-en">{{item.en}}</span><span v-if="item.clickCount >= 1" class="word-phonetic" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">[{{item.phonetic}}]</span></div><div :class="&quot;word-info &quot; + (item.clickCount === 2 ? 'show' : 'hide')"><div class="word-part"><span class="part-meaning">{{item.part}} {{item.meaning}}</span></div></div><div class="click-indicator"><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 1 ? 'active' : '')" :style="(item.clickCount >= 1 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 2 ? 'active' : '')" :style="(item.clickCount >= 2 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div><div :class="&quot;indicator-dot &quot; + (item.clickCount >= 3 ? 'active' : '')" :style="(item.clickCount >= 3 ? 'background:' + themeColors[themeIdx].accent + ';' : '')"></div></div></div></div></div><div class="bottom-controls"><div @click="mp('preGroup', $event)" :class="&quot;btn-control &quot; + (currentGroup <= (dayStartGroup || 1) ? 'disabled' : '')"><span >上一组</span></div><div @click="mp('nextGroup', $event)" :class="&quot;btn-control btn-control--primary &quot; + (!canNext ? 'disabled' : '')"><span >下一组</span></div></div></div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';
import { clearBackGuard, setBackGuard } from '@/mp/nav';
import { maybeAutoCheckIn } from '@/utils/checkin';
import {
  clearLessonSession,
  formatLessonClock,
  readActiveLessonSession,
  saveLessonSession,
  sessionFromServer,
  setStoredLessonHours
} from '@/utils/lesson';

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
    lastGroup: 1,

    // 课时计时
    lessonActive: false,
    lessonHours: 0,
    lessonMinutes: 0,
    lessonRemainingSec: 0,
    lessonRemainingText: ''
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
    this._teacherCode = String(options.teacherCode || '').trim().slice(0, 20);
    this._flushing = false;
    this._touched = false;
    this.setupAudio();
    this.bindPagehide();
    this.registerLessonBackGuard();
    this.loadTodayLearned();

    const requestedHours = parseInt(options.lessonHours, 10) || 0;
    const lessonReady = await this.initLesson(requestedHours);
    if (!lessonReady) return;
    await this.initProgress();
  },

  onShow: function () {
    const themeIdx = getApp().globalData.cardThemeIndex || 0;
    if (themeIdx !== this.$data.themeIdx) {
      this.setData({ themeIdx });
    }
    if (this._lesson && !this._lessonEnded) this.updateLessonRemaining();
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

  /* ---------------- 课时计时 ---------------- */

  registerLessonBackGuard: function () {
    if (this._lessonBackGuard) return;
    this._lessonBackGuard = () => {
      if (!this._lesson) return false;
      this.confirmLeaveLesson();
      return true;
    };
    setBackGuard(this._lessonBackGuard);
  },

  clearLessonBackGuard: function () {
    if (!this._lessonBackGuard) return;
    clearBackGuard(this._lessonBackGuard);
    this._lessonBackGuard = null;
  },

  // 进入学习页时启动课时：请求后端扣费并拿到结束时间。
  initLesson: async function (requestedHours) {
    const bookId = this.$data.bookId;
    const userId = wx.getStorageSync('userId') || '';

    // 刷新页面时优先复用本地会话，避免重复扣费
    let session = readActiveLessonSession({ bookId });

    // 本地会话丢失时，尝试从后端恢复未结束的课时
    if (!session && !requestedHours) {
      try {
        const res = await api.getActiveLesson();
        if (res && res.code === 200 && res.data && res.data.session) {
          session = sessionFromServer(res.data.session, { bookId, userId });
          if (session) saveLessonSession(session);
        }
      } catch (err) {
        // 旧后端没有该接口时忽略，交给下面统一提示
      }
    }

    if (!session && requestedHours > 0) {
      let resumed = false;
      // 老师编号随扣课时一起上报；URL 丢失时回退到本地记住的编号。
      const teacherCode = this._teacherCode || wx.getStorageSync('lessonTeacherCode') || '';
      wx.showLoading({ title: '扣除课时...' });
      try {
        const res = await api.startLesson(requestedHours, bookId, teacherCode);
        if (!res || res.code !== 200 || !res.data || !res.data.session) {
          throw new Error((res && res.msg) || '课时扣除失败');
        }
        resumed = !!res.data.resumed;
        session = sessionFromServer(res.data.session, { bookId, userId });
        if (!session) throw new Error('课时会话数据异常，请稍后重试');
        saveLessonSession(session);
        setStoredLessonHours(res.data.lessonHours);
      } catch (err) {
        wx.hideLoading();
        const message = (err && err.message) || '无法开始学习';
        wx.showModal({
          title: '无法开始学习',
          content: message === 'Not Found'
            ? '后端还没有部署课时接口，请联系管理员'
            : message,
          showCancel: false,
          confirmText: '返回',
          success: () => wx.navigateBack()
        });
        return false;
      }
      wx.hideLoading();
      if (resumed) {
        wx.showToast({ title: '继续未结束的课时', icon: 'none' });
      }
    }

    if (!session) {
      wx.showModal({
        title: '请先选择课时',
        content: '请返回首页，点击「继续背单词」选择学习课时后再开始。',
        showCancel: false,
        confirmText: '返回首页',
        success: () => wx.navigateBack()
      });
      return false;
    }

    this.beginLessonSession(session);
    this.stripLessonParam();
    return true;
  },

  beginLessonSession: function (session) {
    this._lesson = session;
    this._lessonEnded = false;
    this._leaveConfirming = false;
    this.setData({
      lessonActive: true,
      lessonHours: session.hours,
      lessonMinutes: session.minutes
    });
    this.startLessonTimer();
  },

  // 扣费成功后把 URL 里的 lessonHours 去掉，刷新页面不会误以为要再扣一次。
  // 用 history.replaceState 而不是 router.replace：后者会改变 route.fullPath，
  // App 以 fullPath 作为 router-view 的 key，会导致学习页重挂载并误结束课时。
  stripLessonParam: function () {
    if (typeof window === 'undefined') return;
    try {
      const { pathname, search, hash } = window.location;
      const [hashPath, hashQuery] = hash.split('?');
      if (!hashQuery) return;
      const params = new URLSearchParams(hashQuery);
      if (!params.has('lessonHours') && !params.has('teacherCode')) return;
      params.delete('lessonHours');
      params.delete('teacherCode');
      const rest = params.toString();
      const nextHash = hashPath + (rest ? `?${rest}` : '');
      window.history.replaceState(window.history.state, '', pathname + search + nextHash);
    } catch (err) {
      // ignore
    }
  },

  startLessonTimer: function () {
    this.stopLessonTimer();
    this.updateLessonRemaining();
    this._lessonTimer = setInterval(() => this.updateLessonRemaining(), 1000);
  },

  stopLessonTimer: function () {
    if (!this._lessonTimer) return;
    clearInterval(this._lessonTimer);
    this._lessonTimer = null;
  },

  updateLessonRemaining: function () {
    if (!this._lesson) return;
    const remaining = Math.max(0, Math.ceil((this._lesson.endsAt - Date.now()) / 1000));
    const text = formatLessonClock(remaining);
    if (
      remaining !== this.$data.lessonRemainingSec ||
      text !== this.$data.lessonRemainingText
    ) {
      this.setData({ lessonRemainingSec: remaining, lessonRemainingText: text });
    }
    if (remaining <= 0 && !this._lessonEnded) {
      this.stopLessonTimer();
      this.onLessonTimeUp();
    }
  },

  onLessonTimeUp: function () {
    if (this._lessonEnded) return;
    // 时间到就结束会话（不再扣费），但保留计时条上下文供离开提示使用
    this.endLessonSession({ endedEarly: false, keepContext: true });

    wx.showModal({
      title: '本课时已结束',
      content: '本次课时时间已用完。可以稍作停留，或进入复习检测。',
      cancelText: '稍等一会',
      confirmText: '结束学习',
      success: (res) => {
        if (!res.confirm) return;
        this.finishLessonToReview();
      }
    });
  },

  confirmLeaveLesson: function () {
    if (this._leaveConfirming) return;
    this._leaveConfirming = true;

    const remaining = this.$data.lessonRemainingSec;
    const content = remaining > 0
      ? `当前课时还剩 ${this.$data.lessonRemainingText}，返回会提前结束本次课时，剩余时间不退还。`
      : '本课时已结束，返回后将结束本次学习。';

    wx.showModal({
      title: '结束本次课时？',
      content,
      cancelText: '继续学习',
      confirmText: '确定离开',
      success: (res) => {
        this._leaveConfirming = false;
        if (!res.confirm) return;
        this.endLessonSession({ endedEarly: remaining > 0 });
        this.clearLessonBackGuard();
        wx.navigateBack();
      },
      fail: () => {
        this._leaveConfirming = false;
      }
    });
  },

  endLessonSession: function ({ endedEarly = false, keepContext = false } = {}) {
    const session = this._lesson;
    if (!session) return;

    this.stopLessonTimer();
    clearLessonSession();

    if (!this._lessonEnded) {
      this._lessonEnded = true;
      api.endLesson(session.sessionId, endedEarly).catch((err) => {
        console.warn('结束课时失败:', err);
      });
    }

    if (keepContext) {
      this.setData({
        lessonActive: true,
        lessonRemainingSec: 0,
        lessonRemainingText: '00:00'
      });
    } else {
      this._lesson = null;
      this.setData({ lessonActive: false });
    }
  },

  finishLessonToReview: async function () {
    this.clearLessonBackGuard();
    const navigated = await this.handleReviewButton({ autoConfirm: true });
    if (!navigated && !this.$data.isLoading) {
      wx.navigateBack();
    }
  },

  cleanupLessonOnUnload: function () {
    const session = this._lesson;
    this.stopLessonTimer();
    if (session && !this._lessonEnded) {
      this._lessonEnded = true;
      api.endLesson(session.sessionId, true).catch(() => {});
    }
    clearLessonSession();
    this._lesson = null;
  },

  /* ---------------- 复习检测入口 ---------------- */

  handleReviewButton: async function (eventOrOptions) {
    const autoConfirm = !!(eventOrOptions && eventOrOptions.autoConfirm);
    if (this.$data.isLoading) return false;

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

    return this.navigateToReview({ pending, allGroups, fullGroups, allWordCount, autoConfirm });
  },

  navigateToReview: function ({ pending, allGroups, fullGroups, allWordCount, autoConfirm }) {
    const that = this;
    const go = () => {
      that.saveLocalDraft();
      const groupsParam = pending.length ? pending.join(',') : '';
      // 带课时进入复习时用 redirect 替换学习页：课时已结束，返回时应回到首页，
      // 而不是回到一个没有课时、无法继续的学习页。
      const navigate = that._lesson ? wx.redirectTo : wx.navigateTo;
      navigate({
        url: `/pages/review/review?bookId=${that.$data.bookId}&groups=${groupsParam}&allGroups=${fullGroups.join(',')}&allWordCount=${allWordCount}`,
        fail: (err) => {
          console.error('nav to review failed:', err);
          wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
        }
      });
    };

    // 没有待复习组时，仍允许进入页面做「全盘复习」。
    if (!pending.length) {
      if (!allGroups.length) {
        wx.showToast({ title: '今天还没有学完的组', icon: 'none' });
        return false;
      }
      if (autoConfirm) {
        go();
        return true;
      }
      wx.showModal({
        title: '全盘复习',
        content: '今天没有待复习组了，是否把今天学过的所有单词加入复习？',
        success(res) {
          if (res.confirm) go();
        }
      });
      return true;
    }

    if (autoConfirm) {
      go();
      return true;
    }

    wx.showModal({
      title: '复习检测',
      content: `将复习今天第 ${pending.join('、')} 组，共 ${pending.length} 组，确认吗？`,
      success(res) {
        if (res.confirm) go();
      }
    });
    return true;
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
    this.cleanupLessonOnUnload();
    this.clearLessonBackGuard();
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
