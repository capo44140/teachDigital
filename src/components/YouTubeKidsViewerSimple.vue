<template>
  <div class="youtube-kids-viewer">
    <div class="header-section">
      <h1>Mes vidéos éducatives</h1>
      <p>Bienvenue {{ currentProfile?.name || 'Utilisateur' }} !</p>
    </div>
    
    <div class="content">
      <div v-if="videos.length === 0" class="no-videos">
        <p>Aucune vidéo disponible pour le moment.</p>
      </div>
      
      <div v-else class="videos-grid">
        <div v-for="video in videos" :key="video.id" class="video-card">
          <h3>{{ video.title }}</h3>
          <p>{{ video.description }}</p>
          <span class="category">{{ video.category }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'YouTubeKidsViewerSimple',
  setup() {
    console.log('🎥 YouTubeKidsViewerSimple component loaded')
    const profileStore = useProfileStore()
    
    const videos = ref([])
    const currentProfile = computed(() => profileStore.currentProfile)
    
    const loadVideos = async () => {
      console.log('📺 Loading videos...')
      videos.value = [
        {
          id: 1,
          title: 'Vidéo éducative sur les mathématiques',
          description: 'Apprends les maths en s\'amusant !',
          category: 'Mathématiques'
        },
        {
          id: 2,
          title: 'Découverte de la nature',
          description: 'Explore la nature avec nous !',
          category: 'Science'
        }
      ]
    }
    
    onMounted(() => {
      loadVideos()
    })
    
    return {
      videos,
      currentProfile
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

.no-videos {
  text-align: center;
  padding: 40px;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.video-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.video-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
}

.video-card p {
  margin: 0 0 15px 0;
  opacity: 0.8;
}

.category {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
</style>
