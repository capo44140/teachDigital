# Guide de reproduction TeachDigital en React Native

Ce document permet de reproduire l’application **TeachDigital** (Vue.js 3 + Vite) en **React Native**, en conservant les mêmes fonctionnalités et en réutilisant le backend existant.

---

## 1. Vue d’ensemble de l’application actuelle

### 1.1 Stack technique actuelle

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue 3, Pinia, Vue Router, TailwindCSS, Vite |
| Backend | Node.js (Express), Vercel Functions |
| Base de données | PostgreSQL |
| PWA | Service Worker, Manifest |

### 1.2 Principes à respecter en React Native

- **Le frontend ne fait que des appels API** : aucune logique métier ni accès direct à la base de données.
- **Backend inchangé** : les endpoints REST existants restent la seule source de vérité.
- **Authentification** : JWT (token dans le header `Authorization`), code familial (family gate), PIN par profil.

---

## 2. Équivalent React Native de la stack

### 2.1 Outils recommandés

| Vue / Web | React Native |
|-----------|--------------|
| Vue 3 + Composition API | React 18+ (hooks) |
| Pinia | Zustand ou Redux Toolkit |
| Vue Router | React Navigation |
| TailwindCSS | NativeWind (Tailwind pour RN) ou StyleSheet |
| Vite | Metro (bundler React Native) |
| fetch + apiService | fetch / axios + même baseURL et headers |

### 2.2 Création du projet React Native

```bash
# Avec Expo (recommandé pour démarrer rapidement)
npx create-expo-app teachdigital-mobile --template blank

# Ou React Native CLI
npx @react-native-community/cli init teachdigital-mobile
```

**Dépendances utiles :**

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# État global (équivalent Pinia)
npm install zustand

# Requêtes API
npm install axios

# Stockage local (token, session, code familial)
npx expo install @react-native-async-storage/async-storage

# Sécurité / clavier numérique pour PIN
# (optionnel) react-native-pin-view ou composant custom
```

---

## 3. Architecture des écrans et navigation

### 3.1 Correspondance des routes Vue → React Navigation

| Route Vue | Écran React Native | Garde / condition |
|-----------|--------------------|-------------------|
| `/family-gate` | `FamilyGateScreen` | Premier écran si pas de session famille |
| `/` | `ProfileSelectorScreen` | Après family gate valide |
| `/pin-lock` | `PinLockScreen` | Si profil admin et pas de session déverrouillée |
| `/dashboard` | `DashboardScreen` | `requiresAdmin` + session déverrouillée |
| `/user-dashboard` | `UserDashboardScreen` | `requiresChildOrTeen` |
| `/manage-profiles` | `ProfileManagementScreen` | Admin |
| `/edit-profile/:id` | `EditProfileScreen` | Admin |
| `/profile-settings/:id` | `ProfileSettingsScreen` | Admin |
| `/pin-settings` | `PinSettingsScreen` | Admin |
| `/lesson-scanner` | `LessonScannerScreen` | Admin |
| `/quiz-generator` | `QuizGeneratorScreen` | - |
| `/text-quiz-generator` | `TextQuizGeneratorScreen` | Admin |
| `/youtube-video-manager` | `YouTubeVideoManagerScreen` | Admin |
| `/youtube-kids-viewer` | `YouTubeKidsViewerScreen` | Enfant / Teen |
| `/progress-tracking` | `ProgressTrackingScreen` | Auth |
| `/parent-progress-tracking` | `ParentProgressTrackingScreen` | Admin |
| `/parent-settings` | `ParentSettingsScreen` | Admin |
| `/child-settings` | `ChildSettingsScreen` | Enfant / Teen |
| `/child-help` | `ChildHelpScreen` | Enfant / Teen |
| `/badge-manager` | `BadgeManagerScreen` | Auth |
| `/badge-admin-manager` | `BadgeAdminManagerScreen` | Admin |
| `/notifications` (logique) | `NotificationScreen` ou intégré | - |

### 3.2 Structure des navigators

- **Stack racine** : `FamilyGate` → `ProfileSelector` → soit **Parent Stack**, soit **Child/Teen Stack**.
- **Parent Stack** : après PIN → Dashboard, Gestion profils, Leçons, YouTube Manager, Paramètres parent, Badges admin, etc.
- **Child/Teen Stack** : User Dashboard, YouTube Kids Viewer, Aide enfant, Paramètres enfant, etc.

Implémenter les guards dans un `AuthNavigator` ou avec des composants wrapper qui vérifient `familyGate`, `sessionService`, `profile.is_admin` / `is_child` / `is_teen` (comme dans le `router.beforeEach` actuel).

---

## 4. API Backend (à réutiliser telle quelle)

### 4.1 Base URL et authentification

- **Dev** : `VITE_API_URL` (ex. `http://localhost:3000` ou l’URL de votre machine pour l’émulateur).
- **Prod** : `https://www.teach-digital.fr` (ou votre domaine).
- **Headers** : `Content-Type: application/json`, `Authorization: Bearer <token>` pour les routes protégées. Token stocké dans AsyncStorage (équivalent `localStorage`).

