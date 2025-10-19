# Exemple d'intégration des badges avec les quiz

## 🎯 Intégration dans QuizGenerator.vue

Voici comment intégrer le système de badges dans votre composant de quiz existant.

### 1. Import des dépendances

```vue
<script>
import { useBadgeStore } from '../stores/badgeStore.js'
import { useNotificationStore } from '../stores/notificationStore.js'

export default {
  name: 'QuizGenerator',
  setup() {
    const badgeStore = useBadgeStore()
    const notificationStore = useNotificationStore()
    
    return {
      badgeStore,
      notificationStore
    }
  },
  // ... reste du code
}
</script>
```

### 2. Vérifier les badges après un quiz

```javascript
async submitQuiz() {
  try {
    // 1. Calculer le score
    const result = this.calculateScore()
    
    // 2. Sauvegarder le résultat
    await this.saveQuizResult(result)
    
    // 3. Vérifier et débloquer les badges
    const newBadges = await this.badgeStore.checkAndUnlockBadges(
      this.profileId,
      'quiz_completed',
      {
        score: result.score,
        percentage: result.percentage,
        subject: this.lesson?.subject,
        totalQuestions: result.totalQuestions
      }
    )
    
    // 4. Afficher les nouveaux badges
    if (newBadges.length > 0) {
      await this.showBadgeUnlockedNotification(newBadges)
    }
    
    // 5. Afficher le résultat du quiz
    this.showResults = true
    
  } catch (error) {
    console.error('Erreur lors de la soumission du quiz:', error)
    this.error = 'Une erreur est survenue'
  }
}
```

### 3. Afficher une notification de badge

```javascript
async showBadgeUnlockedNotification(badges) {
  for (const badge of badges) {
    // Créer une notification
    await this.notificationStore.createNotification({
      type: 'achievement_unlocked',
      title: `🏆 Badge débloqué !`,
      message: `Félicitations ! Tu as débloqué le badge "${badge.name}"`,
      data: {
        badgeId: badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        points: badge.points
      }
    })
    
    // Afficher une animation (optionnel)
    this.showBadgeAnimation(badge)
  }
}
```

### 4. Animation de déblocage de badge

```vue
<template>
  <!-- Dans votre template -->
  <transition name="badge-unlock">
    <div v-if="showBadgePopup" class="badge-unlock-popup">
      <div class="badge-unlock-content">
        <div class="badge-icon">{{ currentBadge.icon }}</div>
        <h3>Badge débloqué !</h3>
        <h4>{{ currentBadge.name }}</h4>
        <p>{{ currentBadge.description }}</p>
        <div class="badge-points">+{{ currentBadge.points }} points</div>
        <button @click="closeBadgePopup">Continuer</button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      showBadgePopup: false,
      currentBadge: null
    }
  },
  methods: {
    showBadgeAnimation(badge) {
      this.currentBadge = badge
      this.showBadgePopup = true
      
      // Fermer automatiquement après 5 secondes
      setTimeout(() => {
        this.closeBadgePopup()
      }, 5000)
    },
    
    closeBadgePopup() {
      this.showBadgePopup = false
      this.currentBadge = null
    }
  }
}
</script>

<style scoped>
.badge-unlock-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.badge-unlock-content {
  background: white;
  padding: 3rem;
  border-radius: 1.5rem;
  text-align: center;
  max-width: 500px;
  animation: bounce 0.5s ease;
}

.badge-icon {
  font-size: 6rem;
  margin-bottom: 1rem;
  animation: rotate 0.5s ease;
}

.badge-points {
  font-size: 1.5rem;
  color: #f59e0b;
  font-weight: bold;
  margin: 1rem 0;
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.badge-unlock-enter-active,
.badge-unlock-leave-active {
  transition: opacity 0.3s ease;
}

.badge-unlock-enter-from,
.badge-unlock-leave-to {
  opacity: 0;
}
</style>
```

## 🔄 Vérification périodique des badges

### Dans le Dashboard

```vue
<script>
export default {
  async mounted() {
    // Charger les badges au montage
    await this.loadBadges()
    
    // Mettre à jour toutes les 30 secondes
    this.badgeInterval = setInterval(async () => {
      await this.badgeStore.refreshBadgeStats(this.profileId)
    }, 30000)
  },
  
  beforeUnmount() {
    // Nettoyer l'interval
    if (this.badgeInterval) {
      clearInterval(this.badgeInterval)
    }
  },
  
  methods: {
    async loadBadges() {
      try {
        await this.badgeStore.loadProfileBadges(this.profileId)
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error)
      }
    }
  }
}
</script>
```

## 📊 Afficher la progression des badges

### Dans le UserDashboard

```vue
<template>
  <div class="badge-progress-section">
    <h3>Tes prochains badges</h3>
    
    <div v-for="badge in nearlyUnlockedBadges" :key="badge.id" class="badge-progress-item">
      <div class="badge-info">
        <span class="badge-icon">{{ badge.icon }}</span>
        <div class="badge-details">
          <h4>{{ badge.name }}</h4>
          <p>{{ badge.description }}</p>
        </div>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: badge.progress + '%' }"
        ></div>
      </div>
      
      <span class="progress-text">{{ badge.progress }}%</span>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    // Badges avec plus de 50% de progression mais pas encore débloqués
    nearlyUnlockedBadges() {
      return this.badgeStore.inProgressBadges
        .filter(badge => badge.progress >= 50)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3)
    }
  }
}
</script>
```

