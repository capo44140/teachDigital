# 🎥 Vidéos YouTube pour les enfants

Le parent choisit des vidéos YouTube, et les enfants voient uniquement cette sélection.

## 👨‍👩‍👧 Parent : gestion des vidéos

`/youtube-video-manager` (`src/views/YouTubeVideoManager.vue`), accessible depuis le tableau de
bord parent.

- **Ajouter** une vidéo : URL YouTube (obligatoire), titre (obligatoire), description, catégorie
  (obligatoire) et statut (actif ou inactif).
- Catégories proposées : Éducation, Divertissement, Science, Histoire, Géographie, Mathématiques.
- URL acceptées (`src/services/youtubeVideoService.js`) : `youtube.com/watch?v=`, `youtu.be/`,
  `youtube.com/embed/`, `/v/`, `/shorts/`, `/live/` et `youtubekids.com/watch?v=`. L'identifiant
  à 11 caractères en est extrait. Une URL non reconnue est refusée avant l'envoi.
- Modifier, activer ou désactiver, supprimer ; rechercher, filtrer par catégorie et trier.
- Une vidéo **inactive** n'est plus visible des enfants. ⚠️ `GET /api/youtube-videos` ne renvoie
  que les vidéos actives, **parents compris** : une vidéo désactivée disparaît aussi du
  gestionnaire après rechargement et ne peut plus y être réactivée.

## 🧒 Enfant : visionneuse

`/youtube-kids-viewer?profile=<id>` (`src/views/YouTubeKidsViewerSimple.vue`), accessible depuis le
tableau de bord enfant. Le guard exige un profil enfant ou ado.

- Elle affiche **toutes les vidéos actives**, avec miniature, catégorie et tranche d'âge.
  Il n'y a **pas de filtrage par âge** : la sélection du parent fait foi.
- Un clic ouvre la vidéo **sur YouTube, dans un nouvel onglet**, sans accès à l'application
  (`noopener,noreferrer`). Seuls les liens `https` vers youtube.com, youtu.be et youtubekids.com
  sont ouverts.
- En cas d'erreur de chargement, un message s'affiche avec un bouton « Réessayer ». Il n'y a pas de
  vidéos de démonstration.

## 🔧 Technique

| Élément | Détail |
| --- | --- |
| Table | `youtube_videos` (`url`, `video_id`, `title`, `description`, `category`, `age_group`, `is_active`, dates), créée par `backend/migrations/0001_baseline.sql` |
| `GET /api/youtube-videos`, `GET /api/youtube-videos/:id` | Tout membre. La liste ne renvoie que les vidéos actives, pour tout le monde ; `/:id` renvoie aussi une vidéo inactive à un parent |
| `POST`, `PUT`, `DELETE /api/youtube-videos[/:id]` | Parent uniquement (`requireAdmin`), corps validé par `youtubeVideoCreateSchema` / `youtubeVideoUpdateSchema` |
| Valeurs par défaut | `category = 'general'`, `age_group = '6-12'` (le formulaire ne propose pas la tranche d'âge), `is_active = true` |
| CSP | Les miniatures (`img.youtube.com`, `i.ytimg.com`) sont autorisées par `frontend/nginx.conf` |

## 🚨 Dépannage

| Symptôme | Piste |
| --- | --- |
| « URL YouTube invalide » | L'URL doit contenir l'identifiant de la vidéo (voir les formats ci-dessus) |
| Une vidéo n'apparaît pas côté enfant | Elle est inactive. Pour la réactiver : `PUT /api/youtube-videos/:id` avec `{ "is_active": true }`, ou directement en base |
| Erreur au chargement | Le message affiche l'identifiant de requête : le rechercher dans les logs du backend |
| Accès refusé à la visionneuse | Le profil n'est pas un profil enfant ou ado, ou la session famille a expiré |
