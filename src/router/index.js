import { createRouter, createWebHistory } from 'vue-router'
import { useProfileStore } from '../stores/profileStore.js'
import { useApiStore } from '../stores/apiStore.js'
import sessionService from '../services/sessionService.js'

// Imports dynamiques optimisés avec chunking intelligent
// Composants critiques (chargés immédiatement)
const ProfileSelector = () => import('../components/ProfileSelector.vue')
const Dashboard = () => import('../components/Dashboard.vue')
const UserDashboard = () => import('../components/UserDashboard.vue')
const PinLock = () => import('../components/PinLock.vue')

// Composants de gestion des profils (chunk: profile-management)
const ProfileManagement = () => import(/* webpackChunkName: "profile-management" */ '../components/ProfileManagement.vue')
const EditProfilePage = () => import(/* webpackChunkName: "profile-management" */ '../components/EditProfilePage.vue')
const ProfileSettings = () => import(/* webpackChunkName: "profile-management" */ '../components/ProfileSettings.vue')
const PinSettings = () => import(/* webpackChunkName: "profile-management" */ '../components/PinSettings.vue')

// Composants lourds avec IA (chunk: ai-components)
const LessonScanner = () => import(/* webpackChunkName: "ai-components" */ '../components/LessonScanner.vue')
const QuizGenerator = () => import(/* webpackChunkName: "ai-components" */ '../components/QuizGenerator.vue')
const TextQuizGenerator = () => import(/* webpackChunkName: "ai-components" */ '../components/TextQuizGenerator.vue')

// Composants YouTube (chunk: youtube-components)
const YouTubeVideoManager = () => import(/* webpackChunkName: "youtube-components" */ '../components/YouTubeVideoManager.vue')
const YouTubeKidsViewer = () => import(/* webpackChunkName: "youtube-components" */ '../components/YouTubeKidsViewerSimple.vue')

// Composants de sécurité (chunk: security-components)
const SecurityDashboard = () => import(/* webpackChunkName: "security-components" */ '../components/SecurityDashboard.vue')
const SecurityTest = () => import(/* webpackChunkName: "security-components" */ '../components/SecurityTest.vue')

// Composants de suivi et analytics (chunk: tracking-components)
const ProgressTracking = () => import(/* webpackChunkName: "tracking-components" */ '../components/ProgressTracking.vue')
const ParentProgressTracking = () => import(/* webpackChunkName: "tracking-components" */ '../components/ParentProgressTracking.vue')
const ParentQuizManagement = () => import(/* webpackChunkName: "tracking-components" */ '../components/ParentQuizManagement.vue')
const ParentActivityManagement = () => import(/* webpackChunkName: "tracking-components" */ '../components/ParentActivityManagement.vue')
const BadgeManager = () => import(/* webpackChunkName: "tracking-components" */ '../components/BadgeManager.vue')
const BadgeAdminManager = () => import(/* webpackChunkName: "tracking-components" */ '../components/BadgeAdminManager.vue')

// Composants d'aide (chunk: help-components)
const ChildHelp = () => import(/* webpackChunkName: "help-components" */ '../components/ChildHelp.vue')

// Composants de test et développement (chunk: dev-components)
const ProfileTest = () => import(/* webpackChunkName: "dev-components" */ '../components/ProfileTest.vue')
const NotificationTest = () => import(/* webpackChunkName: "dev-components" */ '../components/NotificationTest.vue')
const PerformanceDashboard = () => import(/* webpackChunkName: "dev-components" */ '../components/PerformanceDashboard.vue')
const LiquidGlassTest = () => import(/* webpackChunkName: "dev-components" */ '../components/LiquidGlassTest.vue')

// Composants API (chunk: api-components)
const ApiLoginForm = () => import(/* webpackChunkName: "api-components" */ '../components/ApiLoginForm.vue')
const ApiDashboard = () => import(/* webpackChunkName: "api-components" */ '../components/ApiDashboard.vue')

// Composants de paramètres (chunk: settings-components)
const ParentSettings = () => import(/* webpackChunkName: "settings-components" */ '../components/ParentSettings.vue')
const ChildSettings = () => import(/* webpackChunkName: "settings-components" */ '../components/ChildSettings.vue')