## 🎁 Bonus : Badge du jour

### Proposer un défi quotidien

```vue
<template>
  <div class="daily-badge-challenge">
    <h3>🎯 Défi du jour</h3>
    
    <div v-if="dailyChallenge" class="challenge-card">
      <div class="challenge-badge">
        {{ dailyChallenge.icon }}
      </div>
      
      <div class="challenge-info">
        <h4>{{ dailyChallenge.name }}</h4>
        <p>{{ dailyChallenge.description }}</p>
        
        <div class="challenge-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: dailyChallengeProgress + '%' }"
            ></div>
          </div>
          <span>{{ dailyChallengeProgress }}%</span>
        </div>
        
        <div class="challenge-reward">
          Récompense : {{ dailyChallenge.points }} points
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    dailyChallenge() {
      // Sélectionner un badge non débloqué avec le plus de progression
      const unlockedBadges = this.badgeStore.lockedBadges
        .filter(badge => badge.progress > 0)
        .sort((a, b) => b.progress - a.progress)
      
      return unlockedBadges[0] || null
    },
    
    dailyChallengeProgress() {
      return this.dailyChallenge?.progress || 0
    }
  }
}
</script>
```

## 🎨 Badge Leaderboard (Classement)

### Afficher un classement des badges

```vue
<template>
  <div class="badge-leaderboard">
    <h3>🏅 Top Collecteurs de Badges</h3>
    
    <div v-for="(user, index) in leaderboard" :key="user.id" class="leaderboard-item">
      <div class="rank">{{ index + 1 }}</div>
      
      <div class="user-info">
        <div class="user-avatar" :class="user.avatarColor">
          {{ user.initial }}
        </div>
        <span class="user-name">{{ user.name }}</span>
      </div>
      
      <div class="user-stats">
        <span class="badge-count">{{ user.badgeCount }} badges</span>
        <span class="point-count">{{ user.points }} pts</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      leaderboard: []
    }
  },
  
  async mounted() {
    await this.loadLeaderboard()
  },
  
  methods: {
    async loadLeaderboard() {
      try {
        // Récupérer les statistiques de tous les profils
        const profiles = await profileService.getAllProfiles()
        
        const stats = await Promise.all(
          profiles.map(async profile => {
            const badgeStats = await this.badgeStore.getBadgeStats(profile.id)
            return {
              id: profile.id,
              name: profile.name,
              initial: profile.name.charAt(0),
              avatarColor: profile.color,
              badgeCount: badgeStats.unlocked,
              points: badgeStats.points
            }
          })
        )
        
        // Trier par nombre de badges, puis par points
        this.leaderboard = stats.sort((a, b) => {
          if (b.badgeCount !== a.badgeCount) {
            return b.badgeCount - a.badgeCount
          }
          return b.points - a.points
        })
        
      } catch (error) {
        console.error('Erreur lors du chargement du leaderboard:', error)
      }
    }
  }
}
</script>
```

## 🔔 Notification Push pour les badges

### Envoyer une notification push

```javascript
async function sendBadgeNotification(profileId, badge) {
  // Vérifier si les notifications sont supportées
  if (!('Notification' in window)) {
    console.log('Les notifications ne sont pas supportées')
    return
  }
  
  // Demander la permission si nécessaire
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  
  // Envoyer la notification si autorisée
  if (Notification.permission === 'granted') {
    const notification = new Notification('🏆 Badge débloqué !', {
      body: `Tu as débloqué le badge "${badge.name}"`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: `badge-${badge.id}`,
      data: {
        badgeId: badge.id,
        profileId: profileId,
        url: `/badge-manager?profile=${profileId}`
      }
    })
    
    // Rediriger vers le gestionnaire de badges au clic
    notification.onclick = function(event) {
      event.preventDefault()
      window.open(event.target.data.url, '_blank')
    }
  }
}
```

## 📈 Analytics des badges

### Suivre les statistiques

```javascript
async function trackBadgeAnalytics(profileId) {
  const stats = await badgeService.getBadgeStats(profileId)
  
  // Envoyer à votre service d'analytics
  analytics.track('Badge Stats', {
    profileId: profileId,
    totalBadges: stats.total,
    unlockedBadges: stats.unlocked,
    completionRate: stats.percentage,
    totalPoints: stats.points
  })
  
  // Suivre les badges débloqués
  const recentBadges = await badgeService.getRecentlyUnlockedBadges(profileId, 10)
  
  recentBadges.forEach(badge => {
    analytics.track('Badge Unlocked', {
      profileId: profileId,
      badgeId: badge.id,
      badgeName: badge.name,
      badgeCategory: badge.category,
      points: badge.points,
      unlockedAt: badge.unlocked_at
    })
  })
}
```

## ✨ Conseils d'intégration

1. **Toujours vérifier les badges après une action importante**
   - Complétion de quiz
   - Fin de session d'apprentissage
   - Connexion quotidienne

2. **Afficher visuellement les progrès**
   - Barres de progression
   - Animations
   - Notifications

3. **Encourager l'engagement**
   - Défis quotidiens
   - Classements
   - Partage social

4. **Optimiser les performances**
   - Mettre en cache les statistiques
   - Vérifier les badges en arrière-plan
   - Limiter les requêtes DB

5. **Tester régulièrement**
   - Vérifier que les badges se débloquent correctement
   - Tester les conditions edge cases
   - Valider les animations

Avec ces exemples, vous avez tout ce qu'il faut pour intégrer complètement le système de badges dans votre application !

