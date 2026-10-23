/**
 * API simulée pour les tests E2E : aucune base ni backend nécessaires.
 * Toutes les requêtes /api/** du navigateur (page et iframes) sont interceptées par
 * page.route ; les réponses suivent les contrats lus par src/services/*.js
 * ({ success, data, message?, code?, requestId? }).
 */

// ─── Jetons (JWT non signés : le client ne lit que la charge utile) ─────────────
function base64Url (value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function fakeJwt (payload, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000)
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ iat: now, exp: now + ttlSeconds, ...payload })}.signature-e2e`
}

export const familyToken = () => fakeJwt({ scope: 'family' }, 24 * 3600)
export const parentToken = () => fakeJwt({ scope: 'profile', profileId: 1, isAdmin: true, name: 'Parent' }, 3600)

// ─── Données ─────────────────────────────────────────────────────────────────
export const PARENT = { id: 1, name: 'Parent', type: 'admin', is_admin: true, is_child: false, is_teen: false, is_active: true }
export const CHILD = { id: 2, name: 'Lucas', type: 'child', is_admin: false, is_child: true, is_teen: false, is_active: true, level: 'CE2' }
export const PROFILES = [PARENT, CHILD]

export const LESSON_SUMMARY = {
  id: 5,
  title: 'Les fractions',
  description: 'Additionner et comparer des fractions',
  subject: 'Mathématiques',
  level: 'CE2',
  created_at: '2026-10-01T08:00:00.000Z'
}

// Leçon telle que servie à un jeton enfant / famille : sans correctAnswer ni explanation
export const CHILD_LESSON = {
  ...LESSON_SUMMARY,
  quiz_data: {
    title: 'Les fractions',
    description: 'Deux questions sur les fractions',
    questions: [
      { question: 'Combien font 1/2 + 1/2 ?', options: ['Un entier', 'Deux entiers', 'Un quart', 'Zéro'] },
      { question: 'Quelle fraction est la plus grande ?', options: ['Un quart', 'Une moitié', 'Un huitième', 'Un tiers'] }
    ]
  }
}

export const COURSE_PAGE = {
  id: 7,
  title: 'Le cycle de l\'eau',
  description: 'Évaporation, condensation, précipitations',
  subject: 'SVT',
  is_published: true
}

// ─── Réponses ────────────────────────────────────────────────────────────────
export const ok = (data, status = 200) => ({ status, json: { success: true, data } })
export const fail = (status, body) => ({ status, json: { success: false, requestId: 'req-e2e', ...body } })

/**
 * Réponses par défaut, indexées par « MÉTHODE /chemin » (chaîne exacte ou RegExp sur le chemin).
 * Chaque test peut en remplacer certaines (overrides), qui sont prioritaires.
 */
const DEFAULT_ROUTES = [
  ['GET', '/api/profiles', () => ok({ profiles: PROFILES })],
  ['GET', /^\/api\/profiles\/(\d+)$/, (match) => ok({ profile: PROFILES.find(p => String(p.id) === match[1]) || null })],
  ['GET', '/api/lessons', () => ok({ lessons: [LESSON_SUMMARY] })],
  ['GET', /^\/api\/lessons\/5$/, () => ok({ lesson: CHILD_LESSON })],
  ['GET', '/api/course-pages', () => ok({ coursePages: [COURSE_PAGE] })],
  ['GET', /^\/api\/badges\/profile\/\d+(\/recent|\/unlocked)?$/, () => ok([])],
  ['GET', /^\/api\/badges\/profile\/\d+\/stats$/, () => ok({ total: 0, unlocked: 0, locked: 0, points: 0, percentage: 0 })],
  ['GET', '/api/badges', () => ok([])],
  ['GET', '/api/activities', () => ok({ activities: [] })],
  ['GET', '/api/youtube-videos', () => ok({ videos: [] })]
]

function findRoute (routes, method, pathname) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue
    if (typeof pattern === 'string' && pattern === pathname) return { handler, match: [pathname] }
    if (pattern instanceof RegExp) {
      const match = pathname.match(pattern)
      if (match) return { handler, match }
    }
  }
  return null
}

/**
 * Intercepter toutes les requêtes /api/** de la page.
 * @param {import('@playwright/test').Page} page
 * @param {Array<[string, string|RegExp, Function]>} overrides - prioritaires sur les réponses par défaut ;
 *   un handler reçoit (match, request) et renvoie { status, json } ou { status, body, contentType }
 * @returns {{ calls: Array<{ method: string, path: string, body: any }> }} journal des appels
 */
export async function mockApi (page, overrides = []) {
  const calls = []
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    let body = null
    try {
      body = request.postDataJSON()
    } catch {
      body = request.postData()
    }
    calls.push({ method, path: url.pathname, search: url.search, body, headers: request.headers() })

    const found = findRoute(overrides, method, url.pathname) || findRoute(DEFAULT_ROUTES, method, url.pathname)
    // Toute autre requête (journal d'erreurs client, statistiques…) : succès sans données
    const response = found ? await found.handler(found.match, request) : ok({})
    if (response.json !== undefined) {
      await route.fulfill({ status: response.status, json: response.json, headers: { 'x-request-id': 'req-e2e' } })
    } else {
      await route.fulfill({ status: response.status, body: response.body, contentType: response.contentType })
    }
  })
  // Pas de proposition de mise à jour pendant les tests (version du serveur inconnue)
  await page.route('**/version.json*', route => route.fulfill({ status: 404, body: '' }))
  return { calls }
}

/**
 * Session famille déjà ouverte (code familial saisi) et présentation enfant déjà vue,
 * réinjectées à chaque chargement de page.
 * @param {import('@playwright/test').Page} page
 */
export async function seedFamilySession (page, { onboardingDone = true } = {}) {
  const session = { token: familyToken(), expiresAt: Date.now() + 24 * 3600 * 1000, createdAt: Date.now() }
  await page.addInitScript(({ session, onboardingDone, childId }) => {
    try {
      // Iframes isolées (origine opaque) : pas de localStorage, on ignore
      window.localStorage.setItem('teachdigital_family_session', JSON.stringify(session))
      if (onboardingDone) {
        window.localStorage.setItem(`td_onboarding_v1_${childId}`, JSON.stringify({ completedAt: new Date().toISOString() }))
      }
    } catch {}
  }, { session, onboardingDone, childId: CHILD.id })
}
