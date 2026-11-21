<template>
  <div class="home-page page-index">
    <header class="home-header">
      <div class="home-greeting-block">
        <h1 class="home-greeting">你好，{{ displayName() }}</h1>
        <button class="home-tagline" type="button" @click="editStatus">
          {{ userStatus || '坚持学习，遇见更好的自己' }}
        </button>
      </div>
      <button class="listen-entry" type="button" aria-label="打开随身听" title="随身听" @click="openWalkman">
        <span class="listen-disc"></span>
        <span class="listen-dot"></span>
      </button>
    </header>

    <div class="home-section-head home-current-head">
      <h2 class="home-section-title">当前学习</h2>
    </div>

    <section class="wordbook-card">
      <div class="book-info">
        <div class="book-title-line">
          <span class="book-title">{{ currentBook.name || '选择一本单词书' }}</span>
        </div>

        <div class="book-count">
          共 {{ formatNumber(currentBook.totalWords) }} 词 · 已掌握 {{ formatNumber(totalLearned) }} 词
        </div>

        <div class="book-progress-row">
          <div class="book-progress"><span :style="{ width: (currentBook.progress || 0) + '%' }"></span></div>
          <span class="book-percent">{{ currentBook.progress || 0 }}%</span>
        </div>
      </div>

      <div class="book-art" aria-hidden="true">
        <svg class="book-ring" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
            stroke-dasharray="86 26 52 22 70 30"
          />
        </svg>
        <div class="book-3d">
          <span class="book-pages"></span>
          <div class="book-cover">
            <b>{{ bookShort(currentBook.name) }}</b>
            <small>{{ bookTag(currentBook.name) }}</small>
          </div>
        </div>
      </div>

      <div class="book-bottom-row">
        <span class="book-group">
          <AppIcon name="book-open" class="book-group-icon" />
          {{ groupText() }}
        </span>
        <button class="book-change" type="button" @click="openBookSheet">
          <AppIcon name="refresh" class="book-change-icon" />
          切换词书
        </button>
      </div>
    </section>

    <button class="home-primary" type="button" @click="startStudy">继续背单词</button>

    <section class="home-actions">
      <button class="home-action" type="button" @click="startReview">
        <span class="home-action-text">
          <span class="home-action-label">抗遗忘</span>
          <span class="home-action-meta">{{ reviewCount || 0 }} 词待复习</span>
        </span>
        <svg class="home-action-art" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M48 42a16 16 0 1 0 3 14" />
          <path d="M51 28v14H37" />
          <circle cx="100" cy="42" r="16" />
          <path d="M84 56 L76 104 L124 104 L116 56 Z" />
          <path d="M92 72 L108 72" />
          <path d="M70 104 L60 144 L140 144 L130 104 Z" />
          <path d="M64 144 L64 172" />
          <path d="M136 144 L136 172" />
          <path d="M80 144 L80 164" />
          <path d="M120 144 L120 164" />
          <path d="M76 104 L68 120 L132 120 L124 104" />
          <path d="M88 84 L96 76 L100 80" />
          <path d="M96 80 L92 96" />
        </svg>
      </button>
      <button class="home-action" type="button" @click="goWrongWords">
        <span class="home-action-text">
          <span class="home-action-label">错词本</span>
          <span class="home-action-meta">{{ wrongCount || 0 }} 个错词</span>
        </span>
        <svg class="home-action-art" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="130" cy="46" r="16" />
          <path d="M118 60 L110 110 L152 110 L144 60 Z" />
          <path d="M126 78 L138 78" />
          <path d="M100 110 L90 140 L160 140 L150 110 Z" />
          <path d="M104 140 L104 162" />
          <path d="M156 140 L156 162" />
          <path d="M122 140 L122 154" />
          <path d="M142 140 L142 154" />
          <path d="M110 110 L102 124 L148 124 L140 110" />
          <path d="M54 88 L70 60 L96 68 L80 96 Z" />
          <path d="M66 72 L88 82" />
          <path d="M70 88 L84 66" />
        </svg>
      </button>
    </section>

    <section class="home-section home-track-section">
      <div class="home-section-head">
        <h2 class="home-section-title">学习轨迹</h2>
      </div>
      <div
        class="week-chart"
        role="button"
        tabindex="0"
        aria-label="查看学习详情"
        @click="goStudyRecord"
        @keyup.enter="goStudyRecord"
      >
        <div
          v-for="day in weekChart"
          :key="day.date"
          class="week-day"
          :class="{ active: day.active }"
          :title="day.date + ' · ' + day.count + ' 词'"
        >
          <i class="week-bar" :style="{ height: day.pct + '%' }"></i>
          <span>{{ day.label }}</span>
        </div>
        <div v-if="weekEmpty" class="week-empty">本周还没有学习记录</div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="sheetOpen" class="home-sheet-mask" @click.self="closeSheet">
        <div class="home-sheet home-sheet--books">
          <div class="sheet-handle"></div>

          <div class="home-sheet-head">
            <span>切换词书</span>
            <button class="home-sheet-close" type="button" aria-label="关闭" @click="closeSheet">
              <AppIcon name="close" />
            </button>
          </div>

          <div class="sheet-book-list">
            <button
              v-for="book in wordBooks"
              :key="book.id"
              class="sheet-book"
              :class="{ active: String(book.id) === String(currentBook.id) }"
              type="button"
              @click="chooseBook(book)"
            >
              <span class="sheet-book-cover" :class="'cover-' + coverClass(book)">
                <b :class="{ compact: bookShort(book.name).length > 4 }">{{ bookShort(book.name) }}</b>
                <small>核心词汇</small>
              </span>
              <span class="sheet-book-info">
                <span class="sheet-book-name">{{ book.name }}</span>
                <span class="sheet-book-detail">{{ bookDetail(book) }}</span>
              </span>
              <span class="sheet-book-percent">{{ statsFor(book).pct || 0 }}%</span>
              <span class="sheet-book-check"></span>
            </button>
            <div v-if="!wordBooks.length" class="sheet-empty">暂无单词书</div>
          </div>

          <button class="sheet-manage" type="button" @click="manageBooks">管理词库</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import api from '@/utils/api';
