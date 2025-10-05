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
import ParentQuizManagement from '../components/ParentQuizManagement.vue'

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
    component: Dashboard
  },
  {
    path: '/user-dashboard',
    name: 'UserDashboard',
    component: UserDashboard
  },
  {
    path: '/manage-profiles',
    name: 'ProfileManagement',
    component: ProfileManagement
  },
  {
    path: '/edit-profile/:id',
    name: 'EditProfilePage',
    component: EditProfilePage,
    props: true
  },
  {
    path: '/profile-settings/:id',
    name: 'ProfileSettings',
    component: ProfileSettings,
    props: true
  },
  {
    path: '/pin-settings',
    name: 'PinSettings',
    component: PinSettings
  },
  {
    path: '/lesson-scanner',
    name: 'LessonScanner',
    component: LessonScanner
  },
  {
    path: '/quiz-generator',
    name: 'QuizGenerator',
    component: QuizGenerator
  },
  {
    path: '/security-dashboard',
    name: 'SecurityDashboard',
    component: SecurityDashboard
  },
  {
    path: '/profile-test',
    name: 'ProfileTest',
    component: ProfileTest
  },
  {
    path: '/parent-quiz-management',
    name: 'ParentQuizManagement',
    component: ParentQuizManagement
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
