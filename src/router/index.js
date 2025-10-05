import { createRouter, createWebHistory } from 'vue-router'
import ProfileSelector from '../components/ProfileSelector.vue'
import Dashboard from '../components/Dashboard.vue'
import UserDashboard from '../components/UserDashboard.vue'
import ProfileManagement from '../components/ProfileManagement.vue'
import PinLock from '../components/PinLock.vue'
import PinSettings from '../components/PinSettings.vue'
import EditProfilePage from '../components/EditProfilePage.vue'
import ProfileSettings from '../components/ProfileSettings.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
