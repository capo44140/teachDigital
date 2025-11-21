<template>
  <!--
    LIQUID GLASS DESIGN - Gestionnaire de Badges (Version Centralisée)
    
    ✨ Utilise le système Liquid Glass centralisé
    🌈 Composants UI réutilisables
    💎 Design cohérent et maintenable
  -->
  <GlassLayout>
    <!-- Header avec bouton retour -->
    <header class="lg-z-header backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <GlassButton
              :title="''"
              icon="←"
              gradient="primary"
              size="small"
              custom-class="!p-3"
              @click="goBack"
            />
            <div>
              <h1 class="lg-text-primary text-2xl font-bold">Retour au dashboard</h1>
              <p class="lg-text-secondary text-sm">Découvre et gère tes badges</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <GlassBadge
              text="🏆"
              gradient="quiz"
              size="small"
            />
            <span class="lg-text-primary font-medium">{{ profileId ? `Profil ${profileId}` : 'Utilisateur' }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="lg-z-content w-full max-w-6xl mx-auto px-6 py-8">
      <!-- En-tête avec statistiques -->
      <div class="lg-glass-grid mb-8">
        <GlassCard size="normal" custom-class="lg-fade-in-up">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center lg-gradient-quiz">
              <span class="text-white text-xl">🏆</span>
            </div>
            <div>
              <h3 class="lg-text-primary text-lg font-semibold">Badges Débloqués</h3>
              <p class="lg-text-secondary text-sm">{{ unlockedBadges.length }} badges</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard size="normal" custom-class="lg-fade-in-up" style="animation-delay: 0.1s">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center lg-gradient-notifications">
              <span class="text-white text-xl">⭐</span>
            </div>
            <div>
              <h3 class="lg-text-primary text-lg font-semibold">Points Gagnés</h3>
              <p class="lg-text-secondary text-sm">{{ totalPoints }} points</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard size="normal" custom-class="lg-fade-in-up" style="animation-delay: 0.2s">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center lg-gradient-profiles">
              <span class="text-white text-xl">📈</span>
            </div>
            <div>
              <h3 class="lg-text-primary text-lg font-semibold">Progression</h3>
              <p class="lg-text-secondary text-sm">{{ progressPercentage }}% complété</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Barre de progression globale -->
      <GlassCard size="normal" custom-class="lg-fade-in-up mb-8" style="animation-delay: 0.3s">
        <GlassProgress
          :value="progressPercentage"
          :max="100"
          label="Progression Globale"
          :description="`${unlockedBadges.length} badges débloqués sur ${allBadges.length}`"
          value-format="percentage"
        />
      </GlassCard>

      <!-- Onglets de filtrage -->
      <GlassCard size="normal" custom-class="lg-fade-in-up mb-8" style="animation-delay: 0.4s">
        <div class="flex flex-wrap gap-2">
          <GlassButton
            v-for="tab in tabs"
            :key="tab.id"
            :title="tab.label"
            :icon="tab.icon"
            :gradient="activeTab === tab.id ? 'quiz' : 'info'"
            size="small"
            :custom-class="activeTab === tab.id ? 'shadow-lg shadow-purple-500/20' : ''"
            @click="setActiveTab(tab.id)"
          />
        </div>
      </GlassCard>

      <!-- Grille de badges -->
      <div class="lg-glass-grid">
        <template v-if="filteredBadges.length > 0">
          <GlassCard
            v-for="badge in filteredBadges"
            :key="badge.id"
            size="normal"
            custom-class="lg-fade-in-up hover:scale-105 transition-transform duration-300"
            @click="openBadgeModal(badge)"
          >
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                   :class="badge.unlocked ? 'lg-gradient-quiz' : 'bg-gray-600'">
                {{ badge.unlocked ? badge.icon : '🔒' }}
              </div>
              <h3 class="lg-text-primary font-semibold mb-2">{{ badge.name }}</h3>
              <p class="lg-text-secondary text-sm mb-3">{{ badge.description }}</p>
              <GlassBadge
                :text="badge.unlocked ? 'Débloqué' : 'Verrouillé'"
                :gradient="badge.unlocked ? 'learning' : 'info'"
                size="small"
              />
            </div>
          </GlassCard>
        </template>
        
        <template v-else>
          <GlassCard size="large" custom-class="col-span-full text-center py-12">
            <div class="text-6xl mb-4">🔍</div>
            <h3 class="lg-text-primary text-xl font-semibold mb-2">Aucun badge trouvé</h3>
            <p class="lg-text-secondary">Aucun badge ne correspond à ce filtre.</p>
          </GlassCard>
        </template>
      </div>
    </div>

    <!-- Modal de détails du badge -->
    <div v-if="selectedBadge" class="lg-z-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassCard size="large" custom-class="max-w-md w-full">
        <div class="text-center">
          <div class="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center text-4xl lg-gradient-quiz">
            {{ selectedBadge.icon }}
          </div>
          <h2 class="lg-text-primary text-2xl font-bold mb-4">{{ selectedBadge.name }}</h2>
          <p class="lg-text-secondary mb-6">{{ selectedBadge.description }}</p>
          
          <div class="space-y-4 mb-6">
            <div class="flex justify-between items-center">
              <span class="lg-text-secondary">Points:</span>
              <GlassBadge :text="`${selectedBadge.points} pts`" gradient="notifications" size="small" />
            </div>
            <div class="flex justify-between items-center">
              <span class="lg-text-secondary">Statut:</span>
              <GlassBadge
                :text="selectedBadge.unlocked ? 'Débloqué' : 'Verrouillé'"
                :gradient="selectedBadge.unlocked ? 'learning' : 'info'"
                size="small"
              />
            </div>
          </div>
          
          <GlassButton
            title="Fermer"
            gradient="primary"
            @click="closeBadgeModal"
          />
        </div>
      </GlassCard>
    </div>
  </GlassLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBadgeStore } from '@/stores/badgeStore'
