<template>
  <div class="space-y-6">
    <h3 class="text-xl font-bold text-white mb-6">Recommandations d'apprentissage</h3>

    <div class="space-y-8">
      <!-- Quiz recommandés -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-green-300">💡</span>
          </div>
          Quiz recommandés
        </h4>
        <div class="space-y-4">
          <div v-for="quiz in recommendedQuizzes" :key="quiz.id" class="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
            <div class="flex-1">
              <h5 class="text-white font-bold mb-1">{{ quiz.title }}</h5>
              <p class="text-white/60 text-sm mb-2">{{ quiz.description }}</p>
              <div class="flex space-x-4 text-white/60 text-xs">
                <span class="px-2 py-1 bg-white/10 rounded-lg">{{ quiz.difficulty }}</span>
                <span class="px-2 py-1 bg-white/10 rounded-lg">{{ quiz.estimatedTime }} min</span>
              </div>
            </div>
            <button
              class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium"
              @click="$emit('start-quiz', quiz)"
            >
              Commencer
            </button>
          </div>
        </div>
      </div>

      <!-- Points d'amélioration -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-orange-300">🎯</span>
          </div>
          Points d'amélioration
        </h4>
        <div class="space-y-4">
          <div v-for="area in improvementAreas" :key="area.id" class="flex items-start space-x-4 p-4 bg-white/5 rounded-xl">
            <div class="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              {{ area.icon }}
            </div>
            <div class="flex-1">
              <h5 class="text-white font-bold mb-1">{{ area.title }}</h5>
              <p class="text-white/60 text-sm mb-3">{{ area.description }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="suggestion in area.suggestions" :key="suggestion" class="px-3 py-1 bg-white/10 text-white/80 text-xs rounded-lg">
                  {{ suggestion }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProgressRecommendationsTab',
  props: {
    recommendedQuizzes: { type: Array, default: () => [] },
    improvementAreas:   { type: Array, default: () => [] }
  },
  emits: ['start-quiz']
}
</script>

<style scoped>
.glass-stat-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
}

.glass-stat-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .glass-stat-card { padding: 1.5rem; border-radius: 1.5rem; }
}
@media (max-width: 480px) {
  .glass-stat-card { padding: 1rem; border-radius: 1rem; }
}
</style>
