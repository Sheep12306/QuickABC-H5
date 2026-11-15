<template>
  <header class="app-navbar">
    <div class="app-navbar-inner">
      <button v-if="!isTab" class="app-navbar-back" @click="goBack">
        <span>‹</span> 返回
      </button>
      <span class="app-navbar-title">{{ title }}</span>
    </div>
  </header>

  <div class="app-body">
    <div ref="scroller" class="page-scroll">
      <router-view :key="viewKey" />
    </div>
  </div>

  <nav v-if="isTab" class="app-tabbar">
    <button
      v-for="item in tabs"
      :key="item.path"
      class="app-tab-item"
      :class="{ active: isActive(item.path) }"
      @click="goTab(item.path)"
    >
      <img class="app-tab-icon" :src="isActive(item.path) ? item.activeIcon : item.icon" alt="" />
      <span>{{ item.text }}</span>
    </button>
  </nav>

  <MpUI />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MpUI from '@/components/MpUI.vue';
import { navigateBack, switchTab, syncStack } from '@/mp/nav';
import { authState } from '@/utils/auth';
import wx from '@/mp/wx';

const route = useRoute();
const router = useRouter();
const scroller = ref(null);

const tabs = [
  { path: '/', text: '单词', icon: '/images/tab/word.png', activeIcon: '/images/tab/word-active.png' },
  { path: '/discover', text: '发现', icon: '/images/tab/discover.png', activeIcon: '/images/tab/discover-active.png' },
  { path: '/my', text: '我的', icon: '/images/tab/my.png', activeIcon: '/images/tab/my-active.png' },
];

const isTab = computed(() => !!route.meta.tab);
const title = computed(() => route.meta.title || '快背单词');

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

function isActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

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