import { 
  GlassLayout, 
  GlassCard, 
  GlassButton, 
  GlassBadge, 
  GlassProgress 
} from '@/components/ui'

const router = useRouter()
const badgeStore = useBadgeStore()

// État local
const activeTab = ref('all')
const selectedBadge = ref(null)
const profileId = ref(null)

// Onglets de filtrage
const tabs = [
  { id: 'all', label: 'Tous', icon: '🏆' },
  { id: 'unlocked', label: 'Débloqués', icon: '✅' },
  { id: 'in-progress', label: 'En cours', icon: '⏳' },
  { id: 'locked', label: 'Verrouillés', icon: '🔒' }
]

// Computed properties
const allBadges = computed(() => badgeStore.badges)
const unlockedBadges = computed(() => badgeStore.badges.filter(badge => badge.unlocked))
const totalPoints = computed(() => unlockedBadges.value.reduce((sum, badge) => sum + badge.points, 0))
const progressPercentage = computed(() => 
  allBadges.value.length > 0 ? Math.round((unlockedBadges.value.length / allBadges.value.length) * 100) : 0
)

const filteredBadges = computed(() => {
  switch (activeTab.value) {
    case 'unlocked':
      return unlockedBadges.value
    case 'locked':
      return allBadges.value.filter(badge => !badge.unlocked)
    case 'in-progress':
      return allBadges.value.filter(badge => badge.progress > 0 && !badge.unlocked)
    default:
      return allBadges.value
  }
})

// Méthodes
const goBack = () => {
  router.push('/dashboard')
}

const setActiveTab = (tabId) => {
  activeTab.value = tabId
}

const openBadgeModal = (badge) => {
  selectedBadge.value = badge
}

const closeBadgeModal = () => {
  selectedBadge.value = null
}

// Lifecycle
onMounted(async () => {
  await badgeStore.loadBadges()
  // Récupérer l'ID du profil depuis les paramètres de route ou le store
  profileId.value = router.currentRoute.value.params.profileId || null
})
</script>

<style scoped>
/* Styles spécifiques si nécessaire */
</style>
