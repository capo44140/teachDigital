/**
 * Rendu de fumée des écrans retravaillés : chaque composant est monté avec un router en
 * mémoire et une API simulée ; aucun avertissement Vue (propriété inconnue, composant
 * introuvable, erreur de rendu) ne doit apparaître.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { jsonResponse, storeFamilySession, storeParentSession, profileToken } from '../services/testUtils.js'

// Le canvas de jsdom ne sait pas encoder d'image (service d'optimisation instancié à l'import)
vi.mock('../../src/services/imageOptimizationService.js', () => ({
  default: { optimizeImage: vi.fn() }
}))

const PROFILES = [
  { id: 1, name: 'Parent', is_admin: true, is_child: false, is_teen: false, is_active: true },
  { id: 2, name: 'Enfant', is_admin: false, is_child: true, is_teen: false, is_active: true }
]

const LESSON = {
  id: 5,
  title: 'Fractions',
  quiz_data: { title: 'Fractions', questions: [{ question: '1/2 + 1/2 ?', options: ['1', '2'], correctAnswer: 0 }] }
}

// Réponses simulées de l'API (données minimales, chemin → data)
function fakeApi (url) {
  const path = new URL(url, 'http://localhost').pathname
  if (path === '/api/profiles') return { profiles: PROFILES }
  if (/^\/api\/profiles\/\d+$/.test(path)) return { profile: PROFILES.find(p => path.endsWith(`/${p.id}`)) }
  if (/^\/api\/lessons\/\d+$/.test(path)) return { lesson: LESSON }
  if (path === '/api/lessons') return { lessons: [] }
  if (path === '/api/course-pages') return { coursePages: [] }
  if (path === '/api/youtube-videos') return { videos: [] }
  if (path === '/api/badges' || /^\/api\/badges\/profile\/\d+(\/recent)?$/.test(path)) return []
  if (path.startsWith('/api/badges/profile/') && path.endsWith('/unlocked')) return { unlockedBadges: [] }
  if (path === '/api/ai/course-page/provider') return { provider: null, options: [] }
  if (path === '/api/ai/local-llm/models') return { connected: false, models: [] }
  return {}
}

async function flush () {
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await nextTick()
  }
}

async function mountScreen (loader, path, props = {}, interact = null) {
  const warnings = []
  const { default: Screen } = await loader()
  const Root = defineComponent({ render: () => h('div', [h(Screen, props)]) })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
      { path: '/quiz-generator', name: 'QuizGenerator', component: { render: () => null } }
    ]
  })
  await router.push(path)
  await router.isReady()

  const app = createApp(Root)
  app.use(createPinia()).use(router)
  app.directive('safe-html', { mounted () {}, updated () {} })
  app.config.globalProperties.$toast = new Proxy({}, { get: () => vi.fn() })
  app.config.globalProperties.$confirm = vi.fn().mockResolvedValue(false)
  app.config.warnHandler = (msg) => warnings.push(msg)
  app.config.errorHandler = (err) => warnings.push(`Erreur : ${err?.message || err}`)

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  await flush()
  if (interact) {
    await interact(el)
    await flush()
  }
  const text = el.textContent
  app.unmount()
  el.remove()
  return { warnings, text }
}

const SCREENS = [
  ['FamilyGate', () => import('../../src/views/FamilyGate.vue'), '/family-gate'],
  ['PinLock', () => import('../../src/views/PinLock.vue'), '/pin-lock?profile=1'],
  ['Dashboard', () => import('../../src/views/Dashboard.vue'), '/dashboard?profile=1'],
  ['ParentSettings', () => import('../../src/views/ParentSettings.vue'), '/parent-settings'],
  ['PinSettings', () => import('../../src/views/PinSettings.vue'), '/pin-settings'],
  ['FamilyGateSettings', () => import('../../src/views/FamilyGateSettings.vue'), '/family-gate-settings'],
  ['ChildSettings', () => import('../../src/views/ChildSettings.vue'), '/child-settings?profile=2'],
  ['UserDashboard', () => import('../../src/views/UserDashboard.vue'), '/user-dashboard?profile=2'],
  ['QuizGenerator', () => import('../../src/views/QuizGenerator.vue'), '/quiz-generator?childId=2&lessonId=5'],
  ['TextQuizGenerator', () => import('../../src/views/TextQuizGenerator.vue'), '/text-quiz-generator'],
  ['LessonScanner', () => import('../../src/views/LessonScanner.vue'), '/lesson-scanner'],
  ['ParentQuizManagement', () => import('../../src/views/ParentQuizManagement.vue'), '/parent-quiz-management'],
  ['EditProfilePage', () => import('../../src/views/EditProfilePage.vue'), '/edit-profile/2'],
  ['ProfileManagement', () => import('../../src/views/ProfileManagement.vue'), '/manage-profiles'],
  ['YouTubeKidsViewerSimple', () => import('../../src/views/YouTubeKidsViewerSimple.vue'), '/youtube-kids-viewer?profile=2'],
  ['YouTubeVideoManager', () => import('../../src/views/YouTubeVideoManager.vue'), '/youtube-video-manager'],
  ['SecurityDashboard', () => import('../../src/views/SecurityDashboard.vue'), '/security-dashboard'],
  ['AISettings', () => import('../../src/views/AISettings.vue'), '/ai-settings'],
  ['ParentActivityManagement', () => import('../../src/views/ParentActivityManagement.vue'), '/parent-activity-management'],
  ['ParentProgressTracking', () => import('../../src/views/ParentProgressTracking.vue'), '/parent-progress-tracking'],
  ['BadgeAdminManager', () => import('../../src/views/BadgeAdminManager.vue'), '/badge-admin-manager'],
  ['BadgeManager', () => import('../../src/views/BadgeManager.vue'), '/badge-manager?profile=2', { profileId: '2' }],
  ['LessonDetails', () => import('../../src/views/LessonDetails.vue'), '/lesson-details/5?childId=2'],
  ['ProgressTracking', () => import('../../src/views/ProgressTracking.vue'), '/progress-tracking?childId=2'],
  ['CoursePageManager', () => import('../../src/views/CoursePageManager.vue'), '/course-page-manager'],
  ['NotFound', () => import('../../src/views/NotFound.vue'), '/nulle-part']
]

describe('rendu des écrans retravaillés', () => {
  beforeEach(() => {
    localStorage.clear()
    storeFamilySession()
    localStorage.setItem('auth_token', profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    vi.stubGlobal('fetch', vi.fn(async (url) => jsonResponse(200, { success: true, data: fakeApi(url) })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(SCREENS)('%s se rend sans avertissement Vue', async (_name, loader, path, props) => {
    const { warnings, text } = await mountScreen(loader, path, props)
    expect(warnings).toEqual([])
    expect(text.length).toBeGreaterThan(0)
  })

  const clickButton = async (el, label) => {
    const button = [...el.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(label))
    expect(button, `bouton « ${label} »`).toBeTruthy()
    button.click()
    await flush()
  }

  const quizPosts = () => fetch.mock.calls.filter(([url, options]) =>
    String(url).includes('/quiz-results') && options?.method === 'POST')

  it('QuizGenerator en session parent : bandeau « Aperçu parent », aucun résultat enregistré', async () => {
    const { text } = await mountScreen(
      () => import('../../src/views/QuizGenerator.vue'),
      '/quiz-generator?childId=2&lessonId=5',
      {},
      async (el) => {
        await clickButton(el, 'Commencer')
        await clickButton(el, 'A')
        await clickButton(el, 'Terminer')
      }
    )
    expect(text).toContain('Aperçu parent')
    expect(text).toContain('Fractions')
    expect(quizPosts()).toHaveLength(0)
  })

  // Leçon telle que servie à un jeton enfant/famille : sans correctAnswer ni explanation
  const CHILD_LESSON = {
    id: 5,
    title: 'Fractions',
    quiz_data: { title: 'Fractions', questions: [{ question: '1/2 + 1/2 ?', options: ['1', '2'] }] }
  }
  const childFetch = (postResponse) => async (url, options) => {
    if (String(url).includes('/quiz-results') && options?.method === 'POST') return postResponse()
    if (/\/api\/lessons\/5$/.test(new URL(url, 'http://localhost').pathname)) {
      return jsonResponse(200, { success: true, data: { lesson: CHILD_LESSON } })
    }
    return jsonResponse(200, { success: true, data: fakeApi(url) })
  }
  const answerAll = async (el) => {
    await clickButton(el, 'Commencer')
    await clickButton(el, 'A')
    await clickButton(el, 'Terminer')
  }

  it('QuizGenerator côté enfant : n\'envoie que les réponses, score et correction du serveur', async () => {
    // Pas de session parent : l'enfant passe le quiz
    localStorage.removeItem('auth_token')
    localStorage.removeItem('teachdigital_session')
    fetch.mockImplementation(childFetch(() => jsonResponse(201, {
      success: true,
      data: {
        score: 0,
        totalQuestions: 1,
        percentage: 0,
        result: { id: 1 },
        correction: [{ correctAnswer: 1, explanation: 'Une moitié plus une moitié font un entier.' }]
      }
    })))

    const { text } = await mountScreen(
      () => import('../../src/views/QuizGenerator.vue'),
      '/quiz-generator?childId=2&lessonId=5',
      {},
      answerAll
    )

    expect(text).not.toContain('Aperçu parent')
    const posts = quizPosts()
    expect(posts).toHaveLength(1)
    expect(JSON.parse(posts[0][1].body)).toEqual({ profileId: 2, answers: [0] })
    // Le serveur fait foi : score et correction
    expect(text).toContain('0 bonnes réponses sur 1')
    expect(text).toContain('Résultat enregistré')
    expect(text).toContain('Incorrect')
    expect(text).toContain('(bonne réponse)')
    expect(text).toContain('Une moitié plus une moitié font un entier.')
  })

  it('QuizGenerator côté enfant : enregistrement en échec → score indisponible, pas de correction', async () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('teachdigital_session')
    fetch.mockImplementation(childFetch(() => jsonResponse(500, { success: false, message: 'Panne', requestId: 'req-9' })))

    const { text } = await mountScreen(
      () => import('../../src/views/QuizGenerator.vue'),
      '/quiz-generator?childId=2&lessonId=5',
      {},
      answerAll
    )

    expect(text).toContain('Score indisponible')
    expect(text).toContain('Réessayer l\'enregistrement')
    expect(text).toContain('La correction s\'affichera une fois le résultat enregistré.')
    expect(text).not.toContain('bonnes réponses sur')
    expect(text).not.toContain('(bonne réponse)')
  })
})
