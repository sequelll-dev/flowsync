import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(
  process.env.FLOWSYNC_PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.FLOWSYNC_PLAYWRIGHT_MODULE).href
    : 'playwright'
)
const browser = await chromium.launch({
  channel: process.env.FLOWSYNC_BROWSER ?? 'chrome',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: 'Asia/Manila',
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
const savedTasks = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('flowsync.tasks')).tasks)
async function saveForm() {
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function create(title, completed = false) {
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Title Required').fill(title)
  if (completed)
    await page.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('completed')
  await saveForm()
}
try {
  await page.goto(`${origin}/#/tasks`)
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.getByRole('button', { name: 'New task', exact: true }).waitFor()
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  assert.equal(
    await page.getByRole('dialog').getByLabel('Priority', { exact: true }).inputValue(),
    'medium',
  )
  assert.equal(
    await page.getByRole('dialog').getByLabel('Status', { exact: true }).inputValue(),
    'todo',
  )
  assert.equal(await page.getByLabel('Due date Optional').inputValue(), '')
  await page.getByLabel('Title Required').fill('    ')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  assert.equal(
    await page.getByRole('alert').filter({ hasText: 'Enter a task title.' }).isVisible(),
    true,
  )
  await page.getByLabel('Title Required').fill('  Plan the week  ')
  await page.getByLabel('Description', { exact: true }).fill('  Review the next steps.  ')
  await page.getByRole('dialog').getByLabel('Priority', { exact: true }).selectOption('high')
  await page.getByLabel('Due date Optional').fill('2026-11-25')
  await saveForm()
  let [task] = await savedTasks()
  assert.equal(task.title, 'Plan the week')
  assert.equal(task.description, 'Review the next steps.')
  assert.equal(task.dueDate, '2026-11-25')
  assert.equal(task.priority, 'high')
  assert.equal(task.status, 'todo')
  assert.equal(task.completedAt, undefined)
  const initialUpdated = task.updatedAt
  await page.getByRole('button', { name: 'Complete Plan the week', exact: true }).click()
  await page.getByRole('button', { name: 'Reopen Plan the week', exact: true }).waitFor()
  ;[task] = await savedTasks()
  assert.equal(task.status, 'completed')
  assert.ok(task.completedAt)
  assert.ok(task.updatedAt > initialUpdated)
  const completedAt = task.completedAt
  await page.getByRole('button', { name: 'Edit Plan the week', exact: true }).click()
  await page.getByLabel('Description', { exact: true }).fill('Completed and reviewed.')
  await saveForm()
  assert.equal((await savedTasks())[0].completedAt, completedAt)
  await page.getByRole('button', { name: 'Reopen Plan the week', exact: true }).click()
  await page.getByRole('button', { name: 'Complete Plan the week', exact: true }).waitFor()
  assert.equal((await savedTasks())[0].completedAt, undefined)
  await page.getByRole('button', { name: 'Edit Plan the week', exact: true }).click()
  await page.getByLabel('Title Required').fill('Review the week')
  await page.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('in_progress')
  await page.getByRole('dialog').getByLabel('Priority', { exact: true }).selectOption('low')
  await page.getByLabel('Due date Optional').fill('2026-11-26')
  await saveForm()
  ;[task] = await savedTasks()
  assert.equal(task.title, 'Review the week')
  assert.equal(task.status, 'in_progress')
  assert.equal(task.priority, 'low')
  assert.equal(task.dueDate, '2026-11-26')
  await page.reload()
  await page.getByRole('heading', { name: 'Review the week', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Edit Review the week', exact: true }).click()
  await page.getByLabel('Due date Optional').fill('')
  await saveForm()
  assert.equal((await savedTasks())[0].dueDate, undefined)
  await create('A finished task', true)
  assert.ok((await savedTasks())[1].completedAt)
  await page.goto(`${origin}/#/`)
  await page.getByRole('heading', { name: 'Review the week', exact: true }).waitFor()
  assert.match(
    await page.locator('.task-counts').innerText(),
    /0 to do.*1 in progress.*1 completed/,
  )
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/milestone3-dashboard.png', fullPage: true })
  await page.goto(`${origin}/#/tasks`)
  await page.getByRole('button', { name: 'Delete Review the week', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal((await savedTasks()).length, 2)
  await page.getByRole('button', { name: 'Delete Review the week', exact: true }).click()
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal((await savedTasks()).length, 1)
  await page.setViewportSize({ width: 320, height: 844 })
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.ok((await page.getByRole('dialog').boundingBox()).width <= 320)
  await page.screenshot({ path: 'artifacts/milestone3-mobile-dialog.png', fullPage: true })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(
    await page
      .getByRole('button', { name: 'New task', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  )
  // Block storage writes after initial data is saved; UI must preserve the draft and saved task.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
  })
  await page.getByRole('button', { name: 'Edit A finished task', exact: true }).click()
  await page.getByLabel('Title Required').fill('Unsaved draft')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await page.getByRole('dialog').getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Title Required').inputValue(), 'Unsaved draft')
  assert.equal((await savedTasks())[0].title, 'A finished task')
  assert.deepEqual(errors, [])
  const valid = (await savedTasks())[0]
  // Corrupt, incompatible, duplicate, and impossible-date data must never be overwritten.
  for (const raw of [
    '{broken',
    'null',
    JSON.stringify({ schemaVersion: 9, tasks: [] }),
    JSON.stringify({ schemaVersion: 1, tasks: [valid, valid] }),
    JSON.stringify({ schemaVersion: 1, tasks: [{ ...valid, dueDate: '2026-02-30' }] }),
  ]) {
    const isolated = await browser.newContext()
    await isolated.addInitScript((data) => localStorage.setItem('flowsync.tasks', data), raw)
    const broken = await isolated.newPage()
    await broken.goto(`${origin}/#/tasks`)
    await broken.getByRole('alert').waitFor()
    assert.equal(
      await broken.getByRole('button', { name: 'New task', exact: true }).isDisabled(),
      true,
    )
    assert.equal(await broken.evaluate(() => localStorage.getItem('flowsync.tasks')), raw)
    await isolated.close()
  }
  console.log(
    'PASS: task CRUD, trim/validation/defaults, status/priority/date edits, completion/reopen timestamps, refresh/navigation persistence, dashboard counts, deletion confirmation, mobile dialog/Escape focus, failed saves, corrupt/duplicate/invalid-date data preservation, no runtime errors.',
  )
} finally {
  await browser.close()
}
