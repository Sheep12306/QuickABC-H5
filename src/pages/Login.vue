<template>
  <div class="page-auth page-login">
    <header class="auth-head">
      <span class="auth-mark"><AppIcon name="leaf" /></span>
      <h1 class="auth-title">快背单词</h1>
      <p class="auth-sub">登录后同步你的学习记录</p>
    </header>

    <form class="auth-card" @submit.prevent="submit">
      <label class="auth-field">
        <span class="auth-label">手机号</span>
        <div class="auth-control">
          <AppIcon name="user" class="auth-icon" />
          <input
            v-model="phone"
            class="auth-input auth-input--num"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            autocomplete="tel"
            placeholder="请输入 11 位手机号"
          />
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-label">密码</span>
        <div class="auth-control">
          <AppIcon name="key" class="auth-icon" />
          <input
            v-model="password"
            class="auth-input"
            :type="showPassword ? 'text' : 'password'"
            maxlength="64"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
          <button
            class="auth-eye"
            type="button"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
          </button>
        </div>
      </label>

      <p v-if="error" class="auth-error"><AppIcon name="alert-triangle" />{{ error }}</p>

      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </button>

      <div class="auth-links">
        <router-link to="/register">注册账号</router-link>
        <router-link to="/forgot-password">忘记密码</router-link>
      </div>
    </form>

    <p class="auth-foot">手机号即账号，请妥善保管密码</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '@/utils/auth';

const route = useRoute();
const router = useRouter();

const phone = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const submitting = ref(false);

function safeRedirect() {
  const target = route.query.redirect;
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

async function submit() {
  if (submitting.value) return;
  error.value = '';
  const normalized = phone.value.replace(/\s/g, '');
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    error.value = '请输入正确的 11 位手机号';
    return;
  }
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }

  submitting.value = true;
  try {
    const result = await login(normalized, password.value);
    if (!result.ok) {
      error.value = result.error || '登录失败';
      return;
    }
    router.replace(safeRedirect());
  } finally {
    submitting.value = false;
  }
}
</script>