### 4.2 Liste des endpoints (référence)

#### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion (body: identifiants) |
| POST | `/api/auth/logout` | Déconnexion |
| POST | `/api/auth/family-gate` | Vérification code familial (accès à l’app) |
| PUT | `/api/auth/family-gate` | Configuration family gate (admin) |

#### Profils

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/profiles` | Liste des profils |
| GET | `/api/profiles/stats` | Statistiques profils |
| GET | `/api/profiles/:id` | Détail d’un profil |
| PUT | `/api/profiles/:id` | Mise à jour profil |
| DELETE | `/api/profiles/:id` | Suppression profil |
| POST | `/api/profiles/:id/pin` | Vérification PIN |
| GET | `/api/profiles/:id/learning-stats` | Stats d’apprentissage |
| GET | `/api/profiles/:id/progress-summary` | Résumé de progrès |
| POST | `/api/profiles/requests` | Demande de création de profil (rate limité) |

#### Leçons

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/lessons` | Liste (query: `profileId`, `published`) |
| POST | `/api/lessons` | Création |
| GET | `/api/lessons/:id` | Détail |
| PUT | `/api/lessons/:id` | Mise à jour |
| DELETE | `/api/lessons/:id` | Suppression |
| GET/POST | `/api/lessons/:id/quiz-results` | Résultats de quiz |
| GET | `/api/lessons/stats/global` | Statistiques globales |

#### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` | Liste (query: `profileId`, `isRead`) |
| POST | `/api/notifications` | Création |
| GET | `/api/notifications/:id` | Détail |
| PUT | `/api/notifications/:id` | Mise à jour |
| DELETE | `/api/notifications/:id` | Suppression |

#### Activités

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/activities` | Liste des activités |

#### YouTube

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/youtube-videos` | Liste des vidéos |

#### Badges

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/badges` | Tous les badges |
| POST | `/api/badges` | Création (admin) |
| GET | `/api/badges/profile/:id` | Badges d’un profil |
| GET | `/api/badges/profile/:id/unlocked` | Badges débloqués |
| GET | `/api/badges/profile/:id/stats` | Stats badges profil |
| POST | `/api/badges/check-unlock` | Vérifier et débloquer des badges |
| GET | `/api/badges/:id` | Détail badge |
| PUT | `/api/badges/:id` | Mise à jour |
| DELETE | `/api/badges/:id` | Suppression |

#### IA (quiz, OCR, etc.)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/ai/generate-quiz-from-image` | Quiz à partir d’une image |
| POST | `/api/ai/generate-quiz-from-documents` | Quiz à partir de documents |
| POST | `/api/ai/extract-text-from-documents` | Extraction de texte |
| POST | `/api/ai/generate-quiz-from-analyses` | Quiz à partir d’analyses |
| POST | `/api/ai/generate-quiz-from-text` | Quiz à partir de texte |
| GET | `/api/ai/validate-key` | Validation clé API |
| GET | `/api/ai/has-valid-key` | Présence d’une clé valide |
| GET | `/api/ai/local-llm/models` | Modèles LM Studio |
| GET | `/api/ai/local-llm/status` | Statut Local LLM |
| POST | `/api/ai/local-llm/model` | Définir le modèle |
| GET | `/api/ai/providers` | Liste des fournisseurs IA |

