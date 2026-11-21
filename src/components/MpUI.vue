<template>
  <!-- Toast -->
  <div v-if="uiState.toast" class="mp-toast">
    <AppIcon v-if="uiState.toast.icon === 'success'" name="check" class="mp-toast-icon is-success" />
    <AppIcon v-else-if="uiState.toast.icon === 'error'" name="close" class="mp-toast-icon is-error" />
    <span v-else-if="uiState.toast.icon === 'loading'" class="mp-toast-icon">…</span>
    {{ uiState.toast.title }}
  </div>

  <!-- Loading -->
  <div v-if="uiState.loading" class="mp-loading-mask">
    <div class="mp-loading-box">
      <div class="mp-spinner"></div>
      <span>{{ uiState.loadingText }}</span>
    </div>
  </div>

  <!-- Modal -->
  <div v-if="uiState.modal" class="mp-modal-mask">
    <div class="mp-modal">
      <div v-if="uiState.modal.title" class="mp-modal-title">{{ uiState.modal.title }}</div>
      <div class="mp-modal-body">
        <template v-if="uiState.modal.content">{{ uiState.modal.content }}</template>
        <textarea
          v-if="uiState.modal.editable"
          v-model="uiState.modal.value"
          class="mp-modal-input"
          :placeholder="uiState.modal.placeholderText"
          rows="2"
          autofocus
        ></textarea>
      </div>
      <div class="mp-modal-actions">
        <button
          v-if="uiState.modal.showCancel"
          class="mp-modal-btn"
          @click="closeModal(false)"
        >
          {{ uiState.modal.cancelText }}
        </button>
        <button class="mp-modal-btn primary" @click="closeModal(true)">
          {{ uiState.modal.confirmText }}
        </button>
      </div>
    </div>
  </div>

  <!-- ActionSheet -->
  <div v-if="uiState.actionSheet" class="mp-sheet-mask" @click.self="closeActionSheet(null)">
    <div class="mp-sheet">
      <button
        v-for="(item, index) in uiState.actionSheet.itemList"
        :key="index"
        class="mp-sheet-item"
        @click="closeActionSheet(index)"
      >
        {{ item }}
      </button>
      <button class="mp-sheet-item mp-sheet-cancel" @click="closeActionSheet(null)">取消</button>
    </div>
  </div>
</template>

<script setup>
import { uiState, closeModal, closeActionSheet } from '@/mp/wx';
</script>
