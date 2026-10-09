import { createRouter, createWebHistory } from 'vue-router'
import { useProfileStore } from '../stores/profileStore.js'
import { useApiStore } from '../stores/apiStore.js'
import sessionService from '../services/sessionService.js'
import familyGateService from '../services/familyGateService.js'
import { apiService } from '../services/apiService.js'
import { hasParentAccess } from '../services/parentAccessService.js'

// Imports dynamiques optimisés avec chunking intelligent
// Composants critiques (chargés immédiatement)
const FamilyGate = () => import('../components/FamilyGate.vue')
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
const LessonDetails = () => import(/* webpackChunkName: "tracking-components" */ '../components/LessonDetails.vue')
const CoursePageManager = () => import(/* webpackChunkName: "course-pages" */ '../components/CoursePageManager.vue')
const CoursePageViewer = () => import(/* webpackChunkName: "course-pages" */ '../components/CoursePageViewer.vue')
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
const FamilyGateSettings = () => import(/* webpackChunkName: "settings-components" */ '../components/FamilyGateSettings.vue')
const ChildSettings = () => import(/* webpackChunkName: "settings-components" */ '../components/ChildSettings.vue')
const PWASettings = () => import(/* webpackChunkName: "settings-components" */ '../components/PWASettings.vue')
const AISettings = () => import(/* webpackChunkName: "settings-components" */ '../components/AISettings.vue')

const routes = [
  {
    path: '/family-gate',
    name: 'FamilyGate',
    component: FamilyGate,
    // Seule route accessible sans session famille
    meta: { public: true }
  },
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
    path: '/lesson-details/:lessonId',
    name: 'LessonDetails',
    component: LessonDetails,
    props: true,
    meta: { requiresAdmin: true }
  },
  {
    path: '/course-page-manager',
    name: 'CoursePageManager',
    component: CoursePageManager,
    meta: { requiresAdmin: true }
  },
  {
    path: '/course-page/:id',
    name: 'CoursePageViewer',
    component: CoursePageViewer,
    props: true,
    meta: { requiresChildOrTeen: true }
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
    // Page enfant (?childId=) : profil enfant/ado exigé, consultable aussi depuis l'espace parent
    meta: { requiresChildOrTeen: true }
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
    path: '/family-gate-settings',
    name: 'FamilyGateSettings',
    component: FamilyGateSettings,
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
    // Page enfant (?profile=) : profil enfant/ado exigé
    meta: { requiresChildOrTeen: true }
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
  },
  {
    path: '/settings/pwa',
    name: 'PWASettings',
    component: PWASettings,
    meta: { requiresAdmin: true }
  },
  {
    path: '/ai-settings',
    name: 'AISettings',
    component: AISettings,
    meta: { requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Retrouver un profil (id string ou number) dans le store, après chargement
 */
async function findProfile (profileId) {
  const profileStore = useProfileStore()
  await profileStore.loadProfiles()
  return profileStore.getProfileById(profileId) ||
    profileStore.getProfileById(Number(profileId)) ||
    profileStore.getProfileById(String(profileId)) ||
    null
}

// Accès parent : session parent déverrouillée ET jeton admin du même profil
export { hasParentAccess }

/**
 * Guard de navigation.
 * Pas de court-circuit « même chemin » : au démarrage, from.path vaut '/' et
 * cela sautait le code familial. vue-router n'exécute de toute façon pas les
 * guards pour une navigation dupliquée, et aucune redirection ci-dessous ne boucle
 * (/family-gate est public ; /pin-lock et / n'exigent que la session famille).
 */
export async function navigationGuard (to) {
  // Code d'entrée familial : seule page publique
  if (to.meta.public) {
    return true
  }

  // Toutes les autres pages exigent une session famille valide (jeton non expiré)
  if (!familyGateService.hasValidFamilySession()) {
    const query = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    return { path: '/family-gate', query }
  }

  // Vérifier l'authentification API
  if (to.meta.requiresApiAuth) {
    const apiStore = useApiStore()

    // Initialiser le store si nécessaire
    if (!apiStore.isAuthenticated) {
      await apiStore.initialize()
    }

    if (!apiStore.isAuthenticated) {
      return { path: '/api-login' }
    }
  }

  // Pages parent : session parent + jeton admin du même profil
  if (to.meta.requiresAdmin) {
    const session = sessionService.getValidSession()
    const profileId = to.query.profile || session?.profileId || null

    if (hasParentAccess(profileId)) {
      // Prolonger la session parent
      sessionService.extendSession()
      return true
    }

    console.warn('Accès parent refusé (PIN requis):', to.path)
    if (profileId) {
      return { path: '/pin-lock', query: { profile: String(profileId) } }
    }
    return { path: '/' }
  }

  // Pages enfant/adolescent (?profile= ou ?childId=)
  if (to.meta.requiresChildOrTeen) {
    const profileId = to.query.profile || to.query.childId
    let currentProfile = null
    let lookupFailed = false

    if (profileId) {
      try {
        currentProfile = await findProfile(profileId)
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
        lookupFailed = true
      }
    }

    if (!currentProfile || (!currentProfile.is_child && !currentProfile.is_teen)) {
      // Tableau de bord enfant : toléré si les profils n'ont pas pu être chargés (hors ligne…)
      if (to.path === '/user-dashboard' && lookupFailed) {
        return true
      }
      return { path: '/' }
    }
  }

  // Pour toutes les autres pages, la session famille suffit
  return true
}

router.beforeEach(navigationGuard)

/**
 * Session refusée par le serveur (401) :
 * - jeton famille → retour au code familial ;
 * - jeton parent → nouveau PIN si l'on est dans l'espace parent.
 */
apiService.setAuthErrorHandler(({ kind }) => {
  const current = router.currentRoute.value
  if (kind === 'family') {
    if (!current.meta?.public) {
      router.replace({ path: '/family-gate' }).catch(() => {})
    }
    return
  }
  if (current.meta?.requiresAdmin) {
    const profileId = current.query.profile
    const target = profileId ? { path: '/pin-lock', query: { profile: String(profileId) } } : { path: '/' }
    router.replace(target).catch(() => {})
  }
})

export default router