#### Autres

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/init-pins` | Initialisation des PINs |
| * | `/api/audit/*` | Logs d’audit |

### 4.3 Format des réponses

Le backend renvoie en général :

```json
{
  "success": true,
  "message": "Message descriptif",
  "data": { ... }
}
```

En cas d’erreur : `success: false`, `message` d’erreur, et éventuellement un code (ex. `RATE_LIMIT_LOGIN`). Gérer les status HTTP 401 (redirection login / family gate) et 403 (accès refusé).

---

## 5. Modèles de données (côté app)

Ces types servent à typer les réponses API et l’état local (Zustand/Redux). La base reste en PostgreSQL côté backend.

### 5.1 Profil

- `id`, `name`, `description`, `type` ('child' | 'teen' | 'parent' | 'admin')
- `is_child`, `is_teen`, `is_admin`, `is_active`
- `color`, `avatar_class`, `avatar_content`, `image_url`, `image_data`, `image_type`
- `level`, `created_at`, `updated_at`

### 5.2 Leçon

- `id`, `profile_id`, `target_profile_id` (optionnel)
- `title`, `description`, `subject`, `level`
- `image_filename`, `image_data`, `quiz_data` (JSON)
- `is_published`, `created_at`, `updated_at`

### 5.3 Quiz / Résultats

- `quiz_data` : tableau de questions (énoncé, options, bonne réponse, etc.)
- `quiz_results` : `lesson_id`, `profile_id`, `score`, `total_questions`, `percentage`, `answers` (JSON), `completed_at`

### 5.4 Notification

- `id`, `profile_id` (ou équivalent), `title`, `body`, `type`, `is_read`, `read_at`, `created_at`

### 5.5 Badge

- `id`, `name`, `description`, `icon`, `category`, `condition_type`, `condition_value`, `points`, `color`, `is_active`
- `profile_badges` : `profile_id`, `badge_id`, `progress`, `is_unlocked`, `unlocked_at`

### 5.6 Session / Family gate

- Session famille : stocker en local (AsyncStorage) un indicateur + éventuellement une date d’expiration.
- Session profil déverrouillé : `profileId`, `profileName`, `isUnlocked`, expiration (comme dans `sessionService` actuel).

---

## 6. Services (couche API uniquement)

En React Native, créer des modules “services” qui ne font qu’appeler le backend (même principe que le frontend Vue).

### 6.1 Client API commun

- Base URL depuis variable d’environnement (ex. `EXPO_PUBLIC_API_URL`).
- Récupérer le token depuis AsyncStorage et l’ajouter dans `Authorization: Bearer <token>`.
- Gérer les timeouts (ex. 30 s, 60 s pour login, 180 s pour génération quiz).
- Intercepter 401 / 403 : déconnexion ou redirection vers Family Gate / Pin Lock / Login.

### 6.2 Services à implémenter

- `authService` : login, logout, familyGate (POST/PUT), vérification token.
- `profileService` : getProfiles, getProfile(id), createProfile, updateProfile, deleteProfile, getStats, getLearningStats, getProgressSummary, verifyPin(profileId, pin).
- `lessonService` : getLessons, getLesson(id), createLesson, updateLesson, deleteLesson, getQuizResults, submitQuizResults, getGlobalStats.
- `notificationService` : getNotifications, getNotification(id), create, update, delete, markAsRead.
- `activityService` : getActivities.
- `youtubeVideoService` : getYoutubeVideos.
- `badgeService` : getAllBadges, getProfileBadges(profileId), getUnlocked, getStats, checkUnlock.
- `aiService` : generateQuizFromImage, generateQuizFromText, generateQuizFromDocuments, extractTextFromDocuments, validateKey, hasValidKey, etc.

Chaque méthode : `async` qui appelle `fetch` ou `axios` sur l’endpoint correspondant et retourne `response.data` (ou `data` du JSON). Pas de logique métier ni d’accès DB.

---

## 7. État global (Zustand, équivalent Pinia)

- **authStore** : token, user/profile minimal, isAuthenticated, login, logout, init (lecture token depuis AsyncStorage).
- **familyGateStore** : hasValidFamilySession, setFamilySession, clear.
- **profileStore** : profiles[], currentProfile, loadProfiles, getProfileById, createProfile, updateProfile, deleteProfile, stats (total, active, children, teens, admins).
- **sessionStore** (équivalent sessionService) : currentSession (profileId, profileName, isUnlocked, expiresAt), getValidSession, setSession, extendSession, clear.
- **lessonStore** : lessons, currentLesson, loadLessons, loadLesson(id), createLesson, etc.
- **notificationStore** : notifications, unreadCount, loadNotifications, markAsRead.
- **badgeStore** : badges, profileBadges, loadBadges, loadProfileBadges(profileId), checkUnlock.

Les stores appellent les services API et mettent à jour l’état ; pas de logique métier complexe côté client.

---

## 8. Flux clés à reproduire

### 8.1 Démarrage

1. Lancer l’app → vérifier session famille (AsyncStorage).
2. Si pas de session famille valide → écran **Family Gate** (saisie code) → POST `/api/auth/family-gate` → si OK, stocker et aller à **ProfileSelector**.
3. ProfileSelector : charger les profils (GET `/api/profiles`), afficher les cartes (Parent / Enfant / Adolescent).
4. Clic sur un profil :
   - Si admin : vérifier session déverrouillée (sessionStore). Si pas de session ou expirée → **PinLock** (saisie PIN) → POST `/api/profiles/:id/pin` → si OK, créer/étendre session → aller au **Dashboard** parent.
   - Si enfant/teen : aller au **UserDashboard** (avec `profile` dans la navigation/params).

### 8.2 Guards de navigation

- Routes “admin” : profil courant `is_admin === true` ET session déverrouillée valide.
- Routes “childOrTeen” : profil courant `is_child === true` ou `is_teen === true`.
- Sinon : redirection vers ProfileSelector ou PinLock.

### 8.3 Sécurité

- PIN : jamais en clair ; le backend compare un hash (comme aujourd’hui).
- Token JWT : uniquement en AsyncStorage (ou Keychain/Keystore pour plus de sécurité).
- Données biométriques : traitement local uniquement, pas d’envoi au serveur (si vous répliquez la reconnaissance faciale plus tard, garder la même règle).

---

## 9. Fonctionnalités spécifiques

### 9.1 Scanner de leçons / Quiz IA

- **LessonScanner** : capture ou sélection d’image → upload vers POST `/api/ai/generate-quiz-from-image` (FormData avec `image` + `childProfile`). Afficher le quiz retourné et permettre la création de leçon (POST `/api/lessons`).
- **QuizGenerator** / **TextQuizGenerator** : texte ou documents → endpoints `/api/ai/generate-quiz-from-text`, `generate-quiz-from-documents`, `extract-text-from-documents`, etc. Même principe : appels API uniquement.

### 9.2 YouTube Kids

- **YouTubeVideoManager** (admin) : GET `/api/youtube-videos`, affichage liste ; pas de modification côté API dans la liste actuelle.
- **YouTubeKidsViewer** (enfant/teen) : afficher les vidéos autorisées ; lecture via WebView ou `expo-av` / lien externe selon votre choix (respecter les contraintes de la plateforme pour YouTube).

### 9.3 Badges et suivi

- Récupérer les badges (GET `/api/badges`, GET `/api/badges/profile/:id`, `/unlocked`, `/stats`).
- Après un quiz ou une activité : POST `/api/badges/check-unlock` avec les infos demandées par le backend pour mettre à jour les badges débloqués.
- **ProgressTracking** / **ParentProgressTracking** : combiner GET `/api/profiles/:id/progress-summary`, `/api/lessons`, `/api/lessons/:id/quiz-results`, et badges.

### 9.4 Notifications

- GET `/api/notifications?profileId=...` pour la liste.
- PUT `/api/notifications/:id` pour marquer comme lu ; affichage dans un écran ou une bannière.

---

## 10. Variables d’environnement (React Native / Expo)

Créer un fichier `.env` (et `.env.example`) à la racine du projet mobile :

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_URL_PROD=https://www.teach-digital.fr
```

Expo expose les variables préfixées par `EXPO_PUBLIC_` au client. Utiliser `EXPO_PUBLIC_API_URL` en dev et `EXPO_PUBLIC_API_URL_PROD` en production (ou une seule variable selon l’environnement de build).

---

## 11. Base de données (inchangée)

La base reste **PostgreSQL** gérée par le backend. Aucune migration spécifique “React Native” : les tables existantes (profiles, pin_codes, lessons, quiz_results, notifications, activities, youtube_videos, badges, profile_badges, etc.) et les migrations dans `scripts/` restent valides. Le mobile ne fait qu’appeler l’API.

---

## 12. Checklist de reproduction

- [ ] Projet React Native (Expo ou CLI) créé.
- [ ] Navigation (Stack + Tabs) avec guards (family gate, session, admin / child / teen).
- [ ] Client API (base URL, token AsyncStorage, timeouts, gestion 401/403).
- [ ] Services : auth, profile, lesson, notification, activity, youtube, badge, ai.
- [ ] Stores (Zustand/Redux) : auth, familyGate, session, profile, lesson, notification, badge.
- [ ] Écrans : FamilyGate, ProfileSelector, PinLock, Dashboard (parent), UserDashboard (enfant/teen), gestion profils, paramètres, leçons, quiz, YouTube, badges, suivi.
- [ ] Intégration IA : génération de quiz (image, texte, documents) via API.
- [ ] Variables d’environnement et build dev/prod.
- [ ] Tests manuels sur émulateur et appareil (connexion au même backend que la PWA).

---

## 13. Référence des fichiers sources (Vue)

Pour détailler les comportements ou les champs exacts, s’appuyer sur :

- **Router et guards** : `src/router/index.js`
- **API client** : `src/services/apiService.js`
- **Profils** : `src/services/profile/profileService.js`, `src/stores/profileStore.js`
- **Session / PIN** : `src/services/sessionService.js`, `src/services/profile/pinService.js`
- **Family gate** : `src/services/familyGateService.js`
- **Leçons** : `src/services/lessonService.js`, `src/stores/lessonStore.js`
- **Badges** : `src/services/badgeService.js`, `src/stores/badgeStore.js`
- **IA** : `src/services/aiService.js`
- **Backend** : `backend/api/index.js`, `backend/controllers/*.js`, `backend/api/ai/index.js`, `backend/api/badges.js`

Ce guide permet de reproduire l’application TeachDigital en React Native en réutilisant intégralement le backend et en respectant la séparation frontend (appels API uniquement) / backend (logique métier et base de données).
