<template>
  <div class="mp-progress" :style="{ height: heightPx, background: backgroundColor }">
    <div
      class="mp-progress-fill"
      :style="{ width: safePercent + '%', background: activeColor }"
    ></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  percent: { type: [Number, String], default: 0 },
  strokeWidth: { type: [Number, String], default: 6 },
  activeColor: { type: String, default: '#326d43' },
  backgroundColor: { type: String, default: 'rgba(50,109,67,0.10)' },
});

const safePercent = computed(() => {
  const n = Number(props.percent) || 0;
  return Math.max(0, Math.min(100, n));
});

// 小程序 stroke-width 以 px 计
const heightPx = computed(() => `${Number(props.strokeWidth) || 6}px`);
</script>
