# Guide de reproduction TeachDigital en React Native

Ce document sert à reproduire l'application **TeachDigital** (Vue 3 + Vite) en **React Native**. Il
garde les mêmes fonctionnalités et réutilise le backend existant tel quel. Les comportements
décrits ici sont ceux du code actuel ; en cas de doute, les fichiers cités en fin de document font
foi.

---

## 1. Vue d'ensemble de l'application actuelle

### 1.1 Stack technique actuelle

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue 3, Pinia, Vue Router, Tailwind CSS 4, Vite 7 |
| Backend | Node.js / Express 4 (`backend/`), derrière le nginx du conteneur frontend, en Docker sur un NAS Synology |
| Base de données | PostgreSQL (schéma géré par les migrations `backend/migrations/`) |
| PWA | Service worker unique (`public/sw.js`), manifest |

### 1.2 Principes à respecter en React Native

- **Le client ne fait que des appels API** : aucune logique métier ni accès direct à la base. La
  notation des quiz, le déblocage des badges et les droits sont calculés par le serveur.
- **Backend inchangé** : les endpoints REST existants restent la seule source de vérité.
- **Authentification à deux niveaux** : code familial → jeton « famille », puis PIN d'un profil →
  jeton « profil », tous deux en `Authorization: Bearer`. Détails :
  [PIN-SECURITY.md](PIN-SECURITY.md).

---

## 2. Équivalent React Native de la stack

### 2.1 Outils recommandés

| Vue / Web | React Native |
|-----------|--------------|
| Vue 3 + Composition API | React 18+ (hooks) |
| Pinia | Zustand ou Redux Toolkit |
| Vue Router | React Navigation |
| Tailwind CSS | NativeWind (Tailwind pour RN) ou StyleSheet |
| Vite | Metro (bundler React Native) |
| `fetch` + `apiService` | `fetch` / axios avec la même base d'URL et les mêmes en-têtes |

### 2.2 Création du projet React Native

```bash
# Avec Expo (recommandé pour démarrer rapidement)
npx create-expo-app teachdigital-mobile --template blank

# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# État global (équivalent Pinia) et requêtes
npm install zustand axios

# Stockage local des jetons (de préférence : expo-secure-store)
npx expo install expo-secure-store @react-native-async-storage/async-storage
```

---

## 3. Architecture des écrans et navigation

### 3.1 Correspondance des routes Vue → React Navigation

Garde : « famille » = session famille valide ; « parent » = session parent déverrouillée et jeton
profil admin du même profil ; « enfant » = `?profile=` ou `?childId=` désignant un profil enfant ou
ado.

