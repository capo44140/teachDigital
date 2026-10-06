<template>
  <div class="h-dvh flex flex-col bg-slate-900">
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="flex items-center gap-3 px-4 py-3">
        <button
          class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all flex-shrink-0"
          title="Retour à mon espace"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-bold text-white truncate">{{ coursePage?.title || 'Mon cours' }}</h1>
          <p v-if="coursePage?.subject" class="text-xs text-white/60 truncate">{{ coursePage.subject }}</p>
        </div>
        <!-- Score de la session, remonté par le quiz de la page -->
        <div v-if="progress.total > 0" class="flex items-center gap-2 text-sm flex-shrink-0" aria-live="polite">
          <span class="px-3 py-1 rounded-full bg-white/10 text-white font-bold tabular-nums">{{ progress.ok }}/{{ progress.total }}</span>
          <span v-if="progress.streak >= 2" class="px-2 py-1 rounded-full bg-orange-500/30 text-orange-200 text-xs font-bold" title="Bonnes réponses d'affilée">🔥 {{ progress.streak }}</span>
          <span v-if="resultId" class="text-xs text-white/50 hidden sm:inline" title="Cette session compte dans tes progrès">Enregistré</span>
        </div>
      </nav>
    </header>

    <main class="flex-1 min-h-0">
      <div v-if="isLoading" class="h-full flex flex-col items-center justify-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
        <p class="text-white/60">Chargement du cours...</p>
      </div>
      <div v-else-if="errorMessage" class="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p class="text-white/80 text-lg">{{ errorMessage }}</p>
        <button class="px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all" @click="goBack">
          Retour à mon espace
        </button>
      </div>
      <CoursePageFrame v-else :html="coursePage.html_content" :title="coursePage.title" @progress="onProgress" />
    </main>
  </div>
</template>

<script>
import { apiService } from '../services/apiService.js'
import CoursePageFrame from './CoursePageFrame.vue'

// Une session compte comme un quiz à partir de 5 réponses ; ensuite on sauvegarde
// toutes les 5 réponses, et à la sortie de la page.
const MIN_ANSWERS = 5
const SAVE_EVERY = 5

export default {
  name: 'CoursePageViewer',
  components: { CoursePageFrame },
  props: {
    id: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      coursePage: null,
      isLoading: true,
      errorMessage: null,
      progress: { ok: 0, total: 0, streak: 0, bestStreak: 0 },
      resultId: null,
      savedTotal: 0,
      saving: null
    }
  },
  computed: {
    profileId() {
      return this.$route.query.profile
    },
    hasUnsavedProgress() {
      return this.progress.total >= MIN_ANSWERS && this.progress.total > this.savedTotal
    }
  },
  async created() {
    try {
      this.coursePage = await apiService.getCoursePage(this.id)
      if (!this.coursePage) {
        this.errorMessage = 'Ce cours est introuvable.'
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la page de cours:', error)
      this.errorMessage = 'Ce cours n\'est pas disponible pour le moment.'
    } finally {
      this.isLoading = false
    }
  },
  mounted() {
    // Fermeture de l'onglet ou retour à l'écran d'accueil sur mobile
    this.onPageHide = () => this.saveProgress({ keepalive: true })
    window.addEventListener('pagehide', this.onPageHide)
  },
  beforeUnmount() {
    window.removeEventListener('pagehide', this.onPageHide)
  },
  beforeRouteLeave() {
    this.saveProgress({ keepalive: true })
  },
  methods: {
    goBack() {
      this.$router.push({
        name: 'UserDashboard',
        query: { profile: this.profileId }
      })
    },

    onProgress({ ok, total, streak }) {
      this.progress = { ok, total, streak, bestStreak: Math.max(this.progress.bestStreak, streak) }
      const dueForSave = this.resultId ? total - this.savedTotal >= SAVE_EVERY : total >= MIN_ANSWERS
      if (dueForSave) this.saveProgress()
    },

    async saveProgress({ keepalive = false } = {}) {
      if (!this.hasUnsavedProgress || !this.profileId || this.saving) return
      const { ok, total, bestStreak } = this.progress
      const payload = {
        profileId: this.profileId,
        score: ok,
        totalQuestions: total,
        answers: { source: 'course_page', bestStreak }
      }

      this.saving = (async () => {
        try {
          const data = this.resultId
            ? await apiService.updateCoursePageResult(this.id, this.resultId, payload, { keepalive })
            : await apiService.saveCoursePageResult(this.id, payload)
          if (!data) return
          this.resultId = this.resultId || data.result?.id || null
          this.savedTotal = total
          for (const badge of data.unlockedBadges || []) {
            this.$toast?.success(`${badge.icon || '🏅'} Badge débloqué : ${badge.name}`, { duration: 6000 })
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde de la session:', error)
        } finally {
          this.saving = null
        }
      })()
      return this.saving
    }
  }
}
</script>
