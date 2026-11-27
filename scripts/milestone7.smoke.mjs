import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(
  process.env.FLOWSYNC_PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.FLOWSYNC_PLAYWRIGHT_MODULE).href
    : 'playwright'
)
const b = await chromium.launch({
  channel: process.env.FLOWSYNC_BROWSER ?? 'chrome',
  headless: true,
})
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
const p = await c.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
const stored = (key) => p.evaluate((key) => JSON.parse(localStorage.getItem(key))?.records, key)
const history = p.locator('.writing-history')
async function saved() {
  await p.waitForFunction(() =>
    [...document.querySelectorAll('[role=status]')].some(
      (el) => el.textContent === 'Saved on this device',
    ),
  )
}
try {
  await p.goto(`${origin}/#/check-in`)
  await p.getByLabel('Daily goal', { exact: true }).fill('  Focus on one thing  ')
  await p.getByRole('radio', { name: 'Good', exact: true }).check()
  await p.getByLabel('Reflection', { exact: true }).fill('A thoughtful day.')
  await p.getByLabel('Accomplishments', { exact: true }).fill('Finished the draft.')
  const day = await p.getByLabel('Check-in date', { exact: true }).inputValue()
  await p.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await saved()
  let checkins = await stored('flowsync.checkins')
  assert.equal(checkins.length, 1)
  assert.equal(checkins[0].dailyGoal, 'Focus on one thing')
  const id = checkins[0].id
  await p.getByLabel('Reflection', { exact: true }).fill('Updated reflection.')
  await p.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await saved()
  checkins = await stored('flowsync.checkins')
  assert.equal(checkins.length, 1)
  assert.equal(checkins[0].id, id)
  await p.getByLabel('Check-in date', { exact: true }).fill('2026-01-01')
  await p.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await saved()
  assert.equal((await stored('flowsync.checkins')).length, 2)
  await p.reload()
  await p.getByLabel('Reflection', { exact: true }).waitFor()
  await p.waitForFunction(
    () => document.getElementById('reflection')?.value === 'Updated reflection.',
  )
  // Shared draft survives in-app navigation before a manual check-in save.
  await p.getByLabel('Daily goal', { exact: true }).fill('Unsaved check-in draft')
  await p.getByRole('navigation').getByRole('link', { name: 'Daily Journal', exact: true }).click()
  await p.getByRole('button', { name: 'New entry', exact: true }).click()
  await p.getByLabel('Title', { exact: true }).fill('First page')
  await p
    .getByLabel('Your thoughts', { exact: true })
    .fill('A private reflection with searchable phrases.')
  await saved()
  let journal = await stored('flowsync.journal')
  assert.equal(journal.length, 1)
  assert.equal(journal[0].content, 'A private reflection with searchable phrases.')
  await p.getByLabel('Your thoughts', { exact: true }).fill('Autosave survives navigation.')
  await p.getByRole('navigation').getByRole('link', { name: 'Dashboard', exact: true }).click()
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('flowsync.journal')).records[0].content ===
      'Autosave survives navigation.',
  )
  await p.getByRole('navigation').getByRole('link', { name: 'Daily Check-In', exact: true }).click()
  assert.equal(
    await p.getByLabel('Daily goal', { exact: true }).inputValue(),
    'Unsaved check-in draft',
  )
  await p.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await saved()
  await p.getByRole('navigation').getByRole('link', { name: 'Daily Journal', exact: true }).click()
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Autosave survives navigation.',
  )
  await p.getByRole('button', { name: 'New entry', exact: true }).click()
  await p.getByLabel('Entry date', { exact: true }).fill('2020-02-29')
  await p.getByLabel('Title', { exact: true }).fill('Earlier page')
  await p.getByLabel('Your thoughts', { exact: true }).fill('Searchable memory')
  await saved()
  await p.getByLabel('Search entries', { exact: true }).fill('memory')
  assert.equal(await history.getByRole('button').count(), 1)
  await p.getByLabel('Search entries', { exact: true }).fill('First page')
  assert.equal(await history.getByRole('button').count(), 1)
  await p.getByLabel('Search entries', { exact: true }).fill('')
  await p.getByLabel('Sort entries', { exact: true }).selectOption('oldest')
  assert.match((await history.getByRole('button').allTextContents())[0], /Earlier page/)
  await p.reload()
  await history.getByRole('button').first().waitFor()
  assert.equal(await history.getByRole('button').count(), 2)
  await history.getByRole('button').filter({ hasText: 'Earlier page' }).click()
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Searchable memory',
  )
  await p.getByRole('button', { name: 'Delete journal entry', exact: true }).click()
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal((await stored('flowsync.journal')).length, 2)
  await p.getByRole('button', { name: 'Delete journal entry', exact: true }).click()
  await p.getByRole('button', { name: 'Delete entry', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal((await stored('flowsync.journal')).length, 1)
  // Stale editor preserves its draft instead of overwriting another tab.
  await history.getByRole('button').filter({ hasText: 'First page' }).click()
  const other = await c.newPage()
  await other.goto(`${origin}/#/journal`)
  await other
    .locator('.writing-history')
    .getByRole('button')
    .filter({ hasText: 'First page' })
    .click()
  await other.getByLabel('Title', { exact: true }).fill('Newer title')
  await other.getByRole('button', { name: 'Save now', exact: true }).click()
  await other.waitForFunction(() =>
    [...document.querySelectorAll('[role=status]')].some(
      (el) => el.textContent === 'Saved on this device',
    ),
  )
  await p.getByLabel('Your thoughts', { exact: true }).fill('My unsaved version')
  await p.getByRole('button', { name: 'Save now', exact: true }).click()
  await p.getByRole('alert').waitFor()
  assert.equal((await stored('flowsync.journal'))[0].title, 'Newer title')
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'My unsaved version',
  )
  p.once('dialog', (d) => d.accept())
  await p.getByRole('button', { name: 'Reload saved journal', exact: true }).click()
  await p.waitForFunction(() => document.getElementById('journal-title')?.value === 'Newer title')
  // Quota errors retain drafts and expose retry, then recover.
  await p.evaluate(() => {
    window.restoreStorage = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'flowsync.journal') throw new DOMException('Full', 'QuotaExceededError')
      return window.restoreStorage.call(this, key, value)
    }
  })
  await p.getByLabel('Your thoughts', { exact: true }).fill('Recover this writing')
  assert.equal(
    await p.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }),
    true,
  )
  await p.getByRole('button', { name: 'Save now', exact: true }).click()
  await p.getByRole('alert').waitFor()
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Recover this writing',
  )
  await p.evaluate(() => (Storage.prototype.setItem = window.restoreStorage))
  await p.getByRole('button', { name: 'Save now', exact: true }).click()
  await saved()
  assert.equal((await stored('flowsync.journal'))[0].content, 'Recover this writing')
  assert.equal((await stored('flowsync.checkins')).length, 2)
  await mkdir('artifacts', { recursive: true })
  await p.screenshot({ path: 'artifacts/milestone7-journal-dark.png', fullPage: true })
  await p.getByRole('button', { name: 'Switch to light theme', exact: true }).click()
  await p.screenshot({ path: 'artifacts/milestone7-journal-light.png', fullPage: true })
  for (const width of [820, 390, 320]) {
    await p.setViewportSize({ width, height: 1000 })
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  }
  await p.screenshot({ path: 'artifacts/milestone7-mobile.png', fullPage: true })
  await p.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await p.getByRole('navigation').getByRole('link', { name: 'Daily Check-In', exact: true }).click()
  await p.screenshot({ path: 'artifacts/milestone7-checkin.png', fullPage: true })
  assert.deepEqual(errors, [])
  // Malformed and duplicate-date records block writes without replacement.
  for (const key of ['flowsync.journal', 'flowsync.checkins']) {
    const isolated = await b.newContext()
    await isolated.addInitScript((key) => localStorage.setItem(key, '{broken'), key)
    const q = await isolated.newPage()
    await q.goto(`${origin}/#/${key.endsWith('journal') ? 'journal' : 'check-in'}`)
    await q.getByRole('alert').waitFor()
    assert.equal(await q.evaluate((key) => localStorage.getItem(key), key), '{broken')
    await isolated.close()
  }
  // Check-in drafts reject stale saves and warn before a browser unload.
  const conflict = await b.newContext()
  const a = await conflict.newPage()
  await a.goto(`${origin}/#/check-in`)
  await a.getByLabel('Daily goal', { exact: true }).fill('Original goal')
  await a.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await a.waitForFunction(() =>
    [...document.querySelectorAll('[role=status]')].some(
      (el) => el.textContent === 'Saved on this device',
    ),
  )
  const z = await conflict.newPage()
  await z.goto(`${origin}/#/check-in`)
  await z.waitForFunction(() => document.getElementById('daily-goal')?.value === 'Original goal')
  await a.getByLabel('Reflection', { exact: true }).fill('Keep this unsaved reflection')
  assert.equal(
    await a.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }),
    true,
  )
  await z.getByLabel('Daily goal', { exact: true }).fill('Newer goal')
  await z.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await z.waitForFunction(() =>
    [...document.querySelectorAll('[role=status]')].some(
      (el) => el.textContent === 'Saved on this device',
    ),
  )
  await a.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await a.getByRole('alert').waitFor()
  assert.equal(
    await a.getByLabel('Reflection', { exact: true }).inputValue(),
    'Keep this unsaved reflection',
  )
  assert.equal(
    await a.evaluate(
      () => JSON.parse(localStorage.getItem('flowsync.checkins')).records[0].dailyGoal,
    ),
    'Newer goal',
  )
  await conflict.close()
  // Invalid schemas, dates, duplicate IDs and duplicate check-in dates stay untouched.
  const sample = (await stored('flowsync.checkins'))[0]
  for (const payload of [
    { schemaVersion: 99, records: [] },
    { schemaVersion: 1, records: [sample, sample] },
    { schemaVersion: 1, records: [sample, { ...sample, id: 'duplicate-date' }] },
    { schemaVersion: 1, records: [{ ...sample, date: '2026-02-30' }] },
  ]) {
    const raw = JSON.stringify(payload)
    const context = await b.newContext()
    await context.addInitScript((raw) => localStorage.setItem('flowsync.checkins', raw), raw)
    const page = await context.newPage()
    await page.goto(`${origin}/#/check-in`)
    await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('flowsync.checkins')), raw)
    assert.equal(
      await page.getByRole('button', { name: 'Save check-in', exact: true }).isDisabled(),
      true,
    )
    await context.close()
  }
  console.log(
    'PASS: check-in create/edit/date uniqueness/optional fields/history/persistence; journal create/autosave/edit/search/sort/delete/navigation persistence; stale-editor and quota protection/recovery; independent stores; corrupted data preservation; themes and responsive layouts.',
  )
} finally {
  await b.close()
}
