<template>
  <svg
    class="app-sketch"
    viewBox="0 0 200 200"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="markup"
  />
</template>

<script setup>
import { computed } from 'vue';

// 潦草简笔画：与首页「抗遗忘 / 错词本」同一套 200 网格手绘风格
const SKETCHES = {
  commute:
    '<path d="M52 116c-3-40 17-68 48-68s51 28 48 68"/><path d="M50 108c-13 2-18 15-16 28 2 13 11 20 22 18l4-1-6-44Z"/><path d="M150 108c13 2 18 15 16 28-2 13-11 20-22 18l-4-1 6-44Z"/><path d="M34 78c-7 10-7 24 0 34"/><path d="M166 78c7 10 7 24 0 34"/><path d="M76 172c16 6 32 6 48 0"/>',
  paper:
    '<path d="M66 34l56 4 20 22-3 102-74-4Z"/><path d="M122 38l-1 21 21 2"/><path d="M84 82l30 2"/><path d="M82 104l34 2"/><path d="M80 126l24 2"/><path d="M80 148l16 1"/><path d="M136 138l4-16 20-24 12 10-20 24-16 6Z"/>',
  dictation:
    '<path d="M58 152l10-34 54-62 24 20-54 64-34 12Z"/><path d="M120 60l24 20"/><path d="M72 158l8-22"/><path d="M48 176c18-8 34 6 52-2 18-8 34 6 52-4"/>',
  grammar:
    '<path d="M72 142l26-84 28 84"/><path d="M82 110h34"/><path d="M62 160c24 6 50 6 76 0"/>',
  reading:
    '<path d="M100 64C86 54 68 50 48 52v90c20-2 38 2 52 12 14-10 32-14 52-12V52c-20-2-38 2-52 12Z"/><path d="M100 64v90"/><path d="M64 80c10 0 20 2 28 7"/><path d="M64 102c10 0 20 2 28 7"/><path d="M136 80c-10 0-20 2-28 7"/><path d="M136 102c-10 0-20 2-28 7"/>',
  gauge:
    '<path d="M43 120c2-33 26-58 58-58 31 0 55 25 58 57"/><path d="M101 120l26-32"/><path d="M101 114c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z"/><path d="M62 105l9-7"/><path d="M87 75l4 10"/><path d="M140 105l-9-7"/><path d="M36 132c20 10 42 14 66 14s45-5 64-15"/>',
  plan:
    '<path d="M70 52l59 3 4 108-62-4Z"/><path d="M90 50l1-12 22 2 1 11"/><path d="M84 92l9 10 15-17"/><path d="M84 126l9 10 15-17"/><path d="M113 100l13 1"/><path d="M112 134l13 1"/>',
  calendar:
    '<path d="M52 60l96 4 3 98-97-4Z"/><path d="M54 84l95 4"/><path d="M76 52l1 20"/><path d="M124 55l1 20"/><path d="M73 106l11 0"/><path d="M101 107l11 0"/><path d="M129 108l11 0"/><path d="M73 130l11 0"/><path d="M101 131l11 0"/><path d="M129 132l11 0"/><path d="M73 154l11 0"/>',
  target:
    '<path d="M101 44c32 1 57 25 56 56-1 30-25 55-56 56-31 0-57-24-57-56 0-31 26-56 57-56Z"/><path d="M101 70c17 1 31 13 30 30s-14 30-30 30c-17 0-31-13-31-30 0-18 14-31 31-30Z"/><path d="M101 92c5 0 9 3 9 8s-4 9-9 9-8-4-8-9 3-8 8-8Z"/><path d="M101 100l37-40"/><path d="M138 60l-12 3"/><path d="M138 60l-3 12"/>',
  sliders:
    '<path d="M50 76l100 3"/><path d="M80 69c6 0 10 4 10 9 0 4-4 8-10 8s-10-4-10-8c0-5 4-9 10-9Z"/><path d="M50 130l100 3"/><path d="M128 123c6 0 10 4 10 9 0 4-4 8-10 8s-10-4-10-8c0-5 4-9 10-9Z"/>',
  palette:
    '<path d="M105 44c-30-2-55 14-60 38-5 23 11 45 34 52 14 4 26 1 29-8 3-8-5-13-5-21 0-8 7-12 15-12h13c17 0 28-13 24-27-4-13-27-21-50-22Z"/><path d="M75 74c4-1 6 3 4 6-2 2-5 1-6-1-1-2 0-4 2-5Z"/><path d="M97 64c4-1 6 3 4 6-2 2-5 1-6-1-1-2 0-4 2-5Z"/><path d="M119 68c4-1 6 3 4 6-2 2-5 1-6-1-1-2 0-4 2-5Z"/><path d="M139 84c4-1 6 3 4 6-2 2-5 1-6-1-1-2 0-4 2-5Z"/>',
  book:
    '<path d="M66 46l58 4 6 108-60 6Z"/><path d="M92 48l4 108"/><path d="M112 48l-1 30-9-7-8 8 1-31"/><path d="M103 96l15 1"/><path d="M102 114l15 1"/>',
  pencil:
    '<path d="M61 149l11-30 48-55 19 16-49 58-29 11Z"/><path d="M120 64l19 16"/><path d="M72 149l9-23"/><path d="M61 149l26-8"/>',
};

const props = defineProps({
  name: { type: String, required: true },
  strokeWidth: { type: [Number, String], default: 4 },
});

const markup = computed(() => SKETCHES[props.name] || SKETCHES.paper);
</script>
