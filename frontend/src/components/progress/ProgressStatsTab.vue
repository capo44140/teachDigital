<template>
  <div class="space-y-6">
    <h3 class="text-xl font-bold text-white mb-6">Statistiques Détaillées</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Score moyen par type de quiz -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-blue-300">📊</span>
          </div>
          Score moyen par type
        </h4>
        <div class="space-y-4">
          <div v-for="type in scoreByType" :key="type.type" class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-white/80 font-medium">{{ type.type }}</span>
              <span class="text-white font-bold">{{ type.averageScore }}%</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                :style="{ width: type.averageScore + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progrès mensuel -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-green-300">📅</span>
          </div>
          Progrès mensuel
        </h4>
        <div class="space-y-3">
          <div v-for="month in monthlyProgress" :key="month.month" class="flex justify-between items-center p-3 bg-white/5 rounded-xl">
            <div>
              <span class="text-white font-medium">{{ month.month }}</span>
              <p class="text-white/60 text-sm">{{ month.quizCount }} quiz</p>
            </div>
            <div class="text-right">
              <span class="text-white font-bold">{{ month.averageScore }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Série & niveau -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-orange-300">🔥</span>
          </div>
          Série & niveau
        </h4>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-4 bg-white/5 rounded-xl">
            <div class="text-2xl font-bold text-white mb-1">{{ summary?.streaks?.current || 0 }}</div>
            <div class="text-white/60 text-sm">Jours de suite</div>
          </div>
          <div class="text-center p-4 bg-white/5 rounded-xl">
            <div class="text-2xl font-bold text-white mb-1">{{ summary?.streaks?.best || 0 }}</div>
            <div class="text-white/60 text-sm">Meilleure série</div>
          </div>
        </div>

        <div class="mt-6 p-4 bg-white/5 rounded-xl">
          <div class="flex items-center justify-between mb-2">
            <div class="text-white font-bold">
              Niveau {{ summary?.xp?.level || 1 }}
              <span class="text-white/60 font-medium ml-2">({{ summary?.xp?.total || 0 }} XP)</span>
            </div>
            <div class="text-white/80 text-sm">
              {{ summary?.xp?.xpInLevel || 0 }}/{{ summary?.xp?.xpForNextLevel || 500 }}
            </div>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              class="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500"
              :style="{ width: (summary?.xp?.levelProgressPercent || 0) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Objectifs hebdo -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-cyan-300">🎯</span>
          </div>
          Objectifs de la semaine
        </h4>
        <div v-if="!summary?.weeklyGoals || summary.weeklyGoals.length === 0" class="text-white/60">
          Aucun objectif défini.
        </div>
        <div v-else class="space-y-4">
          <div v-for="goal in summary.weeklyGoals" :key="goal.id" class="p-4 bg-white/5 rounded-xl">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-white font-bold">{{ goal.title }}</div>
                <div class="text-white/60 text-sm">{{ goal.description }}</div>
              </div>
              <div class="text-right">
                <div class="text-white font-bold">{{ goal.current }}/{{ goal.target }}</div>
                <div class="text-white/60 text-xs">+{{ goal.rewardXp }} XP</div>
              </div>
            </div>
            <div class="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                :style="{ width: (goal.progressPercent || 0) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Objectifs et récompenses -->
      <div class="glass-stat-card">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-lg flex items-center justify-center mr-3">
            <span class="text-yellow-300">🏆</span>
          </div>
          Objectifs et récompenses
        </h4>
        <div class="space-y-4">
          <div v-for="achievement in achievements" :key="achievement.id" class="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
            <div :class="[
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
              achievement.unlocked
                ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30'
                : 'bg-white/10'
            ]">
              {{ achievement.icon }}
            </div>
            <div class="flex-1">
              <h5 class="text-white font-bold">{{ achievement.title }}</h5>
              <p class="text-white/60 text-sm">{{ achievement.description }}</p>
              <div v-if="!achievement.unlocked" class="mt-2">
                <div class="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-yellow-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    :style="{ width: achievement.progress + '%' }"
                  ></div>
                </div>
                <span class="text-white/60 text-xs mt-1">{{ achievement.progress }}%</span>
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
  name: 'ProgressStatsTab',
  props: {
    scoreByType:     { type: Array, default: () => [] },
    monthlyProgress: { type: Array, default: () => [] },
    achievements:    { type: Array, default: () => [] },
    summary:         { type: Object, default: null }
  }
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
