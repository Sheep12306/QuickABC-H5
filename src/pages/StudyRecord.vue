<template>
<div class="record-container page-study-record"><div class="calendar-header"><span @click="mp('prevMonth', $event)" class="month-btn"><AppIcon name="chevron-left" /></span><span class="current-month">{{currentYear}}年{{currentMonth}}月</span><span @click="mp('nextMonth', $event)" class="month-btn"><AppIcon name="chevron-right" /></span></div><div class="week-header"><span class="week-item">日</span><span class="week-item">一</span><span class="week-item">二</span><span class="week-item">三</span><span class="week-item">四</span><span class="week-item">五</span><span class="week-item">六</span></div><div class="calendar-body"><div v-for="(item, index) in calendarDays" :key="index" @click="mp('selectDate', $event)" class="date-item" :data-date="item.date" :data-wordnum="item.wordNum"><span :class="&quot;date-text &quot; + (!item.isCurrentMonth ? 'not-current' : '') + (item.isCheckIn ? 'check-in' : '') + (item.date === selectedDate ? 'selected' : '')" :style="(item.date === selectedDate ? 'background:' + themeColors[themeIdx].accent + ';' : '') + (item.isCheckIn && item.date !== selectedDate ? 'color:' + themeColors[themeIdx].accent + ';' : '')">
        {{item.day}}
      </span><div v-if="item.isCheckIn && item.isCurrentMonth" class="check-mark" :style="&quot;background:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;"></div></div></div><div v-if="selectedDate" class="detail-card"><span class="detail-title">{{selectedDate}} 打卡详情</span><span class="detail-content" :style="&quot;color:&quot; + (themeColors[themeIdx].accent) + &quot;;&quot;">
      {{selectedWordNum > 0 ? '当日背单词数：' + selectedWordNum + ' 个' : '当日未背单词'}}
    </span></div></div>
</template>

<script>

import { createPage } from '@/mp/page';
import { dateKey } from '@/utils/ebbinghaus';

export default createPage({
    data: {
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      calendarDays: [],
      selectedDate: '',
      selectedWordNum: 0,
      checkInData: {},
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
      this.loadCheckInData();
      this.initCalendar();
    },

    onShow() {
      this.setData({ themeIdx: getApp().globalData.cardThemeIndex || 0 });
    },

    loadCheckInData() {
      try {
        // 日历只统计「当天背了多少词」：扫描所有词书的 dailyLearnedWords_<bookId>_<date>，
        // 同一天多本书的同一个单词只算一次。
        const prefix = 'dailyLearnedWords_';
        let keys = [];
        try {
          keys = (wx.getStorageInfoSync().keys || []).filter(key => key.startsWith(prefix));
        } catch (err) {
          keys = [];
        }

        // 拿不到 key 列表时，按当前词书兜底扫描最近 60 天。
        if (!keys.length) {
          const book = wx.getStorageSync('currentBook') || {};
          const bookId = book.id || 1;
          for (let i = 0; i < 60; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            keys.push(`${prefix}${bookId}_${dateKey(d)}`);
          }
        }

        const wordsByDate = {};
        keys.forEach(key => {
          const match = key.slice(prefix.length).match(/^(.+)_(\d{4}-\d{2}-\d{2})$/);
          if (!match) return;
          const date = match[2];
          const words = wx.getStorageSync(key);
          if (!Array.isArray(words) || !words.length) return;

          const bucket = wordsByDate[date] || (wordsByDate[date] = new Map());
          words.forEach((word, index) => {
            if (!word) return;
            const id = word.id != null ? String(word.id) : (word.en || `index-${index}`);
            bucket.set(id, word);
          });
        });

        const checkInData = {};
        Object.keys(wordsByDate).forEach(date => {
          const count = wordsByDate[date].size;
          if (count > 0) checkInData[date] = count;
        });

        this.setData({ checkInData });
      } catch (e) {
        // keep empty
      }
    },

    initCalendar() {
      const { currentYear, currentMonth, checkInData } = this.$data;
      const calendarDays = [];
      const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
      const totalDays = new Date(currentYear, currentMonth, 0).getDate();
      const lastMonthTotalDays = new Date(currentYear, currentMonth - 1, 0).getDate();

      for (let i = firstDay - 1; i >= 0; i--) {
        const day = lastMonthTotalDays - i;
        const m = currentMonth - 1 < 1 ? 12 : currentMonth - 1;
        const y = currentMonth - 1 < 1 ? currentYear - 1 : currentYear;
        const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.push({ day, date, isCurrentMonth: false, isCheckIn: !!checkInData[date], wordNum: checkInData[date] || 0 });
      }

      for (let day = 1; day <= totalDays; day++) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.push({ day, date, isCurrentMonth: true, isCheckIn: !!checkInData[date], wordNum: checkInData[date] || 0 });
      }

      const remainDays = 42 - calendarDays.length;
      for (let day = 1; day <= remainDays; day++) {
        const m = currentMonth + 1 > 12 ? 1 : currentMonth + 1;
        const y = currentMonth + 1 > 12 ? currentYear + 1 : currentYear;
        const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.push({ day, date, isCurrentMonth: false, isCheckIn: !!checkInData[date], wordNum: checkInData[date] || 0 });
      }

      this.setData({ calendarDays });
    },

    prevMonth() {
      let { currentYear, currentMonth } = this.$data;
      currentMonth--;
      if (currentMonth < 1) { currentMonth = 12; currentYear--; }
      this.setData({ currentYear, currentMonth, selectedDate: '', selectedWordNum: 0 }, () => this.initCalendar());
    },

    nextMonth() {
      let { currentYear, currentMonth } = this.$data;
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      this.setData({ currentYear, currentMonth, selectedDate: '', selectedWordNum: 0 }, () => this.initCalendar());
    },

    selectDate(e) {
      const { date, wordnum } = e.currentTarget.dataset;
      this.setData({ selectedDate: date, selectedWordNum: wordnum || 0 });
    },

    goBack() {
      wx.navigateBack();
    }
  });

</script>
