# Guide du Système de Badges - TeachDigital

## 🏆 Vue d'ensemble

Le système de badges de TeachDigital permet de gamifier l'expérience d'apprentissage en récompensant les utilisateurs pour leurs progrès et leurs réussites.

## 📁 Architecture

### Tables de base de données

#### Table `badges`
Stocke les définitions des badges disponibles.

```sql
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  color VARCHAR(50) DEFAULT 'yellow',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Table `profile_badges`
Suit les badges débloqués et la progression pour chaque profil.

```sql
CREATE TABLE profile_badges (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, badge_id)
)
```

## 🚀 Installation

### 1. Exécuter la migration

```bash
# Migrer les tables de badges
node scripts/migrate-badges.js
```

Cette commande va :
- Créer les tables `badges` et `profile_badges`
- Créer les index nécessaires
- Insérer 10 badges par défaut

### 2. Vérifier l'installation

Les badges par défaut incluent :
- 🎯 **Premier pas** : Complète ton premier quiz
- 📚 **Apprenti** : Complète 5 quiz
- 🏆 **Expert** : Complète 10 quiz
- ⭐ **Perfectionniste** : Obtiens un score parfait de 100%
- 🔥 **Série de victoires** : Obtiens plus de 80% sur 3 quiz d'affilée
- ⏰ **Studieux** : Passe plus de 60 minutes à apprendre
- 📅 **Régulier** : Complète un quiz pendant 7 jours consécutifs
- 🌈 **Polyvalent** : Complète des quiz dans 3 matières différentes
- 🔢 **Mathématicien** : Complète 5 quiz de mathématiques
- 📖 **Littéraire** : Complète 5 quiz de français

## 📖 Utilisation

### Pour les utilisateurs

#### Affichage des badges dans le Dashboard

Les utilisateurs peuvent voir leurs badges depuis le `UserDashboard` :
```vue
<div @click="viewBadges">
  <p>{{ badgeMessage }}</p>
  <div>{{ badgeStats.unlocked }}/{{ badgeStats.total }}</div>
</div>
```

#### Gestionnaire de badges

Le composant `BadgeManager` permet de :
- Voir tous les badges disponibles
- Consulter les badges débloqués
- Suivre la progression des badges en cours
- Voir les badges verrouillés

### Pour les développeurs

#### Utilisation du BadgeService

```javascript
import badgeService from '../services/badgeService.js'

// Récupérer tous les badges
const badges = await badgeService.getAllBadges()

// Récupérer les badges d'un profil
const profileBadges = await badgeService.getProfileBadges(profileId)

// Vérifier et débloquer automatiquement les badges
const newBadges = await badgeService.checkAndUnlockBadges(
  profileId, 
  'quiz_completed',
  { subject: 'mathématiques', score: 90 }
)
```

#### Utilisation du BadgeStore

```javascript
import { useBadgeStore } from '../stores/badgeStore.js'

const badgeStore = useBadgeStore()

// Charger les badges d'un profil
await badgeStore.loadProfileBadges(profileId)

// Accéder aux statistiques
console.log(badgeStore.badgeStats) // { total, unlocked, locked, points, percentage }

