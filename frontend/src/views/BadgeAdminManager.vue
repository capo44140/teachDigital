<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white"><span aria-hidden="true">🏆</span> Gestion des Badges</h1>
              <p class="text-sm text-white/70 hidden sm:block">Créez et gérez les badges pour motiver vos enfants</p>
            </div>
          </div>
          <button
            type="button"
            class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center space-x-2 text-sm"
            aria-haspopup="dialog"
            @click="showCreateModal = true"
          >
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Créer un badge</span>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <!-- Statistiques globales -->
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/70 text-sm">Total badges</p>
            <p class="text-3xl font-bold text-white">{{ allBadges.length }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/70 text-sm">Badges actifs</p>
            <p class="text-3xl font-bold text-white">{{ activeBadgesCount }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/70 text-sm">Enfants</p>
            <p class="text-3xl font-bold text-white">{{ childrenCount }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <div>
            <p class="text-white/70 text-sm">Catégories</p>
            <p class="text-3xl font-bold text-white">{{ categories.length }}</p>
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="glass-card-dashboard mb-8">
        <div class="flex space-x-1 mb-6" role="tablist" aria-label="Sections de la gestion des badges">
          <button
            v-for="tab in tabs"
            :id="`badge-admin-tab-${tab.id}`"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id ? 'true' : 'false'"
            :aria-controls="`badge-admin-panel-${tab.id}`"
            :class="[
              'px-4 py-2 rounded-xl transition-all font-medium text-sm',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            ]"
            @click="activeTab = tab.id"
          >
            <span class="mr-2" aria-hidden="true">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Contenu des onglets -->
        <div
          v-if="activeTab === 'badges'"
          id="badge-admin-panel-badges"
          role="tabpanel"
          aria-labelledby="badge-admin-tab-badges"
        >
          <!-- Bouton créer badge -->
          <div class="flex justify-end mb-6">
            <button
              type="button"
              aria-haspopup="dialog"
              class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              @click="showCreateModal = true"
            >
              Créer un nouveau badge
            </button>
          </div>

          <p v-if="loading" role="status" class="text-white/70 text-sm mb-4">Chargement des badges…</p>

          <!-- Liste des badges -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-white/10">
                  <th scope="col" class="text-left py-3 px-4 text-white/80 font-medium">Badge</th>
                  <th scope="col" class="text-left py-3 px-4 text-white/80 font-medium">Catégorie</th>
                  <th scope="col" class="text-left py-3 px-4 text-white/80 font-medium">Condition</th>
                  <th scope="col" class="text-left py-3 px-4 text-white/80 font-medium">Points</th>
                  <th scope="col" class="text-left py-3 px-4 text-white/80 font-medium">Statut</th>
                  <th scope="col" class="text-right py-3 px-4 text-white/80 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="badge in allBadges" :key="badge.id" class="hover:bg-white/5 transition-colors">
                  <td class="py-4 px-4">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" aria-hidden="true" :style="{ backgroundColor: badge.color + '20' }">
                        {{ badge.icon }}
                      </div>
                      <div>
                        <p class="text-white font-medium">{{ badge.name }}</p>
                        <p class="text-white/70 text-sm">{{ badge.description }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="px-2 py-1 bg-purple-500/30 text-purple-200 text-xs rounded-full">
                      {{ badge.category }}
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    <p class="text-white/80 text-sm">{{ getConditionText(badge) }}</p>
                  </td>
                  <td class="py-4 px-4">
                    <span class="text-white font-medium">{{ badge.points }} pts</span>
                  </td>
                  <td class="py-4 px-4">
                    <span :class="badge.is_active ? 'bg-green-500/30 text-green-200' : 'bg-gray-500/30 text-gray-200'"
                          class="px-2 py-1 text-xs rounded-full">
                      {{ badge.is_active ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex justify-end space-x-2">
                      <button
                        type="button"
                        class="p-2 text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg hover:bg-white/10 transition-all"
                        title="Modifier"
                        :aria-label="`Modifier le badge ${badge.name}`"
                        aria-haspopup="dialog"
                        @click="editBadge(badge)"
                      >
                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="p-2 text-red-300 hover:text-red-200 border border-red-400/20 hover:border-red-400/40 rounded-lg hover:bg-red-400/10 transition-all"
                        title="Supprimer"
                        :aria-label="`Supprimer le badge ${badge.name}`"
                        @click="confirmDeleteBadge(badge)"
                      >
                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <!-- Onglet statistiques par enfant (GET /api/badges/profile/:id/stats) -->
        <div
          v-else-if="activeTab === 'children'"
          id="badge-admin-panel-children"
          role="tabpanel"
          aria-labelledby="badge-admin-tab-children"
        >
          <p v-if="loadingChildrenStats" role="status" class="text-white/70 text-sm mb-4">Chargement des statistiques…</p>
          <p v-else-if="children.length === 0" class="text-white/70 text-sm">Aucun profil enfant ou adolescent.</p>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="child in children" :key="child.id" class="glass-card-stat">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <p class="text-white/70 text-sm">{{ child.name }}</p>
                <template v-if="childrenStats[child.id]">
                  <p class="text-2xl font-bold text-white">
                    {{ childrenStats[child.id].unlocked }}<span class="text-base font-medium text-white/70"> / {{ childrenStats[child.id].total }}</span>
                  </p>
                  <p class="text-white/70 text-xs">
                    badges obtenus · {{ childrenStats[child.id].points }} pts · {{ childrenStats[child.id].percentage }} %
                  </p>
                </template>
                <p v-else-if="!loadingChildrenStats" class="text-white/70 text-xs">Statistiques indisponibles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création/modification -->
    <BaseModal
      :open="showCreateModal || showEditModal"
      labelledby="badge-form-title"
      :persistent="saving"
      overlay-class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      panel-class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl max-w-md w-full p-8 border border-white/10 max-h-[90vh] overflow-y-auto"
      @close="closeModals"
    >
      <h3 id="badge-form-title" class="text-xl font-bold text-white mb-6">
        {{ editingBadge ? 'Modifier le badge' : 'Créer un badge' }}
      </h3>

      <form class="space-y-4" @submit.prevent="saveBadge">
        <!-- Nom du badge -->
        <div>
          <label for="badge-form-name" class="block text-sm font-medium text-white/80 mb-2">Nom du badge *</label>
          <input
            id="badge-form-name"
            v-model="badgeForm.name"
            type="text"
            required
            placeholder="Ex: Super Apprenant"
            class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="badge-form-description" class="block text-sm font-medium text-white/80 mb-2">Description *</label>
          <textarea
            id="badge-form-description"
            v-model="badgeForm.description"
            required
            placeholder="Ex: Complète 20 quiz avec succès"
            rows="3"
            class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
          ></textarea>
        </div>

        <!-- Icône -->
        <div>
          <label for="badge-form-icon" class="block text-sm font-medium text-white/80 mb-2">Icône (emoji) *</label>
          <div class="flex items-center space-x-2">
            <input
              id="badge-form-icon"
              v-model="badgeForm.icon"
              type="text"
              required
              placeholder="🏆"
              class="flex-1 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              maxlength="2"
            />
            <div class="flex space-x-1" role="group" aria-label="Icônes suggérées">
              <button
                v-for="emoji in emojiSuggestions.slice(0, 5)"
                :key="emoji"
                type="button"
                :aria-label="`Choisir l'icône ${emoji}`"
                :aria-pressed="badgeForm.icon === emoji ? 'true' : 'false'"
                class="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                @click="badgeForm.icon = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>

        <!-- Catégorie -->
        <div>
          <label for="badge-form-category" class="block text-sm font-medium text-white/80 mb-2">Catégorie *</label>
          <select id="badge-form-category" v-model="badgeForm.category" required class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">
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
        <div>
          <label for="badge-form-condition" class="block text-sm font-medium text-white/80 mb-2">Type de condition *</label>
          <select id="badge-form-condition" v-model="badgeForm.condition_type" required class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">
            <option value="">Sélectionner un type</option>
            <option value="quiz_completed">Nombre de quiz complétés</option>
            <option value="perfect_score">Scores parfaits (100%)</option>
            <option value="score_streak">Série de bons scores</option>
            <option value="daily_streak">Jours consécutifs</option>
            <option value="subjects_variety">Variété de matières</option>
            <option value="subject_specific">Quiz dans une matière</option>
          </select>
        </div>

        <!-- Valeur de condition -->
        <div>
          <label for="badge-form-value" class="block text-sm font-medium text-white/80 mb-2">Valeur requise *</label>
          <input
            id="badge-form-value"
            v-model.number="badgeForm.condition_value"
            aria-describedby="badge-form-value-help"
            type="number"
            required
            min="1"
            placeholder="Ex: 10"
            class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          <p id="badge-form-value-help" class="text-xs text-white/70 mt-1">{{ getConditionHelp() }}</p>
        </div>

        <!-- Points -->
        <div>
          <label for="badge-form-points" class="block text-sm font-medium text-white/80 mb-2">Points *</label>
          <input
            id="badge-form-points"
            v-model.number="badgeForm.points"
            type="number"
            required
            min="0"
            placeholder="Ex: 50"
            class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>

        <!-- Couleur -->
        <div>
          <p id="badge-form-color-label" class="block text-sm font-medium text-white/80 mb-2">Couleur *</p>
          <div class="flex flex-wrap gap-2" role="group" aria-labelledby="badge-form-color-label">
            <button
              v-for="color in colors"
              :key="color.value"
              type="button"
              :class="[
                'w-8 h-8 rounded-lg border-2 transition-all',
                color.class,
                badgeForm.color === color.value ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'
              ]"
              :title="color.label"
              :aria-label="color.label"
              :aria-pressed="badgeForm.color === color.value ? 'true' : 'false'"
              @click="badgeForm.color = color.value"
            >
              <svg v-if="badgeForm.color === color.value" aria-hidden="true" class="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Boutons -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            class="px-6 py-2 text-white/80 hover:text-white transition-colors"
            @click="closeModals"
          >
            Annuler
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
          >
            {{ saving ? 'Enregistrement...' : (showEditModal ? 'Mettre à jour' : 'Créer le badge') }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import BaseModal from '../components/BaseModal.vue'
import { useToast } from '../stores/toastStore.js'
import { useConfirm } from '../composables/useConfirm.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { useBadgeStore } from '../stores/badgeStore.js'
import { useProfileStore } from '../stores/profileStore.js'
import badgeService from '../services/badgeService.js'

export default {
  name: 'BadgeAdminManager',
  components: {
    BaseModal
  },
  setup() {
    const parentNav = useParentNavigation()
    const toast = useToast()
    const { confirm } = useConfirm()
    const badgeStore = useBadgeStore()
    const profileStore = useProfileStore()

    // État réactif
    const activeTab = ref('badges')
    const loading = ref(false)
    const saving = ref(false)
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const editingBadge = ref(null)
    // Statistiques de badges par profil enfant/ado : { [profileId]: { total, unlocked, points, percentage } }
    const childrenStats = ref({})
    const loadingChildrenStats = ref(false)

    // Configuration des onglets
    const tabs = [
      { id: 'badges', label: 'Gestion des badges', icon: '🏆' },
      { id: 'children', label: 'Statistiques par enfant', icon: '👶' }
    ]

    // Formulaire de badge
    const badgeForm = ref({
      name: '',
      description: '',
      icon: '🏆',
      category: '',
      condition_type: '',
      condition_value: 1,
      points: 10,
      color: '#8B5CF6',
      is_active: true
    })

    // Suggestions d'emojis
    const emojiSuggestions = [
      '🏆', '🥇', '⭐', '🌟', '💎', '🎯', '🚀', '💪', '🧠', '📚',
      '🎨', '🎵', '⚽', '🏀', '🎮', '🔬', '🌍', '🎭', '🎪', '🎨'
    ]

    // Couleurs disponibles
    const colors = [
      { value: '#8B5CF6', label: 'Violet', class: 'bg-purple-500' },
      { value: '#EF4444', label: 'Rouge', class: 'bg-red-500' },
      { value: '#F59E0B', label: 'Orange', class: 'bg-amber-500' },
      { value: '#10B981', label: 'Vert', class: 'bg-emerald-500' },
      { value: '#3B82F6', label: 'Bleu', class: 'bg-blue-500' },
      { value: '#EC4899', label: 'Rose', class: 'bg-pink-500' },
      { value: '#06B6D4', label: 'Cyan', class: 'bg-cyan-500' },
      { value: '#84CC16', label: 'Lime', class: 'bg-lime-500' }
    ]

    // Computed properties
    const allBadges = computed(() => badgeStore.allBadges || [])
    // Profils enfants et adolescents actifs
    const children = computed(() => profileStore.nonAdminProfiles)
    const childrenCount = computed(() => children.value.length)
    const activeBadgesCount = computed(() => allBadges.value.filter(b => b.is_active).length)
    const categories = computed(() => {
      const cats = [...new Set(allBadges.value.map(b => b.category))]
      return cats.filter(cat => cat).sort()
    })

    // Méthodes
    const goBack = () => {
      parentNav.goToDashboard()
    }

    const loadBadges = async () => {
      try {
        loading.value = true
        await badgeStore.loadAllBadges()
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error)
      } finally {
        loading.value = false
      }
    }

    // GET /api/badges/profile/:id/stats pour chaque enfant/ado (un échec n'empêche pas les autres)
    const loadChildrenStats = async () => {
      loadingChildrenStats.value = true
      try {
        await profileStore.loadProfiles()
        const entries = await Promise.all(children.value.map(async (child) => {
          try {
            return [child.id, await badgeService.getBadgeStats(child.id)]
          } catch (error) {
            console.error(`Statistiques de badges indisponibles pour le profil ${child.id}:`, error)
            return [child.id, null]
          }
        }))
        childrenStats.value = Object.fromEntries(entries.filter(([, stats]) => stats))
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      } finally {
        loadingChildrenStats.value = false
      }
    }

    const getConditionText = (badge) => {
      const type = badge.condition_type
      const value = badge.condition_value

      switch (type) {
        case 'quiz_completed':
          return `${value} quiz complétés`
        case 'perfect_score':
          return `${value} scores parfaits`
        case 'score_streak':
          return `Série de ${value} bons scores`
        case 'learning_time':
          // Critère plus évalué par le serveur (aucune donnée de temps) : badge jamais débloqué
          return `${value} minutes d'apprentissage (non évaluable)`
        case 'daily_streak':
          return `${value} jours consécutifs`
        case 'subjects_variety':
          return `${value} matières différentes`
        case 'subject_specific':
          return `${value} quiz dans une matière`
        default:
          return 'Condition non définie'
      }
    }

    const getConditionHelp = () => {
      const type = badgeForm.value.condition_type
      switch (type) {
        case 'quiz_completed':
          return 'Nombre total de quiz complétés'
        case 'perfect_score':
          return 'Nombre de quiz avec 100% de réussite'
        case 'score_streak':
          return 'Nombre de quiz réussis consécutivement'
        case 'learning_time':
          return 'Critère non évaluable (temps non enregistré) : choisissez un autre type'
        case 'daily_streak':
          return 'Nombre de jours consécutifs d\'activité'
        case 'subjects_variety':
          return 'Nombre de matières différentes étudiées'
        case 'subject_specific':
          return 'Nombre de quiz dans une matière (déduite du nom ou de la description du badge)'
        default:
          return 'Sélectionnez un type de condition'
      }
    }

    const editBadge = (badge) => {
      editingBadge.value = badge
      badgeForm.value = {
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
      showEditModal.value = true
    }

    // Confirmation accessible commune (ConfirmDialog) puis suppression
    const confirmDeleteBadge = async (badge) => {
      const accepted = await confirm({
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer le badge « ${badge.name} » ?\nCette action est irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true
      })
      if (accepted) await deleteBadge(badge)
    }

    const deleteBadge = async (badge) => {
      if (!badge) return

      try {
        await badgeService.deleteBadge(badge.id)
        await loadBadges()
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        toast.errorFrom(error, 'Erreur lors de la suppression du badge')
      }
    }

    const saveBadge = async () => {
      try {
        saving.value = true

        if (editingBadge.value) {
          await badgeService.updateBadge(editingBadge.value.id, badgeForm.value)
        } else {
          // BadgeService expose createCustomBadge (POST /api/badges)
          await badgeService.createCustomBadge(badgeForm.value)
        }

        await loadBadges()
        closeModals()
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error)
        toast.errorFrom(error, 'Erreur lors de la sauvegarde du badge')
      } finally {
        saving.value = false
      }
    }

    const closeModals = () => {
      showCreateModal.value = false
      showEditModal.value = false
      editingBadge.value = null
      badgeForm.value = {
        name: '',
        description: '',
        icon: '🏆',
        category: '',
        condition_type: '',
        condition_value: 1,
        points: 10,
        color: '#8B5CF6',
        is_active: true
      }
    }

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        loadBadges(),
        loadChildrenStats()
      ])
    })

    return {
      // État
      activeTab,
      loading,
      saving,
      showCreateModal,
      showEditModal,
      editingBadge,
      childrenStats,
      loadingChildrenStats,

      // Configuration
      tabs,
      badgeForm,
      emojiSuggestions,
      colors,

      // Computed
      allBadges,
      children,
      childrenCount,
      activeBadgesCount,
      categories,

      // Méthodes
      goBack,
      getConditionText,
      getConditionHelp,
      editBadge,
      confirmDeleteBadge,
      saveBadge,
      closeModals
    }
  }
}
</script>

<style scoped>
/* NOTE: styles "glass-card-*" centralisés (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */
</style>