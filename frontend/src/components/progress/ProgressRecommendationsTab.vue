<template>
  <div class="space-y-6">
    <h3 class="text-xl font-bold text-white mb-6">Recommandations d'apprentissage</h3>

    <div class="space-y-8">
      <!-- Quiz recommandés -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div aria-hidden="true" class="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-green-300">💡</span>
          </div>
          Quiz recommandés
        </h4>
        <p v-if="recommendedQuizzes.length === 0" class="text-white/70 text-sm">
          Aucun quiz à recommander pour le moment : toutes les leçons sont réussies.
        </p>
        <div v-else class="space-y-4">
          <div v-for="quiz in recommendedQuizzes" :key="quiz.id" class="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
            <div class="flex-1">
              <h5 class="text-white font-bold mb-1">{{ quiz.title }}</h5>
              <p class="text-white/70 text-sm mb-2">{{ quiz.description }}</p>
              <div class="flex space-x-4 text-white/70 text-xs">
                <span class="px-2 py-1 bg-white/10 rounded-lg">{{ quiz.subject }}</span>
              </div>
            </div>
            <button
              type="button"
              class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium"
              :aria-label="`Commencer le quiz « ${quiz.title} »`"
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
          <div aria-hidden="true" class="w-8 h-8 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-orange-300">🎯</span>
          </div>
          Points d'amélioration
        </h4>
        <p v-if="improvementAreas.length === 0" class="text-white/70 text-sm">
          Aucune matière sous les 70 % de moyenne : continue comme ça !
        </p>
        <div v-else class="space-y-4">
          <div v-for="area in improvementAreas" :key="area.id" class="flex items-start space-x-4 p-4 bg-white/5 rounded-xl">
            <div aria-hidden="true" class="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              {{ area.icon }}
            </div>
            <div class="flex-1">
              <h5 class="text-white font-bold mb-1">{{ area.title }}</h5>
              <p class="text-white/70 text-sm mb-3">{{ area.description }}</p>
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
