<template>
  <div class="page-auth page-register">
    <router-link class="auth-back" to="/login" aria-label="返回登录">
      <AppIcon name="chevron-left" />
    </router-link>

    <header class="auth-head">
      <span class="auth-mark"><AppIcon name="leaf" /></span>
      <h1 class="auth-title">创建账号</h1>
      <p class="auth-sub">用手机号注册，学习记录跟着账号走</p>
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
        <span class="auth-label">昵称</span>
        <div class="auth-control">
          <AppIcon name="edit" class="auth-icon" />
          <input
            v-model="nickname"
            class="auth-input"
            maxlength="20"
            autocomplete="nickname"
            placeholder="怎么称呼你"
          />
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-label">年级</span>
        <div class="auth-control">
          <AppIcon name="book-open" class="auth-icon" />
          <select v-model="grade" class="auth-input auth-select">
            <option value="" disabled>请选择年级</option>
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-label">出生日期</span>
        <div class="auth-control">
          <AppIcon name="calendar" class="auth-icon" />
          <input
            v-model="birthday"
            class="auth-input auth-input--date"
            type="date"
            :max="maxBirthday"
            min="1900-01-01"
            autocomplete="bday"
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
            autocomplete="new-password"
            placeholder="至少 6 位"
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

      <label class="auth-field">
        <span class="auth-label">确认密码</span>
        <div class="auth-control">
          <AppIcon name="key" class="auth-icon" />
          <input
            v-model="confirmPassword"
            class="auth-input"
            type="password"
            maxlength="64"
            autocomplete="new-password"
            placeholder="再输入一次密码"
          />
        </div>
      </label>

      <p v-if="error" class="auth-error"><AppIcon name="alert-triangle" />{{ error }}</p>

      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '注册中…' : '注册并登录' }}
      </button>

      <div class="auth-links auth-links--center">
        <span>已有账号？</span>
        <router-link to="/login">直接登录</router-link>
      </div>
    </form>

    <p class="auth-foot">注册后可用手机号和密码登录</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '@/utils/auth';

const grades = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三', '高一', '高二', '高三',
];

function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const router = useRouter();
const phone = ref('');
const nickname = ref('');
const grade = ref('');
const birthday = ref('');
const maxBirthday = todayIso();
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const error = ref('');
const submitting = ref(false);

async function submit() {
  if (submitting.value) return;
  error.value = '';

  const normalized = phone.value.replace(/\s/g, '');
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    error.value = '请输入正确的 11 位手机号';
    return;
  }
  if (!nickname.value.trim()) {
    error.value = '请填写昵称';
    return;
  }
  if (!grade.value) {
    error.value = '请选择年级';
    return;
  }
  if (!birthday.value) {
    error.value = '请选择出生日期';
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday.value) || birthday.value > maxBirthday) {
    error.value = '出生日期不正确';
    return;
  }
  if (password.value.length < 6) {
    error.value = '密码至少 6 位';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }

  submitting.value = true;
  try {
    const result = await register({
      phone: normalized,
      password: password.value,
      nickname: nickname.value.trim(),
      grade: grade.value,
      birthday: birthday.value,
    });
    if (!result.ok) {
      error.value = result.error || '注册失败';
      return;
    }
    router.replace('/');
  } finally {
    submitting.value = false;
  }
}
</script>
