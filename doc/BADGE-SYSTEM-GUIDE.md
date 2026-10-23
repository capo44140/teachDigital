# 🏆 Système de badges

Les badges récompensent les enfants pour leurs quiz. Le serveur les évalue et les débloque lui-même ;
le frontend ne fait que les afficher.

## Données

- `badges` : définition (`name`, `description`, `icon` (emoji), `category`, `condition_type`,
  `condition_value`, `points`, `color`, `is_active`).
- `profile_badges` : progression par profil (`progress`, `is_unlocked`, `unlocked_at`), une ligne
  unique par `(profile_id, badge_id)`.

Les deux tables sont créées par la migration `backend/migrations/0001_baseline.sql`. Il n'y a pas
de script de migration propre aux badges.

## Critères (`condition_type`)

Liste des critères évaluables, dans `backend/lib/badgeConditions.js` :

| Critère | Progression comparée à `condition_value` |
| --- | --- |
| `quiz_completed` | Nombre de quiz terminés (leçons et pages de cours) |
| `perfect_score` | Nombre de quiz à 100 % |
| `score_streak` | Série actuelle de quiz consécutifs à 80 % ou plus |
| `subjects_variety` | Nombre de matières différentes |
| `subject_specific` | Quiz terminés dans une matière, déduite du nom ou de la description du badge (« Mathématicien », « Littéraire » → français, « Historien »…) |
| `daily_streak` | Plus longue série de jours consécutifs avec au moins un quiz terminé |

`learning_time` (temps d'apprentissage) n'est **pas pris en charge** : l'application n'enregistre
pas le temps passé. Pour cette raison :

- la création ou la modification d'un badge avec ce critère est refusée (400, validation de
  `lib/schemas.js`) ;
- la migration `0102_deactivate_learning_time_badges.sql` a désactivé les badges existants de ce
  type. Les déblocages déjà obtenus sont conservés.

## Déblocage

Après chaque résultat enregistré, le serveur appelle `lib/badgeService.js`
(`checkAndUnlockBadges`) :

- quiz d'une leçon : `POST /api/lessons/:id/quiz-results`. La réponse contient `unlockedBadges`,
  que l'écran de quiz affiche en toast ;
- session de révision d'une page de cours terminée : `POST`/`PUT /api/course-pages/:id/results`.

Le calcul tient en un nombre fixe de requêtes : statistiques du profil, puis un seul UPSERT des
progressions. Une erreur de badge ne bloque jamais l'enregistrement du résultat.

## API (`backend/api/badges.js`)

Les lectures sont ouvertes à tout membre ; les écritures sont réservées aux parents
(`requireAdminForWrites`). Les routes `/profile/:profileId/*` vérifient l'accès au profil : un
jeton famille ne lit pas les données d'un parent.

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/badges` | Badges |
| GET | `/api/badges/:id` | Un badge |
| POST / PUT / DELETE | `/api/badges`, `/api/badges/:id` | Créer, modifier, supprimer (parent) |
| GET | `/api/badges/profile/:profileId` | Badges d'un profil avec progression |
| GET | `/api/badges/profile/:profileId/unlocked` | Badges débloqués |
| GET | `/api/badges/profile/:profileId/stats` | Statistiques (total, débloqués, points…) |
| GET | `/api/badges/profile/:profileId/recent?limit=` | Derniers badges débloqués |
| POST | `/api/badges/check-unlock` | Réévaluer les badges d'un profil (parent) |

## Interface

- **Enfant** : `/badge-manager?profile=<id>` (`src/views/BadgeManager.vue`), accessible depuis le
  tableau de bord enfant. Il montre les badges débloqués, en cours et verrouillés.
- **Parent** : `/badge-admin-manager` (`src/views/BadgeAdminManager.vue`), avec deux onglets :
  gestion des badges et statistiques par enfant. Le formulaire ne propose que les critères
  ci-dessus. Désactiver un badge le masque aux enfants sans perdre les déblocages.
- Code : `src/services/badgeService.js` (appels API), `src/stores/badgeStore.js` et
  `src/components/badges/BadgeCard.vue`.

## Badges par défaut

```bash
# dans backend/ (ou docker exec -it teachdigital-backend node scripts/init-badges.js)
node scripts/init-badges.js
```

Le script crée 16 badges de démonstration et ignore ceux dont le nom existe déjà. En production
(`NODE_ENV=production`) ou en CI, il s'arrête si la table contient déjà des badges.

## Dépannage

| Symptôme | Piste |
| --- | --- |
| Un badge ne se débloque jamais | Vérifier qu'il est actif et que son critère est pris en charge. Pour `subject_specific`, la matière doit apparaître dans le nom ou la description, et correspondre à la matière des leçons |
| « Badge à critère non évaluable » dans les logs | Badge `subject_specific` sans matière reconnaissable, ou critère inconnu en base |
| Création refusée | Critère `learning_time` ou inconnu, valeur ≤ 0, champ obligatoire vide |
