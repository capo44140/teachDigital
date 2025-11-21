<template>
  <!--
    LIQUID GLASS DESIGN - Gestionnaire de Badges

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

    <!-- Header avec bouton retour -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              class="p-3 text-white/80 hover:text-white backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 relative group"
              @click="goBack"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Retour au dashboard</h1>
              <p class="text-sm text-white/60">Découvre et gère tes badges</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-400 to-pink-400 backdrop-blur-xl border border-white/20">
              <span class="text-white text-sm font-semibold">🏆</span>
            </div>
            <span class="text-white font-medium">{{ profileId ? `Profil ${profileId}` : 'Utilisateur' }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 w-full max-w-6xl mx-auto px-6 py-8">
      <!-- En-tête avec statistiques -->
      <div class="glass-stats-grid mb-8">
        <div class="glass-stat-card">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center">
            <span class="text-2xl">🏆</span>
          </div>
          <div class="flex-1">
            <div class="text-2xl font-bold text-white">{{ badgeStats.unlocked }} / {{ badgeStats.total }}</div>
            <div class="text-sm text-white/60">Badges débloqués</div>
        </div>
      </div>
      
        <div class="glass-stat-card">
          <div class="w-12 h-12 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center">
            <span class="text-2xl">⭐</span>
          </div>
          <div class="flex-1">
            <div class="text-2xl font-bold text-white">{{ badgeStats.points }}</div>
            <div class="text-sm text-white/60">Points gagnés</div>
          </div>
        </div>
        
        <div class="glass-stat-card">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center">
            <span class="text-2xl">📊</span>
          </div>
          <div class="flex-1">
            <div class="text-2xl font-bold text-white">{{ badgeStats.percentage }}%</div>
            <div class="text-sm text-white/60">Progression</div>
        </div>
      </div>
    </div>

    <!-- Barre de progression globale -->
      <div class="glass-card-dashboard mb-8">
        <div class="w-full h-4 bg-white/10 backdrop-blur-xl rounded-full overflow-hidden mb-4">
          <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" :style="{ width: badgeStats.percentage + '%' }"></div>
      </div>
        <p class="text-center text-white/60 text-sm">
        Continue comme ça ! Tu as débloqué {{ badgeStats.unlocked }} badges sur {{ badgeStats.total }}
      </p>
    </div>

    <!-- Onglets de filtrage -->
      <div class="glass-card-dashboard mb-8">
        <div class="flex gap-2 flex-wrap">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="[
              'flex-1 min-w-32 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-xl border text-center',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:border-white/40'
            ]"
            @click="activeTab = tab.id"
          >
            <span class="text-lg mr-2">{{ tab.icon }}</span>
            <span class="font-medium">{{ tab.label }}</span>
      </button>
        </div>
    </div>

    <!-- Contenu des onglets -->
      <div class="glass-card-dashboard">
      <!-- Tous les badges -->
        <div v-if="activeTab === 'all'">
          <div v-if="loading" class="text-center py-16">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <div class="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p class="text-white/60">Chargement des badges...</p>
        </div>
        
          <div v-else-if="profileBadges.length === 0" class="text-center py-16">
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span class="text-4xl">🏆</span>
            </div>
            <p class="text-white text-lg">Aucun badge disponible pour le moment</p>
        </div>
        
        <div v-else>
            <div v-for="category in categories" :key="category" class="mb-8">
              <h3 class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/20">{{ getCategoryLabel(category) }}</h3>
              <div class="glass-badges-grid">
              <BadgeCard 
                v-for="badge in getBadgesByCategory(category)" 
                :key="badge.id"
                :badge="badge"
                @click="showBadgeDetails(badge)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Badges débloqués -->
        <div v-if="activeTab === 'unlocked'">
          <div v-if="unlockedBadges.length === 0" class="text-center py-16">
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span class="text-4xl">🔒</span>
            </div>
            <p class="text-white text-lg mb-2">Tu n'as pas encore débloqué de badges</p>
            <p class="text-white/60">Continue à apprendre pour débloquer tes premiers badges !</p>
        </div>
        
          <div v-else class="glass-badges-grid">
        <BadgeCard 
          v-for="badge in sortedUnlockedBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
          </div>
      </div>

      <!-- Badges en cours -->
        <div v-if="activeTab === 'progress'">
          <div v-if="inProgressBadges.length === 0" class="text-center py-16">
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span class="text-4xl">⏳</span>
            </div>
            <p class="text-white text-lg mb-2">Aucun badge en cours de progression</p>
            <p class="text-white/60">Commence à compléter des quiz pour débloquer des badges !</p>
        </div>
        
          <div v-else class="glass-badges-grid">
        <BadgeCard 
          v-for="badge in inProgressBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
          </div>
      </div>

      <!-- Badges verrouillés -->
        <div v-if="activeTab === 'locked'" class="glass-badges-grid">
        <BadgeCard 
          v-for="badge in lockedBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
        </div>
      </div>
    </div>

    <!-- Modal de détails du badge -->
    <transition name="modal">
      <div v-if="selectedBadge" class="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4" @click="selectedBadge = null">
        <div class="glass-modal-content max-w-md w-full" @click.stop>
          <button class="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300" @click="selectedBadge = null">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <div class="text-center mb-6">
            <div class="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center" :class="selectedBadge.is_unlocked ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20'">
              <span class="text-4xl" :class="selectedBadge.is_unlocked ? '' : 'grayscale opacity-50'">{{ selectedBadge.icon }}</span>
            </div>
            
            <h3 class="text-2xl font-bold text-white mb-2">{{ selectedBadge.name }}</h3>
            <p class="text-white/60 mb-4">{{ selectedBadge.description }}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="glass-info-item">
              <span class="text-xs text-white/60 mb-1 block">Catégorie</span>
              <span class="text-sm font-semibold text-white">{{ getCategoryLabel(selectedBadge.category) }}</span>
            </div>
            <div class="glass-info-item">
              <span class="text-xs text-white/60 mb-1 block">Points</span>
              <span class="text-sm font-semibold text-white">{{ selectedBadge.points }} pts</span>
            </div>
          </div>
          
          <div v-if="!selectedBadge.is_unlocked" class="mb-6">
            <div class="flex justify-between text-sm text-white/60 mb-2">
              <span>Progression</span>
              <span>{{ selectedBadge.progress }}%</span>
            </div>
            <div class="w-full h-3 bg-white/10 backdrop-blur-xl rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" :style="{ width: selectedBadge.progress + '%' }"></div>
            </div>
          </div>
          
          <div v-else class="text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">✅</span>
            </div>
            <p class="text-lg font-semibold text-green-400 mb-2">Badge débloqué !</p>
            <p class="text-sm text-white/60">{{ formatDate(selectedBadge.unlocked_at) }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useBadgeStore } from '../stores/badgeStore.js'
