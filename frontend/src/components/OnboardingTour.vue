<template>
  <!-- Fenêtre modale accessible (BaseModal) : focus initial sur « Suivant », Échap = passer -->
  <BaseModal
    :open="store.visible && !!currentSlide"
    :labelledby="currentSlide ? `onb-title-${currentSlide.id}` : ''"
    transition="onb-fade"
    overlay-class="onb-overlay"
    panel-class="onb-card"
    initial-focus=".onb-btn--primary"
    :close-on-backdrop="false"
    @close="store.skip()"
  >
    <button
      type="button"
      class="onb-skip"
      aria-label="Passer la présentation"
      @click="store.skip()"
    >
      Passer
    </button>

    <!-- Chaque nouvelle étape est annoncée par les lecteurs d'écran -->
    <div aria-live="polite">
      <Transition name="onb-slide" mode="out-in">
        <div v-if="currentSlide" :key="currentSlide.id" class="onb-slide">
          <div class="onb-emoji" aria-hidden="true">{{ currentSlide.emoji }}</div>
          <h2 :id="`onb-title-${currentSlide.id}`" class="onb-title">
            {{ currentSlide.title }}
          </h2>
          <p class="onb-body">{{ currentSlide.body }}</p>
        </div>
      </Transition>
    </div>

    <div class="onb-progress">
      <span class="sr-only">Étape {{ store.currentStep + 1 }} sur {{ store.totalSteps }}</span>
      <span
        v-for="(_, i) in store.steps"
        :key="i"
        class="onb-dot"
        :class="{ 'onb-dot--active': i === store.currentStep, 'onb-dot--done': i < store.currentStep }"
        aria-hidden="true"
      />
    </div>

    <div class="onb-actions">
      <button
        v-if="store.currentStep > 0"
        type="button"
        class="onb-btn onb-btn--ghost"
        @click="store.previous()"
      >
        Précédent
      </button>
      <button
        type="button"
        class="onb-btn onb-btn--primary"
        @click="store.next()"
      >
        {{ store.isLastStep ? 'C\'est parti !' : 'Suivant' }}
      </button>
    </div>
  </BaseModal>
</template>

<script>
import { storeToRefs } from 'pinia'
import { useOnboardingStore } from '../stores/onboardingStore.js'
import BaseModal from './BaseModal.vue'

export default {
  name: 'OnboardingTour',
  components: {
    BaseModal
  },
  setup() {
    const store = useOnboardingStore()
    const { currentSlide } = storeToRefs(store)
    return { store, currentSlide }
  }
}
</script>

<!-- Non scopé : le fond et le panneau sont rendus par BaseModal (classes préfixées onb-) -->
<style>
.onb-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: radial-gradient(ellipse at center, var(--td-backdrop-glow, rgba(76, 29, 149, 0.65)), var(--td-backdrop-deep, rgba(15, 23, 42, 0.85)));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.onb-card {
  position: relative;
  width: 100%;
  max-width: 28rem;
  padding: 2.5rem 1.75rem 1.5rem;
  border-radius: calc(1.75rem * var(--td-radius-scale, 1));
  background: var(--td-surface-raised, rgba(15, 23, 42, 0.7));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  color: #fff;
  text-align: center;
}

.onb-skip {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: calc(0.5rem * var(--td-radius-scale, 1));
  transition: background 0.2s ease, color 0.2s ease;
}
.onb-skip:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

.onb-slide {
  min-height: 14rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 0.5rem;
}

.onb-emoji {
  font-size: 4rem;
  line-height: 1;
  filter: drop-shadow(0 4px 16px var(--td-accent-glow, rgba(167, 139, 250, 0.4)));
}

.onb-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--td-accent-text-gradient, linear-gradient(135deg, #C084FC, #F472B6));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.onb-body {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
  max-width: 22rem;
}

.onb-progress {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.5rem 0;
}

.onb-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.25);
  transition: background 0.3s ease, width 0.3s ease;
}
.onb-dot--active {
  width: 1.5rem;
  background: var(--td-accent-gradient, linear-gradient(90deg, #A78BFA, #EC4899));
}
.onb-dot--done { background: var(--td-accent-muted, rgba(167, 139, 250, 0.6)); }

.onb-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.onb-btn {
  min-height: 48px;
  padding: 0.75rem 1.75rem;
  border-radius: calc(0.875rem * var(--td-radius-scale, 1));
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;
  border: 1px solid transparent;
}
.onb-btn:active { transform: scale(0.97); }

.onb-btn--primary {
  background: var(--td-accent-gradient, linear-gradient(135deg, #8B5CF6, #EC4899));
  color: #fff;
  box-shadow: 0 8px 24px var(--td-accent-glow, rgba(139, 92, 246, 0.4));
}
.onb-btn--primary:hover { box-shadow: 0 12px 32px var(--td-accent-glow-strong, rgba(139, 92, 246, 0.55)); }

.onb-btn--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.15);
}
.onb-btn--ghost:hover { background: rgba(255, 255, 255, 0.14); }

/* Animations */
.onb-fade-enter-active,
.onb-fade-leave-active { transition: opacity 0.25s ease; }
.onb-fade-enter-from,
.onb-fade-leave-to { opacity: 0; }

.onb-slide-enter-active,
.onb-slide-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease; }
.onb-slide-enter-from { transform: translateX(20px); opacity: 0; }
.onb-slide-leave-to   { transform: translateX(-20px); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .onb-fade-enter-active,
  .onb-fade-leave-active,
  .onb-slide-enter-active,
  .onb-slide-leave-active { transition: opacity 0.15s ease; }
  .onb-slide-enter-from,
  .onb-slide-leave-to { transform: none; }
}

@media (max-width: 480px) {
  .onb-card { padding: 2.25rem 1.25rem 1.25rem; }
  .onb-emoji { font-size: 3.25rem; }
  .onb-title { font-size: 1.25rem; }
}
</style>
