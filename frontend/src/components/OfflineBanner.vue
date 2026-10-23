<template>
  <!-- Région live toujours présente : son contenu est annoncé quand la connexion change -->
  <div class="offline-banner-region" role="status" aria-live="polite">
    <p v-if="!isOnline" class="offline-banner">
      <svg class="offline-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>Hors ligne : les pages restent consultables, mais rien ne peut être chargé ni enregistré.</span>
    </p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const isOnline = ref(typeof navigator === 'undefined' || navigator.onLine !== false)

function updateStatus () {
  isOnline.value = navigator.onLine !== false
}

onMounted(() => {
  window.addEventListener('online', updateStatus)
  window.addEventListener('offline', updateStatus)
  updateStatus()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateStatus)
  window.removeEventListener('offline', updateStatus)
})
</script>

<style scoped>
.offline-banner-region {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  pointer-events: none;
}

.offline-banner {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 40rem;
  margin: 0;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: #78350f;
  border: 1px solid #f59e0b;
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.35;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.offline-banner__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
</style>
