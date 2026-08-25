<script setup>
import { nextTick, ref, watch } from 'vue';
import { AlertTriangle, CheckCircle2, Info, X } from '@lucide/vue';
import { dialogState, resolveDialog } from '../dialog.js';

const inputElement = ref(null);
const confirmButton = ref(null);

watch(() => dialogState.open, async (open) => {
  if (!open) return;
  await nextTick();
  (dialogState.input ? inputElement.value : confirmButton.value)?.focus();
});

function confirm() {
  if (dialogState.input?.required && !String(dialogState.inputValue || '').trim()) return;
  resolveDialog(true);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-dialog-fade">
      <div v-if="dialogState.open" class="app-dialog-backdrop" role="presentation" @click.self="resolveDialog(false)" @keydown.esc="resolveDialog(false)">
        <form class="app-dialog-card" :class="dialogState.variant" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message" @submit.prevent="confirm">
          <button class="app-dialog-close" type="button" aria-label="ปิดหน้าต่าง" @click="resolveDialog(false)"><X /></button>
          <div class="app-dialog-icon" aria-hidden="true">
            <AlertTriangle v-if="dialogState.variant === 'danger' || dialogState.variant === 'warning'" />
            <CheckCircle2 v-else-if="dialogState.variant === 'success'" />
            <Info v-else />
          </div>
          <div class="app-dialog-copy">
            <p class="app-dialog-eyebrow">MEETPLANNING</p>
            <h2 id="app-dialog-title">{{ dialogState.title }}</h2>
            <p id="app-dialog-message">{{ dialogState.message }}</p>
          </div>
          <label v-if="dialogState.input" class="app-dialog-input">
            <span>{{ dialogState.input.label }}</span>
            <input ref="inputElement" v-model="dialogState.inputValue" :type="dialogState.input.type" :placeholder="dialogState.input.placeholder" :required="dialogState.input.required" autocomplete="off" />
          </label>
          <div class="app-dialog-actions">
            <button class="app-dialog-cancel" type="button" @click="resolveDialog(false)">{{ dialogState.cancelText }}</button>
            <button ref="confirmButton" class="app-dialog-confirm" :class="dialogState.variant" type="submit">{{ dialogState.confirmText }}</button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
