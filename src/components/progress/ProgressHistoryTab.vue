<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h3 class="text-xl font-bold text-white mb-3 sm:mb-0">Historique des Quiz</h3>
      <select
        :value="period"
        class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full sm:w-auto"
        @change="$emit('update:period', $event.target.value)"
      >
        <option value="all" class="bg-slate-900">Tous les quiz</option>
        <option value="week" class="bg-slate-900">Cette semaine</option>
        <option value="month" class="bg-slate-900">Ce mois</option>
        <option value="year" class="bg-slate-900">Cette année</option>
      </select>
    </div>

    <div v-if="filteredHistory.length === 0" class="text-center py-12">
      <div class="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">📚</span>
      </div>
      <h4 class="text-xl font-bold text-white mb-2">Aucun quiz trouvé</h4>
      <p class="text-white/60">Commencez par faire des quiz pour voir votre historique ici.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="quiz in filteredHistory"
        :key="quiz.id"
        class="glass-quiz-item"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1">
            <h4 class="text-lg font-bold text-white mb-1">{{ quiz.lessonTitle || 'Quiz' }}</h4>
            <p class="text-white/60 text-sm">{{ formatDate(quiz.completedAt) }}</p>
          </div>
          <div class="text-right">
            <div :class="['px-4 py-2 rounded-xl font-bold text-lg', getScoreClass(quiz.percentage)]">
              {{ formatPercentage(quiz.percentage) }}%
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex space-x-4 text-white/60 text-sm">
            <span>{{ quiz.score }}/{{ quiz.totalQuestions }} questions</span>
            <span>{{ formatDuration(quiz.duration) }}</span>
          </div>
        </div>
        <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            class="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
            :style="{ width: formatPercentage(quiz.percentage) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDate, formatDuration, formatPercentage, getScoreClass, filterHistoryByPeriod } from '../../utils/progressFormatters.js'

export default {
  name: 'ProgressHistoryTab',
  props: {
    history: { type: Array, default: () => [] },
    period:  { type: String, default: 'all' }
  },
  emits: ['update:period'],
  computed: {
    filteredHistory() {
      return filterHistoryByPeriod(this.history, this.period)
    }
  },
  methods: {
    formatDate,
    formatDuration,
    formatPercentage,
    getScoreClass
  }
}
</script>

<style scoped>
.glass-quiz-item {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
}

.glass-quiz-item:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .glass-quiz-item { padding: 1.5rem; border-radius: 1.5rem; }
}
@media (max-width: 480px) {
  .glass-quiz-item { padding: 1rem; border-radius: 1rem; }
}
</style>