import BadgeCard from './BadgeCard.vue'

export default {
  name: 'BadgeManager',
  components: {
    BadgeCard
  },
  props: {
    profileId: {
      type: [Number, String],
      required: true
    }
  },
  setup() {
    const badgeStore = useBadgeStore()
    return { badgeStore }
  },
  data() {
    return {
      activeTab: 'all',
      selectedBadge: null,
      tabs: [
        { id: 'all', label: 'Tous', icon: '🏆' },
        { id: 'unlocked', label: 'Débloqués', icon: '✅' },
        { id: 'progress', label: 'En cours', icon: '⏳' },
        { id: 'locked', label: 'Verrouillés', icon: '🔒' }
      ]
    }
  },
  computed: {
    loading() {
      return this.badgeStore.loading
    },
    badgeStats() {
      return this.badgeStore.badgeStats
    },
    profileBadges() {
      return this.badgeStore.profileBadges
    },
    unlockedBadges() {
      return this.badgeStore.unlockedBadges
    },
    sortedUnlockedBadges() {
      return this.badgeStore.sortedUnlockedBadges
    },
    lockedBadges() {
      return this.badgeStore.lockedBadges
    },
    inProgressBadges() {
      return this.badgeStore.inProgressBadges
    },
    categories() {
      const cats = [...new Set(this.profileBadges.map(b => b.category))]
      return cats.sort()
    }
  },
  async mounted() {
    await this.loadBadges()
  },
  methods: {
    async loadBadges() {
      try {
        await this.badgeStore.loadProfileBadges(this.profileId)
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error)
      }
    },
    
    getBadgesByCategory(category) {
      return this.profileBadges.filter(badge => badge.category === category)
    },
    
    getCategoryLabel(category) {
      const labels = {
        'débutant': '🎯 Débutant',
        'progression': '📈 Progression',
        'excellence': '⭐ Excellence',
        'temps': '⏰ Temps',
        'diversité': '🌈 Diversité',
        'matière': '📚 Matières'
      }
      return labels[category] || category
    },
    
    showBadgeDetails(badge) {
      this.selectedBadge = badge
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    },
    
    goBack() {
      // Retourner vers le dashboard utilisateur
      this.$router.push({ 
        path: '/user-dashboard', 
        query: { profile: this.profileId } 
      })
    }
  }
}
</script>