| Route Vue (`src/router/index.js`) | Écran React Native | Garde |
|-----------|--------------------|-------|
| `/family-gate` | `FamilyGateScreen` | public |
| `/` | `ProfileSelectorScreen` | famille |
| `/pin-lock` | `PinLockScreen` | famille |
| `/dashboard` | `DashboardScreen` | parent |
| `/user-dashboard` | `UserDashboardScreen` | enfant |
| `/manage-profiles`, `/edit-profile/:id` | `ProfileManagementScreen`, `EditProfileScreen` | parent |
| `/pin-settings`, `/family-gate-settings` | `PinSettingsScreen`, `FamilyGateSettingsScreen` | parent |
| `/lesson-scanner`, `/text-quiz-generator` | `LessonScannerScreen`, `TextQuizGeneratorScreen` | parent |
| `/quiz-generator?childId=&lessonId=` | `QuizScreen` (aperçu sans enregistrement en session parent) | enfant |
| `/parent-quiz-management`, `/lesson-details/:lessonId` | `ParentQuizManagementScreen`, `LessonDetailsScreen` | parent |
| `/course-page-manager` | `CoursePageManagerScreen` | parent |
| `/course-page/:id` | `CoursePageScreen` | enfant |
| `/parent-activity-management` | `ActivityManagementScreen` | parent |
| `/youtube-video-manager` | `YouTubeVideoManagerScreen` | parent |
| `/youtube-kids-viewer` | `YouTubeKidsViewerScreen` | enfant |
| `/progress-tracking` | `ProgressTrackingScreen` | enfant |
| `/parent-progress-tracking` | `ParentProgressTrackingScreen` | parent |
| `/badge-manager?profile=` | `BadgeManagerScreen` | enfant |
| `/badge-admin-manager` | `BadgeAdminManagerScreen` | parent |
| `/security-dashboard` | `SecurityDashboardScreen` (journal d'audit) | parent |
| `/parent-settings`, `/ai-settings` | `ParentSettingsScreen`, `AISettingsScreen` | parent |
| `/child-settings`, `/child-help` | `ChildSettingsScreen`, `ChildHelpScreen` | enfant |
| autre | `NotFoundScreen` | public |

### 3.2 Structure des navigators

- **Stack racine** : `FamilyGate` → `ProfileSelector` → **Parent Stack** (après PIN) ou
  **Child/Teen Stack**.
- **Parent Stack** : Dashboard, profils, PIN et code familial, leçons et quiz, pages de cours,
  activités, YouTube, badges, suivi, sécurité, paramètres et IA.
- **Child/Teen Stack** : tableau de bord, quiz, pages de cours, vidéos, badges, progrès, paramètres
  et aide.

Implémenter les gardes comme `navigationGuard` dans `src/router/index.js`. Le serveur revérifie de
toute façon chaque droit.

---

## 4. API Backend (à réutiliser telle quelle)

### 4.1 Base URL et authentification

- **Web, développement** : URL relative, le proxy Vite relaie `/api` vers `http://127.0.0.1:3001`.
- **Web, production** : URL relative (même origine que la page), sauf si `VITE_API_URL_PROD` est
  défini. Le nginx du site relaie `/api/` vers le backend.
- **Mobile** : utiliser l'URL publique du site (`https://<domaine>/api/...`). Le port 3001 du
  backend n'est pas exposé sur le réseau.
- **En-têtes** : `Content-Type: application/json` et `Authorization: Bearer <jeton>`. Envoyer le
  jeton profil s'il existe, sinon le jeton famille (même règle que `apiService`).
- **CORS** : sans objet pour une application native. Pour un client web sur une autre origine, il
  faudrait l'ajouter à `FRONTEND_URL` / `ALLOWED_ORIGIN`.

### 4.2 Liste des endpoints (référence : `backend/api/index.js`)

#### Authentification

| Méthode | Endpoint | Jeton | Description |
|---------|----------|-------|-------------|
| POST | `/api/auth/family-gate` | aucun | `{ pin }` → `{ token, expiresAt }` (jeton famille, 24 h) |
| PUT | `/api/auth/family-gate` | parent | `{ currentPin, newPin }` : change le code et révoque les jetons famille ; renvoie un nouveau jeton |
| POST | `/api/auth/login` | famille | `{ profileId, pin }` → `{ token, profile }` (jeton profil, 4 h) |
| GET | `/api/auth/verify` | famille ou profil | Validité du jeton (401 si expiré ou révoqué) |
| POST | `/api/auth/logout` | aucun | Sans effet serveur (jetons sans état) |

#### Profils

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/profiles` | Profils visibles |
| POST | `/api/profiles` | Création (parent) |
| GET / PUT / DELETE | `/api/profiles/:id` | Détail, mise à jour, suppression (parent pour PUT et DELETE) |
| GET | `/api/profiles/stats` | Statistiques (parent) |
| GET | `/api/profiles/:id/stats`, `/api/profiles/:id/learning-stats` | Statistiques d'apprentissage |
| GET | `/api/profiles/:id/progress-summary` | Résumé de progrès |
| POST | `/api/profiles/:id/pin` | Vérification d'un PIN (`{ pin }`), avec les mêmes verrouillages que la connexion |
| PUT | `/api/profiles/:id/pin` | Changement de PIN (parent) : `{ newPin, currentPin? }`, avec la politique `WEAK_PIN` / `PIN_TOO_SHORT` |
| POST | `/api/profiles/requests` | Demande de création de profil (limitée) |

#### Leçons et quiz

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/lessons` | Liste sans `quiz_data` (query : `profileId`, `targetProfileId`, `published`) |
| POST | `/api/lessons` | Création (parent) |
| GET | `/api/lessons/:id` | Détail. Pour un non-parent, les réponses et explications sont retirées |
| PUT / DELETE | `/api/lessons/:id` | Parent |
| GET | `/api/lessons/:id/quiz-results` | Résultats |
| POST | `/api/lessons/:id/quiz-results` | `{ profileId, answers }` → score calculé par le serveur, `correction`, `unlockedBadges` |
| GET | `/api/lessons/stats/global` | Statistiques globales (parent) |

#### Pages de cours

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/course-pages` | Liste |
| POST / PUT / DELETE | `/api/course-pages[/:id]` | Gestion (parent) |
| GET | `/api/course-pages/:id` | Détail |
| POST | `/api/course-pages/:id/view` | URL d'affichage signée, valable 5 min |
| POST | `/api/course-pages/preview` | URL d'aperçu d'un brouillon (parent) |
| GET | `/api/course-pages/render?t=<jeton>` | HTML isolé, avec une CSP `sandbox` (à charger dans une WebView) |
| POST / PUT | `/api/course-pages/:id/results[/:resultId]` | Sessions de révision (score envoyé par la page) |

#### Autres domaines

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` (`profileId`, `isRead`, `type`) | Notifications |
| POST | `/api/notifications` | Création (parent) |
| GET / PUT / DELETE | `/api/notifications/:id` | Détail, mise à jour (lecture), suppression |
| POST | `/api/notifications/mark-all-read` | Tout marquer comme lu |
| GET / POST / PUT / DELETE | `/api/activities[/:id]` | Activités (écriture : parent) |
| GET / POST / PUT / DELETE | `/api/youtube-videos[/:id]` | Vidéos (écriture : parent) |
| GET / POST / PUT / DELETE | `/api/badges[/:id]` | Badges (écriture : parent) |
| GET | `/api/badges/profile/:id`, `/unlocked`, `/stats`, `/recent` | Badges d'un profil |
| POST | `/api/badges/check-unlock` | Réévaluation (parent). Après un quiz, le serveur le fait seul |
| POST | `/api/audit/logs` | Envoi d'un événement (jeton requis, limité) |
| GET / POST | `/api/audit/logs`, `/api/audit/stats`, `/api/audit/export` | Consultation (parent) |

#### IA (parent uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/ai/extract-text-from-documents` | Texte d'images (multipart) |
| POST | `/api/ai/generate-quiz-from-analyses` | Quiz à partir des textes extraits |
| POST | `/api/ai/generate-quiz-from-text` | Quiz à partir d'un texte |
| POST | `/api/ai/generate-quiz-from-image`, `/generate-quiz-from-documents` | Variantes en un appel |
| POST | `/api/ai/generate-course-page` | Page de cours à partir de photos |
| GET | `/api/ai/providers`, `/providers/config`, `/providers/:name/models` | Fournisseurs |
| POST / DELETE | `/api/ai/providers/:name/config`, `/providers/:name/key` | Réglages des fournisseurs |
| GET / POST | `/api/ai/local-llm/*`, `/api/ai/course-page/provider` | LLM local, fournisseur des pages de cours |
| GET | `/api/ai/validate-key`, `/api/ai/has-valid-key` | Clés disponibles |

Seules les images sont acceptées : un PDF renvoie 415 `UNSUPPORTED_FILE_TYPE`. Une génération
dure au maximum 170 s (504 au-delà).

### 4.3 Format des réponses

```json
{ "success": true, "message": "Message descriptif", "data": { } }
```

En cas d'erreur : `{ "success": false, "message", "code", "requestId" }`. Le message est
générique ; le `requestId` (aussi dans l'en-tête `X-Request-Id`) permet de retrouver le détail
dans les logs du serveur. Cas à gérer :

- 401 : jeton absent, expiré ou révoqué (`TOKEN_REVOKED`). Retour au code familial (jeton famille)
  ou au PIN (jeton profil). Sur `/auth/login` et `/auth/family-gate`, un 401 signifie
  « code incorrect ».
- 403 : droits insuffisants.
- 429 : `PIN_LOCKED`, `FAMILY_GATE_LOCKED` ou `RATE_LIMIT_*`, avec `retryAfterSeconds` et
  l'en-tête `Retry-After`. Afficher un compte à rebours.
- 400 : erreurs de validation, dont `WEAK_PIN` et `PIN_TOO_SHORT`.

---

## 5. Modèles de données (côté app)

### 5.1 Profil

- `id`, `name`, `description`, `type` (`child` | `teen` | `admin`)
- `is_child`, `is_teen`, `is_admin`, `is_active`
- `color`, `avatar_class`, `avatar_content`, `image_url`, `image_data`, `image_type`, `level`
- jamais de PIN ni de `token_version`

### 5.2 Leçon

- `id`, `profile_id` (créateur), `target_profile_id` (enfant visé ou `null` pour tous)
- `title`, `description`, `subject`, `level`, `image_filename`, `quiz_data` (JSON), `is_published`

### 5.3 Quiz / Résultats

- `quiz_data.questions[]` : énoncé et options. `correctAnswer` et `explanation` ne sont présents
  que pour un parent.
- Envoi : `answers[i]` = index de l'option choisie, ou `null`.
- `quiz_results` : `lesson_id`, `profile_id`, `score`, `total_questions`, `percentage`, `answers`,
  `completed_at`.

### 5.4 Notification

- `id`, `profile_id`, `type`, `title`, `message`, `data` (JSON), `is_read`, `created_at`

### 5.5 Badge

- `id`, `name`, `description`, `icon`, `category`, `condition_type`, `condition_value`, `points`,
  `color`, `is_active`
- `profile_badges` : `profile_id`, `badge_id`, `progress`, `is_unlocked`, `unlocked_at`

### 5.6 Sessions

- **Famille** : jeton JWT (scope `family`) et `expiresAt` (24 h).
- **Parent** : jeton JWT (scope `profile`, 4 h), plus une session locale de 30 min glissantes
  (`sessionService`). À son expiration, le jeton profil est supprimé et le PIN redemandé.

---

## 6. Services (couche API uniquement)

### 6.1 Client API commun

- URL de base issue d'une variable d'environnement (`EXPO_PUBLIC_API_URL`).
- Choix du jeton (profil, sinon famille) et en-tête `Authorization`.
- Délais d'attente : 30 s par défaut, plus long pour les routes IA (jusqu'à 170 s, et plusieurs
  minutes pour une page de cours).
- Gestion centralisée des 401, 403 et 429 (voir 4.3).

### 6.2 Services à implémenter (équivalents de `frontend/src/services/`)

- `authService` : `checkFamilyCode`, `login`, `logout`, `verifyToken`, `updatePin`,
  `updateFamilyCode`.
- `profileService` : liste, détail, création, mise à jour, suppression, statistiques, résumé de
  progrès.
- `lessonService` : liste, détail, création, mise à jour, suppression, résultats, envoi des
  réponses.
- `coursePageService` : liste, gestion, URL d'affichage et d'aperçu, sessions de révision.
- `activityService`, `youtubeVideoService`, `badgeService`, `aiService`, `auditLogService`.
- `notificationService` : il n'en existe pas dans le frontend web actuel, qui n'affiche pas les
  notifications. Le backend les fournit déjà.

---

## 7. État global (Zustand, équivalent Pinia)

- **authStore** : jetons famille et profil, profil connecté, `login`, `logout`, initialisation
  depuis le stockage sécurisé.
- **sessionStore** (équivalent de `sessionService`) : session parent (`profileId`, expiration
  glissante de 30 min).
- **profileStore** : profils, profil courant, chargement et mise à jour.
- **lessonStore**, **badgeStore**, **settingsStore** (préférences d'affichage de l'enfant :
  taille du texte, lecture facile, contraste, animations, couleur).

Les stores appellent les services et mettent à jour l'état, sans logique métier.

---

## 8. Flux clés à reproduire

### 8.1 Démarrage

1. Lire la session famille. Si elle est absente ou expirée → **FamilyGate** :
   `POST /api/auth/family-gate`, puis enregistrer le jeton.
2. **ProfileSelector** : `GET /api/profiles` avec le jeton famille.
3. Clic sur un profil :
   - **parent** : session parent valide et jeton admin du même profil → **Dashboard** ; sinon
     **PinLock** → `POST /api/auth/login { profileId, pin }` (avec le jeton famille). Enregistrer
     le jeton profil, ouvrir une session de 30 min, puis aller au **Dashboard** ;
   - **enfant / ado** : **UserDashboard** directement (jeton famille, sans PIN).

### 8.2 Gardes de navigation

- Toute page sauf FamilyGate et 404 : session famille valide.
- Pages parent : session parent déverrouillée **et** jeton profil admin du même profil.
- Pages enfant : le profil passé en paramètre doit être un profil enfant ou ado.

### 8.3 Sécurité

- PIN et code familial ne sont jamais stockés. Les vérifications et les verrouillages se font côté
  serveur.
- Jetons dans un stockage sécurisé (Keychain / Keystore via `expo-secure-store`).
- Après un changement de PIN, de code familial ou de type de profil, les anciens jetons sont
  refusés (401 `TOKEN_REVOKED`).

---

## 9. Fonctionnalités spécifiques

### 9.1 Scanner de leçons / Quiz IA

- **LessonScanner** : photos (JPG, PNG, WebP, 10 au maximum) → `POST /api/ai/extract-text-from-documents`
  (multipart, une image par appel) → `POST /api/ai/generate-quiz-from-analyses` → `POST /api/lessons`
  → aperçu du quiz. Voir [LESSON-SCANNER.md](LESSON-SCANNER.md).
- **TextQuizGenerator** : `POST /api/ai/generate-quiz-from-text`, puis `POST /api/lessons`.
- **Quiz enfant** : `GET /api/lessons/:id` (sans les réponses), puis
  `POST /api/lessons/:id/quiz-results` avec les seules réponses. Afficher la `correction` renvoyée.

### 9.2 Pages de cours

`POST /api/course-pages/:id/view`, puis charger l'URL renvoyée dans une WebView isolée (JavaScript
activé, sans accès au stockage de l'application). Le score remonte par
`postMessage({ type: 'teachdigital:quiz-progress', ok, total, streak })`. Il est enregistré par
`POST`/`PUT /api/course-pages/:id/results`.

### 9.3 YouTube Kids

- **YouTubeVideoManager** (parent) : gestion des vidéos par l'API.
- **YouTubeKidsViewer** (enfant) : liste des vidéos actives. Le web ouvre la vidéo sur YouTube
  dans un nouvel onglet ; en mobile, ouvrir l'application YouTube ou une WebView, en respectant
  les conditions de YouTube. Voir [YOUTUBE-KIDS-GUIDE.md](YOUTUBE-KIDS-GUIDE.md).

### 9.4 Badges et suivi

- Lecture : `GET /api/badges`, `/api/badges/profile/:id`, `/unlocked`, `/stats`, `/recent`.
- Il n'y a rien à appeler après un quiz : le serveur évalue les badges et renvoie
  `unlockedBadges`. Voir [BADGE-SYSTEM-GUIDE.md](BADGE-SYSTEM-GUIDE.md).
- **ProgressTracking** / **ParentProgressTracking** : `GET /api/profiles/:id/progress-summary`.

### 9.5 Notifications

`GET /api/notifications?profileId=...`, `PUT /api/notifications/:id` (lecture),
`POST /api/notifications/mark-all-read`. Le serveur en crée à la fin d'un quiz, lors du
verrouillage d'un PIN parent et lors d'une demande de profil.

---

## 10. Variables d'environnement (React Native / Expo)

```env
EXPO_PUBLIC_API_URL=https://<votre-domaine>
```

Expo expose au client les variables préfixées par `EXPO_PUBLIC_` : n'y mettre aucun secret. Les
clés IA restent dans le backend.

---

## 11. Base de données (inchangée)

La base reste **PostgreSQL**, gérée par le backend. Son schéma est défini par
`backend/migrations/*.sql`, appliquées automatiquement au démarrage du serveur. Le mobile
n'appelle que l'API.

---

## 12. Checklist de reproduction

- [ ] Projet React Native (Expo ou CLI) créé.
- [ ] Navigation avec gardes (session famille, session parent + jeton admin, profil enfant).
- [ ] Client API : URL, choix du jeton, délais, gestion des 401, 403 et 429, `requestId`.
- [ ] Services : auth, profile, lesson, coursePage, activity, youtube, badge, ai, audit.
- [ ] Stores : auth, session, profile, lesson, badge, settings.
- [ ] Écrans de la section 3.1.
- [ ] Quiz noté par le serveur (aucune réponse envoyée à l'enfant avant validation).
- [ ] Pages de cours dans une WebView isolée.
- [ ] Tests sur émulateur et sur appareil, avec le même backend que la PWA.

---

## 13. Référence des fichiers sources

- **Router et gardes** : `frontend/src/router/index.js`, `src/services/parentAccessService.js`
- **Client API** : `frontend/src/services/apiService.js`, `src/services/authStorage.js`
- **Authentification** : `src/services/authService.js`, `familyGateService.js`, `sessionService.js`
- **Profils** : `src/services/profile/profileService.js`, `src/stores/profileStore.js`
- **Leçons et quiz** : `src/services/lessonService.js`, `src/views/QuizGenerator.vue`
- **Pages de cours** : `src/services/coursePageService.js`, `src/components/course-pages/CoursePageFrame.vue`
- **Badges** : `src/services/badgeService.js`, `src/stores/badgeStore.js`
- **IA** : `src/services/aiService.js`
- **Backend** : `backend/api/index.js`, `backend/controllers/*.js`, `backend/api/ai/index.js`,
  `backend/api/badges.js`, `backend/lib/auth.js`, `backend/lib/schemas.js`
