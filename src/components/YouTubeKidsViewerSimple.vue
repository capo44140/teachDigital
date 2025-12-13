<template>
  <!--
    LIQUID GLASS DESIGN - Visualiseur YouTube Kids Simple

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec bouton retour -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <button 
            class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/50 transform hover:scale-105 transition-all duration-300 backdrop-blur-xl border border-white/20" 
            @click="goBack"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span class="font-medium">Retour au dashboard</span>
          </button>
          
          <!-- Info profil -->
          <div v-if="currentProfile" class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-400 to-orange-400 backdrop-blur-xl border border-white/20">
              <span class="text-white text-sm font-semibold">{{ currentProfile.name?.charAt(0) || 'U' }}</span>
            </div>
            <span class="text-white font-medium">{{ currentProfile.name }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- En-tête de la page -->
      <div class="text-center mb-12">
        <div class="flex items-center justify-center space-x-4 mb-6">
          <div class="w-12 h-12 bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-xl flex items-center justify-center">
            <span class="text-2xl">📺</span>
          </div>
          <h1 class="text-4xl font-bold text-white">
            Mes vidéos éducatives
          </h1>
        </div>
        <p class="text-xl text-white/60">
          Bienvenue {{ currentProfile?.name || 'Utilisateur' }} ! Découvre des vidéos adaptées à ton âge 🎉
        </p>
      </div>
      
      <!-- Indicateur de chargement -->
      <div v-if="isLoading" class="glass-card-dashboard text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mb-4"></div>
        <p class="text-white text-lg">Chargement des vidéos...</p>
      </div>
      
      <!-- Message si aucune vidéo -->
      <div v-else-if="videos.length === 0" class="glass-card-dashboard text-center py-16">
        <div class="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
          <span class="text-4xl">📺</span>
        </div>
        <h3 class="text-2xl font-bold text-white mb-4">Aucune vidéo disponible</h3>
        <p class="text-white/60">Il n'y a pas encore de vidéos éducatives pour votre âge.</p>
      </div>
      
      <!-- Grille des vidéos -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="video in videos" 
          :key="video.id" 
          class="glass-video-card group cursor-pointer"
          @click="playVideo(video)"
        >
          <!-- Miniature -->
          <div class="relative h-48 overflow-hidden rounded-xl">
            <img 
              :src="getThumbnailUrl(video.video_id)" 
              :alt="video.title"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <!-- Overlay de lecture -->
            <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div class="transform scale-0 group-hover:scale-100 transition-transform duration-300">
                <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Informations -->
          <div class="p-5">
            <h3 class="text-lg font-bold text-white mb-2 line-clamp-2">
              {{ video.title }}
            </h3>
            <p class="text-sm text-white/60 mb-3 line-clamp-2">
              {{ video.description }}
            </p>
            
            <!-- Badges -->
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border border-red-400/30">
                {{ video.category }}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30">
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
/* Liquid Glass Design Styles */
/* NOTE: .glass-card-dashboard / .animate-blob sont centralisés (src/styles/liquid-glass.css) */

.glass-video-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.glass-video-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

/* Button styles */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animation pour les éléments */
.glass-card-dashboard > div:last-child > div {
  animation: fadeInUp 0.3s ease-out;
  animation-fill-mode: both;
}

.glass-card-dashboard > div:last-child > div:nth-child(1) { animation-delay: 0.1s; }
.glass-card-dashboard > div:last-child > div:nth-child(2) { animation-delay: 0.2s; }
.glass-card-dashboard > div:last-child > div:nth-child(3) { animation-delay: 0.3s; }
.glass-card-dashboard > div:last-child > div:nth-child(4) { animation-delay: 0.4s; }
.glass-card-dashboard > div:last-child > div:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .glass-video-card {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  
  .max-w-6xl {
    max-width: 100%;
    padding: 0 1rem;
  }

  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .glass-video-card {
    padding: 1rem;
    border-radius: 1rem;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Video card hover effects */
.glass-video-card img {
  transition: transform 0.3s ease;
}

.glass-video-card:hover img {
  transform: scale(1.05);
}

/* Tag styles */
.px-3.py-1 {
  transition: all 0.3s ease;
}

.px-3.py-1:hover {
  transform: scale(1.05);
}

/* Avatar styling */
.w-8.h-8 {
  transition: all 0.3s ease;
}

.w-8.h-8:hover {
  transform: scale(1.05);
}

/* Grid responsive adjustments */
@media (max-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

/* Icon styling */
.w-12.h-12 {
  transition: all 0.3s ease;
}

.w-12.h-12:hover {
  transform: scale(1.05);
}
</style>
