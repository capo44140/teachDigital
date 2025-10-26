<template>
  <!--
    LIQUID GLASS DESIGN - Paramètres Enfant

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">Mes Paramètres</h1>
              <p class="text-sm text-white/60 hidden sm:block">Personnalise ton espace d'apprentissage</p>
            </div>
          </div>
          
          <!-- Profil actuel -->
          <div v-if="currentProfile" class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20" :class="currentProfile.bgColor || 'bg-gradient-to-br from-purple-500/30 to-pink-500/30'">
              <span class="text-white text-sm font-semibold">{{ currentProfile.initial || currentProfile.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="text-white font-medium">{{ currentProfile.name }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Section Mon Profil -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Mon Profil</h2>
          </div>
          
          <div class="flex items-center space-x-6 mb-6">
            <div class="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white backdrop-blur-xl border border-white/20" 
                 :class="currentProfile?.bgColor || 'bg-gradient-to-br from-purple-500/30 to-pink-500/30'">
              {{ currentProfile?.initial || currentProfile?.name?.charAt(0) || '?' }}
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white">{{ currentProfile?.name || 'Utilisateur' }}</h3>
              <p class="text-white/60">{{ currentProfile?.description || 'Profil d\'apprentissage' }}</p>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-400/30 rounded-xl p-4">
            <p class="text-sm text-purple-200">
              <span class="font-semibold">💡 Info :</span> Pour modifier ton nom ou ton avatar, demande à un parent de t'aider !
            </p>
          </div>
        </div>

        <!-- Section Apparence -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Apparence et Thème</h2>
          </div>
          
          <div class="space-y-6">
            <!-- Choix du thème de couleur -->
            <div>
              <h3 class="text-lg font-medium text-white mb-4">Choisis ta couleur préférée</h3>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
                <button 
                  v-for="theme in colorThemes" 
                  :key="theme.id"
                  @click="selectTheme(theme)"
                  :class="[
                    'h-20 rounded-xl transition-all duration-300 transform hover:scale-110 backdrop-blur-xl border border-white/20',
                    theme.gradient,
                    settings.selectedTheme === theme.id ? 'ring-4 ring-offset-2 ring-purple-400 scale-110 shadow-lg shadow-purple-500/50' : ''
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
                <h3 class="text-lg font-medium text-white">Taille du texte</h3>
                <p class="text-sm text-white/60">Rends le texte plus facile à lire</p>
              </div>
              <select 
                v-model="settings.fontSize"
                class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="small" class="bg-slate-900">Petit</option>
                <option value="normal" class="bg-slate-900">Normal</option>
                <option value="large" class="bg-slate-900">Grand</option>
              </select>
            </div>

            <!-- Animations -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Animations</h3>
                <p class="text-sm text-white/60">Rendre l'interface plus vivante</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.animations" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Sons et Notifications -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Sons et Notifications</h2>
          </div>
          
          <div class="space-y-6">
            <!-- Sons du jeu -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Sons 🔊</h3>
                <p class="text-sm text-white/60">Activer les effets sonores</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.sounds" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Musique de fond -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Musique 🎵</h3>
                <p class="text-sm text-white/60">Jouer de la musique douce en arrière-plan</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.music" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Notifications de réussite -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Notifications de réussite 🎉</h3>
                <p class="text-sm text-white/60">Recevoir des félicitations pour tes progrès</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.successNotifications" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Accessibilité -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Accessibilité</h2>
          </div>
          
          <div class="space-y-6">
            <!-- Mode lecture facile -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Mode lecture facile 📖</h3>
                <p class="text-sm text-white/60">Police plus grande et espacement amélioré</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.easyReadMode" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <!-- Contraste élevé -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-white">Contraste élevé 🔆</h3>
                <p class="text-sm text-white/60">Améliorer la visibilité des éléments</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.highContrast" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-white/20 backdrop-blur-xl border border-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Aide et Support -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Aide et Support</h2>
          </div>
          
          <div class="space-y-4">
            <button 
              @click="showHelp"
              class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-400/30 rounded-xl hover:bg-yellow-500/20 transition-all"
            >
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="text-lg font-medium text-white">Guide d'aide 📚</h3>
                  <p class="text-sm text-white/60">Apprends à utiliser l'application</p>
                </div>
              </div>
              <svg class="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            <button 
              @click="contactParent"
              class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-400/30 rounded-xl hover:bg-blue-500/20 transition-all"
            >
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="text-lg font-medium text-white">Demander de l'aide 🤝</h3>
                  <p class="text-sm text-white/60">Contacter un parent pour assistance</p>
                </div>
              </div>
              <svg class="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Boutons d'action -->
        <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button 
            @click="saveSettings"
            class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 font-medium text-lg backdrop-blur-xl border border-white/20"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Sauvegarder
          </button>
          <button 
            @click="resetSettings"
            class="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium text-lg"
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
            class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg backdrop-blur-xl border border-green-400/30 flex items-center space-x-2"
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
/* Liquid Glass Design Styles */
.glass-card-dashboard {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 2rem;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

/* Background blob animations */
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

/* Animations pour la transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Animations personnalisées */
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
  .glass-card-dashboard {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  
  .max-w-4xl {
    max-width: 100%;
    padding: 0 1rem;
  }

  .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }

  .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
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
select:focus {
  outline: none;
  ring: 2px;
  ring-color: rgba(168, 85, 247, 0.5);
  border-color: rgba(168, 85, 247, 0.5);
}

/* Input styles */
select {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  color: white;
  transition: all 0.3s ease;
}

select:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

select option {
  background: #1e293b;
  color: white;
}

/* Toggle switch styles */
.peer:checked ~ .peer-checked\:bg-blue-600 {
  background: #2563eb;
}

.peer:checked ~ .peer-checked\:bg-green-600 {
  background: #16a34a;
}

.peer:checked ~ .peer-checked\:bg-gradient-to-r {
  background: linear-gradient(to right, #9333ea, #ec4899);
}
</style>

