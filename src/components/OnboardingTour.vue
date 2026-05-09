<template>
  <Teleport to="body">
    <Transition name="onb-fade">
      <div
        v-if="store.visible && currentSlide"
        class="onb-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`onb-title-${currentSlide.id}`"
        @keydown.esc="store.skip()"
      >
        <div class="onb-card">
          <button
            type="button"
            class="onb-skip"
            aria-label="Passer la présentation"
            @click="store.skip()"
          >
            Passer
          </button>

          <Transition name="onb-slide" mode="out-in">
            <div :key="currentSlide.id" class="onb-slide">
              <div class="onb-emoji" aria-hidden="true">{{ currentSlide.emoji }}</div>
              <h2 :id="`onb-title-${currentSlide.id}`" class="onb-title">
                {{ currentSlide.title }}
              </h2>
              <p class="onb-body">{{ currentSlide.body }}</p>
            </div>
          </Transition>

          <div class="onb-progress" :aria-label="`Étape ${store.currentStep + 1} sur ${store.totalSteps}`">
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
              ref="nextBtn"
              type="button"
              class="onb-btn onb-btn--primary"
              @click="store.next()"
            >
              {{ store.isLastStep ? 'C\'est parti !' : 'Suivant' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { storeToRefs } from 'pinia'
import { useOnboardingStore } from '../stores/onboardingStore.js'

export default {
  name: 'OnboardingTour',
  setup() {
    const store = useOnboardingStore()
    const { currentSlide } = storeToRefs(store)
    return { store, currentSlide }
  },
  watch: {
    'store.visible'(visible) {
      if (visible) {
        // Focus le bouton "Suivant" pour la nav clavier
        this.$nextTick(() => {
          this.$refs.nextBtn?.focus()
        })
      }
    }
  }
}
</script>

<style scoped>
.onb-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: radial-gradient(ellipse at center, rgba(76, 29, 149, 0.65), rgba(15, 23, 42, 0.85));
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
  border-radius: 1.75rem;
  background: rgba(15, 23, 42, 0.7);
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
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 0.5rem;
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
  filter: drop-shadow(0 4px 16px rgba(167, 139, 250, 0.4));
}

.onb-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #C084FC, #F472B6);
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
  background: linear-gradient(90deg, #A78BFA, #EC4899);
}
.onb-dot--done { background: rgba(167, 139, 250, 0.6); }

.onb-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.onb-btn {
  min-height: 48px;
  padding: 0.75rem 1.75rem;
  border-radius: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;
  border: 1px solid transparent;
}
.onb-btn:active { transform: scale(0.97); }

.onb-btn--primary {
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  color: #fff;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
}
.onb-btn--primary:hover { box-shadow: 0 12px 32px rgba(139, 92, 246, 0.55); }

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
