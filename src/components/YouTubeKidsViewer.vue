<template>
  <div class="youtube-kids-viewer">
    <!-- En-tête avec informations du profil -->
    <div class="header-section">
      <div class="profile-info">
        <div class="avatar" :class="currentProfile?.avatar_class">
          <span v-if="currentProfile?.avatar_content">{{ currentProfile.avatar_content }}</span>
        </div>
        <div class="profile-details">
          <h2 class="profile-name">{{ currentProfile?.name }}</h2>
          <p class="profile-level">{{ currentProfile?.level }} - {{ getAgeFromLevel(currentProfile?.level) }} ans</p>
        </div>
      </div>
      <div class="video-count">
        <span class="count-number">{{ filteredVideos.length }}</span>
        <span class="count-label">vidéos disponibles</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="filters-section">
      <div class="filter-group">
        <label class="filter-label">Catégorie :</label>
        <select v-model="selectedCategory" class="filter-select">
          <option value="">Toutes les catégories</option>
          <option v-for="category in availableCategories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Rechercher :</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Titre de la vidéo..."
          class="filter-input"
        />
      </div>
    </div>

    <!-- Message si aucune vidéo -->
    <div v-if="filteredVideos.length === 0" class="no-videos">
      <div class="no-videos-icon">📺</div>
      <h3>Aucune vidéo disponible</h3>
      <p v-if="searchQuery || selectedCategory">
        Aucune vidéo ne correspond à vos critères de recherche.
      </p>
      <p v-else>
        Aucune vidéo n'est disponible pour votre âge pour le moment.
      </p>
    </div>

    <!-- Grille des vidéos -->
    <div v-else class="videos-grid">
      <div 
        v-for="video in paginatedVideos" 
        :key="video.id" 
        class="video-card"
        @click="playVideo(video)"
      >
        <div class="video-thumbnail">
          <img 
            :src="getThumbnailUrl(video.video_id)" 
            :alt="video.title"
            class="thumbnail-image"
          />
          <div class="play-overlay">
            <div class="play-button">▶️</div>
          </div>
        </div>
        <div class="video-info">
          <h3 class="video-title">{{ video.title }}</h3>
          <p class="video-description">{{ truncateText(video.description, 100) }}</p>
          <div class="video-meta">
            <span class="video-category">{{ video.category }}</span>
            <span class="video-age">{{ video.age_group }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="currentPage = Math.max(1, currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
      >
        ← Précédent
      </button>
      <span class="pagination-info">
        Page {{ currentPage }} sur {{ totalPages }}
      </span>
      <button 
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="pagination-btn"
      >
        Suivant →
      </button>
    </div>

    <!-- Modal de lecture vidéo -->
    <div v-if="selectedVideo" class="video-modal" @click="closeVideo">
      <div class="modal-content" @click.stop>
        <button class="close-button" @click="closeVideo">✕</button>
        <div class="video-container">
          <iframe
            :src="getEmbedUrl(selectedVideo.video_id)"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="video-iframe"
          ></iframe>
        </div>
        <div class="video-details">
          <h3>{{ selectedVideo.title }}</h3>
          <p>{{ selectedVideo.description }}</p>
          <div class="video-tags">
            <span class="tag">{{ selectedVideo.category }}</span>
            <span class="tag">{{ selectedVideo.age_group }}</span>
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
.youtube-kids-viewer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.profile-details h2 {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
}

.profile-level {
  margin: 5px 0 0 0;
  opacity: 0.8;
  font-size: 16px;
}

.video-count {
  text-align: center;
}

.count-number {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #4ecdc4;
}

.count-label {
  font-size: 14px;
  opacity: 0.8;
}

.filters-section {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-weight: 600;
  font-size: 14px;
}

.filter-select,
.filter-input {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 14px;
  min-width: 200px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.3);
}

.no-videos {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.no-videos-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-videos h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.no-videos p {
  margin: 0;
  opacity: 0.8;
  font-size: 16px;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.video-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.15);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-card:hover .thumbnail-image {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-card:hover .play-overlay {
  opacity: 1;
}

.play-button {
  font-size: 48px;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.video-info {
  padding: 20px;
}

.video-title {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-description {
  margin: 0 0 15px 0;
  opacity: 0.8;
  font-size: 14px;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.video-category,
.video-age {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.pagination-btn {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-weight: 600;
  font-size: 16px;
}

.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 18px;
  z-index: 1001;
}

.video-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-details {
  padding: 20px;
  color: #333;
}

.video-details h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: bold;
}

.video-details p {
  margin: 0 0 15px 0;
  color: #666;
  line-height: 1.5;
}

.video-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag {
  background: #4ecdc4;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .youtube-kids-viewer {
    padding: 15px;
  }
  
  .header-section {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .filter-select,
  .filter-input {
    min-width: 100%;
  }
  
  .videos-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
