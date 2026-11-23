<template>
  <div class="page-auth page-forgot">
    <router-link class="auth-back" to="/login" aria-label="返回登录">
      <AppIcon name="chevron-left" />
    </router-link>

    <header class="auth-head">
      <span class="auth-mark"><AppIcon name="key" /></span>
      <h1 class="auth-title">找回密码</h1>
      <p class="auth-sub">提交申请后由管理员帮你重置</p>
    </header>

    <div v-if="submitted" class="auth-card auth-success">
      <span class="auth-success-mark"><AppIcon name="check" /></span>
      <h2 class="auth-success-title">申请已提交</h2>
      <p class="auth-success-text">
        管理员会尽快为手机号 {{ maskedPhone }} 重置密码，重置后使用新密码登录即可。
      </p>
      <router-link class="auth-submit auth-submit--link" to="/login">返回登录</router-link>
    </div>

    <form v-else class="auth-card" @submit.prevent="submit">
      <p class="auth-note">
        当前版本没有短信验证，忘记密码需要管理员在后台重置。提交下面的手机号，管理员处理完后你就能用新密码登录。
      </p>

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
            placeholder="请输入注册时的手机号"
          />
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-label">补充说明（可选）</span>
        <div class="auth-control auth-control--textarea">
          <textarea
            v-model="note"
            class="auth-input auth-textarea"
            maxlength="120"
            rows="2"
            placeholder="方便管理员核对身份，例如昵称、年级"
          ></textarea>
        </div>
      </label>

      <p v-if="error" class="auth-error"><AppIcon name="alert-triangle" />{{ error }}</p>

      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '提交中…' : '提交找回申请' }}
      </button>

      <div class="auth-links auth-links--center">
        <span>想起密码了？</span>
        <router-link to="/login">返回登录</router-link>
      </div>
    </form>

    <p class="auth-foot">为保护账号安全，管理员可能会先联系你确认身份</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { requestPasswordReset } from '@/utils/auth';

const phone = ref('');
const note = ref('');
const error = ref('');
const submitting = ref(false);
const submitted = ref(false);

const maskedPhone = computed(() =>
  phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
);

async function submit() {
  if (submitting.value) return;
  error.value = '';
  const normalized = phone.value.replace(/\s/g, '');
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    error.value = '请输入正确的 11 位手机号';
    return;
  }

  submitting.value = true;
  try {
    const result = await requestPasswordReset(normalized, note.value.trim());
    if (!result.ok) {
      error.value = result.error || '提交失败';
      return;
    }
    phone.value = normalized;
    submitted.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>
