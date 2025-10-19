<template>
  <div class="badge-admin-manager">
    <!-- En-tête -->
    <div class="header">
      <div class="header-content">
        <h1 class="title">🏆 Gestion des Badges</h1>
        <p class="subtitle">Créez et gérez les badges pour motiver vos enfants</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="btn-primary"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Créer un badge
      </button>
    </div>

    <!-- Statistiques globales -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-purple-100 text-purple-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ allBadges.length }}</div>
          <div class="stat-label">Badges disponibles</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-green-100 text-green-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalUnlockedBadges }}</div>
          <div class="stat-label">Badges débloqués</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-yellow-100 text-yellow-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalPoints }}</div>
          <div class="stat-label">Points totaux</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-blue-100 text-blue-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ childrenCount }}</div>
          <div class="stat-label">Enfants</div>
        </div>
      </div>
    </div>

    <!-- Onglets -->
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
      <!-- Liste des badges -->
      <div v-if="activeTab === 'badges'" class="content-section">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des badges...</p>
        </div>

        <div v-else class="badges-table">
          <table>
            <thead>
              <tr>
                <th>Badge</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Condition</th>
                <th>Points</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="badge in allBadges" :key="badge.id">
                <td>
                  <div class="badge-icon-cell">{{ badge.icon }}</div>
                </td>
                <td>
                  <div class="badge-name-cell">
                    <strong>{{ badge.name }}</strong>
                    <p class="text-sm text-gray-600">{{ badge.description }}</p>
                  </div>
                </td>
                <td>
                  <span class="badge-category">{{ getCategoryLabel(badge.category) }}</span>
                </td>
                <td>
                  <span class="badge-condition">
                    {{ getConditionLabel(badge.condition_type) }}: {{ badge.condition_value }}
                  </span>
                </td>
                <td>
                  <span class="badge-points">{{ badge.points }} pts</span>
                </td>
                <td>
                  <span :class="['badge-status', badge.is_active ? 'active' : 'inactive']">
                    {{ badge.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      @click="editBadge(badge)"
                      class="btn-icon btn-edit"
                      title="Modifier"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button 
                      @click="toggleBadgeStatus(badge)"
                      class="btn-icon btn-toggle"
                      :title="badge.is_active ? 'Désactiver' : 'Activer'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </button>
                    <button 
                      @click="confirmDelete(badge)"
                      class="btn-icon btn-delete"
                      title="Supprimer"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Statistiques par enfant -->
      <div v-if="activeTab === 'children'" class="content-section">
        <div class="children-stats">
          <div v-for="child in childrenProfiles" :key="child.id" class="child-card">
            <div class="child-header">
              <div class="child-avatar" :class="child.color">
                {{ child.name.charAt(0) }}
              </div>
              <div class="child-info">
                <h3>{{ child.name }}</h3>
                <p class="child-type">{{ child.is_child ? 'Enfant' : 'Adolescent' }}</p>
              </div>
              <button 
                @click="viewChildBadges(child)"
                class="btn-secondary btn-sm"
              >
                Voir les badges
              </button>
            </div>

            <div class="child-stats">
              <div class="stat-item">
                <span class="stat-icon">🏆</span>
                <div>
                  <div class="stat-value">{{ getChildStats(child.id).unlocked }}/{{ getChildStats(child.id).total }}</div>
                  <div class="stat-label">Badges</div>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">⭐</span>
                <div>
                  <div class="stat-value">{{ getChildStats(child.id).points }}</div>
                  <div class="stat-label">Points</div>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📊</span>
                <div>
                  <div class="stat-value">{{ getChildStats(child.id).percentage }}%</div>
                  <div class="stat-label">Progression</div>
                </div>
              </div>
            </div>

            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: getChildStats(child.id).percentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Créer/Modifier Badge -->
    <transition name="modal">
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ showEditModal ? 'Modifier le badge' : 'Créer un nouveau badge' }}</h2>
            <button @click="closeModals" class="modal-close">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveBadge" class="modal-body">
            <!-- Nom du badge -->
            <div class="form-group">
              <label>Nom du badge *</label>
              <input 
                v-model="badgeForm.name" 
                type="text"
                required
                placeholder="Ex: Super Apprenant"
                class="form-input"
              />
            </div>

            <!-- Description -->
            <div class="form-group">
              <label>Description *</label>
              <textarea 
                v-model="badgeForm.description"
                required
                placeholder="Ex: Complète 20 quiz avec succès"
                rows="3"
                class="form-input"
              ></textarea>
            </div>

            <!-- Icône -->
            <div class="form-group">
              <label>Icône (emoji) *</label>
              <div class="icon-selector">
                <input 
                  v-model="badgeForm.icon" 
                  type="text"
                  required
                  placeholder="🏆"
                  class="form-input icon-input"
                  maxlength="2"
                />
                <div class="icon-suggestions">
                  <button 
                    v-for="emoji in emojiSuggestions" 
                    :key="emoji"
                    type="button"
                    @click="badgeForm.icon = emoji"
                    class="emoji-btn"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Catégorie -->
            <div class="form-group">
              <label>Catégorie *</label>
              <select v-model="badgeForm.category" required class="form-input">
                <option value="">Sélectionner une catégorie</option>
                <option value="débutant">🎯 Débutant</option>
                <option value="progression">📈 Progression</option>
                <option value="excellence">⭐ Excellence</option>
                <option value="temps">⏰ Temps</option>
                <option value="diversité">🌈 Diversité</option>
                <option value="matière">📚 Matières</option>
              </select>
            </div>

            <!-- Type de condition -->
            <div class="form-group">
              <label>Type de condition *</label>
              <select v-model="badgeForm.condition_type" required class="form-input">
                <option value="">Sélectionner un type</option>
                <option value="quiz_completed">Nombre de quiz complétés</option>
                <option value="perfect_score">Scores parfaits (100%)</option>
                <option value="score_streak">Série de bons scores</option>
                <option value="learning_time">Temps d'apprentissage (minutes)</option>
                <option value="daily_streak">Jours consécutifs</option>
                <option value="subjects_variety">Variété de matières</option>
                <option value="subject_specific">Quiz dans une matière</option>
              </select>
            </div>

            <!-- Valeur de condition -->
            <div class="form-group">
              <label>Valeur requise *</label>
              <input 
                v-model.number="badgeForm.condition_value" 
                type="number"
                required
                min="1"
                placeholder="Ex: 10"
                class="form-input"
              />
              <p class="form-help">{{ getConditionHelp() }}</p>
            </div>

            <!-- Points -->
            <div class="form-group">
              <label>Points *</label>
              <input 
                v-model.number="badgeForm.points" 
                type="number"
                required
                min="0"
                placeholder="Ex: 50"
                class="form-input"
              />
            </div>

            <!-- Couleur -->
            <div class="form-group">
              <label>Couleur *</label>
              <div class="color-selector">
                <button
                  v-for="color in colors"
                  :key="color.value"
                  type="button"
                  @click="badgeForm.color = color.value"
                  :class="['color-btn', color.class, { selected: badgeForm.color === color.value }]"
                  :title="color.label"
                >
                  <svg v-if="badgeForm.color === color.value" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Boutons -->
            <div class="modal-footer">
              <button type="button" @click="closeModals" class="btn-secondary">
                Annuler
              </button>
              <button type="submit" class="btn-primary" :disabled="saving">
                <span v-if="saving">Enregistrement...</span>
                <span v-else>{{ showEditModal ? 'Mettre à jour' : 'Créer le badge' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Modal de confirmation de suppression -->
    <transition name="modal">
      <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
        <div class="modal-content modal-sm" @click.stop>
          <div class="modal-header">
            <h2>Confirmer la suppression</h2>
          </div>
          <div class="modal-body">
            <p>Êtes-vous sûr de vouloir supprimer le badge <strong>{{ badgeToDelete?.name }}</strong> ?</p>
            <p class="text-sm text-gray-600 mt-2">Cette action est irréversible.</p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteModal = false" class="btn-secondary">
              Annuler
            </button>
            <button @click="deleteBadge" class="btn-danger">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useBadgeStore } from '../stores/badgeStore.js'
import { useProfileStore } from '../stores/profileStore.js'
import { BadgeRepository } from '../repositories/badgeRepository.js'

export default {
  name: 'BadgeAdminManager',
  setup() {
    const badgeStore = useBadgeStore()
    const profileStore = useProfileStore()
    const badgeRepository = new BadgeRepository()
    return { badgeStore, profileStore, badgeRepository }
  },
  data() {
    return {
      activeTab: 'badges',
      loading: false,
      saving: false,
      showCreateModal: false,
      showEditModal: false,
      showDeleteModal: false,
      badgeToDelete: null,
      childrenStats: {},
      tabs: [
        { id: 'badges', label: 'Gestion des badges', icon: '🏆' },
        { id: 'children', label: 'Statistiques par enfant', icon: '👶' }
      ],
      badgeForm: {
        name: '',
        description: '',
        icon: '🏆',
        category: '',
        condition_type: '',
        condition_value: 1,
        points: 10,
        color: 'purple',
        is_active: true
      },
      editingBadgeId: null,
      emojiSuggestions: ['🏆', '⭐', '🎯', '🔥', '💎', '👑', '🌟', '✨', '🎖️', '🥇', '🥈', '🥉', '📚', '🎓', '🧠', '💪', '🚀', '⚡', '🌈', '🎨'],
      colors: [
        { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
        { value: 'green', label: 'Vert', class: 'bg-green-500' },
        { value: 'purple', label: 'Violet', class: 'bg-purple-500' },
        { value: 'yellow', label: 'Jaune', class: 'bg-yellow-500' },
        { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
        { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
        { value: 'rainbow', label: 'Arc-en-ciel', class: 'bg-gradient-to-r from-red-400 via-purple-400 to-blue-400' }
      ]
    }
  },
  computed: {
    allBadges() {
      return this.badgeStore.allBadges
    },
    childrenProfiles() {
      return this.profileStore.profiles.filter(p => p.is_child || p.is_teen)
    },
    childrenCount() {
      return this.childrenProfiles.length
    },
    totalUnlockedBadges() {
      return Object.values(this.childrenStats).reduce((sum, stats) => sum + (stats.unlocked || 0), 0)
    },
    totalPoints() {
      return Object.values(this.childrenStats).reduce((sum, stats) => sum + (stats.points || 0), 0)
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        // Charger tous les badges
        await this.badgeStore.loadAllBadges()
        
        // Charger les profils
        await this.profileStore.loadProfiles()
        
        // Charger les statistiques pour chaque enfant
        for (const child of this.childrenProfiles) {
          const stats = await this.badgeRepository.getBadgeStats(child.id)
          this.childrenStats[child.id] = stats
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        this.loading = false
      }
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
    
    getConditionLabel(type) {
      const labels = {
        'quiz_completed': 'Quiz complétés',
        'perfect_score': 'Scores parfaits',
        'score_streak': 'Série de scores',
        'learning_time': 'Temps d\'apprentissage',
        'daily_streak': 'Jours consécutifs',
        'subjects_variety': 'Variété de matières',
        'subject_specific': 'Quiz par matière'
      }
      return labels[type] || type
    },
    
    getConditionHelp() {
      const helps = {
        'quiz_completed': 'Nombre de quiz à compléter',
        'perfect_score': 'Nombre de scores parfaits (100%) à obtenir',
        'score_streak': 'Nombre de quiz consécutifs avec plus de 80%',
        'learning_time': 'Nombre de minutes d\'apprentissage',
        'daily_streak': 'Nombre de jours consécutifs avec au moins un quiz',
        'subjects_variety': 'Nombre de matières différentes à essayer',
        'subject_specific': 'Nombre de quiz dans une matière spécifique'
      }
      return helps[this.badgeForm.condition_type] || 'Sélectionnez un type de condition'
    },
    
    getChildStats(childId) {
      return this.childrenStats[childId] || { total: 0, unlocked: 0, points: 0, percentage: 0 }
    },
    
    editBadge(badge) {
      this.editingBadgeId = badge.id
      this.badgeForm = {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        condition_type: badge.condition_type,
        condition_value: badge.condition_value,
        points: badge.points,
        color: badge.color,
        is_active: badge.is_active
      }
      this.showEditModal = true
    },
    
    async saveBadge() {
      this.saving = true
      try {
        if (this.showEditModal) {
          // Modifier
          await this.badgeStore.updateBadge(this.editingBadgeId, this.badgeForm)
        } else {
          // Créer
          await this.badgeStore.createBadge(this.badgeForm)
        }
        
        await this.loadData()
        this.closeModals()
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du badge:', error)
        alert('Erreur lors de la sauvegarde: ' + error.message)
      } finally {
        this.saving = false
      }
    },
    
    async toggleBadgeStatus(badge) {
      try {
        await this.badgeStore.updateBadge(badge.id, {
          ...badge,
          is_active: !badge.is_active
        })
        await this.loadData()
      } catch (error) {
        console.error('Erreur lors du changement de statut:', error)
      }
    },
    
    confirmDelete(badge) {
      this.badgeToDelete = badge
      this.showDeleteModal = true
    },
    
    async deleteBadge() {
      try {
        await this.badgeStore.deleteBadge(this.badgeToDelete.id)
        await this.loadData()
        this.showDeleteModal = false
        this.badgeToDelete = null
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        alert('Erreur lors de la suppression: ' + error.message)
      }
    },
    
    viewChildBadges(child) {
      this.$router.push({
        name: 'BadgeManager',
        query: { profile: child.id }
      })
    },
    
    closeModals() {
      this.showCreateModal = false
      this.showEditModal = false
      this.editingBadgeId = null
      this.badgeForm = {
        name: '',
        description: '',
        icon: '🏆',
        category: '',
        condition_type: '',
        condition_value: 1,
        points: 10,
        color: 'purple',
        is_active: true
      }
    }
  }
}
</script>

<style scoped>
.badge-admin-manager {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
}

/* Statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Onglets */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-button {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-weight: 500;
}

.tab-button:hover {
  color: #374151;
  background-color: #f9fafb;
}

.tab-button.active {
  color: #7c3aed;
  border-bottom-color: #7c3aed;
}

.tab-icon {
  font-size: 1.25rem;
}

/* Table */
.badges-table {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f9fafb;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.badge-icon-cell {
  font-size: 2rem;
  text-align: center;
}

.badge-name-cell strong {
  display: block;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.badge-category,
.badge-condition,
.badge-points {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
}

.badge-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-status.active {
  background: #d1fae5;
  color: #059669;
}

.badge-status.inactive {
  background: #fee2e2;
  color: #dc2626;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Boutons */
.btn-primary {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.btn-secondary {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-danger {
  background: #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-edit {
  background: #dbeafe;
  color: #1d4ed8;
}

.btn-edit:hover {
  background: #bfdbfe;
}

.btn-toggle {
  background: #fef3c7;
  color: #d97706;
}

.btn-toggle:hover {
  background: #fde68a;
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fecaca;
}

/* Cartes enfants */
.children-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.child-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.child-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.child-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}

.child-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.child-type {
  font-size: 0.875rem;
  color: #6b7280;
}

.child-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-item .stat-icon {
  font-size: 1.5rem;
}

.stat-item .stat-value {
  font-size: 1.25rem;
}

.stat-item .stat-label {
  font-size: 0.75rem;
}

.progress-bar {
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
  transition: width 0.3s ease;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-sm {
  max-width: 400px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Form */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.form-help {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* Icon selector */
.icon-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.icon-input {
  font-size: 1.5rem;
  text-align: center;
}

.icon-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.emoji-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: #f3f4f6;
  transform: scale(1.1);
}

/* Color selector */
.color-selector {
  display: flex;
  gap: 0.75rem;
}

.color-btn {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.selected {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .badge-admin-manager {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .badges-table {
    overflow-x: auto;
  }

  table {
    min-width: 800px;
  }

  .children-stats {
    grid-template-columns: 1fr;
  }
}
</style>

