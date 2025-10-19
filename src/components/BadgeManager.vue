<template>
  <div class="badge-manager">
    <!-- En-tête avec statistiques -->
    <div class="stats-header">
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <div class="stat-value">{{ badgeStats.unlocked }} / {{ badgeStats.total }}</div>
          <div class="stat-label">Badges débloqués</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-value">{{ badgeStats.points }}</div>
          <div class="stat-label">Points gagnés</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ badgeStats.percentage }}%</div>
          <div class="stat-label">Progression</div>
        </div>
      </div>
    </div>

    <!-- Barre de progression globale -->
    <div class="progress-section">
      <div class="progress-bar-container">
        <div class="progress-bar-fill" :style="{ width: badgeStats.percentage + '%' }"></div>
      </div>
      <p class="progress-text">
        Continue comme ça ! Tu as débloqué {{ badgeStats.unlocked }} badges sur {{ badgeStats.total }}
      </p>
    </div>

    <!-- Onglets de filtrage -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Contenu des onglets -->
    <div class="tab-content">
      <!-- Tous les badges -->
      <div v-if="activeTab === 'all'" class="badges-grid">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des badges...</p>
        </div>
        
        <div v-else-if="profileBadges.length === 0" class="empty-state">
          <div class="empty-icon">🏆</div>
          <p>Aucun badge disponible pour le moment</p>
        </div>
        
        <div v-else>
          <div v-for="category in categories" :key="category" class="category-section">
            <h3 class="category-title">{{ getCategoryLabel(category) }}</h3>
            <div class="badges-grid">
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
      <div v-if="activeTab === 'unlocked'" class="badges-grid">
        <div v-if="unlockedBadges.length === 0" class="empty-state">
          <div class="empty-icon">🔒</div>
          <p>Tu n'as pas encore débloqué de badges</p>
          <p class="empty-subtitle">Continue à apprendre pour débloquer tes premiers badges !</p>
        </div>
        
        <BadgeCard 
          v-for="badge in sortedUnlockedBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
      </div>

      <!-- Badges en cours -->
      <div v-if="activeTab === 'progress'" class="badges-grid">
        <div v-if="inProgressBadges.length === 0" class="empty-state">
          <div class="empty-icon">⏳</div>
          <p>Aucun badge en cours de progression</p>
          <p class="empty-subtitle">Commence à compléter des quiz pour débloquer des badges !</p>
        </div>
        
        <BadgeCard 
          v-for="badge in inProgressBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
      </div>

      <!-- Badges verrouillés -->
      <div v-if="activeTab === 'locked'" class="badges-grid">
        <BadgeCard 
          v-for="badge in lockedBadges" 
          :key="badge.id"
          :badge="badge"
          @click="showBadgeDetails(badge)"
        />
      </div>
    </div>

    <!-- Modal de détails du badge -->
    <transition name="modal">
      <div v-if="selectedBadge" class="modal-overlay" @click="selectedBadge = null">
        <div class="modal-content" @click.stop>
          <button class="modal-close" @click="selectedBadge = null">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <div class="modal-badge-icon" :class="{ unlocked: selectedBadge.is_unlocked }">
            {{ selectedBadge.icon }}
          </div>
          
          <h3 class="modal-title">{{ selectedBadge.name }}</h3>
          <p class="modal-description">{{ selectedBadge.description }}</p>
          
          <div class="modal-info">
            <div class="info-item">
              <span class="info-label">Catégorie:</span>
              <span class="info-value">{{ getCategoryLabel(selectedBadge.category) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Points:</span>
              <span class="info-value">{{ selectedBadge.points }} pts</span>
            </div>
          </div>
          
          <div v-if="!selectedBadge.is_unlocked" class="modal-progress">
            <div class="progress-label">
              <span>Progression</span>
              <span>{{ selectedBadge.progress }}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" :style="{ width: selectedBadge.progress + '%' }"></div>
            </div>
          </div>
          
          <div v-else class="modal-unlocked">
            <div class="unlocked-badge">✅</div>
            <p class="unlocked-text">Badge débloqué !</p>
            <p class="unlocked-date">{{ formatDate(selectedBadge.unlocked_at) }}</p>
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
    }
  }
}
</script>

<style scoped>
.badge-manager {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Statistiques */
.stats-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Barre de progression */
.progress-section {
  margin-bottom: 2rem;
}

.progress-bar-container {
  width: 100%;
  height: 1rem;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Onglets */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.tab-button {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab-button:hover {
  border-color: #667eea;
  background-color: #f9fafb;
}

.tab-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-label {
  font-weight: 500;
}

/* Grille de badges */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.category-section {
  margin-bottom: 2rem;
}

.category-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #374151;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

/* États vides */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* Chargement */
.loading-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 1rem;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.modal-badge-icon {
  font-size: 5rem;
  text-align: center;
  margin-bottom: 1rem;
  filter: grayscale(100%);
  opacity: 0.5;
}

.modal-badge-icon.unlocked {
  filter: none;
  opacity: 1;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  color: #374151;
  margin-bottom: 0.5rem;
}

.modal-description {
  text-align: center;
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.modal-info {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  flex: 1;
  background-color: #f9fafb;
  padding: 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
}

.info-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.info-value {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.modal-progress {
  margin-top: 1.5rem;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.modal-unlocked {
  text-align: center;
  margin-top: 1.5rem;
}

.unlocked-badge {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.unlocked-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #10b981;
  margin-bottom: 0.25rem;
}

.unlocked-date {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Transitions */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .badges-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .stats-header {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  
  .tab-button {
    flex-shrink: 0;
  }
}
</style>

