<template>
  <div class="glass-card-dashboard">
    <h3 class="text-xl font-bold text-white mb-6">Quiz récents</h3>
    <div class="space-y-3">
      <div
        v-for="quiz in quizzes"
        :key="quiz.id"
        class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all"
      >
        <div class="flex items-center space-x-3 min-w-0 flex-1">
          <div class="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium text-white truncate">{{ quiz.lessonTitle }}</p>
            <p class="text-white/60 text-sm">{{ formatDate(quiz.completedAt) }}</p>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-3">
          <p class="text-lg font-bold" :class="quiz.score >= 80 ? 'text-green-400' : quiz.score >= 60 ? 'text-yellow-400' : 'text-red-400'">
            {{ quiz.score }}%
          </p>
          <p class="text-white/60 text-xs">{{ quiz.correctAnswers }}/{{ quiz.totalQuestions }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuizRecentList',
  props: {
    quizzes: {
      type: Array,
      required: true
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
    }
  }
}
</script>
