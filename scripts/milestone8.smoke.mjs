import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
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
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } })
const p = await c.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
const stamp = '2026-11-20T00:00:00.000Z'
const backup = {
  schemaVersion: 1,
  exportedAt: stamp,
  tasks: [
    {
      id: 'task-8',
      title: 'Imported task',
      priority: 'high',
      status: 'todo',
      dueDate: '2020-01-01',
      createdAt: stamp,
      updatedAt: stamp,
    },
  ],
  journalEntries: [
    {
      id: 'journal-8',
      date: '2026-11-20',
      title: 'Imported journal',
      content: 'Writing to preserve',
      createdAt: stamp,
      updatedAt: stamp,
    },
  ],
  checkIns: [
    {
      id: 'check-8',
      date: '2026-11-20',
      mood: 'Good',
      dailyGoal: 'Imported goal',
      reflection: 'A good day',
      accomplishments: 'Saved a backup',
      createdAt: stamp,
      updatedAt: stamp,
    },
  ],
  preferences: { theme: 'light', taskView: 'list', taskSort: 'title' },
  notifications: [
    {
      id: JSON.stringify(['task-8', '2020-01-01', 'overdue']),
      taskId: 'task-8',
      dueDate: '2020-01-01',
      type: 'overdue',
      createdAt: stamp,
      readAt: stamp,
      dismissedAt: stamp,
    },
  ],
}
async function upload(value) {
  await p.getByLabel('Import backup file', { exact: true }).setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
  })
}
async function settings() {
  await p.goto(`${origin}/#/settings`)
  await p.getByRole('button', { name: 'Export JSON', exact: true }).waitFor()
}
async function confirmImport() {
  await p
    .getByRole('checkbox', {
      name: 'I understand this replaces all saved FlowSync data.',
      exact: true,
    })
    .check()
  await p.getByRole('button', { name: 'Replace data', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function exported() {
  const downloading = p.waitForEvent('download')
  await p.getByRole('button', { name: 'Export JSON', exact: true }).click()
  const download = await downloading
  return JSON.parse(await readFile(await download.path(), 'utf8'))
}
try {
  await settings()
  await p.evaluate(() => localStorage.setItem('unrelated.application', 'keep this'))
  // Legacy data stays unchanged until explicit import confirmation.
  await p.goto(`${origin}/#/tasks`)
  await p.getByRole('button', { name: 'New task', exact: true }).click()
  await p.getByLabel('Title Required').fill('Original task')
  await p.getByRole('button', { name: 'Save task', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  await settings()
  const original = await p.evaluate(() => localStorage.getItem('flowsync.tasks'))
  await upload(backup)
  await p.getByRole('dialog', { name: 'Replace all application data?', exact: true }).waitFor()
  assert.equal(
    await p.getByRole('button', { name: 'Replace data', exact: true }).isDisabled(),
    true,
  )
  assert.equal(await p.evaluate(() => localStorage.getItem('flowsync.tasks')), original)
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(await p.evaluate(() => localStorage.getItem('flowsync.tasks')), original)
  // Malformed/incompatible/type/date/ID/check-in duplicates are rejected before replacement.
  for (const invalid of [
    '{broken',
    { ...backup, schemaVersion: 2 },
    { ...backup, tasks: [{ ...backup.tasks[0], status: 'wrong' }] },
    { ...backup, tasks: [backup.tasks[0], backup.tasks[0]] },
    { ...backup, checkIns: [backup.checkIns[0], { ...backup.checkIns[0], id: 'other' }] },
    { ...backup, journalEntries: [{ ...backup.journalEntries[0], date: '2026-02-30' }] },
    { ...backup, preferences: { theme: 'light' } },
    { ...backup, preferences: { ...backup.preferences, theme: ['light'] } },
    { ...backup, preferences: { ...backup.preferences, taskView: ['list'] } },
    { ...backup, notifications: [{ ...backup.notifications[0], id: 'bad' }] },
  ]) {
    await upload(invalid)
    await p.getByRole('alert').waitFor()
    assert.equal(await p.getByRole('dialog').count(), 0)
    assert.equal(await p.evaluate(() => localStorage.getItem('flowsync.tasks')), original)
  }
  await upload(backup)
  await confirmImport()
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'light')
  assert.equal(await p.getByLabel('Default task view').inputValue(), 'list')
  assert.equal(await p.getByLabel('Default sorting').inputValue(), 'title')
  assert.equal(await p.evaluate(() => localStorage.getItem('flowsync.tasks')), null)
  assert.equal(await p.evaluate(() => localStorage.getItem('unrelated.application')), 'keep this')
  const roundtrip = await exported()
  for (const key of ['tasks', 'journalEntries', 'checkIns', 'preferences', 'notifications'])
    assert.deepEqual(roundtrip[key], backup[key], key)
  assert.equal(roundtrip.schemaVersion, 1)
  assert.ok(roundtrip.exportedAt)
  await p.goto(`${origin}/#/tasks`)
  await p.getByRole('heading', { name: 'Imported task', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Complete Imported task', exact: true }).click()
  await p.getByRole('button', { name: 'Reopen Imported task', exact: true }).waitFor()
  await p.reload()
  await p.getByRole('button', { name: 'Reopen Imported task', exact: true }).waitFor()
  await p.goto(`${origin}/#/journal`)
  await p
    .locator('.writing-history')
    .getByRole('button')
    .filter({ hasText: 'Imported journal' })
    .click()
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Writing to preserve',
  )
  await p.getByLabel('Your thoughts', { exact: true }).fill('Latest journal writing')
  await settings()
  const withDraft = await exported()
  assert.equal(withDraft.journalEntries[0].content, 'Latest journal writing')
  // Export explicitly saves a pending manual check-in as well as the journal.
  await p.goto(`${origin}/#/check-in`)
  await p.getByLabel('Daily goal', { exact: true }).fill('Saved for export')
  await settings()
  const withCheckIn = await exported()
  assert.ok(withCheckIn.checkIns.some((entry) => entry.dailyGoal === 'Saved for export'))
  // An unsaved check-in requires explicit discard before replacement.
  await p.goto(`${origin}/#/check-in`)
  await p.getByLabel('Daily goal', { exact: true }).fill('Unsaved current goal')
  await settings()
  await upload(backup)
  await p
    .getByRole('checkbox', {
      name: 'I understand this replaces all saved FlowSync data.',
      exact: true,
    })
    .check()
  assert.equal(
    await p.getByRole('button', { name: 'Replace data', exact: true }).isDisabled(),
    true,
  )
  await p
    .getByRole('checkbox', { name: 'Discard my unsaved writing drafts too.', exact: true })
    .check()
  await p.getByRole('button', { name: 'Replace data', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  // Failed atomic commit must preserve the entire previous workspace.
  const before = await p.evaluate(() => localStorage.getItem('flowsync.workspace'))
  await p.evaluate(() => {
    window.restoreStorage = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'flowsync.workspace') throw new DOMException('Storage full', 'QuotaExceededError')
      return window.restoreStorage.call(this, key, value)
    }
  })
  await upload({ ...backup, tasks: [] })
  await p
    .getByRole('checkbox', {
      name: 'I understand this replaces all saved FlowSync data.',
      exact: true,
    })
    .check()
  await p.getByRole('button', { name: 'Replace data', exact: true }).click()
  await p.getByRole('dialog').getByRole('alert').waitFor()
  assert.equal(await p.evaluate(() => localStorage.getItem('flowsync.workspace')), before)
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await p.evaluate(() => (Storage.prototype.setItem = window.restoreStorage))
  // A dirty editor in another tab cannot save over an imported version with identical timestamps.
  const other = await c.newPage()
  await other.goto(`${origin}/#/check-in`)
  await other.getByLabel('Daily goal', { exact: true }).fill('Keep this other-tab draft')
  await upload(backup)
  await confirmImport()
  await other.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await other.getByRole('alert').waitFor()
  assert.equal(
    await other.getByLabel('Daily goal', { exact: true }).inputValue(),
    'Keep this other-tab draft',
  )
  await other.close()
  const taskTab = await c.newPage()
  await taskTab.goto(`${origin}/#/tasks`)
  await taskTab.getByRole('button', { name: 'Edit Imported task', exact: true }).click()
  await taskTab.getByLabel('Title Required').fill('Stale task changes')
  await upload(backup)
  await confirmImport()
  await taskTab.getByRole('button', { name: 'Save task', exact: true }).click()
  await taskTab.getByRole('dialog').getByRole('alert').waitFor()
  assert.equal(await taskTab.getByLabel('Title Required').inputValue(), 'Stale task changes')
  await taskTab.close()
  await mkdir('artifacts', { recursive: true })
  await p.screenshot({ path: 'artifacts/milestone8-settings.png', fullPage: true })
  await upload(backup)
  await p.screenshot({ path: 'artifacts/milestone8-preview.png', fullPage: true })
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await p.getByRole('button', { name: 'Clear application data', exact: true }).click()
  assert.equal(
    await p.getByRole('button', { name: 'Clear all data', exact: true }).isDisabled(),
    true,
  )
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.ok(
    await p.evaluate(
      () => JSON.parse(localStorage.getItem('flowsync.workspace')).stores['flowsync.tasks'],
    ),
  )
  await p.getByRole('button', { name: 'Clear application data', exact: true }).click()
  await p.getByLabel('Type CLEAR to confirm').fill('CLEAR')
  await p.getByRole('button', { name: 'Clear all data', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'dark')
  const empty = await exported()
  assert.equal(
    empty.tasks.length +
      empty.journalEntries.length +
      empty.checkIns.length +
      empty.notifications.length,
    0,
  )
  assert.equal(await p.evaluate(() => localStorage.getItem('unrelated.application')), 'keep this')
  await p.goto(`${origin}/#/tasks`)
  await p.getByRole('button', { name: 'New task', exact: true }).click()
  await p.getByLabel('Title Required').fill('After reset')
  await p.getByRole('button', { name: 'Save task', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  await p.reload()
  await p.getByRole('heading', { name: 'After reset', exact: true }).waitFor()
  await settings()
  for (const width of [820, 390, 320]) {
    await p.setViewportSize({ width, height: 900 })
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  }
  await p.screenshot({ path: 'artifacts/milestone8-mobile.png', fullPage: true })
  // Corrupted canonical storage blocks export and remains recoverable through a validated import.
  const brokenContext = await b.newContext()
  const broken = await brokenContext.newPage()
  await broken.goto(`${origin}/#/settings`)
  await broken.evaluate(() => localStorage.setItem('flowsync.workspace', '{broken'))
  await broken.reload()
  await broken.getByRole('button', { name: 'Export JSON', exact: true }).click()
  await broken.locator('.data-management').getByRole('alert').waitFor()
  assert.equal(await broken.evaluate(() => localStorage.getItem('flowsync.workspace')), '{broken')
  await broken.getByLabel('Import backup file', { exact: true }).setInputFiles({
    name: 'recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await broken
    .getByRole('checkbox', {
      name: 'I understand this replaces all saved FlowSync data.',
      exact: true,
    })
    .check()
  await broken.getByRole('button', { name: 'Replace data', exact: true }).click()
  await broken.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(await broken.locator('html').getAttribute('data-theme'), 'light')
  await brokenContext.close()
  assert.deepEqual(errors, [])
  console.log(
    'PASS: full backup download/roundtrip, schema/type/date/ID validation, import preview/cancellation/confirmation, preferences, drafts, quota atomicity, cross-tab draft protection, confirmed clear, unrelated storage preservation, post-reset CRUD, and responsive layouts.',
  )
} finally {
  await b.close()
}
