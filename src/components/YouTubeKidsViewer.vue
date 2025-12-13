<template>
  <!--
    LIQUID GLASS DESIGN - Visualiseur YouTube Kids

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

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-6xl mx-auto">
    <!-- En-tête avec informations du profil -->
        <div class="glass-card-dashboard mb-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="w-16 h-16 bg-gradient-to-br from-red-400 to-orange-400 rounded-xl flex items-center justify-center text-2xl font-bold text-white backdrop-blur-xl border border-white/20" :class="currentProfile?.avatar_class">
          <span v-if="currentProfile?.avatar_content">{{ currentProfile.avatar_content }}</span>
                <span v-else>👶</span>
        </div>
              <div>
                <h2 class="text-2xl font-bold text-white">{{ currentProfile?.name || 'Enfant' }}</h2>
                <p class="text-white/60">{{ currentProfile?.level }} - {{ getAgeFromLevel(currentProfile?.level) }} ans</p>
        </div>
      </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-red-300">{{ filteredVideos.length }}</div>
              <div class="text-sm text-white/60">vidéos disponibles</div>
            </div>
      </div>
    </div>

    <!-- Filtres -->
        <div class="glass-card-dashboard mb-8">
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-white">Filtres</h3>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <label class="text-white/80 font-medium">Catégorie :</label>
                <select v-model="selectedCategory" class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all">
                  <option value="" class="bg-slate-900">Toutes les catégories</option>
                  <option v-for="category in availableCategories" :key="category" :value="category" class="bg-slate-900">
            {{ category }}
          </option>
        </select>
      </div>
              <div class="flex items-center space-x-2">
                <label class="text-white/80 font-medium">Rechercher :</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Titre de la vidéo..."
                  class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white px-4 py-2 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
        />
              </div>
            </div>
      </div>
    </div>

    <!-- Message si aucune vidéo -->
        <div v-if="filteredVideos.length === 0" class="glass-card-dashboard text-center py-16">
          <div class="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span class="text-4xl">📺</span>
          </div>
          <h3 class="text-2xl font-bold text-white mb-4">Aucune vidéo disponible</h3>
          <p v-if="searchQuery || selectedCategory" class="text-white/60">
        Aucune vidéo ne correspond à vos critères de recherche.
      </p>
          <p v-else class="text-white/60">
        Aucune vidéo n'est disponible pour votre âge pour le moment.
      </p>
    </div>

    <!-- Grille des vidéos -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      <div 
        v-for="video in paginatedVideos" 
        :key="video.id" 
            class="glass-video-card group cursor-pointer"
        @click="playVideo(video)"
      >
            <div class="relative overflow-hidden rounded-xl">
          <img 
            :src="getThumbnailUrl(video.video_id)" 
            :alt="video.title"
                class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span class="text-2xl">▶️</span>
                </div>
          </div>
        </div>
            <div class="p-4">
              <h3 class="text-lg font-bold text-white mb-2 line-clamp-2">{{ video.title }}</h3>
              <p class="text-white/60 text-sm mb-3 line-clamp-2">{{ truncateText(video.description, 100) }}</p>
              <div class="flex items-center space-x-2">
                <span class="px-3 py-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 text-xs rounded-lg border border-red-400/30">{{ video.category }}</span>
                <span class="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 text-xs rounded-lg border border-blue-400/30">{{ video.age_group }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
        <div v-if="totalPages > 1" class="glass-card-dashboard">
          <div class="flex items-center justify-center space-x-4">
      <button 
        :disabled="currentPage === 1"
        class="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              @click="currentPage = Math.max(1, currentPage - 1)"
      >
        ← Précédent
      </button>
            <span class="text-white font-medium">
        Page {{ currentPage }} sur {{ totalPages }}
      </span>
      <button 
        :disabled="currentPage === totalPages"
        class="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
      >
        Suivant →
      </button>
          </div>
    </div>

    <!-- Modal de lecture vidéo -->
        <div v-if="selectedVideo" class="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4" @click="closeVideo">
          <div class="glass-modal-content max-w-4xl w-full max-h-[90vh] overflow-hidden" @click.stop>
            <button class="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all z-10" @click="closeVideo">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div class="relative w-full h-0 pb-[56.25%]">
          <iframe
            :src="getEmbedUrl(selectedVideo.video_id)"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
                class="absolute top-0 left-0 w-full h-full rounded-t-xl"
          ></iframe>
        </div>
            <div class="glass-card-dashboard rounded-t-none">
              <h3 class="text-xl font-bold text-white mb-3">{{ selectedVideo.title }}</h3>
              <p class="text-white/60 mb-4">{{ selectedVideo.description }}</p>
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 text-sm rounded-lg border border-red-400/30">{{ selectedVideo.category }}</span>
                <span class="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 text-sm rounded-lg border border-blue-400/30">{{ selectedVideo.age_group }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'YouTubeKidsViewer',
  setup() {
    console.log('🎥 YouTubeKidsViewer component loaded')
    const profileStore = useProfileStore()
    
    // État réactif
    const videos = ref([])
    const selectedVideo = ref(null)
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const currentPage = ref(1)
    const videosPerPage = 12
    const isLoading = ref(false)

    // Profil actuel
    const currentProfile = computed(() => profileStore.currentProfile)

    // Fonction pour obtenir l'âge à partir du niveau
    const getAgeFromLevel = (level) => {
      const ageMap = {
        'CP': 6, 'CE1': 7, 'CE2': 8, 'CM1': 9, 'CM2': 10,
        '6ème': 11, '5ème': 12, '4ème': 13, '3ème': 14
      }
      return ageMap[level] || 6
    }

    // Fonction pour vérifier si une vidéo est appropriée pour l'âge
    const isVideoAppropriateForAge = (video, userAge) => {
      if (!video.age_group) return true
      
      const ageGroup = video.age_group
      const ageRanges = ageGroup.match(/(\d+)-(\d+)/)
      
      if (ageRanges) {
        const minAge = parseInt(ageRanges[1])
        const maxAge = parseInt(ageRanges[2])
        return userAge >= minAge && userAge <= maxAge
      }
      
      return true
    }

    // Vidéos filtrées par âge et critères de recherche
    const filteredVideos = computed(() => {
      if (!currentProfile.value) return []
      
      const userAge = getAgeFromLevel(currentProfile.value.level)
      
      return videos.value.filter(video => {
        // Filtrage par âge
        if (!isVideoAppropriateForAge(video, userAge)) return false
        
        // Filtrage par catégorie
        if (selectedCategory.value && video.category !== selectedCategory.value) return false
        
        // Filtrage par recherche
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase()
          return video.title.toLowerCase().includes(query) || 
                 video.description.toLowerCase().includes(query)
        }
        
        return true
      })
    })

    // Catégories disponibles
    const availableCategories = computed(() => {
      const categories = [...new Set(videos.value.map(v => v.category))]
      return categories.sort()
    })

    // Pagination
    const totalPages = computed(() => Math.ceil(filteredVideos.value.length / videosPerPage))
    
    const paginatedVideos = computed(() => {
      const start = (currentPage.value - 1) * videosPerPage
      const end = start + videosPerPage
      return filteredVideos.value.slice(start, end)
    })

    // Fonctions utilitaires
    const getThumbnailUrl = (videoId) => {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }

    const getEmbedUrl = (videoId) => {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`
    }

    const truncateText = (text, maxLength) => {
      if (!text) return ''
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }

    const playVideo = (video) => {
      selectedVideo.value = video
    }

    const closeVideo = () => {
      selectedVideo.value = null
    }

    // Charger les vidéos
    const loadVideos = async () => {
      try {
        isLoading.value = true
        // Données de démonstration temporaires
        videos.value = [
          {
            id: 1,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            video_id: 'dQw4w9WgXcQ',
            title: 'Vidéo éducative sur les mathématiques',
            description: 'Une vidéo amusante pour apprendre les bases des mathématiques avec des exemples concrets et des exercices pratiques.',
            category: 'Mathématiques',
            age_group: '6-8 ans',
            is_active: true,
            created_at: new Date('2024-01-15').toISOString(),
            updated_at: new Date('2024-01-15').toISOString()
          },
          {
            id: 2,
            url: 'https://www.youtube.com/watch?v=example2',
            video_id: 'example2',
            title: 'Découverte de la nature',
            description: 'Explorez la beauté de la nature avec cette vidéo éducative qui présente les différents écosystèmes.',
            category: 'Science',
            age_group: '3-5 ans',
            is_active: true,
            created_at: new Date('2024-01-10').toISOString(),
            updated_at: new Date('2024-01-10').toISOString()
          }
        ]
        console.log('📺 Vidéos chargées pour les enfants:', videos.value.length)
      } catch (error) {
        console.error('❌ Erreur lors du chargement des vidéos:', error)
        videos.value = []
      } finally {
        isLoading.value = false
      }
    }

    // Réinitialiser la pagination quand les filtres changent
    watch([searchQuery, selectedCategory], () => {
      currentPage.value = 1
    })

    // Charger les vidéos au montage
    onMounted(() => {
      loadVideos()
    })

    return {
      currentProfile,
      videos,
      selectedVideo,
      searchQuery,
      selectedCategory,
      currentPage,
      videosPerPage,
      isLoading,
      filteredVideos,
      availableCategories,
      totalPages,
      paginatedVideos,
      getAgeFromLevel,
      getThumbnailUrl,
      getEmbedUrl,
      truncateText,
      playVideo,
      closeVideo
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

.glass-modal-content {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

/* Focus styles */
select:focus,
input:focus {
  outline: none;
  ring: 2px;
  ring-color: rgba(239, 68, 68, 0.5);
  border-color: rgba(239, 68, 68, 0.5);
}

/* Input styles */
select,
input {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  color: white;
  transition: all 0.3s ease;
}

select:hover,
input:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

select option {
  background: #1e293b;
  color: white;
}

/* Video card hover effects */
.glass-video-card img {
  transition: transform 0.3s ease;
}

.glass-video-card:hover img {
  transform: scale(1.05);
}

/* Modal animations */
.glass-modal-content {
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Tag styles */
.px-3.py-1 {
  transition: all 0.3s ease;
}

.px-3.py-1:hover {
  transform: scale(1.05);
}

/* Avatar styling */
.w-16.h-16 {
  transition: all 0.3s ease;
}

.w-16.h-16:hover {
  transform: scale(1.05);
}

/* Grid responsive adjustments */
@media (max-width: 1024px) {
  .xl\:grid-cols-4 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
</style>
