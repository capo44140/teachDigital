<template>
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
    <div class="glass-card-stat group">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </div>
      <div>
        <p class="text-white/60 text-sm">Total des leçons</p>
        <p class="text-3xl font-bold text-white">{{ stats.totalLessons || 0 }}</p>
      </div>
    </div>

    <div class="glass-card-stat group">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-white/60 text-sm">Quiz complétés</p>
        <p class="text-3xl font-bold text-white">{{ stats.totalQuizzes || 0 }}</p>
      </div>
    </div>

    <div class="glass-card-stat group">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
      </div>
      <div>
        <p class="text-white/60 text-sm">Score moyen</p>
        <p class="text-3xl font-bold text-white">{{ formatPercentage(stats.averageScore) }}%</p>
      </div>
    </div>

    <div class="glass-card-stat group">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-white/60 text-sm">Enfants actifs</p>
        <p class="text-3xl font-bold text-white">{{ stats.activeChildren }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuizGlobalStats',
  props: {
    stats: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    }
  }
}
</script>