// Vérifier automatiquement les badges après une action
const unlockedBadges = await badgeStore.checkAndUnlockBadges(
  profileId,
  'quiz_completed',
  { score: 100 }
)
```

#### Intégration avec les quiz

Pour débloquer automatiquement les badges après un quiz :

```javascript
// Dans QuizGenerator.vue ou similaire
async function onQuizCompleted(result) {
  try {
    // Sauvegarder le résultat du quiz
    await saveQuizResult(result)
    
    // Vérifier les badges
    const newBadges = await badgeStore.checkAndUnlockBadges(
      profileId,
      'quiz_completed',
      {
        score: result.score,
        percentage: result.percentage,
        subject: result.subject
      }
    )
    
    // Afficher les nouveaux badges débloqués
    if (newBadges.length > 0) {
      showBadgeNotifications(newBadges)
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des badges:', error)
  }
}
```

## 🎨 Types de badges

### Par catégorie

- **débutant** : Badges pour les premiers pas
- **progression** : Badges de progression générale
- **excellence** : Badges de performance
- **temps** : Badges liés au temps d'apprentissage
- **diversité** : Badges de diversité des matières
- **matière** : Badges spécifiques à une matière

### Par type de condition

- **quiz_completed** : Nombre de quiz complétés
- **perfect_score** : Score parfait de 100%
- **score_streak** : Série de bons scores
- **learning_time** : Temps d'apprentissage total
- **daily_streak** : Jours consécutifs d'apprentissage
- **subjects_variety** : Variété de matières
- **subject_specific** : Nombre de quiz dans une matière

## 🔧 Personnalisation

### Créer un badge personnalisé

```javascript
const newBadge = await badgeService.createCustomBadge({
  name: 'Super Star',
  description: 'Obtiens 100% à 5 quiz',
  icon: '🌟',
  category: 'excellence',
  condition_type: 'perfect_score',
  condition_value: 5,
  points: 150,
  color: 'rainbow'
})
```

### Couleurs disponibles

- `blue` : Bleu
- `green` : Vert
- `purple` : Violet
- `yellow` : Jaune
- `orange` : Orange
- `pink` : Rose
- `rainbow` : Arc-en-ciel

## 📊 Statistiques et suivi

### Statistiques globales

```javascript
const stats = await badgeService.getBadgeStats(profileId)
// {
//   total: 10,      // Nombre total de badges
//   unlocked: 3,    // Badges débloqués
//   locked: 7,      // Badges verrouillés
//   points: 85,     // Points gagnés
//   percentage: 30  // Pourcentage de progression
// }
```

### Badges récents

```javascript
const recentBadges = await badgeService.getRecentlyUnlockedBadges(profileId, 5)
```

## 🎯 Bonnes pratiques

1. **Vérifier les badges après chaque action importante** :
   - Complétion d'un quiz
   - Ajout d'une activité
   - Session d'apprentissage

2. **Afficher les notifications de badges** :
   - Utiliser des animations pour célébrer les nouveaux badges
   - Afficher une notification push pour les badges importants

3. **Encourager la progression** :
   - Montrer les badges presque débloqués
   - Afficher la progression en pourcentage

4. **Maintenir l'engagement** :
   - Ajouter régulièrement de nouveaux badges
   - Créer des badges saisonniers ou événementiels

## 🐛 Dépannage

### Les badges ne se débloquent pas

1. Vérifier que les tables existent :
```sql
SELECT * FROM badges;
SELECT * FROM profile_badges;
```

2. Vérifier les logs :
```javascript
console.log(await badgeService.checkAndUnlockBadges(profileId, 'quiz_completed'))
```

3. Vérifier les statistiques du profil :
```javascript
console.log(await badgeService.getQuizCompletedCount(profileId))
```

### Erreurs de migration

Si la migration échoue :
```bash
# Supprimer les tables existantes (ATTENTION : perte de données)
# Puis relancer la migration
node scripts/migrate-badges.js
```

## 📚 Ressources

- [BadgeService.js](src/services/badgeService.js) - Service principal
- [BadgeRepository.js](src/repositories/badgeRepository.js) - Accès aux données
- [BadgeStore.js](src/stores/badgeStore.js) - Store Pinia
- [BadgeManager.vue](src/components/BadgeManager.vue) - Interface utilisateur
- [BadgeCard.vue](src/components/BadgeCard.vue) - Carte de badge

## 🤝 Contribution

Pour ajouter de nouveaux types de badges :

1. Ajouter le type de condition dans `BadgeService.shouldUnlockBadge()`
2. Ajouter la logique de calcul dans `BadgeService.calculateBadgeProgress()`
3. Mettre à jour `BadgeService.isRelevantBadge()` pour le mapping
4. Tester avec différents scénarios

## 📝 Notes

- Les badges sont automatiquement vérifiés lors de la complétion d'un quiz
- La progression est sauvegardée même si le badge n'est pas débloqué
- Les badges peuvent être désactivés sans être supprimés (is_active = false)
- Les points de badges peuvent être utilisés pour un système de récompenses futur

