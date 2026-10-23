<template>
  <BaseModal
    :open="state.open"
    role="alertdialog"
    labelledby="confirm-dialog-title"
    describedby="confirm-dialog-message"
    initial-focus=".confirm-dialog__button--secondary"
    overlay-class="confirm-overlay"
    panel-class="confirm-dialog"
    @close="cancel"
  >
    <h2 id="confirm-dialog-title" class="confirm-dialog__title">{{ state.title }}</h2>
    <p id="confirm-dialog-message" class="confirm-dialog__message">{{ state.message }}</p>
    <div class="confirm-dialog__actions">
      <!-- Action potentiellement destructive : le focus initial va sur « Annuler » -->
      <button
        type="button"
        class="confirm-dialog__button confirm-dialog__button--secondary"
        @click="cancel"
      >
        {{ state.cancelLabel }}
      </button>
      <button
        type="button"
        class="confirm-dialog__button"
        :class="state.danger ? 'confirm-dialog__button--danger' : 'confirm-dialog__button--primary'"
        @click="accept"
      >
        {{ state.confirmLabel }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import { confirmState as state, settleConfirm } from '../composables/useConfirm.js'

// Focus initial, piège à focus, Échap et restauration du focus : assurés par BaseModal
function accept () {
  settleConfirm(true)
}

function cancel () {
  settleConfirm(false)
}
</script>

<!-- Non scopé : le fond et le panneau sont rendus par BaseModal (classes préfixées confirm-) -->
<style>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.7);
}

.confirm-dialog {
  width: 100%;
  max-width: 28rem;
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: #1e1b4b;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.confirm-dialog__title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.confirm-dialog__message {
  margin: 0 0 1.5rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  white-space: pre-line;
}

.confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.confirm-dialog__button {
  min-height: 2.75rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.confirm-dialog__button--secondary {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.confirm-dialog__button--secondary:hover {
  background: rgba(255, 255, 255, 0.18);
}

.confirm-dialog__button--primary {
  background: #7c3aed;
  color: #fff;
}

.confirm-dialog__button--primary:hover {
  background: #6d28d9;
}

.confirm-dialog__button--danger {
  background: #dc2626;
  color: #fff;
}

.confirm-dialog__button--danger:hover {
  background: #b91c1c;
}
</style>
