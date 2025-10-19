<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
    <!-- Header avec navigation -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Retour au tableau de bord"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Mes Paramètres</h1>
              <p class="text-sm text-gray-600">Personnalise ton espace d'apprentissage</p>
            </div>
          </div>
          
          <!-- Profil actuel -->
          <div v-if="currentProfile" class="flex items-center space-x-2">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="currentProfile.bgColor || 'bg-purple-500'">
              <span class="text-white text-sm font-semibold">{{ currentProfile.initial || currentProfile.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="text-gray-700 font-medium">{{ currentProfile.name }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Section Mon Profil -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Mon Profil
            </h2>
          </div>
          <div class="p-6">
            <div class="flex items-center space-x-6 mb-6">
              <div class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white" 
                   :class="currentProfile?.bgColor || 'bg-purple-500'">
                {{ currentProfile?.initial || currentProfile?.name?.charAt(0) || '?' }}
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-gray-800">{{ currentProfile?.name || 'Utilisateur' }}</h3>
                <p class="text-gray-600">{{ currentProfile?.description || 'Profil d\'apprentissage' }}</p>
              </div>
            </div>
            
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
              <p class="text-sm text-gray-600">
                <span class="font-semibold">💡 Info :</span> Pour modifier ton nom ou ton avatar, demande à un parent de t'aider !
              </p>
            </div>
          </div>
        </div>

        <!-- Section Apparence -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-pink-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
              Apparence et Thème
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Choix du thème de couleur -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 mb-4">Choisis ta couleur préférée</h3>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
                <button 
                  v-for="theme in colorThemes" 
                  :key="theme.id"
                  @click="selectTheme(theme)"
                  :class="[
                    'h-20 rounded-xl transition-all duration-300 transform hover:scale-110',
                    theme.gradient,
                    settings.selectedTheme === theme.id ? 'ring-4 ring-offset-2 ring-purple-600 scale-110' : ''
                  ]"
                  :title="theme.name"
                >
                  <div class="text-white font-semibold text-sm">{{ theme.emoji }}</div>
                </button>
              </div>
            </div>

            <!-- Taille de police -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Taille du texte</h3>
                <p class="text-sm text-gray-600">Rends le texte plus facile à lire</p>
              </div>
              <select 
                v-model="settings.fontSize"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="small">Petit</option>
                <option value="normal">Normal</option>
                <option value="large">Grand</option>
              </select>
            </div>

            <!-- Animations -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Animations</h3>
                <p class="text-sm text-gray-600">Rendre l'interface plus vivante</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.animations" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Sons et Notifications -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              Sons et Notifications
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Sons du jeu -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Sons 🔊</h3>
                <p class="text-sm text-gray-600">Activer les effets sonores</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.sounds" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Musique de fond -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Musique 🎵</h3>
                <p class="text-sm text-gray-600">Jouer de la musique douce en arrière-plan</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.music" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Notifications de réussite -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Notifications de réussite 🎉</h3>
                <p class="text-sm text-gray-600">Recevoir des félicitations pour tes progrès</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.successNotifications" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Accessibilité -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Accessibilité
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Mode lecture facile -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Mode lecture facile 📖</h3>
                <p class="text-sm text-gray-600">Police plus grande et espacement amélioré</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.easyReadMode" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <!-- Contraste élevé -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Contraste élevé 🔆</h3>
                <p class="text-sm text-gray-600">Améliorer la visibilité des éléments</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.highContrast" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Aide et Support -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Aide et Support
            </h2>
          </div>
          <div class="p-6 space-y-4">
            <button 
              @click="showHelp"
              class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:shadow-md transition-all"
            >
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="text-lg font-medium text-gray-800">Guide d'aide 📚</h3>
                  <p class="text-sm text-gray-600">Apprends à utiliser l'application</p>
                </div>
              </div>
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            <button 
              @click="contactParent"
              class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-all"
            >
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="text-lg font-medium text-gray-800">Demander de l'aide 🤝</h3>
                  <p class="text-sm text-gray-600">Contacter un parent pour assistance</p>
                </div>
              </div>
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Boutons d'action -->
        <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button 
            @click="saveSettings"
            class="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-medium text-lg"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Sauvegarder
          </button>
          <button 
            @click="resetSettings"
            class="px-8 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium text-lg"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Réinitialiser
          </button>
        </div>

        <!-- Message de confirmation -->
        <transition name="fade">
          <div 
            v-if="showConfirmation"
            class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span class="font-medium">Paramètres sauvegardés ! 🎉</span>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'ChildSettings',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      currentProfile: null,
      showConfirmation: false,
      settings: {
        // Apparence
        selectedTheme: 'purple',
        fontSize: 'normal',
        animations: true,
        
        // Sons et notifications
        sounds: true,
        music: false,
        successNotifications: true,
        
        // Accessibilité
        easyReadMode: false,
        highContrast: false
      },
      colorThemes: [
        { id: 'purple', name: 'Violet', emoji: '💜', gradient: 'bg-gradient-to-br from-purple-500 to-pink-500' },
        { id: 'blue', name: 'Bleu', emoji: '💙', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
        { id: 'green', name: 'Vert', emoji: '💚', gradient: 'bg-gradient-to-br from-green-500 to-emerald-500' },
        { id: 'orange', name: 'Orange', emoji: '🧡', gradient: 'bg-gradient-to-br from-orange-500 to-red-500' },
        { id: 'yellow', name: 'Jaune', emoji: '💛', gradient: 'bg-gradient-to-br from-yellow-400 to-orange-400' },
        { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈', gradient: 'bg-gradient-to-br from-red-400 via-purple-400 to-blue-400' }
      ]
    }
  },
  async created() {
    await this.loadCurrentProfile()
    this.loadSettings()
  },
  methods: {
    async loadCurrentProfile() {
      try {
        const profileId = this.$route.query.profile
        
        if (profileId) {
          await this.profileStore.loadProfile(profileId)
          this.currentProfile = this.profileStore.currentProfile
        } else {
          // Profil par défaut
          this.currentProfile = {
            id: 'user',
            name: 'Utilisateur',
            initial: 'U',
            bgColor: 'bg-purple-500',
            description: 'Profil d\'apprentissage'
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
      }
    },
    
    loadSettings() {
      // Charger les paramètres depuis le localStorage
      const profileId = this.$route.query.profile || 'user'
      const savedSettings = localStorage.getItem(`childSettings_${profileId}`)
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
      }
    },
    
    selectTheme(theme) {
      this.settings.selectedTheme = theme.id
      // Appliquer le thème immédiatement (effet visuel)
      console.log('Thème sélectionné:', theme.name)
    },
    
    saveSettings() {
      // Sauvegarder les paramètres dans le localStorage
      const profileId = this.$route.query.profile || 'user'
      localStorage.setItem(`childSettings_${profileId}`, JSON.stringify(this.settings))
      
      // Afficher la confirmation
      this.showConfirmation = true
      setTimeout(() => {
        this.showConfirmation = false
      }, 3000)
      
      console.log('Paramètres sauvegardés:', this.settings)
    },
    
    resetSettings() {
      // Réinitialiser les paramètres par défaut
      this.settings = {
        selectedTheme: 'purple',
        fontSize: 'normal',
        animations: true,
        sounds: true,
        music: false,
        successNotifications: true,
        easyReadMode: false,
        highContrast: false
      }
      
      // Sauvegarder les paramètres réinitialisés
      this.saveSettings()
      
      console.log('Paramètres réinitialisés')
    },
    
    goBack() {
      this.$router.push({ 
        path: '/user-dashboard',
        query: { 
          profile: this.$route.query.profile
        }
      })
    },
    
    showHelp() {
      this.$router.push({
        name: 'ChildHelp',
        query: {
          profile: this.$route.query.profile
        }
      })
    },
    
    contactParent() {
      alert('🤝 Demande envoyée !\n\nUn parent sera notifié de ta demande d\'aide.')
      console.log('Demande d\'aide envoyée')
    }
  }
}
</script>

<style scoped>
/* Animations pour la transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Animations personnalisées */
button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.98);
}

.hover\:scale-105:hover {
  transform: scale(1.05);
}

.hover\:scale-110:hover {
  transform: scale(1.10);
}

/* Styles pour les toggles */
.peer:checked ~ .peer-checked\:after\:translate-x-full:after {
  transform: translateX(100%);
}

/* Animations de gradient */
@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.bg-gradient-to-r {
  background-size: 200% 200%;
}

/* Styles de sélection pour les thèmes */
.ring-4 {
  box-shadow: 0 0 0 4px currentColor;
}
</style>

