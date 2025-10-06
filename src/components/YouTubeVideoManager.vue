<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Retour au dashboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">TD</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">Gestion des vidéos YouTube</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <button 
              @click="showAddModal = true"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>Ajouter une vidéo</span>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <!-- Statistiques -->
      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-gray-800">Total des vidéos</h3>
              <p class="text-2xl font-bold text-red-600">{{ videos.length }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-gray-800">Vidéos actives</h3>
              <p class="text-2xl font-bold text-green-600">{{ activeVideosCount }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-gray-800">Catégories</h3>
              <p class="text-2xl font-bold text-blue-600">{{ categories.length }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtres et recherche -->
      <div class="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Rechercher une vidéo..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="md:w-48">
            <select 
              v-model="selectedCategory"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les catégories</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>
          <div class="md:w-48">
            <select 
              v-model="sortBy"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="title">Trier par titre</option>
              <option value="category">Trier par catégorie</option>
              <option value="date">Trier par date</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isLoadingVideos" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Chargement des vidéos...</p>
      </div>

      <!-- Liste des vidéos -->
      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="video in filteredVideos" 
          :key="video.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
        >
          <!-- Miniature YouTube -->
          <div class="relative">
            <img 
              :src="getThumbnailUrl(video.url)" 
              :alt="video.title"
              class="w-full h-48 object-cover"
            />
            <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
              <button 
                @click="playVideo(video.url)"
                class="opacity-0 hover:opacity-100 transition-opacity duration-300 bg-red-600 text-white rounded-full p-3 hover:bg-red-700"
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
          <div class="p-6">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-800 line-clamp-2">{{ video.title }}</h3>
              <div class="flex space-x-2 ml-2">
                <button 
                  @click="editVideo(video)"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Modifier"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button 
                  @click="deleteVideo(video.id)"
                  class="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Supprimer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <p class="text-gray-600 text-sm mb-3 line-clamp-2">{{ video.description }}</p>
            
            <div class="flex items-center justify-between">
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {{ video.category }}
              </span>
              <span class="text-xs text-gray-500">
                {{ formatDate(video.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Message si aucune vidéo -->
      <div v-if="!isLoadingVideos && filteredVideos.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Aucune vidéo trouvée</h3>
        <p class="text-gray-500 mb-4">Commencez par ajouter votre première vidéo YouTube</p>
        <button 
          @click="showAddModal = true"
          class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Ajouter une vidéo
        </button>
      </div>
    </main>

    <!-- Modal d'ajout/modification -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            {{ editingVideo ? 'Modifier la vidéo' : 'Ajouter une nouvelle vidéo' }}
          </h2>
          <button 
            @click="closeModal"
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveVideo" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">URL YouTube *</label>
            <input 
              v-model="form.url"
              type="url" 
              placeholder="https://www.youtube.com/watch?v=..."
              :class="[
                'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                urlValidation.isValid === false ? 'border-red-500 bg-red-50' : 'border-gray-300'
              ]"
              required
              @input="validateUrl"
            />
            <div v-if="urlValidation.message" :class="[
              'text-xs mt-1',
              urlValidation.isValid ? 'text-green-600' : 'text-red-600'
            ]">
              {{ urlValidation.message }}
            </div>
            <p v-else class="text-xs text-gray-500 mt-1">Collez l'URL complète de la vidéo YouTube</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
            <input 
              v-model="form.title"
              type="text" 
              placeholder="Titre de la vidéo"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              v-model="form.description"
              placeholder="Description de la vidéo..."
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
              <select 
                v-model="form.category"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Éducation">Éducation</option>
                <option value="Divertissement">Divertissement</option>
                <option value="Science">Science</option>
                <option value="Histoire">Histoire</option>
                <option value="Géographie">Géographie</option>
                <option value="Mathématiques">Mathématiques</option>
                <option value="Langues">Langues</option>
                <option value="Art">Art</option>
                <option value="Musique">Musique</option>
                <option value="Sport">Sport</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Âge recommandé</label>
              <select 
                v-model="form.ageGroup"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous âges</option>
                <option value="3-5 ans">3-5 ans</option>
                <option value="6-8 ans">6-8 ans</option>
                <option value="9-12 ans">9-12 ans</option>
                <option value="13-15 ans">13-15 ans</option>
                <option value="16+ ans">16+ ans</option>
              </select>
            </div>
          </div>

          <div class="flex items-center">
            <input 
              v-model="form.isActive"
              type="checkbox" 
              id="isActive"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="isActive" class="ml-2 text-sm text-gray-700">
              Vidéo active (visible pour les enfants)
            </label>
          </div>

          <div class="flex justify-end space-x-4 pt-4">
            <button 
              type="button"
              @click="closeModal"
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              :disabled="isLoading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoading ? 'Sauvegarde...' : (editingVideo ? 'Modifier' : 'Ajouter') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de lecture vidéo -->
    <div v-if="showVideoModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-4xl mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">Lecture vidéo</h3>
          <button 
            @click="showVideoModal = false"
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
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
import youtubeVideoService from '../services/youtubeVideoService.js'

export default {
  name: 'YouTubeVideoManager',
  setup() {
    const router = useRouter()
    
    // État réactif
    const videos = ref([])
    const showAddModal = ref(false)
    const showVideoModal = ref(false)
    const editingVideo = ref(null)
    const currentVideoUrl = ref('')
    const isLoading = ref(false)
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const sortBy = ref('title')

    // Formulaire
    const form = ref({
      url: '',
      title: '',
      description: '',
      category: '',
      ageGroup: '',
      isActive: true
    })

    // État de chargement
    const isLoadingVideos = ref(false)
    
    // Validation de l'URL
    const urlValidation = ref({
      isValid: null,
      message: ''
    })

    // Computed
    const categories = computed(() => {
      const cats = [...new Set(videos.value.map(v => v.category))]
      return cats.sort()
    })

    const activeVideosCount = computed(() => {
      return videos.value.filter(v => v.isActive).length
    })

    const filteredVideos = computed(() => {
      let filtered = videos.value

      // Filtrage par recherche
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(v => 
          v.title.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query)
        )
      }

      // Filtrage par catégorie
      if (selectedCategory.value) {
        filtered = filtered.filter(v => v.category === selectedCategory.value)
      }

      // Tri
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

    // Méthodes
    const goBack = () => {
      router.push('/dashboard')
    }

    const loadVideos = async () => {
      try {
        isLoadingVideos.value = true
        console.log('📺 [YOUTUBE_MANAGER] Chargement des vidéos...')
        
        const data = await youtubeVideoService.getAllVideos()
        videos.value = data.map(video => ({
          id: video.id,
          url: video.url,
          title: video.title,
          description: video.description,
          category: video.category,
          ageGroup: video.age_group,
          isActive: video.is_active,
          createdAt: new Date(video.created_at)
        }))
        
        console.log('✅ [YOUTUBE_MANAGER] Vidéos chargées:', videos.value.length)
      } catch (error) {
        console.error('❌ [YOUTUBE_MANAGER] Erreur lors du chargement des vidéos:', error)
        // En cas d'erreur, utiliser des données vides
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
        ageGroup: video.ageGroup,
        isActive: video.isActive
      }
      showAddModal.value = true
    }

    const deleteVideo = async (videoId) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
        try {
          console.log('🗑️ [YOUTUBE_MANAGER] Suppression de la vidéo ID:', videoId)
          
          await youtubeVideoService.deleteVideo(videoId)
          
          // Retirer de la liste locale
          videos.value = videos.value.filter(v => v.id !== videoId)
          
          console.log('✅ [YOUTUBE_MANAGER] Vidéo supprimée avec succès')
        } catch (error) {
          console.error('❌ [YOUTUBE_MANAGER] Erreur lors de la suppression:', error)
          alert('Erreur lors de la suppression: ' + error.message)
        }
      }
    }

    const saveVideo = async () => {
      isLoading.value = true
      
      try {
        console.log('💾 [YOUTUBE_MANAGER] Sauvegarde de la vidéo...')
        
        // Validation côté client
        if (!form.value.url || !form.value.title || !form.value.category) {
          throw new Error('Veuillez remplir tous les champs obligatoires')
        }
        
        // Validation de l'URL YouTube
        const videoId = youtubeVideoService.extractVideoId(form.value.url)
        if (!videoId) {
          throw new Error('URL YouTube invalide. Veuillez utiliser un lien YouTube valide (ex: https://www.youtube.com/watch?v=VIDEO_ID)')
        }
        
        if (editingVideo.value) {
          // Modification
          const updatedVideo = await youtubeVideoService.updateVideo(editingVideo.value.id, {
            url: form.value.url,
            title: form.value.title,
            description: form.value.description,
            category: form.value.category,
            ageGroup: form.value.ageGroup,
            isActive: form.value.isActive
          })
          
          // Mettre à jour la liste locale
          const index = videos.value.findIndex(v => v.id === editingVideo.value.id)
          if (index !== -1) {
            videos.value[index] = {
              id: updatedVideo.id,
              url: updatedVideo.url,
              title: updatedVideo.title,
              description: updatedVideo.description,
              category: updatedVideo.category,
              ageGroup: updatedVideo.age_group,
              isActive: updatedVideo.is_active,
              createdAt: new Date(updatedVideo.created_at)
            }
          }
        } else {
          // Ajout
          const newVideo = await youtubeVideoService.createVideo({
            url: form.value.url,
            title: form.value.title,
            description: form.value.description,
            category: form.value.category,
            ageGroup: form.value.ageGroup,
            isActive: form.value.isActive
          })
          
          // Ajouter à la liste locale
          videos.value.unshift({
            id: newVideo.id,
            url: newVideo.url,
            title: newVideo.title,
            description: newVideo.description,
            category: newVideo.category,
            ageGroup: newVideo.age_group,
            isActive: newVideo.is_active,
            createdAt: new Date(newVideo.created_at)
          })
        }
        
        console.log('✅ [YOUTUBE_MANAGER] Vidéo sauvegardée avec succès')
        closeModal()
      } catch (error) {
        console.error('❌ [YOUTUBE_MANAGER] Erreur lors de la sauvegarde:', error)
        alert('Erreur lors de la sauvegarde: ' + error.message)
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
        ageGroup: '',
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
      
      const videoId = youtubeVideoService.extractVideoId(form.value.url)
      if (videoId) {
        urlValidation.value = {
          isValid: true,
          message: '✅ URL YouTube valide'
        }
      } else {
        urlValidation.value = {
          isValid: false,
          message: '❌ URL YouTube invalide. Formats supportés: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...'
        }
      }
    }

    // Lifecycle
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
      isLoadingVideos,
      urlValidation,
      searchQuery,
      selectedCategory,
      sortBy,
      form,
      categories,
      activeVideosCount,
      filteredVideos,
      goBack,
      getThumbnailUrl,
      getEmbedUrl,
      playVideo,
      editVideo,
      deleteVideo,
      saveVideo,
      closeModal,
      formatDate,
      validateUrl
    }
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
