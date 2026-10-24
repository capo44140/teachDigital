import { createRouter, createWebHistory } from 'vue-router'
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import familyGateService from '../services/familyGateService.js'
import { apiService } from '../services/apiService.js'
import { hasParentAccess } from '../services/parentAccessService.js'

// Écrans (src/views) chargés à la demande : Vite crée un chunk par import dynamique
const FamilyGate = () => import('../views/FamilyGate.vue')
const ProfileSelector = () => import('../views/ProfileSelector.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const UserDashboard = () => import('../views/UserDashboard.vue')
const PinLock = () => import('../views/PinLock.vue')
const NotFound = () => import('../views/NotFound.vue')

// Gestion des profils
const ProfileManagement = () => import('../views/ProfileManagement.vue')
const EditProfilePage = () => import('../views/EditProfilePage.vue')
const PinSettings = () => import('../views/PinSettings.vue')

// Composants avec IA
const LessonScanner = () => import('../views/LessonScanner.vue')
const QuizGenerator = () => import('../views/QuizGenerator.vue')
const TextQuizGenerator = () => import('../views/TextQuizGenerator.vue')

// YouTube
const YouTubeVideoManager = () => import('../views/YouTubeVideoManager.vue')
const YouTubeKidsViewer = () => import('../views/YouTubeKidsViewerSimple.vue')

// Sécurité
const SecurityDashboard = () => import('../views/SecurityDashboard.vue')

// Suivi
const ProgressTracking = () => import('../views/ProgressTracking.vue')
const ParentProgressTracking = () => import('../views/ParentProgressTracking.vue')
const ParentQuizManagement = () => import('../views/ParentQuizManagement.vue')
const ParentActivityManagement = () => import('../views/ParentActivityManagement.vue')
const LessonDetails = () => import('../views/LessonDetails.vue')
const CoursePageManager = () => import('../views/CoursePageManager.vue')
const CoursePageViewer = () => import('../views/CoursePageViewer.vue')
const BadgeManager = () => import('../views/BadgeManager.vue')
const BadgeAdminManager = () => import('../views/BadgeAdminManager.vue')

// Aide
const ChildHelp = () => import('../views/ChildHelp.vue')

// Paramètres
const ParentSettings = () => import('../views/ParentSettings.vue')
const FamilyGateSettings = () => import('../views/FamilyGateSettings.vue')
const ChildSettings = () => import('../views/ChildSettings.vue')
const AISettings = () => import('../views/AISettings.vue')
const ThemeSettings = () => import('../views/ThemeSettings.vue')

/*
 * Méta des routes :
 * - public : accessible sans session famille ;
 * - requiresAdmin : session parent (PIN) + jeton admin du même profil ;
 * - requiresChildOrTeen : ?profile= ou ?childId= doit désigner un profil enfant/ado ;
 * - disablePullToRefresh : pas de « tirer pour actualiser » (quiz en cours, pages de cours) ;
 * - bgTone : teinte du fond animé partagé (AppBackground).
 */
const routes = [
  {
    path: '/family-gate',
    name: 'FamilyGate',
    component: FamilyGate,
    // Seule route accessible sans session famille (avec la page 404)
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
    // Quiz d'une leçon (?childId=&lessonId=) : passé par l'enfant, ou aperçu par le parent
    // (en session parent, rien n'est enregistré). ?childId= doit être un profil enfant/ado.
    path: '/quiz-generator',
    name: 'QuizGenerator',
    component: QuizGenerator,
    meta: { requiresChildOrTeen: true, disablePullToRefresh: true, bgTone: 'green' }
  },
  {
    path: '/security-dashboard',
    name: 'SecurityDashboard',
    component: SecurityDashboard,
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
    meta: { requiresAdmin: true, disablePullToRefresh: true }
  },
  {
    path: '/course-page/:id',
    name: 'CoursePageViewer',
    component: CoursePageViewer,
    props: true,
    meta: { requiresChildOrTeen: true, disablePullToRefresh: true }
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
    meta: { requiresChildOrTeen: true, bgTone: 'blue' }
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
    // Ancienne page PWA : l'installation se gère désormais dans les paramètres parent
    path: '/settings/pwa',
    redirect: '/parent-settings'
  },
  {
    path: '/family-gate-settings',
    name: 'FamilyGateSettings',
    component: FamilyGateSettings,
    meta: { requiresAdmin: true }
  },
  {
    // Thème de la famille et thème de chaque enfant (src/stores/themeStore.js)
    path: '/theme-settings',
    name: 'ThemeSettings',
    component: ThemeSettings,
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
    meta: { requiresChildOrTeen: true, bgTone: 'red' }
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
    // Le composant attend la prop profileId (sinon les badges ne se chargeaient jamais)
    props: route => ({ profileId: route.query.profile }),
    // Page enfant (?profile=) : profil enfant/ado exigé
    meta: { requiresChildOrTeen: true }
  },
  {
    path: '/badge-admin-manager',
    name: 'BadgeAdminManager',
    component: BadgeAdminManager,
    meta: { requiresAdmin: true }
  },
  {
    path: '/ai-settings',
    name: 'AISettings',
    component: AISettings,
    meta: { requiresAdmin: true }
  },
  {
    // Toute autre adresse : page 404 (publique, sans aucune donnée)
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Retrouver un profil (id string ou number) dans le store, après chargement.
 * Hors ligne (ou API injoignable), la liste déjà chargée en mémoire fait foi :
 * les pages enfant restent consultables avec le précache du Service Worker.
 */
async function findProfile (profileId) {
  const profileStore = useProfileStore()
  try {
    await profileStore.loadProfiles()
  } catch (error) {
    const known = profileStore.getProfileById(profileId)
    if (known) return known
    throw error
  }
  return profileStore.getProfileById(profileId)
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
  // Pages publiques : code d'entrée familial et page 404
  if (to.meta.public) {
    return true
  }

  // Toutes les autres pages exigent une session famille valide (jeton non expiré)
  if (!familyGateService.hasValidFamilySession()) {
    const query = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    return { path: '/family-gate', query }
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
      // Après le nouveau code familial, retour à la page en cours (FamilyGate valide redirect)
      const query = current.fullPath && current.fullPath !== '/' ? { redirect: current.fullPath } : {}
      router.replace({ path: '/family-gate', query }).catch(() => {})
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
