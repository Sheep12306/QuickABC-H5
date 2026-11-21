<template>
  <div class="placeholder-page page-shell">
    <div class="placeholder-card">
      <span class="placeholder-icon"><AppIcon :name="icon" /></span>
      <h1 class="placeholder-title">{{ title }}</h1>
      <p class="placeholder-desc">{{ description }}</p>
      <button class="placeholder-btn" type="button" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '这个功能还在准备中。' },
  icon: { type: String, default: 'sparkles' },
});

const router = useRouter();

function goHome() {
  router.replace('/');
}
</script>
