<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center space-x-4 min-w-0">
            <button
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="min-w-0">
              <h1 class="text-2xl font-bold text-white truncate">Aperçu de l'interrogation</h1>
              <p class="text-sm text-white/60 hidden sm:block truncate">
                {{ lesson?.title || 'Chargement…' }}
              </p>
            </div>
          </div>

          <button
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            :disabled="isLoading"
            title="Actualiser"
            @click="loadAll"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <main class="relative z-10 container mx-auto px-6 py-12 space-y-8">
      <div v-if="errorMessage" class="glass-card-dashboard border border-red-400/30">
        <p class="text-red-200 font-medium">{{ errorMessage }}</p>
      </div>

      <!-- Infos leçon -->
      <section class="glass-card-dashboard">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-xl font-bold text-white truncate">{{ lesson?.title || 'Chargement…' }}</h2>
            <p class="text-white/60 mt-2">{{ lesson?.description || 'Aucune description' }}</p>
            <div class="flex flex-wrap items-center gap-2 text-xs text-white/50 mt-4">
              <span class="bg-white/10 px-2 py-1 rounded">{{ lesson?.subject || 'Matière' }}</span>
              <span class="bg-white/10 px-2 py-1 rounded">{{ lesson?.level || 'Niveau' }}</span>
              <span class="bg-white/10 px-2 py-1 rounded">{{ formatDate(lesson?.created_at) }}</span>
              <span v-if="childId" class="bg-white/10 px-2 py-1 rounded">Enfant: #{{ childId }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="childId"
              class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
              :disabled="!lessonId"
              @click="startQuiz"
              title="Lancer le quiz pour cet enfant"
            >
              Lancer le quiz
            </button>
          </div>
        </div>
      </section>

      <!-- Historique quiz pour l'enfant -->
      <section v-if="childId" class="glass-card-dashboard">
        <h3 class="text-xl font-bold text-white mb-6">Historique (cet enfant)</h3>

        <div v-if="quizResults.length === 0" class="text-white/60">
          Aucun résultat pour l’instant.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="r in quizResults"
            :key="r.id"
            class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl"
          >
            <div class="min-w-0">
              <p class="text-white font-medium">Score: {{ formatPercentage(r.percentage) }}%</p>
              <p class="text-white/60 text-sm truncate">{{ formatDate(r.completed_at) }}</p>
            </div>
            <div class="text-right">
              <p class="text-white/80 text-sm">{{ r.score }}/{{ r.total_questions }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Questions / interrogation -->
      <section class="glass-card-dashboard">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Questions</h3>
          <span class="text-white/60 text-sm">{{ questions.length }} question{{ questions.length > 1 ? 's' : '' }}</span>
        </div>

        <div v-if="questions.length === 0" class="text-white/60">
          Aucun contenu d’interrogation trouvé dans cette leçon.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(q, idx) in questions"
            :key="idx"
            class="border border-white/20 rounded-xl p-4 bg-white/5"
          >
            <p class="text-white font-semibold mb-3">
              {{ idx + 1 }}. {{ q.question || q.prompt || q.text || 'Question' }}
            </p>

            <div v-if="Array.isArray(q.options) && q.options.length" class="grid sm:grid-cols-2 gap-2">
              <div
                v-for="(opt, i) in q.options"
                :key="i"
                class="px-3 py-2 rounded-lg border text-sm"
                :class="isCorrectOption(q, opt, i) ? 'border-green-400/40 bg-green-500/15 text-green-100' : 'border-white/15 bg-white/5 text-white/80'"
              >
                {{ opt }}
              </div>
            </div>

            <div v-else class="text-white/70 text-sm">
              <span class="text-white/60">Réponse attendue:</span>
              <span class="font-medium text-white ml-2">{{ getAnswerText(q) }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { LessonService } from '../services/lessonService.js'

export default {
  name: 'LessonDetails',
  props: {
    lessonId: { type: [String, Number], required: false }
  },
  data() {
    return {
      isLoading: false,
      errorMessage: '',
      lesson: null,
      quizResults: []
    }
  },
  computed: {
    resolvedLessonId() {
      return this.lessonId ?? this.$route.params.lessonId
    },
    childId() {
      const v = this.$route.query.childId
      return v ? Number(v) : null
    },
    questions() {
      // Le backend renvoie quiz_data (JSONB) dans lesson.quiz_data
      const qd = this.lesson?.quiz_data
      if (!qd) return []
      const data = typeof qd === 'string' ? this.safeJsonParse(qd) : qd
      const qs = data?.questions
      return Array.isArray(qs) ? qs : []
    }
  },
  async created() {
    await this.loadAll()
  },
  methods: {
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },
    safeJsonParse(value) {
      try {
        return JSON.parse(value)
      } catch (_e) {
        return null
      }
    },
    formatDate(dateString) {
      if (!dateString) return '—'
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    goBack() {
      // Retourner à la page parent, en conservant profile/unlocked
      this.$router.push({
        name: 'ParentQuizManagement',
        query: { ...this.$route.query }
      })
    },
    async loadAll() {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const id = this.resolvedLessonId
        if (!id) {
          this.errorMessage = 'ID de leçon manquant.'
          return
        }

        this.lesson = await LessonService.getLessonById(id)

        if (this.childId) {
          this.quizResults = await LessonService.getQuizResults(id, this.childId)
        } else {
          this.quizResults = []
        }
      } catch (error) {
        console.error('Erreur chargement interrogation:', error)
        this.errorMessage = error?.message || 'Erreur lors du chargement de l’interrogation.'
      } finally {
        this.isLoading = false
      }
    },
    startQuiz() {
      if (!this.childId) return
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          ...this.$route.query,
          childId: this.childId,
          lessonId: this.resolvedLessonId
        }
      })
    },
    getAnswerText(q) {
      return q.correctAnswer ?? q.answer ?? q.correct ?? '—'
    },
    isCorrectOption(q, option, index) {
      const ans = this.getAnswerText(q)
      if (ans === '—' || ans === null || ans === undefined) return false
      // Support: answer peut être l'option elle-même, ou un index (number/string)
      if (typeof ans === 'number') return ans === index
      if (typeof ans === 'string' && ans.trim() !== '' && !Number.isNaN(Number(ans))) {
        return Number(ans) === index
      }
      return String(ans).trim().toLowerCase() === String(option).trim().toLowerCase()
    }
  }
}
</script>


