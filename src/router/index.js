import { createRouter, createWebHistory } from 'vue-router'
import ProfileSelector from '../components/ProfileSelector.vue'
import Dashboard from '../components/Dashboard.vue'
import ProfileManagement from '../components/ProfileManagement.vue'
import PinLock from '../components/PinLock.vue'
import PinSettings from '../components/PinSettings.vue'

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
    path: '/manage-profiles',
    name: 'ProfileManagement',
    component: ProfileManagement
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
