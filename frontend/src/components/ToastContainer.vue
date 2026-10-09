<template>
  <Teleport to="body">
    <div
      class="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <TransitionGroup name="toast" tag="ul">
        <li
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast--${t.type}`"
          :role="t.type === 'error' ? 'alert' : 'status'"
        >
          <span class="toast__icon" aria-hidden="true">
            <svg v-if="t.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <svg v-else-if="t.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <svg v-else-if="t.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>

          <div class="toast__body">
            <p v-if="t.title" class="toast__title">{{ t.title }}</p>
            <p class="toast__message">{{ t.message }}</p>
            <button
              v-if="t.action"
              type="button"
              class="toast__action"
              @click="onAction(t)"
            >
              {{ t.action.label }}
            </button>
          </div>

          <button
            type="button"
            class="toast__close"
            :aria-label="`Fermer la notification : ${t.message}`"
            @click="dismiss(t.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </li>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script>
import { storeToRefs } from 'pinia'
import { useToastStore } from '../stores/toastStore.js'

export default {
  name: 'ToastContainer',
  setup() {
    const store = useToastStore()
    const { items: toasts } = storeToRefs(store)
    return { toasts, store }
  },
  methods: {
    dismiss(id) {
      this.store.dismiss(id)
    },
    onAction(toast) {
      try {
        toast.action?.handler?.()
      } finally {
        this.dismiss(toast.id)
      }
    }
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  right: calc(1rem + env(safe-area-inset-right, 0px));
  left: calc(1rem + env(safe-area-inset-left, 0px));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-container ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: contents;
}

.toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.75rem;
  width: 100%;
  max-width: 420px;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--lg-glass-border, rgba(255, 255, 255, 0.15));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 0.9375rem;
  line-height: 1.4;
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  flex-shrink: 0;
}
.toast__icon svg { width: 1.125rem; height: 1.125rem; }

.toast--success .toast__icon { background: rgba(16, 185, 129, 0.18); color: #34d399; }
.toast--error   .toast__icon { background: rgba(244, 63, 94, 0.20);  color: #fb7185; }
.toast--warning .toast__icon { background: rgba(234, 179, 8, 0.20);  color: #fbbf24; }
.toast--info    .toast__icon { background: rgba(99, 102, 241, 0.20); color: #a5b4fc; }

.toast--success { border-left: 3px solid #10b981; }
.toast--error   { border-left: 3px solid #f43f5e; }
.toast--warning { border-left: 3px solid #eab308; }
.toast--info    { border-left: 3px solid #6366f1; }

.toast__body { min-width: 0; }
.toast__title {
  margin: 0 0 0.125rem;
  font-weight: 600;
  font-size: 0.875rem;
}
.toast__message {
  margin: 0;
  word-wrap: break-word;
  color: rgba(255, 255, 255, 0.92);
}
.toast__action {
  margin-top: 0.5rem;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
}
.toast__action:hover { background: rgba(255, 255, 255, 0.18); }

.toast__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.toast__close:hover { background: rgba(255, 255, 255, 0.10); color: #fff; }
.toast__close svg { width: 1rem; height: 1rem; }

/* Animations */
.toast-enter-active { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease; }
.toast-leave-active { transition: transform 0.25s ease-in, opacity 0.2s ease; position: absolute; right: 0; }
.toast-enter-from { transform: translateX(120%); opacity: 0; }
.toast-leave-to   { transform: translateX(120%); opacity: 0; }
.toast-move       { transition: transform 0.3s ease; }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move { transition: opacity 0.15s ease; }
  .toast-enter-from,
  .toast-leave-to { transform: none; }
}
</style>
