<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="markup"
  />
</template>

<script setup>
import { computed } from 'vue';

// 全站统一线性图标：24 网格、1.7 描边、圆角端点
const ICONS = {
  home: '<path d="M4.5 10.4 12 4l7.5 6.4"/><path d="M6.4 9.5v9.1a1 1 0 0 0 1 1h3.1v-5.2h3v5.2h3.1a1 1 0 0 0 1-1V9.5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5Z"/>',
  user: '<circle cx="12" cy="8.2" r="3.3"/><path d="M5.5 20c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/>',
  refresh: '<path d="M19.4 11.2a7.5 7.5 0 1 0-2.2 5.4"/><path d="M19.7 5.6v5.6h-5.6"/>',
  'x-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m9.4 9.4 5.2 5.2m0-5.2-5.2 5.2"/>',
  notebook: '<path d="M6.2 4.5h10.3a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6.2"/><path d="M6.2 4.5A1.5 1.5 0 0 0 4.7 6v12a1.5 1.5 0 0 0 1.5 1.5h1.6v-15Z"/><path d="M10.2 9h4.6M10.2 12.5h3.2"/>',
  'book-open': '<path d="M12 6.6C10.4 5.3 8.4 4.7 5.6 4.7H4.2v13.1h1.4c2.8 0 4.8.6 6.4 1.9 1.6-1.3 3.6-1.9 6.4-1.9h1.4V4.7h-1.4c-2.8 0-4.8.6-6.4 1.9Z"/><path d="M12 6.6v13.1"/>',
  headphones: '<path d="M4.5 13.5v-1.2a7.5 7.5 0 0 1 15 0v1.2"/><rect x="3.4" y="13" width="3.8" height="6.2" rx="1.9"/><rect x="16.8" y="13" width="3.8" height="6.2" rx="1.9"/>',
  play: '<path d="M8.6 5.9 18.6 12 8.6 18.1Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9.4 6v12M14.6 6v12" stroke-width="2.2"/>',
  'skip-back': '<path d="M18.4 6.6 10.4 12l8 5.4Z" fill="currentColor" stroke="none"/><path d="M6.4 6v12"/>',
  'skip-forward': '<path d="M5.6 6.6 13.6 12l-8 5.4Z" fill="currentColor" stroke="none"/><path d="M17.6 6v12"/>',
  volume: '<path d="M4.5 9.5v5h3l4 3.5v-12l-4 3.5Z"/><path d="M15.4 9.2a4.6 4.6 0 0 1 0 5.6"/><path d="M18 6.6a8 8 0 0 1 0 10.8"/>',
  'volume-off': '<path d="M4.5 9.5v5h3l4 3.5v-12l-4 3.5Z"/><path d="m15.4 9.6 5 4.8m0-4.8-5 4.8"/>',
  menu: '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
  eye: '<path d="M2.8 12S6.2 6.5 12 6.5 21.2 12 21.2 12 17.8 17.5 12 17.5 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  'eye-off': '<path d="M4 4.5 20 19.5"/><path d="M9.9 6.9A9.7 9.7 0 0 1 12 6.5c5.8 0 9.2 5.5 9.2 5.5a15.5 15.5 0 0 1-3 3.6"/><path d="M6.2 8.3A15.5 15.5 0 0 0 2.8 12S6.2 17.5 12 17.5c1 0 1.9-.2 2.8-.4"/><path d="M10.2 10.2a2.8 2.8 0 0 0 3.7 3.7"/>',
  edit: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m13.8 7.2 3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.2"/><path d="m16 16 4 4"/>',
  check: '<path d="m5 12.5 4.3 4.3L19 7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/>',
  'calendar-check': '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="m8.5 14.6 2.4 2.4 4.6-4.6"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  gauge: '<path d="M4 15.6a8.5 8.5 0 1 1 16 0"/><path d="m12 15.6 4-5"/><circle cx="12" cy="15.6" r="1.2" fill="currentColor" stroke="none"/>',
  settings: '<path d="M4 7h8.5M17.5 7H20M4 17h3.5M12.5 17H20"/><circle cx="15" cy="7" r="2.1"/><circle cx="9" cy="17" r="2.1"/>',
  palette: '<path d="M12 4a8 8 0 0 0 0 16c1.3 0 2-.8 2-1.8 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4A8 8 0 0 0 12 4Z"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="11.2" cy="7.4" r="1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="8.6" r="1" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>',
  message: '<path d="M20 12.5a7.5 7.5 0 0 1-7.5 7.5H7l-3.5 2v-4.2A7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8.5 11h7M8.5 14h4.5"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7"/><path d="M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7"/><path d="M10.5 10.5v6M13.5 10.5v6"/>',
  type: '<path d="M5 6.5V5h14v1.5"/><path d="M12 5v14"/><path d="M8.5 19h7"/>',
  'file-text': '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  download: '<path d="M12 4v10"/><path d="m8 10.5 4 4 4-4"/><path d="M5 18.5h14"/>',
  share: '<circle cx="17.5" cy="6" r="2.3"/><circle cx="6.5" cy="12" r="2.3"/><circle cx="17.5" cy="18" r="2.3"/><path d="m8.5 10.9 7-3.8M8.5 13.1l7 3.8"/>',
  leaf: '<path d="M12 20v-8"/><path d="M12 13C8.5 13 6 10.5 6 6.8c3.5 0 6 2.5 6 6.2Z"/><path d="M12 13c3.5 0 6-2.5 6-6.2-3.5 0-6 2.5-6 6.2Z"/>',
  star: '<path d="m12 4 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z"/>',
  flame: '<path d="M12 21c3.6 0 6-2.3 6-5.6 0-2.4-1.4-4.3-3-5.9-1.2-1.2-2.3-2.6-2.6-4.5-1.7 1.2-3.1 3.2-3.1 5.2 0 .9.2 1.7.6 2.4-.8-.2-1.5-.8-1.9-1.5-.7 1.2-1 2.5-1 3.8C8 18.4 10 21 12 21Z"/>',
  gem: '<path d="M7 4h10l3 5-8 11L4 9Z"/><path d="M4 9h16M9 4l3 5 3-5M8 9l4 11 4-11"/>',
  crown: '<path d="M4 8.5 8 12l4-6 4 6 4-3.5-1.5 9.5h-13Z"/><path d="M6.5 20.5h11"/>',
  sparkles: '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z"/><path d="M18.5 16.5 19.3 19l2.2.8-2.2.7-.8 2.5-.7-2.5-2.3-.7 2.3-.8Z"/>',
  'alert-triangle': '<path d="M12 4.5 21 19H3Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m10.5 6.5-5.5 5.5 5.5 5.5"/>',
  key: '<circle cx="8.2" cy="15.8" r="3.6"/><path d="m10.8 13.2 7.6-7.6M15.6 8.4l2.2 2.2M13 11l2.2 2.2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5v2M14 3.5v2M10 18.5v2M14 18.5v2M3.5 10h2M3.5 14h2M18.5 10h2M18.5 14h2"/>',
};

const props = defineProps({
  name: { type: String, required: true },
});

const markup = computed(() => ICONS[props.name] || ICONS['x-circle']);
</script>
