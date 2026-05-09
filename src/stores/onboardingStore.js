import { defineStore } from 'pinia'

const STORAGE_PREFIX = 'td_onboarding_v1_'

const KID_STEPS = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'Bienvenue {name} !',
    body: 'TeachDigital, c\'est ton espace pour apprendre en t\'amusant. Laisse-toi guider, ça prend 30 secondes.'
  },
  {
    id: 'quizzes',
    emoji: '📝',
    title: 'Tes quiz',
    body: 'Tu trouveras tes quiz et leçons sur ton tableau de bord. Chaque bonne réponse te rapporte des points.'
  },
  {
    id: 'badges',
    emoji: '🏆',
    title: 'Tes badges',
    body: 'En réussissant tes activités, tu débloques des badges. Plus tu progresses, plus ta collection grandit !'
  },
  {
    id: 'help',
    emoji: '💡',
    title: 'Besoin d\'aide ?',
    body: 'Si tu ne sais plus quoi faire, ouvre l\'aide depuis le menu. Tes parents peuvent aussi t\'accompagner. C\'est parti !'
  }
]

function storageKey(profileId) {
  return `${STORAGE_PREFIX}${profileId ?? 'anon'}`
}

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    visible: false,
    currentStep: 0,
    profileId: null,
    profileName: '',
    steps: []
  }),

  getters: {
    totalSteps: (state) => state.steps.length,
    currentSlide: (state) => state.steps[state.currentStep] ?? null,
    isLastStep: (state) => state.currentStep >= state.steps.length - 1
  },

  actions: {
    /**
     * Démarre le tour pour le profil donné s'il ne l'a pas déjà vu.
     * @param {{ id: number|string, name?: string, is_child?: boolean, is_teen?: boolean }} profile
     */
    startForProfileIfNeeded(profile) {
      if (!profile?.id) return false
      if (this.hasCompleted(profile.id)) return false
      // Pour l'instant, on cible enfants ET ados. À ajuster si besoin.
      const eligible = profile.is_child || profile.is_teen
      if (!eligible) return false
      this.start(profile)
      return true
    },

    start(profile) {
      this.profileId = profile.id
      this.profileName = profile.name || ''
      this.steps = KID_STEPS.map(s => ({
        ...s,
        title: s.title.replace('{name}', this.profileName || '')
      }))
      this.currentStep = 0
      this.visible = true
    },

    next() {
      if (this.isLastStep) {
        this.complete()
      } else {
        this.currentStep += 1
      }
    },

    previous() {
      if (this.currentStep > 0) this.currentStep -= 1
    },

    skip() {
      this.markCompleted(this.profileId)
      this.visible = false
    },

    complete() {
      this.markCompleted(this.profileId)
      this.visible = false
    },

    markCompleted(profileId) {
      try {
        localStorage.setItem(storageKey(profileId), JSON.stringify({
          completedAt: new Date().toISOString()
        }))
      } catch (_) { /* localStorage indispo (mode privé) : on ignore */ }
    },

    hasCompleted(profileId) {
      try {
        return !!localStorage.getItem(storageKey(profileId))
      } catch (_) {
        return false
      }
    },

    /** Permet aux parents de réinitialiser l'onboarding d'un enfant depuis les settings. */
    reset(profileId) {
      try {
        localStorage.removeItem(storageKey(profileId))
      } catch (_) { /* idem */ }
    }
  }
})
