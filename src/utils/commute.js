// 通勤英语共用工具（迁移自小程序 utils/commute.js）
import wx from '@/mp/wx';

export function formatDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function getCurrentBookId() {
  const book = wx.getStorageSync('currentBook') || {};
  return book.id || 1;
}

// 获取「昨日单词复习」词表：优先昨日，昨日没有则往前找最近一次有学习记录的日期（30 天内）
export function getReviewWords() {
  const bookId = getCurrentBookId();
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `dailyLearnedWords_${bookId}_${formatDate(d)}`;
    const words = wx.getStorageSync(key) || [];
    if (Array.isArray(words) && words.length > 0) {
      return words
        .map((w) => ({
          word: w.en || w.word || '',
          phonetic: w.phonetic || '',
          meaning: w.meaning || '',
        }))
        .filter((w) => w.word);
    }
  }
  return [];
}

export default { formatDate, getCurrentBookId, getReviewWords };
