import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(
  process.env.FLOWSYNC_PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.FLOWSYNC_PLAYWRIGHT_MODULE).href
    : 'playwright'
)
const browser = await chromium.launch({
  channel: process.env.FLOWSYNC_BROWSER ?? 'chrome',
  headless: true,
})
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
let failures = 0
async function test(name, run) {
  const c = await browser.newContext({
    timezoneId: 'Asia/Manila',
    viewport: { width: 1440, height: 1000 },
  })
  try {
    await run(c)
    console.log('PASS:', name)
  } catch (error) {
    failures++
    console.log('FAIL:', name, error.message)
  } finally {
    await c.close()
  }
}
try {
  await test('Invalid prototype-property routes show recovery instead of crashing', async (c) => {
    const p = await c.newPage()
    await p.goto(`${origin}/#__proto__`)
    await p.getByRole('heading', { name: 'Page not found', exact: true }).waitFor({ timeout: 3000 })
  })
  await test('Dashboard date follows the quote through local midnight', async (c) => {
    const p = await c.newPage()
    await p.clock.install({ time: new Date('2026-11-23T23:59:00+08:00') })
    await p.goto(origin)
    await p.getByRole('figure', { name: 'Daily motivational quote' }).waitFor()
    const date = await p.locator('.page-detail').innerText()
    const quote = await p.locator('.daily-quote blockquote').innerText()
    await p.clock.fastForward(61000)
    assert.notEqual(await p.locator('.daily-quote blockquote').innerText(), quote)
    assert.notEqual(
      await p.locator('.page-detail').innerText(),
      date,
      'Dashboard date must also advance',
    )
  })
  await test('A stale edit cannot overwrite a task saved in another tab', async (c) => {
    const a = await c.newPage()
    await a.goto(`${origin}/#/tasks`)
    await a.getByRole('button', { name: 'New task', exact: true }).click()
    await a.getByLabel('Title Required').fill('Shared task')
    await a.getByRole('button', { name: 'Save task', exact: true }).click()
    await a.getByRole('dialog').waitFor({ state: 'hidden' })
    const b = await c.newPage()
    await b.goto(`${origin}/#/tasks`)
    await a.getByRole('button', { name: 'Edit Shared task', exact: true }).click()
    await a.getByLabel('Description', { exact: true }).fill('Draft from first tab')
    await b.getByRole('button', { name: 'Edit Shared task', exact: true }).click()
    await b.getByLabel('Title Required').fill('Newer title')
    await b.getByRole('button', { name: 'Save task', exact: true }).click()
    await b.getByRole('dialog').waitFor({ state: 'hidden' })
    await a.getByRole('button', { name: 'Save task', exact: true }).click()
    const saved = await a.evaluate(
      () => JSON.parse(localStorage.getItem('flowsync.tasks')).tasks[0],
    )
    assert.equal(saved.title, 'Newer title')
    await a.getByRole('dialog').getByRole('alert').waitFor({ timeout: 3000 })
    assert.equal(
      await a.getByLabel('Description', { exact: true }).inputValue(),
      'Draft from first tab',
    )
    await a.getByRole('button', { name: 'Cancel', exact: true }).click()
    await a.getByRole('heading', { name: 'Newer title', exact: true }).waitFor({ timeout: 3000 })
  })
  await test('Changing theme in another tab preserves a newly selected task view', async (c) => {
    const a = await c.newPage()
    const b = await c.newPage()
    await a.goto(`${origin}/#/tasks`)
    await b.goto(`${origin}/#/settings`)
    await a.getByRole('button', { name: 'List', exact: true }).click()
    await b.getByRole('radio', { name: 'Light', exact: true }).check()
    assert.equal(
      await b.evaluate(
        () => JSON.parse(localStorage.getItem('flowsync.preferences')).preferences.taskView,
      ),
      'list',
    )
    await a.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, {
      timeout: 3000,
    })
  })
  await test('Mobile header search closes navigation and focuses the input', async (c) => {
    const p = await c.newPage()
    await p.setViewportSize({ width: 390, height: 844 })
    await p.goto(origin)
    await p.getByRole('button', { name: 'Open navigation', exact: true }).click()
    await p.getByRole('link', { name: 'Search tasks', exact: true }).click()
    await p.getByRole('searchbox', { name: 'Search tasks', exact: true }).waitFor()
    assert.equal(await p.getByRole('navigation', { name: 'Main navigation' }).isVisible(), false)
    await p.waitForFunction(() => document.activeElement?.id === 'task-search', null, {
      timeout: 3000,
    })
  })
  await test('Stale deletion confirmations preserve a task edited in another tab', async (c) => {
    const a = await c.newPage()
    await a.goto(`${origin}/#/tasks`)
    await a.getByRole('button', { name: 'New task', exact: true }).click()
    await a.getByLabel('Title Required').fill('Delete conflict')
    await a.getByRole('button', { name: 'Save task', exact: true }).click()
    await a.getByRole('dialog').waitFor({ state: 'hidden' })
    const b = await c.newPage()
    await b.goto(`${origin}/#/tasks`)
    await a.getByRole('button', { name: 'Delete Delete conflict', exact: true }).click()
    await b.getByRole('button', { name: 'Edit Delete conflict', exact: true }).click()
    await b.getByLabel('Description', { exact: true }).fill('Newer content')
    await b.getByRole('button', { name: 'Save task', exact: true }).click()
    await b.getByRole('dialog').waitFor({ state: 'hidden' })
    await a.getByRole('button', { name: 'Delete task', exact: true }).click()
    await a.getByRole('dialog').getByRole('alert').waitFor({ timeout: 3000 })
    const saved = await a.evaluate(() => JSON.parse(localStorage.getItem('flowsync.tasks')).tasks)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].description, 'Newer content')
  })
  await test('Failed preference saves retain subsequent session changes', async (c) => {
    const p = await c.newPage()
    await p.goto(`${origin}/#/tasks`)
    await p.getByRole('button', { name: 'Kanban', exact: true }).waitFor()
    await p.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Full', 'QuotaExceededError')
      }
    })
    await p.getByRole('button', { name: 'List', exact: true }).click()
    await p.getByRole('button', { name: 'Switch to light theme', exact: true }).click()
    assert.equal(
      await p.getByRole('button', { name: 'List', exact: true }).getAttribute('aria-pressed'),
      'true',
    )
    assert.equal(await p.locator('html').getAttribute('data-theme'), 'light')
    await p.getByRole('alert').waitFor()
  })
} finally {
  await browser.close()
}
if (failures) process.exitCode = 1
