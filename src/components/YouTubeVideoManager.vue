<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Gestion des vidéos YouTube</h1>
              <p class="text-sm text-white/60 hidden sm:block">Gérez vos contenus éducatifs</p>
            </div>
          </div>
          <button 
            @click="showAddModal = true"
            class="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all flex items-center space-x-2 text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>Ajouter une vidéo</span>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Statistiques -->
      <div class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Total des vidéos</p>
            <p class="text-3xl font-bold text-white">{{ videos.length }}</p>
          </div>
        </div>
        
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Vidéos actives</p>
            <p class="text-3xl font-bold text-white">{{ activeVideosCount }}</p>
          </div>
        </div>
        
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Catégories</p>
            <p class="text-3xl font-bold text-white">{{ categories.length }}</p>
          </div>
        </div>
      </div>

      <!-- Filtres et recherche -->
      <div class="glass-card-dashboard mb-12">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Rechercher une vidéo..."
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
          <select 
            v-model="selectedCategory"
            class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          >
            <option value="">Toutes les catégories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <select 
            v-model="sortBy"
            class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          >
            <option value="title">Trier par titre</option>
            <option value="category">Trier par catégorie</option>
            <option value="date">Trier par date</option>
          </select>
        </div>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isLoadingVideos" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
        <p class="text-white/60 text-lg">Chargement des vidéos...</p>
      </div>

      <!-- Liste des vidéos -->
      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="video in filteredVideos" 
          :key="video.id"
          class="group border border-white/20 rounded-xl overflow-hidden hover:bg-white/10 transition-all"
        >
          <!-- Miniature YouTube -->
          <div class="relative overflow-hidden h-48">
            <img 
              :src="getThumbnailUrl(video.url)" 
              :alt="video.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                @click="playVideo(video.url)"
                class="bg-red-600 text-white rounded-full p-3 hover:bg-red-700 transition-colors"
              >
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
            <div class="absolute top-2 right-2">
              <span 
                :class="video.isActive ? 'bg-green-500' : 'bg-gray-500'"
                class="px-2 py-1 text-xs text-white rounded-full"
              >
                {{ video.isActive ? 'Actif' : 'Inactif' }}
              </span>
            </div>
          </div>
          
          <!-- Contenu de la carte -->
          <div class="p-4">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-white line-clamp-2">{{ video.title }}</h3>
              <div class="flex space-x-2 ml-2">
                <button 
                  @click="editVideo(video)"
                  class="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                  title="Modifier"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button 
                  @click="deleteVideo(video.id)"
                  class="p-1 text-red-300 hover:text-red-200 transition-colors"
                  title="Supprimer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <p class="text-white/60 text-sm mb-3 line-clamp-2">{{ video.description }}</p>
            
            <div class="flex items-center justify-between">
              <span class="px-2 py-1 bg-purple-500/30 text-purple-200 text-xs rounded-full">
                {{ video.category }}
              </span>
              <span class="text-xs text-white/40">
                {{ formatDate(video.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Message si aucune vidéo -->
      <div v-if="!isLoadingVideos && filteredVideos.length === 0" class="text-center py-16">
        <p class="text-white/60 text-lg mb-4">Aucune vidéo trouvée</p>
        <button 
          @click="showAddModal = true"
          class="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all"
        >
          Ajouter votre première vidéo
        </button>
      </div>
    </main>

    <!-- Modal d'ajout/modification -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click="closeModal"
    >
      <div
        class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl max-w-2xl w-full p-8 border border-white/10 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <h3 class="text-xl font-bold text-white mb-6">
          {{ editingVideo ? 'Modifier la vidéo' : 'Ajouter une vidéo' }}
        </h3>

        <form @submit.prevent="saveVideo" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">URL YouTube *</label>
            <input 
              v-model="form.url"
              type="url" 
              placeholder="https://www.youtube.com/watch?v=..."
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              required
              @input="validateUrl"
            />
            <div v-if="urlValidation.message" :class="[
              'text-xs mt-1',
              urlValidation.isValid ? 'text-green-300' : 'text-red-300'
            ]">
              {{ urlValidation.message }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Titre *</label>
            <input 
              v-model="form.title"
              type="text" 
              placeholder="Titre de la vidéo"
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea 
              v-model="form.description"
              placeholder="Description de la vidéo..."
              rows="3"
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
            ></textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Catégorie *</label>
              <select 
                v-model="form.category"
                class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Éducation">Éducation</option>
                <option value="Divertissement">Divertissement</option>
                <option value="Science">Science</option>
                <option value="Histoire">Histoire</option>
                <option value="Géographie">Géographie</option>
                <option value="Mathématiques">Mathématiques</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Statut</label>
              <select 
                v-model="form.isActive"
                class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option :value="true">Actif</option>
                <option :value="false">Inactif</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2 text-white/80 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50"
            >
              {{ isLoading ? 'Sauvegarde...' : (editingVideo ? 'Modifier' : 'Ajouter') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de lecture vidéo -->
    <div v-if="showVideoModal" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click="showVideoModal = false">
      <div class="w-full max-w-4xl" @click.stop>
        <button @click="showVideoModal = false" class="mb-4 text-white hover:text-white/80 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div class="aspect-video">
          <iframe 
            :src="getEmbedUrl(currentVideoUrl)"
            frameborder="0" 
            allowfullscreen
            class="w-full h-full rounded-lg"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import YoutubeVideoService from '../services/youtubeVideoService.js'

export default {
  name: 'YouTubeVideoManager',
  setup() {
    const router = useRouter()
    const youtubeVideoService = new YoutubeVideoService()

    const videos = ref([])
    const showAddModal = ref(false)
    const showVideoModal = ref(false)
    const editingVideo = ref(null)
    const currentVideoUrl = ref('')
    const isLoading = ref(false)
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const sortBy = ref('date')
    const isLoadingVideos = ref(false)

    const form = ref({
      url: '',
      title: '',
      description: '',
      category: '',
      isActive: true
    })

    const urlValidation = ref({
      isValid: null,
      message: ''
    })

    const categories = computed(() => {
      const cats = [...new Set(videos.value.map(v => v.category))]
      return cats.sort()
    })

    const activeVideosCount = computed(() => {
      return videos.value.filter(v => v.isActive).length
    })

    const filteredVideos = computed(() => {
      let filtered = videos.value

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(v => 
          v.title.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query)
        )
      }

      if (selectedCategory.value) {
        filtered = filtered.filter(v => v.category === selectedCategory.value)
      }

      filtered.sort((a, b) => {
        switch (sortBy.value) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'category':
            return a.category.localeCompare(b.category)
          case 'date':
            return new Date(b.createdAt) - new Date(a.createdAt)
          default:
            return 0
        }
      })

      return filtered
    })

    const goBack = () => {
      router.push('/dashboard')
    }

    const loadVideos = async () => {
      try {
        isLoadingVideos.value = true
        const data = await youtubeVideoService.getAllVideos()
        videos.value = data.map(video => ({
          id: video.id,
          url: video.url,
          title: video.title,
          description: video.description,
          category: video.category,
          isActive: video.is_active,
          createdAt: new Date(video.created_at)
        }))
      } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error)
        videos.value = []
      } finally {
        isLoadingVideos.value = false
      }
    }

    const getThumbnailUrl = (url) => {
      const videoId = extractVideoId(url)
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }

    const extractVideoId = (url) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
      return match ? match[1] : 'dQw4w9WgXcQ'
    }

    const getEmbedUrl = (url) => {
      const videoId = extractVideoId(url)
      return `https://www.youtube.com/embed/${videoId}`
    }

    const playVideo = (url) => {
      currentVideoUrl.value = url
      showVideoModal.value = true
    }

    const editVideo = (video) => {
      editingVideo.value = video
      form.value = {
        url: video.url,
        title: video.title,
        description: video.description,
        category: video.category,
        isActive: video.isActive
      }
      showAddModal.value = true
    }

    const deleteVideo = async (videoId) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        try {
          await youtubeVideoService.deleteVideo(videoId)
          videos.value = videos.value.filter(v => v.id !== videoId)
        } catch (error) {
          alert('Erreur lors de la suppression: ' + error.message)
        }
      }
    }

    const saveVideo = async () => {
      isLoading.value = true
      
      try {
        if (!form.value.url || !form.value.title || !form.value.category) {
          throw new Error('Veuillez remplir tous les champs obligatoires')
        }
        
        const videoId = extractVideoId(form.value.url)
        if (!videoId) {
          throw new Error('URL YouTube invalide')
        }
        
        if (editingVideo.value) {
          const updatedVideo = await youtubeVideoService.updateVideo(editingVideo.value.id, {
            url: form.value.url,
            title: form.value.title,
            description: form.value.description,
            category: form.value.category,
            isActive: form.value.isActive
          })
          
          const index = videos.value.findIndex(v => v.id === editingVideo.value.id)
          if (index !== -1) {
            videos.value[index] = {
              id: updatedVideo.id,
              url: updatedVideo.url,
              title: updatedVideo.title,
              description: updatedVideo.description,
              category: updatedVideo.category,
              isActive: updatedVideo.is_active,
              createdAt: new Date(updatedVideo.created_at)
            }
          }
        } else {
          const newVideo = await youtubeVideoService.createVideo({
            url: form.value.url,
            title: form.value.title,
            description: form.value.description,
            category: form.value.category,
            isActive: form.value.isActive
          })
          
          videos.value.unshift({
            id: newVideo.id,
            url: newVideo.url,
            title: newVideo.title,
            description: newVideo.description,
            category: newVideo.category,
            isActive: newVideo.is_active,
            createdAt: new Date(newVideo.created_at)
          })
        }
        
        closeModal()
      } catch (error) {
        alert('Erreur: ' + error.message)
      } finally {
        isLoading.value = false
      }
    }

    const closeModal = () => {
      showAddModal.value = false
      editingVideo.value = null
      form.value = {
        url: '',
        title: '',
        description: '',
        category: '',
        isActive: true
      }
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('fr-FR')
    }

    const validateUrl = () => {
      if (!form.value.url) {
        urlValidation.value = { isValid: null, message: '' }
        return
      }
      
      const videoId = extractVideoId(form.value.url)
      if (videoId) {
        urlValidation.value = {
          isValid: true,
          message: '✅ URL valide'
        }
      } else {
        urlValidation.value = {
          isValid: false,
          message: '❌ URL YouTube invalide'
        }
      }
    }

    onMounted(() => {
      loadVideos()
    })

    return {
      videos,
      showAddModal,
      showVideoModal,
      editingVideo,
      currentVideoUrl,
      isLoading,
      searchQuery,
      selectedCategory,
      sortBy,
      form,
      isLoadingVideos,
      urlValidation,
      categories,
      activeVideosCount,
      filteredVideos,
      goBack,
      playVideo,
      editVideo,
      deleteVideo,
      saveVideo,
      closeModal,
      formatDate,
      getThumbnailUrl,
      getEmbedUrl,
      validateUrl
    }
  }
}
</script>

<style scoped>
/* Animations */
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Glass Cards */
.glass-card-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-stat:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.glass-card-dashboard {
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

@media (max-width: 640px) {
  .glass-card-stat,
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }
}
</style>