import { createPage } from '@/mp/page';
import { countDueWords, loadReviewItems } from '@/utils/ebbinghaus';

const GROUP_SIZE = 5;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export default createPage({
  data: {
    userInfo: { nickname: '', nickName: '' },
    userStatus: '',
    todayLearned: 0,
    totalLearned: 0,
    reviewCount: 0,

    currentBook: {},
    wordBooks: [],
    bookStats: {},
    lastGroup: 1,

    weekChart: [],
    weekEmpty: true,

    wrongCount: 0,

    sheetOpen: false
  },

  onLoad() {
    this.loadUserInfo();
    this.loadWordBooks();
  },

  onShow() {
    this.loadUserInfo();
    this.loadBasicsCounts();
    this.buildWeekChart();
    const book = this.$data.currentBook;
    if (book && book.id) {
      this.refreshBook(book);
      this.loadLastGroup(book.id);
    }
  },

  // 错词本数量存在本地（与「我的」页保持一致）
  loadBasicsCounts() {
    try {
      const wrongWords = wx.getStorageSync('wrong_words');
      this.setData({
        wrongCount: Array.isArray(wrongWords) ? wrongWords.length : 0
      });
    } catch (err) {
      // ignore
    }
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      this.setData({
        userInfo: {
          nickname: userInfo.nickname || userInfo.nickName || '',
          nickName: userInfo.nickName || userInfo.nickname || ''
        },
        userStatus: wx.getStorageSync('userStatus') || ''
      });
    } catch (err) {
      // ignore
    }
  },

  async loadWordBooks() {
    try {
      const res = await api.getAllWordBooks();
      const books = res && res.code === 200 && Array.isArray(res.data) ? res.data : [];

      if (!books.length) {
        const saved = wx.getStorageSync('currentBook');
        if (saved && saved.id) {
          this.setData({ currentBook: saved, wordBooks: [saved] });
          this.applyBook(saved);
        }
        return;
      }

      this.setData({ wordBooks: books });

      const saved = wx.getStorageSync('currentBook') || {};
      const current = books.find(book => String(book.id) === String(saved.id)) || books[0];
      this.setData({ currentBook: current });
      wx.setStorageSync('currentBook', current);

      this.loadAllBookStats(books);
      this.applyBook(current);
    } catch (err) {
      console.error('加载单词书失败:', err);
      const saved = wx.getStorageSync('currentBook');
      if (saved && saved.id) {
        this.setData({ currentBook: saved, wordBooks: [saved] });
        this.applyBook(saved);
      }
      wx.showToast({ title: '加载单词书失败', icon: 'none' });
    }
  },

  applyBook(book) {
    if (!book || !book.id) return;
    this.refreshBook(book);
    this.loadLastGroup(book.id);
    this.buildWeekChart();
  },

  async refreshBook(book) {
    if (!book || !book.id) return;
    // 后端 reviewCount 目前固定返回 0；抗遗忘数据在本地，先按艾宾浩斯规则算出今天待复习词数，
    // 即使后端不可达首页也能显示正确的数量。
    const review = countDueWords(loadReviewItems(book.id).items);
    this.setData({ reviewCount: review });
    try {
      const res = await api.getBookLearningData(book.id);
      if (!res || res.code !== 200 || !res.data) return;

      const data = res.data;
      const totalWords = Number(book.totalWords) || Number(this.$data.currentBook.totalWords) || 0;
      const learned = Number(data.totalLearned) || 0;
      const pct = totalWords > 0 ? Math.round(learned / totalWords * 100) : 0;
      const stat = {
        learned,
        today: Number(data.todayLearned) || 0,
        review,
        pct
      };

      const patch = {
        todayLearned: stat.today,
        totalLearned: learned,
        reviewCount: stat.review,
        'currentBook.progress': pct,
        'currentBook.totalWords': totalWords
      };
      patch['bookStats.' + book.id] = stat;
      this.setData(patch);

      wx.setStorageSync('todayLearned', stat.today);
      wx.setStorageSync('totalLearned', learned);
    } catch (err) {
      console.error('加载学习数据失败:', err);
    }
  },

  async loadAllBookStats(books) {
    const stats = {};
    await Promise.all(books.map(async (book) => {
      try {
        const res = await api.getBookLearningData(book.id);
        if (!res || res.code !== 200 || !res.data) return;
        const data = res.data;
        const total = Number(book.totalWords) || 0;
        const learned = Number(data.totalLearned) || 0;
        stats[book.id] = {
          learned,
          today: Number(data.todayLearned) || 0,
          review: countDueWords(loadReviewItems(book.id).items),
          pct: total > 0 ? Math.round(learned / total * 100) : 0
        };
      } catch (err) {
        // 单本词书失败不影响其他词书
      }
    }));
    this.setData({ bookStats: stats });
  },

  async loadLastGroup(bookId) {
    let group = 1;
    const localRecord = wx.getStorageSync(`learnRecord_${bookId}`);
    if (localRecord && localRecord.lastGroup) {
      group = Number(localRecord.lastGroup) || 1;
      // 先用本地缓存避免按钮闪回第 1 组，随后以服务器结果为准。
      this.setData({ lastGroup: group });
    }

    try {
      // 学习进度以服务器为准；本地只作为离线兜底。
      const res = await api.getLearnRecord(bookId);
      if (res && res.code === 200 && res.data && res.data.learnRecord) {
        group = Number(res.data.learnRecord.lastGroup) || 1;
      }
    } catch (err) {
      // 保持本地兜底值
    }
    this.setData({ lastGroup: group });
  },

  buildWeekChart() {
    const books = this.$data.wordBooks.length ? this.$data.wordBooks : [this.$data.currentBook];
    const bookIds = books.filter(book => book && book.id).map(book => book.id);
    const today = new Date();
    const days = [];
    let maxCount = 0;

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = dateKey(date);
      let count = 0;

      bookIds.forEach((bookId) => {
        try {
          const words = wx.getStorageSync(`dailyLearnedWords_${bookId}_${key}`);
          if (Array.isArray(words)) count += words.length;
        } catch (err) {
          // ignore
        }
      });

      maxCount = Math.max(maxCount, count);
      days.push({
        date: key,
        label: `${date.getMonth() + 1}.${date.getDate()}`,
        count,
        active: offset === 0
      });
    }

    let totalCount = 0;
    days.forEach((day) => {
      totalCount += day.count;
      day.pct = maxCount > 0 ? Math.max(6, Math.round(day.count / maxCount * 100)) : 6;
    });

    this.setData({ weekChart: days, weekEmpty: totalCount === 0 });
  },

  displayName() {
    const info = this.$data.userInfo || {};
    return info.nickname || info.nickName || '同学';
  },

  formatNumber(value) {
    return (Number(value) || 0).toLocaleString('en-US');
  },

  bookShort(name) {
    const value = String(name || '');
    if (/CET[-\s]?4|四级/i.test(value)) return 'CET-4';
    if (/CET[-\s]?6|六级/i.test(value)) return 'CET-6';
    if (/考研/.test(value)) return '考研';
    if (/TOEFL/i.test(value)) return 'TOEFL';
    if (/IELTS|雅思/i.test(value)) return 'IELTS';
    return value.slice(0, 4) || '词书';
  },

  bookTag(name) {
    const value = String(name || '');
    if (/核心/.test(value)) return '核心词汇';
    if (/高频/.test(value)) return '高频词';
    if (/TOEFL/i.test(value)) return '托福词汇';
    if (/考研/.test(value)) return '考研词汇';
    if (/四级|CET[-\s]?4/i.test(value)) return '四级词汇';
    if (/六级|CET[-\s]?6/i.test(value)) return '六级词汇';
    return '词书';
  },

  groupText() {
    const book = this.$data.currentBook || {};
    const totalWords = Number(book.totalWords) || 0;
    const group = Number(this.$data.lastGroup) || 1;
    if (totalWords > 0) {
      const totalGroups = Math.ceil(totalWords / GROUP_SIZE);
      return `第 ${group} / ${totalGroups.toLocaleString('en-US')} 组`;
    }
    return `第 ${group} 组`;
  },

  statsFor(book) {
    if (!book || !book.id) return { learned: 0, today: 0, review: 0, pct: 0 };
    return this.$data.bookStats[book.id] || { learned: 0, today: 0, review: 0, pct: 0 };
  },

  coverClass(book) {
    const value = String((book && book.name) || '');
    if (/CET[-\s]?6|六级/i.test(value)) return 'cet6';
    if (/考研/i.test(value)) return 'kaoyan';
    if (/TOEFL|托福/i.test(value)) return 'toefl';
    if (/IELTS|雅思/i.test(value)) return 'ielts';
    return 'cet4';
  },

  bookDetail(book) {
    const total = Number(book && book.totalWords) || 0;
    const learned = this.statsFor(book).learned || 0;
    if (learned > 0) {
      return `${this.formatNumber(total)} 词 · 已掌握 ${this.formatNumber(learned)} 词`;
    }
    return `${this.formatNumber(total)} 词 · 未开始`;
  },

  manageBooks() {
    this.closeSheet();
  },

  openBookSheet() {
    this.setData({ sheetOpen: true });
  },

  closeSheet() {
    this.setData({ sheetOpen: false });
  },

  chooseBook(book) {
    this.closeSheet();
    if (!book || !book.id) return;
    if (String(book.id) === String(this.$data.currentBook.id)) return;

    const stat = this.statsFor(book);
    this.setData({
      currentBook: { ...book, progress: stat.pct || 0 },
      totalLearned: stat.learned || 0,
      todayLearned: stat.today || 0,
      reviewCount: stat.review || 0
    });
    wx.setStorageSync('currentBook', book);
    this.applyBook(book);
    wx.showToast({ title: `已切换到 ${book.name}`, icon: 'success' });
  },

  // 随身听：直接进专辑播放页，学习模式在播放页内自己切换
  openWalkman() {
    const base = import.meta.env.BASE_URL || '/';
    window.location.href = `${base}uihtml/quickabc_walkman.html?embed=1`;
  },

  startStudy() {
    let book = this.$data.currentBook;
    if (!book || !book.id) {
      book = wx.getStorageSync('currentBook') || {};
    }
    if (!book || !book.id) {
      wx.showToast({ title: '请先选择单词书', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/learn/learn?bookId=${book.id}&startGroup=${this.$data.lastGroup || 1}&mode=normal`
    });
  },

  startReview() {
    const book = this.$data.currentBook;
    if (!book || !book.id) {
      wx.showToast({ title: '请先选择单词书', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/review-mode/review-mode?bookId=${book.id}`
    });
  },

  goWrongWords() {
    const book = this.$data.currentBook || {};
    const suffix = book.id ? `&bookId=${book.id}` : '';
    wx.navigateTo({ url: `/pages/new-word-review/new-word-review?isWrongWordMode=true${suffix}` });
  },

  goStudyRecord() {
    wx.navigateTo({ url: '/pages/studyRecord/studyRecord' });
  },

  editStatus() {
    const that = this;
    wx.showModal({
      title: '更新状态',
      editable: true,
      placeholderText: '说点什么吧...',
      content: that.$data.userStatus || '',
      success: function (res) {
        if (res.confirm && res.content && res.content.trim()) {
          const userStatus = res.content.trim();
          that.setData({ userStatus });
          wx.setStorageSync('userStatus', userStatus);
          wx.showToast({ title: '状态已更新', icon: 'success' });
        }
      }
    });
  }
});
</script>
