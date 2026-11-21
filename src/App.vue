<template>
  <header v-if="!hideNavbar" class="app-navbar">
    <div class="app-navbar-inner">
      <button v-if="!isTab" class="app-navbar-back" type="button" aria-label="返回" @click="goBack">
        <AppIcon name="chevron-left" />
      </button>
      <span class="app-navbar-title">{{ title }}</span>
    </div>
  </header>

  <div class="app-body" :class="{ 'app-body--tab': isTab, 'app-body--home': isHome }">
    <div ref="scroller" class="page-scroll">
      <router-view :key="viewKey" />
    </div>
  </div>

  <LiquidGlassTabbar v-if="isTab" :items="tabs" :active-path="route.path" @select="goTab" />

  <MpUI />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MpUI from '@/components/MpUI.vue';
import LiquidGlassTabbar from '@/components/LiquidGlassTabbar.vue';
import { navigateBack, switchTab, syncStack } from '@/mp/nav';
import { authState } from '@/utils/auth';
import wx from '@/mp/wx';

const route = useRoute();
const router = useRouter();
const scroller = ref(null);

const tabs = [
  { path: '/', text: '首页', icon: 'home' },
  { path: '/discover', text: '发现', icon: 'compass' },
  { path: '/my', text: '我的', icon: 'user' },
];

const isTab = computed(() => !!route.meta.tab);
// 首页内容按一屏设计，禁止上下滚动
const isHome = computed(() => route.path === '/');
const title = computed(() => route.meta.title || '快背单词');
// 三个 tab 页使用各自的全屏标题区（与首页同一套纸张版式），不再叠加全局标题栏
const hideNavbar = computed(() => !!route.meta.tab);

// 启动时先渲染界面、登录在后台完成。新登录成功（本地没有缓存 token）后，
// 递增 key 重新挂载当前页面，让页面用最新登录态重跑 onLoad/onShow。
// 已有缓存 token 时登录在挂载前完成，不会触发重挂载。
const authEpoch = ref(0);
watch(
  () => authState.loggedIn,
  (loggedIn, wasLoggedIn) => {
    if (loggedIn && !wasLoggedIn) authEpoch.value += 1;
  }
);
const viewKey = computed(() => `${route.fullPath}::${authEpoch.value}`);

function goTab(path) {
  if (route.path === path) return;
  switchTab({ url: path });
}

function goBack() {
  navigateBack({ delta: 1 });
}

watch(
  () => route.fullPath,
  (fullPath) => {
    syncStack(fullPath);
    if (scroller.value) scroller.value.scrollTop = 0;
  }
);

// 登录失败（例如后端未部署 H5 登录接口）时给出一次提示
let authErrorShown = false;
watch(
  () => authState.error,
  (message) => {
    if (!message || authErrorShown) return;
    authErrorShown = true;
    wx.showToast({ title: `登录失败：${message}`, icon: 'none', duration: 2800 });
  },
  { immediate: true }
);
</script>
