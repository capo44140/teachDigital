import { createRouter, createWebHistory } from 'vue-router'
import ProfileSelector from '../components/ProfileSelector.vue'
import Dashboard from '../components/Dashboard.vue'
import UserDashboard from '../components/UserDashboard.vue'
import ProfileManagement from '../components/ProfileManagement.vue'
import PinLock from '../components/PinLock.vue'
import PinSettings from '../components/PinSettings.vue'
import EditProfilePage from '../components/EditProfilePage.vue'
import ProfileSettings from '../components/ProfileSettings.vue'
import LessonScanner from '../components/LessonScanner.vue'
import QuizGenerator from '../components/QuizGenerator.vue'
import SecurityDashboard from '../components/SecurityDashboard.vue'
import ProfileTest from '../components/ProfileTest.vue'
import SecurityTest from '../components/SecurityTest.vue'
import ParentQuizManagement from '../components/ParentQuizManagement.vue'
import TextQuizGenerator from '../components/TextQuizGenerator.vue'
import { useProfileStore } from '../stores/profileStore.js'

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
    props: route => ({ profileName: route.query.profile || 'Parent' })
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
    path: '/parent-quiz-management',
    name: 'ParentQuizManagement',
    component: ParentQuizManagement,
    meta: { requiresAdmin: true }
  },
  {
    path: '/text-quiz-generator',
    name: 'TextQuizGenerator',
    component: TextQuizGenerator,
    meta: { requiresAdmin: true }
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

  // Seulement vérifier les pages qui nécessitent des permissions admin
  if (to.meta.requiresAdmin) {
    const profileId = to.query.profile
    const isUnlocked = to.query.unlocked === 'true'
    let currentProfile = null
    
    // Si l'accès est déverrouillé (après vérification du PIN), permettre l'accès
    if (isUnlocked) {
      console.log('Accès autorisé après vérification du PIN')
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

  // Pour toutes les autres pages, permettre l'accès
  next()
})

export default router
