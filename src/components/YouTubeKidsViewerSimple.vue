<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
    <!-- Header avec bouton retour -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <button 
            @click="goBack" 
            class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span class="font-medium">Retour au dashboard</span>
          </button>
          
          <!-- Info profil -->
          <div v-if="currentProfile" class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600">
              <span class="text-white text-sm font-semibold">{{ currentProfile.name?.charAt(0) || 'U' }}</span>
            </div>
            <span class="text-gray-700 font-medium">{{ currentProfile.name }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-12">
      <!-- En-tête de la page -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">
          📺 Mes vidéos éducatives
        </h1>
        <p class="text-xl text-gray-600">
          Bienvenue {{ currentProfile?.name || 'Utilisateur' }} ! Découvre des vidéos adaptées à ton âge 🎉
        </p>
      </div>
      
      <!-- Indicateur de chargement -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
        <p class="text-gray-600 text-lg">Chargement des vidéos...</p>
      </div>
      
      <!-- Message si aucune vidéo -->
      <div v-else-if="videos.length === 0" class="max-w-md mx-auto">
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="text-6xl mb-4">📺</div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">Aucune vidéo disponible</h3>
          <p class="text-gray-600">Il n'y a pas encore de vidéos éducatives pour votre âge.</p>
        </div>
      </div>
      
      <!-- Grille des vidéos -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="video in videos" 
          :key="video.id" 
          class="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group"
          @click="playVideo(video)"
        >
          <!-- Miniature -->
          <div class="relative h-48 overflow-hidden bg-gray-200">
            <img 
              :src="getThumbnailUrl(video.video_id)" 
              :alt="video.title"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <!-- Overlay de lecture -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
              <div class="transform scale-0 group-hover:scale-100 transition-transform duration-300">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg class="w-8 h-8 text-red-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Informations -->
          <div class="p-5">
            <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
              {{ video.title }}
            </h3>
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">
              {{ video.description }}
            </p>
            
            <!-- Badges -->
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {{ video.category }}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-800">
                {{ video.age_group }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '../stores/profileStore.js'
import { migrationService } from '../services/migrationService.js'

export default {
  name: 'YouTubeKidsViewerSimple',
  setup() {
    console.log('🎥 YouTubeKidsViewerSimple component loaded')
    const profileStore = useProfileStore()
    
    const videos = ref([])
    const isLoading = ref(false)
    const currentProfile = computed(() => profileStore.currentProfile)
    
    const loadVideos = async () => {
      try {
        isLoading.value = true
        console.log('📺 Loading videos from database...')
        
        // Charger les vidéos via le service de migration
        const data = await migrationService.getYouTubeVideos()
        videos.value = data.filter(video => video.is_active)
        
        console.log('📺 Videos loaded:', videos.value.length)
      } catch (error) {
        console.error('❌ Error loading videos:', error)
        // Fallback vers des données de démonstration
        videos.value = [
          {
            id: 1,
            title: 'Vidéo éducative sur les mathématiques',
            description: 'Apprends les maths en s\'amusant !',
            category: 'Mathématiques',
            age_group: '6-8 ans'
          },
          {
            id: 2,
            title: 'Découverte de la nature',
            description: 'Explore la nature avec nous !',
            category: 'Science',
            age_group: '3-5 ans'
          }
        ]
      } finally {
        isLoading.value = false
      }
    }
    
    const goBack = () => {
      // Retourner au dashboard utilisateur
      window.history.back()
    }
    
    const getThumbnailUrl = (videoId) => {
      if (!videoId) return 'https://via.placeholder.com/300x200?text=No+Thumbnail'
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    
    const playVideo = (video) => {
      console.log('Playing video:', video.title)
      // Ouvrir la vidéo dans un nouvel onglet
      window.open(video.url, '_blank')
    }
    
    onMounted(() => {
      loadVideos()
    })
    
    return {
      videos,
      isLoading,
      currentProfile,
      goBack,
      getThumbnailUrl,
      playVideo
    }
  }
}
</script>

<style scoped>
/* Styles additionnels pour les effets de line-clamp si nécessaire */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
