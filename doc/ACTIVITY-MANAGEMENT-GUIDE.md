# Guide de gestion des activités - TeachDigital

## 🎯 Vue d'ensemble

Les activités sont des tâches que le parent assigne à un enfant (devoirs, projets, lectures…) ou
à tous les enfants. Elles sont enregistrées par l'API (table `activities`) et visibles sur tous les
appareils de la famille.

## 📱 Accès

- **Parent** : carte « Gestion des activités » du tableau de bord parent, ou
  `/parent-activity-management` (`src/views/ParentActivityManagement.vue`). Il faut la session
  parent (PIN).
- **Enfant** : section « Mes activités récentes » du tableau de bord enfant (`/user-dashboard`).
  Elle affiche les dernières activités qui lui sont assignées et celles qui ne visent aucun enfant.

## 🛠️ Fonctionnalités (parent)

### Champs d'une activité

| Champ | Valeurs |
| --- | --- |
| Titre | obligatoire (255 caractères max.) |
| Description | facultative |
| Enfant concerné | un profil enfant, ou aucun (toute la famille) |
| Priorité | `low` (faible), `medium` (moyenne, défaut), `high` (élevée) |
| Date d'échéance | facultative |
| Statut | `active` (défaut), `paused` (en pause), `completed` (terminée), `cancelled` (annulée) |

L'API accepte aussi `type`, `difficulty_level`, `estimated_duration`, `target_age_group` et
`subject_area`. Des valeurs par défaut s'appliquent (`backend/lib/schemas.js`).

### Gestion

- **Créer** : bouton « Nouvelle activité », formulaire puis « Créer ».
- **Modifier** : icône crayon, ce qui permet aussi de passer une activité à « Terminée » ou
  « Annulée ».
- **Activer / mettre en pause** : bouton de la carte (`active` ↔ `paused`).
- **Supprimer** : icône poubelle, après une boîte de confirmation.

### Affichage et filtres

- Vue **grille** (cartes) ou **liste**.
- Recherche dans le titre et la description, filtre par enfant et par statut.
- Tri par date de création, date d'échéance, titre ou statut.
- Statistiques en tête de page : total, activités actives, enfants concernés, complétion moyenne.
- Codes couleur : statut, priorité et échéance (en retard, aujourd'hui, bientôt).

## 🔒 Droits

| Action | Qui |
| --- | --- |
| `GET /api/activities` (filtres `child_id`, `status`, `priority`, `search`), `GET /api/activities/:id` | tout membre. Un jeton famille ne voit que les activités sans enfant ou destinées à un profil enfant accessible |
| `POST`, `PUT`, `DELETE /api/activities[/:id]` | parent (`requireAdmin`) |

Côté frontend, tous les appels passent par `src/services/activityService.js`.

## 🚨 Dépannage

- **Activité absente de la liste** : vérifier les filtres et la recherche.
- **Échec d'enregistrement** : le message de l'API s'affiche en toast, avec son identifiant de
  requête. Les champs invalides (priorité, statut, date) sont rejetés en 400.
- **« Accès refusé »** : la session parent a expiré (30 min). Le PIN est redemandé.