<style scoped>
/* Liquid Glass Design Styles */

/* Header styles */
header {
  transition: all 0.3s ease;
}

header nav {
  transition: all 0.3s ease;
}

header button {
  transition: all 0.3s ease;
}

header button:hover {
  transform: translateY(-1px);
}

header button:active {
  transform: translateY(0);
}

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

.glass-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.glass-stat-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.glass-stat-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.glass-badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.glass-modal-content {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 2rem;
  position: relative;
}

.glass-info-item {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1rem;
  text-align: center;
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
  .glass-card-dashboard,
  .glass-stat-card,
  .glass-modal-content {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  
  .glass-stats-grid {
    grid-template-columns: 1fr;
  }

  .glass-badges-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .glass-card-dashboard,
  .glass-stat-card,
  .glass-modal-content {
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

/* Tab button styles */
.flex.gap-2.flex-wrap > button {
  transition: all 0.3s ease;
}

.flex.gap-2.flex-wrap > button:hover {
  transform: translateY(-1px);
}

/* Progress bar styling */
.w-full.h-4 {
  transition: all 0.3s ease;
}

/* Icon styling */
.w-12.h-12 {
  transition: all 0.3s ease;
}

.w-12.h-12:hover {
  transform: scale(1.05);
}

/* Modal transitions */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.glass-modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .glass-modal-content,
.modal-leave-to .glass-modal-content {
  transform: scale(0.9);
}

/* Category title styling */
.text-xl.font-bold.text-white {
  transition: all 0.3s ease;
}

/* Empty state styling */
.text-center.py-16 {
  transition: all 0.3s ease;
}

/* Loading spinner styling */
.animate-spin {
  transition: all 0.3s ease;
}

/* Badge grid responsive adjustments */
@media (max-width: 1024px) {
  .glass-badges-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 640px) {
  .glass-badges-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

/* Stats grid responsive adjustments */
@media (max-width: 1024px) {
  .glass-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 640px) {
  .glass-stats-grid {
    grid-template-columns: 1fr;
  }
}

/* Modal responsive adjustments */
@media (max-width: 640px) {
  .glass-modal-content {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }
}

/* Tab responsive adjustments */
@media (max-width: 640px) {
  .flex.gap-2.flex-wrap {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  
  .flex.gap-2.flex-wrap > button {
    flex-shrink: 0;
    min-width: 120px;
  }
}

/* Info item styling */
.glass-info-item {
  transition: all 0.3s ease;
}

.glass-info-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Progress bar in modal */
.w-full.h-3 {
  transition: all 0.3s ease;
}

/* Badge icon styling */
.text-4xl {
  transition: all 0.3s ease;
}

.text-4xl:hover {
  transform: scale(1.1);
}

/* Close button styling */
.absolute.top-4.right-4 {
  transition: all 0.3s ease;
}

.absolute.top-4.right-4:hover {
  transform: scale(1.05);
}
</style>

