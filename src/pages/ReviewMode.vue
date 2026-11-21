<template>
  <div class="mode-container page-review-mode">
    <div class="mode-top"><span class="mode-title">抗遗忘复习</span></div>

    <div v-if="dateWordList.length > 0" class="mode-scroll mp-scroll-y" data-scroll-y="1">
      <section v-for="group in reviewGroups" :key="group.key" class="mode-group">
        <button
          class="mode-group-head"
          type="button"
          :aria-expanded="collapsed[group.key] ? 'false' : 'true'"
          @click="mp('toggleGroup', $event)"
          :data-key="group.key"
        >
          <span class="mode-group-title">
            {{ group.label }}
            <span class="mode-group-count">{{ group.items.length }}</span>
          </span>
          <AppIcon
            :name="collapsed[group.key] ? 'chevron-right' : 'chevron-down'"
            class="mode-group-chevron"
          />
        </button>

        <div v-if="!collapsed[group.key]" class="mode-group-body">
          <div
            v-for="item in group.items"
            :key="item.date"
            @click="mp('goToDateReview', $event)"
            class="mode-card"
            :class="'mode-card--' + item.status"
            :data-date="item.date"
            :data-index="item.listIndex"
          >
            <span class="mode-card-tag" :class="'mode-card-tag--' + item.status">
              {{ item.statusLabel }}
            </span>

            <div class="mode-card-main">
              <div class="mode-card-left">
                <span class="mode-date">{{ item.date }}</span>
                <span class="mode-count">共{{ item.groupCount }}组</span>
              </div>
              <div class="mode-card-right">
                <div
                  class="mode-tag"
                  :style="'background:' + themeColors[themeIdx].light + ';'"
                >
                  <span
                    class="mode-tag-num"
                    :style="'color:' + themeColors[themeIdx].accent + ';'"
                  >{{ item.checkCount || 0 }}</span>
                </div>
                <div
                  class="mode-status"
                  :class="'mode-status--' + item.status"
                  :style="statusStyle(item)"
                >
                  <span class="mode-status-text" :style="statusTextStyle(item)">
                    {{ item.status === 'due' ? '去打卡' : item.statusLabel }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div class="scroll-bottom-space"></div>
    </div>

    <div v-else class="mode-empty">
      <AppIcon name="calendar" class="mode-empty-icon" />
      <span>暂无抗遗忘计划</span>
    </div>
  </div>
</template>

<script>
import { createPage } from '@/mp/page';
import {
  MAX_CHECKINS,
  buildReviewGroups,
  dateKey,
  decorateItems,
  loadReviewItems,
} from '@/utils/ebbinghaus';

export default createPage({
  data: {
    dateWordList: [],
    reviewGroups: [],
    currentBookId: 1,
    // 分组默认：待打卡和已打卡展开，无需打卡收起（日期多时避免一屏全是灰卡片）。
    collapsed: { due: false, checked: false, notDue: true },
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
    const bookId = options.bookId ? parseInt(options.bookId) : 1;
    this.setData({ currentBookId: bookId });
    this.loadDateWordData(bookId);
  },

  onShow() {
    this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    const { currentBookId } = this.$data;
    this.loadDateWordData(currentBookId);
  },

  loadDateWordData(bookId) {
    const { items } = loadReviewItems(bookId);
    this.setData({
      dateWordList: items,
      reviewGroups: buildReviewGroups(items)
    });
    this.persistMeta(items);
  },

  // 只持久化打卡元数据；单词本身仍在 dailyLearnedWords_<bookId>_<date> 里。
  persistMeta(items) {
    const meta = items.map(({ date, checkCount, lastCheckInDate, isCheckIn }) => ({
      date,
      checkCount,
      lastCheckInDate,
      isCheckIn
    }));
    wx.setStorageSync(`dateWords_${this.$data.currentBookId}`, meta);
  },

  toggleGroup(e) {
    const { key } = e.currentTarget.dataset;
    if (!key) return;
    const collapsed = {
      ...this.$data.collapsed,
      [key]: !this.$data.collapsed[key]
    };
    this.setData({ collapsed });
  },

  goToDateReview(e) {
    const { date } = e.currentTarget.dataset;
    const { currentBookId, dateWordList } = this.$data;
    const index = dateWordList.findIndex(item => item.date === date);
    const currentItem = dateWordList[index];

    if (!currentItem) return;

    // 只有今天轮到打卡的卡片才能进入；已打卡/无需打卡的按钮置灰且不可点。
    if (!currentItem.canReview) {
      wx.showToast({
        title: currentItem.status === 'checked' ? '今天已经打卡了' : '今天还不需要复习',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    const dailyWords = wx.getStorageSync(`dailyLearnedWords_${currentBookId}_${date}`) || [];
    const wordsStr = dailyWords.length > 0
      ? encodeURIComponent(JSON.stringify(dailyWords))
      : '[]';

    wx.navigateTo({
      url: `/pages/review-date/review-date?bookId=${currentBookId}&date=${date}&words=${wordsStr}&index=${index}&checkCount=${currentItem.checkCount || 0}`,
      fail: (err) => {
        console.error('跳转失败：', err);
        wx.showToast({
          title: '跳转失败，请检查页面配置',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 打卡页完成后回调：+1 次，记录今天已打卡；满 10 次仍按原逻辑清理。
  updateCheckCount(index) {
    const todayStr = dateKey();
    const list = this.$data.dateWordList.map(item => ({ ...item }));
    const item = list[index];

    if (!item) return;
    // 「已打卡」只能由「去打卡」转变，同一天不重复计数。
    if (item.lastCheckInDate === todayStr) return;

    item.checkCount = (Number(item.checkCount) || 0) + 1;
    item.lastCheckInDate = todayStr;
    item.isCheckIn = true;

    let cleared = false;
    if (item.checkCount >= MAX_CHECKINS) {
      list.splice(index, 1);
      // 先记录日期再删存储，避免原逻辑里 splice 后取到下一项日期的 bug。
      wx.removeStorageSync(`dailyLearnedWords_${this.$data.currentBookId}_${item.date}`);
      cleared = true;
    }

    const items = decorateItems(list, todayStr);
    this.setData({
      dateWordList: items,
      reviewGroups: buildReviewGroups(items)
    });
    this.persistMeta(items);

    if (cleared) {
      wx.showToast({
        title: '该日期已完成复习，自动清理',
        icon: 'success',
        duration: 1500
      });
    }
  },

  statusStyle(item) {
    const theme = this.$data.themeColors[this.$data.themeIdx];
    if (item.status === 'due') return `background:${theme.accent};`;
    if (item.status === 'checked') return `background:${theme.light};`;
    return '';
  },

  statusTextStyle(item) {
    const theme = this.$data.themeColors[this.$data.themeIdx];
    if (item.status === 'due') return 'color:#ffffff;';
    if (item.status === 'checked') return `color:${theme.accent};`;
    return '';
  }
});
</script>
