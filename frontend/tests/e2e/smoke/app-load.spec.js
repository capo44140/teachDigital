import { test, expect } from '@playwright/test'

test.describe('Smoke - stabilité', () => {
  test('charge l’application sans crash', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/TeachDigital/i)
    await expect(page.locator('#app')).toBeVisible()
  })
})


