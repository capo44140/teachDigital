import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, CHILD, COURSE_PAGE } from './support/api.js'

const RENDER_URL = '/api/course-pages/render?t=x'

test.describe('Page de cours (enfant)', () => {
  test('la page est chargée par URL signée dans une iframe isolée', async ({ page }) => {
    await seedFamilySession(page)
    const { calls } = await mockApi(page, [
      ['GET', /^\/api\/course-pages\/7$/, () => ok({ coursePage: COURSE_PAGE })],
      ['POST', /^\/api\/course-pages\/7\/view$/, () => ok({ url: RENDER_URL })],
      ['GET', '/api/course-pages/render', () => ({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html lang="fr"><head><title>Cycle</title></head><body><h1>Le cycle de l\'eau</h1><p>Évaporation…</p></body></html>'
      })]
    ])

    // Depuis le tableau de bord de l'enfant
    await page.goto(`/user-dashboard?profile=${CHILD.id}`)
    await page.getByRole('button', { name: /Le cycle de l'eau/ }).click()

    await expect(page).toHaveURL(new RegExp(`/course-page/${COURSE_PAGE.id}\\?profile=${CHILD.id}`))
    await expect(page.getByRole('heading', { level: 1, name: COURSE_PAGE.title })).toBeVisible()

    const frame = page.locator(`iframe[title="${COURSE_PAGE.title}"]`)
    await expect(frame).toHaveAttribute('src', RENDER_URL)
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-modals')

    // Le contenu servi par l'URL signée est affiché dans l'iframe
    await expect(page.frameLocator(`iframe[title="${COURSE_PAGE.title}"]`).getByRole('heading', { name: 'Le cycle de l\'eau' })).toBeVisible()

    // L'URL d'affichage est demandée par POST (jamais le HTML via l'application)
    expect(calls.some(call => call.method === 'POST' && call.path === '/api/course-pages/7/view')).toBe(true)
    expect(calls.some(call => call.method === 'GET' && call.path === '/api/course-pages/render' && call.search === '?t=x')).toBe(true)
  })
})
