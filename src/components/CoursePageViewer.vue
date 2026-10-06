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
        <div class="min-w-0">
          <h1 class="text-lg font-bold text-white truncate">{{ coursePage?.title || 'Mon cours' }}</h1>
          <p v-if="coursePage?.subject" class="text-xs text-white/60 truncate">{{ coursePage.subject }}</p>
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
      <CoursePageFrame v-else :html="coursePage.html_content" :title="coursePage.title" />
    </main>
  </div>
</template>

<script>
import { apiService } from '../services/apiService.js'
import CoursePageFrame from './CoursePageFrame.vue'

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
      errorMessage: null
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
  methods: {
    goBack() {
      this.$router.push({
        name: 'UserDashboard',
        query: { profile: this.$route.query.profile }
      })
    }
  }
}
</script>
