import { test, expect } from '@playwright/test'

test.describe('Ancient Trees map app', () => {
  test('loads map and sidebar stats', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ancient Trees')).toBeVisible()
    await expect(page.getByText('Awaiting coords')).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })
  })

  test('search reduces results', async ({ page }) => {
    await page.goto('/')
    const search = page.getByPlaceholder('Site, species, or taxon')
    await search.fill('zzzz-no-match-xyz')
    await expect(page.getByText('No trees match your filters')).toBeVisible()
  })

  test('shareable URL applies county filter', async ({ page }) => {
    await page.goto('/?county=Mayo')
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })
    const resultsLabel = page.locator('span').filter({ hasText: /^Results$/ })
    await expect(resultsLabel).toBeVisible()
  })

  test('shareable tree URL opens detail panel', async ({ page }) => {
    await page.goto('/?tree=1')
    await expect(page.getByText('Copy link to this tree')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Ashford Castle', { exact: false })).toBeVisible()
  })
})
