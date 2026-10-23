import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, CHILD, CHILD_LESSON } from './support/api.js'

// Réponse du serveur au POST /api/lessons/:id/quiz-results (201) : score recalculé + correction
const SERVER_RESULT = {
  result: { id: 91 },
  score: 1,
  totalQuestions: 2,
  percentage: 50,
  correction: [
    { correctAnswer: 0, explanation: 'Deux moitiés font un entier.' },
    { correctAnswer: 1, explanation: 'Une moitié est plus grande qu\'un quart, un tiers ou un huitième.' }
  ],
  unlockedBadges: []
}

test.describe('Quiz d\'une leçon (enfant)', () => {
  test('les réponses sont envoyées, le score et la correction viennent du serveur', async ({ page }) => {
    await seedFamilySession(page)
    const { calls } = await mockApi(page, [
      ['POST', /^\/api\/lessons\/5\/quiz-results$/, () => ok(SERVER_RESULT, 201)]
    ])

    await page.goto(`/user-dashboard?profile=${CHILD.id}`)
    await page.getByRole('button', { name: /Les fractions/ }).click()

    await expect(page).toHaveURL(new RegExp(`/quiz-generator\\?childId=${CHILD.id}&lessonId=5`))
    await page.getByRole('button', { name: 'Commencer le quiz' }).click()

    // Question 1 : « Un entier » ; question 2 : « Un quart » (aucune correction connue du client)
    await expect(page.getByRole('heading', { name: 'Question 1 sur 2' })).toBeVisible()
    await page.getByRole('button', { name: 'Un entier' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()

    await expect(page.getByRole('heading', { name: 'Question 2 sur 2' })).toBeVisible()
    await page.getByRole('button', { name: 'Un quart' }).click()
    await page.getByRole('button', { name: 'Terminer' }).click()

    // Seules les réponses partent au serveur
    await expect(page.getByRole('status').filter({ hasText: 'Résultat enregistré' })).toBeVisible()
    const post = calls.find(call => call.method === 'POST' && call.path === '/api/lessons/5/quiz-results')
    expect(post.body).toEqual({ profileId: CHILD.id, answers: [0, 0] })

    // Score du serveur
    await expect(page.getByText('Vous avez obtenu 1 bonnes réponses sur 2')).toBeVisible()
    await expect(page.getByText('50%', { exact: true })).toBeVisible()

    // Correction du serveur : une bonne, une mauvaise réponse, explications
    await expect(page.getByRole('heading', { name: 'Correction' })).toBeVisible()
    await expect(page.getByText('Correct', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Incorrect', { exact: true })).toHaveCount(1)
    await expect(page.getByText(SERVER_RESULT.correction[1].explanation)).toBeVisible()
  })

  test('enregistrement impossible : score indisponible, la correction arrive après le nouvel essai', async ({ page }) => {
    await seedFamilySession(page)
    let attempts = 0
    await mockApi(page, [
      ['POST', /^\/api\/lessons\/5\/quiz-results$/, () => {
        attempts++
        return attempts === 1
          ? { status: 503, json: { success: false, code: 'SERVICE_UNAVAILABLE', message: 'Service momentanément indisponible.', requestId: 'req-e2e' } }
          : ok(SERVER_RESULT, 201)
      }]
    ])

    await page.goto(`/quiz-generator?childId=${CHILD.id}&lessonId=${CHILD_LESSON.id}`)
    await page.getByRole('button', { name: 'Commencer le quiz' }).click()
    await page.getByRole('button', { name: 'Un entier' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Un quart' }).click()
    await page.getByRole('button', { name: 'Terminer' }).click()

    await expect(page.getByRole('alert')).toContainText('Service momentanément indisponible.')
    await expect(page.getByText(/Score indisponible/)).toBeVisible()
    await expect(page.getByText('La correction s\'affichera une fois le résultat enregistré.')).toBeVisible()

    await page.getByRole('button', { name: 'Réessayer l\'enregistrement' }).click()

    await expect(page.getByText('Vous avez obtenu 1 bonnes réponses sur 2')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Correction' })).toBeVisible()
    expect(attempts).toBe(2)
  })
})
