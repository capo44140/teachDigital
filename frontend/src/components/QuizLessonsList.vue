<template>
  <div class="glass-card-dashboard">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h3 class="text-xl font-bold text-white mb-3 sm:mb-0">Leçons</h3>
      <select
        :value="filterStatus"
        class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all w-full sm:w-auto"
        @change="$emit('update:filterStatus', $event.target.value)"
      >
        <option value="all" class="bg-slate-900">Toutes les leçons</option>
        <option value="completed" class="bg-slate-900">Quiz complétés</option>
        <option value="pending" class="bg-slate-900">Quiz en attente</option>
      </select>
    </div>

    <div v-if="filteredLessons.length === 0" class="text-center py-12">
      <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </div>
      <p class="text-white/60">Aucune leçon trouvée</p>
      <p class="text-white/40 text-sm mt-1">Créez des leçons avec le scanner</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="lesson in filteredLessons"
        :key="lesson.id"
        class="border border-white/20 rounded-xl p-4 hover:bg-white/10 transition-all"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
              <h4 class="font-bold text-white truncate">{{ lesson.title }}</h4>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 w-fit mt-1 sm:mt-0',
                  lesson.quizCompleted
                    ? 'bg-green-500/30 text-green-200'
                    : 'bg-yellow-500/30 text-yellow-200'
                ]"
              >
                <svg v-if="lesson.quizCompleted" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
                <span>{{ lesson.quizCompleted ? 'Complété' : 'En attente' }}</span>
              </span>
            </div>
            <p class="text-white/60 text-sm mb-2 line-clamp-2">{{ lesson.description || 'Aucune description' }}</p>
          </div>

          <div v-if="lesson.quizCompleted" class="flex-shrink-0 ml-3 sm:hidden">
            <div class="w-10 h-10 rounded-full flex items-center justify-center"
                 :class="lesson.bestScore >= 80 ? 'bg-green-500/30' : lesson.bestScore >= 60 ? 'bg-yellow-500/30' : 'bg-red-500/30'">
              <span class="text-sm font-bold"
                    :class="lesson.bestScore >= 80 ? 'text-green-200' : lesson.bestScore >= 60 ? 'text-yellow-200' : 'text-red-200'">
                {{ formatPercentage(lesson.bestScore) }}%
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-white/50 mb-3">
          <span class="bg-white/10 px-2 py-1 rounded">{{ lesson.subject || 'Matière' }}</span>
          <span class="bg-white/10 px-2 py-1 rounded">{{ lesson.level || 'Niveau' }}</span>
          <span class="bg-white/10 px-2 py-1 rounded">{{ formatDate(lesson.created_at) }}</span>
        </div>

        <div class="hidden sm:flex items-center justify-between">
          <div v-if="lesson.quizCompleted" class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-full flex items-center justify-center"
                 :class="lesson.bestScore >= 80 ? 'bg-green-500/30' : lesson.bestScore >= 60 ? 'bg-yellow-500/30' : 'bg-red-500/30'">
              <span class="text-lg font-bold"
                    :class="lesson.bestScore >= 80 ? 'text-green-200' : lesson.bestScore >= 60 ? 'text-yellow-200' : 'text-red-200'">
                {{ formatPercentage(lesson.bestScore) }}%
              </span>
            </div>
            <div>
              <p class="text-white font-medium text-sm">Meilleur score</p>
              <p class="text-white/60 text-xs">{{ lesson.totalAttempts }} tentative{{ lesson.totalAttempts > 1 ? 's' : '' }}</p>
            </div>
          </div>

          <div class="flex space-x-2">
            <button
              class="p-2 text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Voir les détails"
              @click="$emit('view-lesson', lesson)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>

            <button
              v-if="!lesson.quizCompleted"
              class="p-2 text-green-400/60 hover:text-green-300 border border-green-400/20 hover:border-green-400/40 rounded-lg backdrop-blur-xl hover:bg-green-400/10 transition-all"
              title="Commencer le quiz"
              @click="$emit('start-quiz', lesson)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z"/>
              </svg>
            </button>

            <button
              class="p-2 text-red-400/60 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg backdrop-blur-xl hover:bg-red-400/10 transition-all"
              title="Supprimer la leçon"
              @click="$emit('delete-lesson', lesson)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuizLessonsList',
  props: {
    lessons: {
      type: Array,
      required: true
    },
    filterStatus: {
      type: String,
      default: 'all'
    },
    selectedChildId: {
      type: [Number, String],
      default: null
    }
  },
  emits: ['update:filterStatus', 'view-lesson', 'start-quiz', 'delete-lesson'],
  computed: {
    filteredLessons() {
      switch (this.filterStatus) {
        case 'completed':
          return this.lessons.filter(lesson => lesson.quizCompleted)
        case 'pending':
          return this.lessons.filter(lesson => !lesson.quizCompleted)
        default:
          return this.lessons
      }
    }
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    }
  }
}
</script>
