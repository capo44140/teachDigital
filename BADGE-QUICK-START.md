# 🚀 Badge System - Quick Start

## Installation rapide

```bash
# 1. Migrer la base de données
pnpm run migrate-badges

# 2. Démarrer l'application
pnpm run dev
```

## Accès rapide

- **URL** : http://localhost:5173/badge-manager?profile=ID_DU_PROFIL
- **Dashboard** : Les badges sont visibles dans le UserDashboard

## Badges par défaut

10 badges sont automatiquement créés :

| Emoji | Badge | Condition |
|-------|-------|-----------|
| 🎯 | Premier pas | 1 quiz complété |
| 📚 | Apprenti | 5 quiz complétés |
| 🏆 | Expert | 10 quiz complétés |
| ⭐ | Perfectionniste | 1 score de 100% |
| 🔥 | Série de victoires | 3 quiz ≥80% d'affilée |
| ⏰ | Studieux | 60 minutes d'apprentissage |
| 📅 | Régulier | 7 jours consécutifs |
| 🌈 | Polyvalent | 3 matières différentes |
| 🔢 | Mathématicien | 5 quiz de maths |
| 📖 | Littéraire | 5 quiz de français |

## Code minimum pour débloquer des badges

```javascript
import { useBadgeStore } from '../stores/badgeStore.js'

const badgeStore = useBadgeStore()

// Après qu'un utilisateur complète un quiz
const newBadges = await badgeStore.checkAndUnlockBadges(
  profileId,
  'quiz_completed'
)

// Afficher les nouveaux badges
if (newBadges.length > 0) {
  console.log('Badges débloqués:', newBadges)
}
```

## Fichiers principaux

```
src/
├── services/badgeService.js       ← Logique métier
├── stores/badgeStore.js           ← État Pinia
├── repositories/badgeRepository.js ← Accès DB
└── components/
    ├── BadgeManager.vue           ← Interface principale
    └── BadgeCard.vue              ← Carte de badge
```

## Documentation complète

- 📖 [Guide complet](BADGE-SYSTEM-GUIDE.md)
- 📝 [Résumé d'implémentation](BADGE-IMPLEMENTATION-SUMMARY.md)
- 💻 [Exemples d'intégration](BADGE-INTEGRATION-EXAMPLE.md)

## Commandes utiles

```bash
# Migrer les badges
pnpm run migrate-badges

# Tester la connexion DB
pnpm run db:test

# Lancer en développement
pnpm run dev

# Build production
pnpm run build
```

## Support

En cas de problème :
1. Vérifier que la migration s'est bien passée
2. Consulter les logs de la console
3. Lire la [documentation complète](BADGE-SYSTEM-GUIDE.md)

C'est prêt ! 🎉

