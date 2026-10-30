import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'

test('hall, station, menu, item and browser navigation', async ({ page, browserName }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'View Patton hall' }).click()
  await page.getByRole('link', { name: 'View Grill menu' }).click()
  await page.getByRole('link', { name: 'Grilled chicken bowl' }).click()
  await expect(page.getByRole('heading', { name: 'Grilled chicken bowl' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Grill · Lunch menu' })).toBeVisible()
  await page.getByLabel('Meal period').selectOption('Breakfast')
  await expect(page.getByRole('heading', { name: 'No menu for this selection' })).toBeVisible()
  await page.getByRole('button', { name: 'Show sample lunch' }).click()
  // Wait for the reset to finish before changing the date again.
  await expect(page.getByLabel('Menu date')).toHaveValue('2026-10-08')
  await expect(page.getByLabel('Meal period')).toHaveValue('Lunch')
  if (browserName === 'webkit') {
    // Playwright's Windows WebKit has no native date input (it renders a textbox) and intermittently
    // drops filled values, so open the dated menu URL directly. Real Safari has a date picker.
    await page.goto('/#/stations/grill?meal=Lunch&date=2026-10-09')
  } else {
    await page.getByLabel('Menu date').fill('2026-10-09')
  }
  await expect(page.getByRole('heading', { name: 'No menu for this selection' })).toBeVisible()
})

test('combined filters, empty results, clear and URL restoration', async ({ page }) => {
  await page.goto('/#/search')
  await page.getByLabel('Search term').fill('bowl')
  await page.getByLabel('Dining hall').selectOption('patton')
  await page.getByLabel('Station', { exact: true }).selectOption('plant')
  await page.getByLabel('Meal period').selectOption('Lunch')
  await page.getByLabel('Minimum rating').selectOption('4')
  await page.getByLabel('Dietary preference').selectOption('Vegan')
  await page.getByLabel('Milk', { exact: true }).check()
  await page.getByLabel('Soy', { exact: true }).check()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('status')).toHaveText('1 item matches the applied filters.')
  await page.getByRole('link', { name: 'Vegetable rice bowl' }).click()
  await page.goBack()
  await expect(page.getByLabel('Station', { exact: true })).toHaveValue('plant')
  await page.getByLabel('Search term').fill('unmatched-food')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('heading', { name: 'No matching items' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await expect(page.getByRole('status')).toHaveText('8 items match the applied filters.')
})

test('required rating and failed review retain the complete draft through refresh', async ({ page }) => {
  await page.goto('/?scenario=submit-failure#/items/chicken-bowl/review')
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alert')).toContainText('Choose a rating')
  await page.getByRole('radio', { name: '4 out of 5' }).check()
  await page.getByLabel('Your review (optional)').fill('Fresh and filling. Keep this draft.')
  await page.getByLabel('Would recommend').check()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alert')).toContainText('draft is kept')
  await expect(page.getByLabel('Your review (optional)')).toHaveValue('Fresh and filling. Keep this draft.')
  await page.reload()
  await expect(page.getByRole('radio', { name: '4 out of 5' })).toBeChecked()
  await expect(page.getByLabel('Would recommend')).toBeChecked()
  // Reload resets the fail-once service, but keeps the tab's draft.
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alert')).toContainText('draft is kept')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Demo review posted' })).toBeVisible()
  await page.getByRole('link', { name: 'View item and reviews' }).click()
  await expect(page.getByText('Fresh and filling. Keep this draft.')).toBeVisible()
  await expect(page.getByText('4.3 / 5 · 4 reviews')).toBeVisible()
})

test('recoverable menu and expired-session states', async ({ page }) => {
  await page.goto('/?scenario=read-failure#/')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a dining hall' })).toBeVisible()
  await page.goto('/?scenario=session-expired#/items/chicken-bowl/review')
  await page.getByRole('radio', { name: '5 out of 5' }).check()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alert')).toContainText('Session expired')
  await page.getByRole('button', { name: 'Restore demo session' }).click()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('heading', { name: 'Demo review posted' })).toBeVisible()
})

test('keyboard navigation and review submission', async ({ page, browserName }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Choose a dining hall' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Search menu items')).toBeFocused()
  await page.keyboard.type('chicken')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('1 item matches the applied filters.')
  // Safari/WebKit does not Tab to links by default (users enable it or press Option+Tab), and
  // Playwright's Windows WebKit build supports neither, so link traversal is checked elsewhere.
  if (browserName !== 'webkit') {
    // Traverse the filter controls to the result without pointer activation.
    for (let count = 0; count < 24; count++) {
      if (await page.getByRole('link', { name: 'Grilled chicken bowl' }).evaluate(el => el === document.activeElement))
        break
      await page.keyboard.press('Tab')
    }
    await expect(page.getByRole('link', { name: 'Grilled chicken bowl' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Grilled chicken bowl' })).toBeFocused()
  }
  // Access the form directly, then use native radio keyboard behavior.
  await page.goto('/#/items/chicken-bowl/review')
  await expect(page.getByRole('heading', { name: 'Write your review' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: '2 out of 5' })).toBeChecked()
  await page.keyboard.press('Tab')
  await page.keyboard.type('Keyboard review')
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Submit review' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Demo review posted' })).toBeVisible()
})

test('accessible screens and no horizontal overflow at desktop, 390px and 320px', async ({ page }) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/search', '/items/chicken-bowl', '/items/chicken-bowl/review']) {
      await page.goto(`/#${route}`)
      await expect(page.locator('h1')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(results.violations).toEqual([])
    }
  }
})

test('capture review evidence', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', 'One reproducible screenshot set from desktop Chrome.')
  const folder = '../docs/sprint-2/evidence'
  await mkdir(folder, { recursive: true })
  await testInfo.attach('browser-version', { body: browser.version(), contentType: 'text/plain' })
  const captures = [
    ['03-halls-desktop', '/', 1280],
    ['04-stations-desktop', '/#/halls/patton', 1280],
    ['05-menu-desktop', '/#/stations/grill', 1280],
    [
      '06-filters-desktop',
      '/#/search?text=bowl&hall=patton&station=plant&meal=Lunch&rating=4&diet=Vegan&exclude=Milk&exclude=Soy',
      1280,
    ],
    ['06-empty-desktop', '/#/search?text=no-such-item', 1280],
    ['07-item-desktop', '/#/items/chicken-bowl', 1280],
    ['21-item-mobile', '/#/items/chicken-bowl', 390],
    ['06-filters-mobile', '/#/search', 390],
  ] as const
  for (const [name, url, width] of captures) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(url)
    await expect(page.locator('h1')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?scenario=submit-failure#/items/chicken-bowl/review')
  await page.getByRole('radio', { name: '4 out of 5' }).check()
  await page.getByLabel('Your review (optional)').fill('Fresh and filling. The vegetables could be warmer.')
  await page.getByLabel('Would recommend').check()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alert')).toContainText('draft is kept')
  await page.screenshot({ path: `${folder}/08-review-failure-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Demo review posted' })).toBeVisible()
  await page.screenshot({ path: `${folder}/08-review-success-desktop.png`, fullPage: true })
})