const routes = [
  {
    path: '/',
    name: 'ProfileSelector',
    component: ProfileSelector
  },
  {
    path: '/pin-lock',
    name: 'PinLock',
    component: PinLock,
    props: route => ({ profileName: route.query.name || 'Parent' })
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAdmin: true }
  },
  {
    path: '/user-dashboard',
    name: 'UserDashboard',
    component: UserDashboard,
    meta: { requiresChildOrTeen: true }
  },
  {
    path: '/manage-profiles',
    name: 'ProfileManagement',
    component: ProfileManagement,
    meta: { requiresAdmin: true }
  },
  {
    path: '/edit-profile/:id',
    name: 'EditProfilePage',
    component: EditProfilePage,
    props: true,
    meta: { requiresAdmin: true }
  },
  {
    path: '/profile-settings/:id',
    name: 'ProfileSettings',
    component: ProfileSettings,
    props: true,
    meta: { requiresAdmin: true }
  },
  {
    path: '/pin-settings',
    name: 'PinSettings',
    component: PinSettings,
    meta: { requiresAdmin: true }
  },
  {
    path: '/lesson-scanner',
    name: 'LessonScanner',
    component: LessonScanner,
    meta: { requiresAdmin: true }
  },
  {
    path: '/quiz-generator',
    name: 'QuizGenerator',
    component: QuizGenerator
  },
  {
    path: '/security-dashboard',
    name: 'SecurityDashboard',
    component: SecurityDashboard,
    meta: { requiresAdmin: true }
  },
  {
    path: '/profile-test',
    name: 'ProfileTest',
    component: ProfileTest,
    meta: { requiresAdmin: true }
  },
  {
    path: '/security-test',
    name: 'SecurityTest',
    component: SecurityTest,
    meta: { requiresAdmin: true }
  },
  {
    path: '/notification-test',
    name: 'NotificationTest',
    component: NotificationTest,
    meta: { requiresAdmin: true }
  },
  {
    path: '/performance-dashboard',
    name: 'PerformanceDashboard',
    component: PerformanceDashboard,
    meta: { requiresAdmin: true }
  },
  {
    path: '/parent-quiz-management',
    name: 'ParentQuizManagement',
    component: ParentQuizManagement,
    meta: { requiresAdmin: true }
  },
  {
    path: '/parent-activity-management',
    name: 'ParentActivityManagement',
    component: ParentActivityManagement,
    meta: { requiresAdmin: true }
  },
  {
    path: '/text-quiz-generator',
    name: 'TextQuizGenerator',
    component: TextQuizGenerator,
    meta: { requiresAdmin: true }
  },
  {
    path: '/progress-tracking',
    name: 'ProgressTracking',
    component: ProgressTracking,
    meta: { requiresAuth: true }
  },
  {
    path: '/parent-progress-tracking',
    name: 'ParentProgressTracking',
    component: ParentProgressTracking,
    meta: { requiresAdmin: true }
  },
  {
    path: '/parent-settings',
    name: 'ParentSettings',
    component: ParentSettings,
    meta: { requiresAdmin: true }
  },
  {
    path: '/child-settings',
    name: 'ChildSettings',
    component: ChildSettings,
    meta: { requiresChildOrTeen: true }
  },
  {
    path: '/youtube-video-manager',
    name: 'YouTubeVideoManager',
    component: YouTubeVideoManager,
    meta: { requiresAdmin: true }
  },
  {
    path: '/youtube-kids-viewer',
    name: 'YouTubeKidsViewer',
    component: YouTubeKidsViewer,
    meta: { requiresChildOrTeen: true }
  },
  {
    path: '/child-help',
    name: 'ChildHelp',
    component: ChildHelp,
    meta: { requiresChildOrTeen: true }
  },
  {
    path: '/badge-manager',
    name: 'BadgeManager',
    component: BadgeManager,
    meta: { requiresAuth: true }
  },
  {
    path: '/badge-admin-manager',
    name: 'BadgeAdminManager',
    component: BadgeAdminManager,
    meta: { requiresAdmin: true }
  },
  // Nouvelles routes API
  {
    path: '/api-login',
    name: 'ApiLogin',
    component: ApiLoginForm
  },
  {
    path: '/api-dashboard',
    name: 'ApiDashboard',
    component: ApiDashboard,
    meta: { requiresApiAuth: true }
  },
  {
    path: '/liquid-glass-test',
    name: 'LiquidGlassTest',
    component: LiquidGlassTest
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navigation simplifié pour éviter les boucles infinies
router.beforeEach(async (to, from, next) => {
  // Éviter les boucles infinies en vérifiant si on est déjà en train de rediriger
  if (to.path === from.path) {
    next()
    return
  }

  // Vérifier l'authentification API
  if (to.meta.requiresApiAuth) {
    const apiStore = useApiStore()

    // Initialiser le store si nécessaire
    if (!apiStore.isAuthenticated) {
      await apiStore.initialize()
    }

    if (!apiStore.isAuthenticated) {
      console.log('Redirection vers la page de connexion API')
      next({ path: '/api-login' })
      return
    }
  }

  // Vérifier les pages qui nécessitent des permissions admin
  if (to.meta.requiresAdmin) {
    const profileId = to.query.profile
    const isUnlocked = to.query.unlocked === 'true'
    let currentProfile = null

    // Si l'accès est déverrouillé (après vérification du PIN), vérifier qu'une session valide existe
    if (isUnlocked) {
      // Vérifier qu'une session valide existe pour ce profil
      const session = sessionService.getValidSession()
      if (session && session.profileId === profileId && session.isUnlocked) {
        console.log('Accès autorisé après vérification du PIN avec session valide')
        next()
        return
      } else {
        // Si unlocked=true mais pas de session valide, rediriger vers la page PIN
        console.warn('Accès déverrouillé demandé mais session invalide, redirection vers PIN')
        next({
          path: '/pin-lock',
          query: {
            profile: profileId,
            name: 'Parent'
          }
        })
        return
      }
    }

    // Vérifier si une session valide existe
    const session = sessionService.getValidSession()
    if (session && sessionService.isUnlocked(profileId)) {
      console.log('Accès autorisé par session valide pour:', session.profileName)
      // Prolonger la session
      sessionService.extendSession()
      next()
      return
    }

    if (profileId) {
      try {
        const profileStore = useProfileStore()
        await profileStore.loadProfiles()
        currentProfile = profileStore.getProfileById(profileId)
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
      }
    }

    if (!currentProfile || !currentProfile.is_admin) {
      console.warn('Accès refusé à la page admin:', to.path)
      next({ path: '/' })
      return
    }
  }

  // Vérifier les pages qui nécessitent des permissions enfant/adolescent
  if (to.meta.requiresChildOrTeen) {
    const profileId = to.query.profile
    let currentProfile = null

    console.log('🔍 [ROUTER] Vérification des permissions enfant/adolescent pour:', to.path)
    console.log('🔍 [ROUTER] Profile ID:', profileId)

    if (profileId) {
      try {
        const profileStore = useProfileStore()
        console.log('🔍 [ROUTER] Chargement des profils...')
        await profileStore.loadProfiles()
        console.log('🔍 [ROUTER] Tous les profils:', profileStore.profiles)
        console.log('🔍 [ROUTER] Recherche du profil ID:', profileId, 'Type:', typeof profileId)

        // Essayer avec l'ID comme string et comme number
        currentProfile = profileStore.getProfileById(profileId)
        if (!currentProfile) {
          console.log('🔍 [ROUTER] Tentative avec ID converti en number...')
          currentProfile = profileStore.getProfileById(parseInt(profileId))
        }
        if (!currentProfile) {
          console.log('🔍 [ROUTER] Tentative avec ID converti en string...')
          currentProfile = profileStore.getProfileById(String(profileId))
        }

        console.log('🔍 [ROUTER] Profil trouvé:', currentProfile)
        console.log('🔍 [ROUTER] is_child:', currentProfile?.is_child)
        console.log('🔍 [ROUTER] is_teen:', currentProfile?.is_teen)
      } catch (error) {
        console.error('❌ [ROUTER] Erreur lors du chargement du profil:', error)
      }
    } else {
      console.warn('⚠️ [ROUTER] Aucun profileId fourni dans l\'URL')
    }

    if (!currentProfile || (!currentProfile.is_child && !currentProfile.is_teen)) {
      console.warn('❌ [ROUTER] Accès refusé à la page enfant/adolescent:', to.path)
      console.warn('❌ [ROUTER] Profil:', currentProfile)
      console.warn('❌ [ROUTER] is_child:', currentProfile?.is_child)
      console.warn('❌ [ROUTER] is_teen:', currentProfile?.is_teen)

      // Solution temporaire : créer un profil par défaut si aucun profil n'est trouvé
      if (to.path === '/user-dashboard') {
        console.log('⚠️ [ROUTER] Création d\'un profil par défaut pour le dashboard utilisateur')
        // Le UserDashboard créera son propre profil par défaut
        next()
        return
      }

      next({ path: '/' })
      return
    }

    console.log('✅ [ROUTER] Accès autorisé pour:', to.path)
  }

  // Pour toutes les autres pages, permettre l'accès
  next()
})

export default router
