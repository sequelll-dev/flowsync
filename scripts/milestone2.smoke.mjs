import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Use an installed Playwright package or an explicit shared runtime module path.
const modulePath = process.env.FLOWSYNC_PLAYWRIGHT_MODULE
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
await mkdir('artifacts', { recursive: true })
const theme = () => page.locator('html').getAttribute('data-theme')
async function noOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow')
}
try {
  await page.goto(origin)
  await page.getByRole('heading', { level: 1 }).waitFor()
  assert.equal(await theme(), 'dark', 'New installs default to dark')
  assert.match(await page.title(), /Dashboard · FlowSync/)
  await noOverflow()
  await page.screenshot({ path: 'artifacts/dashboard-dark.png', fullPage: true })

  for (const [name, heading] of [['My Tasks', 'My Tasks'], ['Daily Check-In', 'Daily Check-In'], ['Daily Journal', 'Daily Journal'], ['Settings', 'Settings'], ['Dashboard', null]]) {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click()
    await page.locator('nav a[aria-current=page]').filter({ hasText: name }).waitFor()
    assert.equal(await page.getByRole('link', { name, exact: true }).getAttribute('aria-current'), 'page')
    if (heading) assert.equal(await page.getByRole('heading', { name: heading, exact: true }).isVisible(), true)
    await page.waitForFunction(label => document.title === `${label} · FlowSync`, name)
  }
  await page.goBack()
  await page.waitForFunction(() => document.title === 'Settings · FlowSync')
  assert.equal(await page.getByRole('heading', { name: 'Settings', exact: true }).isVisible(), true)
  await page.getByRole('radio', { name: 'Light', exact: true }).check()
  assert.equal(await theme(), 'light')
  await page.reload()
  assert.equal(await theme(), 'light', 'Theme persists on refresh')
  assert.equal(await page.getByRole('radio', { name: 'Light', exact: true }).isChecked(), true)
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  assert.equal(await page.getByRole('radio', { name: 'Dark', exact: true }).isChecked(), true)
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard', exact: true }).click()
  await page.waitForFunction(() => document.title === 'Dashboard · FlowSync')
  await page.screenshot({ path: 'artifacts/dashboard-light.png', fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.setViewportSize({ width: 820, height: 1180 })
  await noOverflow()
  assert.equal(await page.getByRole('navigation').isVisible(), true)
  await page.screenshot({ path: 'artifacts/tablet.png', fullPage: true })

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await noOverflow()
    assert.equal(await page.getByRole('navigation').isVisible(), false)
    const menu = page.getByRole('button', { name: 'Open navigation' })
    await menu.click()
    assert.equal(await page.getByRole('navigation').isVisible(), true)
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('navigation').isVisible(), false)
    assert.equal(await menu.evaluate(element => element === document.activeElement), true)
    await menu.click()
    await page.getByRole('navigation').getByRole('link', { name: 'Settings', exact: true }).click()
    assert.equal(await page.getByRole('navigation').isVisible(), false)
    await page.waitForFunction(() => document.title === 'Settings · FlowSync')
    await noOverflow()
    await menu.click()
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard', exact: true }).click()
    await page.waitForFunction(() => document.title === 'Dashboard · FlowSync')
  }
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true })
  await page.goto(`${origin}/#/missing`)
  assert.equal(await page.getByRole('heading', { name: 'Page not found' }).isVisible(), true)
  await page.getByRole('link', { name: 'Return to dashboard' }).click()
  await page.reload()
  await page.keyboard.press('Tab')
  assert.equal(await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), true)
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('main').evaluate(element => element === document.activeElement), true)

  // Test invalid JSON and unsupported versions without altering real user storage.
  for (const saved of ['{broken', JSON.stringify({ schemaVersion: 99, preferences: { theme: 'light' } })]) {
    const invalid = await browser.newContext()
    await invalid.addInitScript(value => localStorage.setItem('flowsync.preferences', value), saved)
    const invalidPage = await invalid.newPage()
    await invalidPage.goto(origin)
    assert.equal(await invalidPage.getByRole('alert').isVisible(), true)
    assert.equal(await invalidPage.locator('html').getAttribute('data-theme'), 'dark')
    await invalidPage.getByRole('button', { name: 'Switch to light theme' }).click()
    assert.equal(await invalidPage.getByRole('alert').count(), 0)
    await invalid.close()
  }
  const blocked = await browser.newContext()
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError') }
  })
  const blockedPage = await blocked.newPage()
  await blockedPage.goto(origin)
  await blockedPage.getByRole('button', { name: 'Switch to light theme' }).click()
  assert.equal(await blockedPage.locator('html').getAttribute('data-theme'), 'light')
  assert.equal(await blockedPage.getByRole('alert').isVisible(), true)
  await blocked.close()
  assert.deepEqual(errors, [], 'No browser errors')
  console.log('PASS: navigation, history, deep links, theme controls and persistence, invalid storage, write failure, keyboard navigation, responsive layouts (1440/820/390/320), and browser errors.')
} finally {
  await browser.close()
}
