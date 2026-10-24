import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, fail, CHILD } from './support/api.js'

// Accès évalué par le serveur (GET /api/games, début de partie, signaux de vie)
const openAccess = {
  unlocked: true,
  reason: null,
  message: null,
  condition: { type: 'none', label: 'Aucune condition', target: 0, current: 0, met: true },
  dailyLimitMinutes: 15,
  usedSecondsToday: 0,
  remainingSeconds: 900
}

const lockedAccess = {
  unlocked: false,
  reason: 'condition',
  message: 'Pour jouer : terminer 2 quiz aujourd\'hui.',
  condition: { type: 'quizzes_today', label: 'Terminer 2 quiz aujourd\'hui', target: 2, current: 1, met: false },
  dailyLimitMinutes: null,
  usedSecondsToday: 0,
  remainingSeconds: null
}

const GAMES = [
  {
    key: 'pacman',
    title: 'Pac-Man',
    description: 'Mange toutes les pastilles du labyrinthe sans te faire attraper par les fantômes.',
    rule: { isEnabled: true, conditionType: 'none', conditionValue: 0, dailyLimitMinutes: 15 },
    access: openAccess,
    bestScore: 1200
  },
  {
    key: 'tetris',
    title: 'Tetris',
    description: 'Empile les pièces qui tombent et complète des lignes pour les faire disparaître.',
    rule: { isEnabled: true, conditionType: 'quizzes_today', conditionValue: 2, dailyLimitMinutes: null },
    access: lockedAccess,
    bestScore: 0
  }
]

const SESSION = { id: 31, gameKey: 'pacman', durationSeconds: 0, score: 0, ended: false }

test.describe('Jeux (enfant)', () => {
  test('salle de jeux, puis partie de Pac-Man : le temps compte pendant la partie', async ({ page }) => {
    await seedFamilySession(page)
    const { calls } = await mockApi(page, [
      ['GET', '/api/games', () => ok({ profileId: CHILD.id, games: GAMES, conditionTypes: [] })],
      ['POST', '/api/games/pacman/sessions', () => ok({ session: SESSION, access: openAccess, bestScore: 1200 }, 201)],
      ['PUT', /^\/api\/games\/sessions\/31$/, () => ok({ session: SESSION, access: openAccess, stop: false })]
    ])

    await page.goto(`/user-dashboard?profile=${CHILD.id}`)
    await page.getByRole('button', { name: 'Voir mes jeux' }).click()

    await expect(page).toHaveURL(new RegExp(`/games\\?profile=${CHILD.id}`))
    await expect(page.getByText('Il te reste 15 min de jeu aujourd\'hui.')).toBeVisible()
    await expect(page.getByText('Pour jouer : terminer 2 quiz aujourd\'hui.')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Terminer 2 quiz aujourd\'hui' })).toHaveAttribute('aria-valuenow', '1')

    await page.getByRole('button', { name: 'Jouer à Pac-Man' }).click()
    await expect(page).toHaveURL(new RegExp(`/games/pacman\\?profile=${CHILD.id}`))
    const start = calls.find(call => call.method === 'POST' && call.path === '/api/games/pacman/sessions')
    expect(start.body).toEqual({ profileId: CHILD.id })
    await expect(page.getByRole('timer')).toContainText('15:00')

    // Avant « Jouer » : aucun temps compté
    expect(calls.filter(call => call.method === 'PUT')).toHaveLength(0)
    await page.getByRole('button', { name: 'Jouer', exact: true }).click()
    await expect.poll(() => calls.filter(call => call.method === 'PUT').length).toBeGreaterThan(0)
    expect(calls.find(call => call.method === 'PUT').body).toEqual({ score: 0, ended: false, idle: true })

    // Pac-Man avance seul vers la gauche et mange des pastilles
    await expect(page.locator('.pacman-stats dd').first()).not.toHaveText('0', { timeout: 10000 })
    await expect(page.getByRole('timer')).not.toContainText('15:00', { timeout: 5000 })

    // Pause : le temps passé jusque-là est envoyé
    const before = calls.filter(call => call.method === 'PUT').length
    await page.keyboard.press('KeyP')
    await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible()
    await expect.poll(() => calls.filter(call => call.method === 'PUT').length).toBeGreaterThan(before)
    expect(calls.filter(call => call.method === 'PUT').at(-1).body).toMatchObject({ ended: false, idle: false })
  })

  test('jeu verrouillé : la partie est refusée avec le motif', async ({ page }) => {
    await seedFamilySession(page)
    await mockApi(page, [
      ['POST', '/api/games/tetris/sessions', () => fail(409, {
        code: 'GAME_LOCKED',
        message: lockedAccess.message,
        access: lockedAccess
      })]
    ])

    await page.goto(`/games/tetris?profile=${CHILD.id}`)

    await expect(page.getByRole('heading', { name: 'Ce jeu est fermé pour l\'instant' })).toBeVisible()
    await expect(page.getByText(lockedAccess.message)).toBeVisible()
    await page.getByRole('button', { name: 'Retour à mes jeux' }).click()
    await expect(page).toHaveURL(new RegExp(`/games\\?profile=${CHILD.id}`))
  })
})
