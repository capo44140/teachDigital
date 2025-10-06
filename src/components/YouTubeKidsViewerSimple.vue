<template>
  <div class="youtube-kids-viewer">
    <!-- Bouton retour -->
    <div class="back-button-section">
      <button @click="goBack" class="back-button">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Retour au dashboard
      </button>
    </div>

    <div class="header-section">
      <h1>Mes vidéos éducatives</h1>
      <p>Bienvenue {{ currentProfile?.name || 'Utilisateur' }} !</p>
    </div>
    
    <div class="content">
      <!-- Indicateur de chargement -->
      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>Chargement des vidéos...</p>
      </div>
      
      <!-- Message si aucune vidéo -->
      <div v-else-if="videos.length === 0" class="no-videos">
        <div class="no-videos-icon">📺</div>
        <h3>Aucune vidéo disponible</h3>
        <p>Il n'y a pas encore de vidéos éducatives pour votre âge.</p>
      </div>
      
      <!-- Grille des vidéos -->
      <div v-else class="videos-grid">
        <div v-for="video in videos" :key="video.id" class="video-card" @click="playVideo(video)">
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
            <h3>{{ video.title }}</h3>
            <p>{{ video.description }}</p>
            <div class="video-meta">
              <span class="category">{{ video.category }}</span>
              <span class="age-group">{{ video.age_group }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '../stores/profileStore.js'
import youtubeVideoService from '../services/youtubeVideoService.js'

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
        
        // Charger les vidéos depuis la base de données
        const data = await youtubeVideoService.getAllVideos()
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
.youtube-kids-viewer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.back-button-section {
  margin-bottom: 20px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.header-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
}

.header-section h1 {
  margin: 0 0 10px 0;
  font-size: 2.5rem;
  font-weight: bold;
}

.content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.video-info h3 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  font-weight: bold;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-info p {
  margin: 0 0 15px 0;
  opacity: 0.8;
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.category,
.age-group {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
</style>
