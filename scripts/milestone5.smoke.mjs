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
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
const records = [
  { title: 'Overdue draft', dueDate: '2026-11-22', status: 'todo' },
  { title: 'Today review', dueDate: '2026-11-23', status: 'todo' },
  { title: 'Tomorrow plan', dueDate: '2026-11-24', status: 'in_progress' },
  { title: 'Finished date', dueDate: '2026-11-25', status: 'completed' },
  { title: 'Undated note', status: 'todo' },
  { title: 'New year task', dueDate: '2027-01-01', status: 'todo' },
].map((task, i) => ({
  ...task,
  id: `calendar-test-${i}`,
  priority: 'medium',
  createdAt: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
  ...(task.status === 'completed' ? { completedAt: '2026-11-20T00:00:00.000Z' } : {}),
}))
const c = await browser.newContext({
  timezoneId: 'Asia/Manila',
  viewport: { width: 1440, height: 1000 },
})
const p = await c.newPage()
const errors = []
p.on('pageerror', (error) => errors.push(error.message))
async function save() {
  await p.getByRole('button', { name: 'Save task', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
}
const dateButton = (value) => p.locator(`#calendar-${value}`)
const selected = p.getByRole('region', { name: 'Selected date tasks', exact: true })
try {
  await p.clock.install({ time: new Date('2026-11-23T12:00:00+08:00') })
  await p.goto(origin)
  await p.evaluate(
    (tasks) => localStorage.setItem('flowsync.tasks', JSON.stringify({ schemaVersion: 1, tasks })),
    records,
  )
  await p.reload()
  await dateButton('2026-11-23').waitFor()
  assert.equal(await dateButton('2026-11-23').getAttribute('aria-current'), 'date')
  assert.equal(await dateButton('2026-11-23').getAttribute('aria-pressed'), 'true')
  assert.match(await dateButton('2026-11-22').getAttribute('aria-label'), /1 task, overdue/)
  assert.equal(await p.locator('.calendar-task-dot').count(), 4)
  const overdue = p.getByRole('region', { name: 'Overdue', exact: true }),
    upcoming = p.getByRole('region', { name: 'Upcoming deadlines', exact: true })
  assert.deepEqual(await overdue.locator('.deadline-title').allTextContents(), ['Overdue draft'])
  assert.deepEqual(await upcoming.locator('.deadline-title').allTextContents(), [
    'Today review',
    'Tomorrow plan',
    'New year task',
  ])
  assert.match(await upcoming.innerText(), /Due today/)
  assert.equal(
    await upcoming.getByRole('button', { name: 'Open task Finished date', exact: true }).count(),
    0,
  )
  assert.equal(
    await selected.getByRole('button', { name: 'Open task Today review', exact: true }).isVisible(),
    true,
  )
  await dateButton('2026-11-24').click()
  await selected.getByRole('button', { name: 'Open task Tomorrow plan', exact: true }).click()
  assert.equal(await p.getByLabel('Due date Optional').inputValue(), '2026-11-24')
  await p.getByLabel('Due date Optional').fill('2026-11-26')
  await save()
  assert.match(await dateButton('2026-11-24').getAttribute('aria-label'), /0 tasks/)
  assert.match(await dateButton('2026-11-26').getAttribute('aria-label'), /1 task/)
  await dateButton('2026-11-26').click()
  await selected.getByRole('button', { name: 'Open task Tomorrow plan', exact: true }).click()
  await p.getByLabel('Due date Optional').fill('')
  await save()
  assert.match(await dateButton('2026-11-26').getAttribute('aria-label'), /0 tasks/)
  assert.equal(
    await upcoming.getByRole('button', { name: 'Open task Tomorrow plan', exact: true }).count(),
    0,
  )
  await dateButton('2026-11-24').click()
  await p.getByRole('button', { name: 'Add task for Nov 24, 2026', exact: true }).click()
  assert.equal(await p.getByLabel('Due date Optional').inputValue(), '2026-11-24')
  await p.getByLabel('Title Required').fill('Calendar-created task')
  await save()
  assert.match(await dateButton('2026-11-24').getAttribute('aria-label'), /1 task/)
  await selected
    .getByRole('button', { name: 'Open task Calendar-created task', exact: true })
    .click()
  await p.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('completed')
  await save()
  assert.equal(
    await upcoming
      .getByRole('button', { name: 'Open task Calendar-created task', exact: true })
      .count(),
    0,
  )
  assert.match(await selected.innerText(), /Completed/)
  // Calendar keeps completed tasks available for reopening.
  await selected
    .getByRole('button', { name: 'Open task Calendar-created task', exact: true })
    .click()
  await p.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('todo')
  await save()
  await upcoming
    .getByRole('button', { name: 'Open task Calendar-created task', exact: true })
    .waitFor()
  await dateButton('2026-11-30').click()
  await p.keyboard.press('ArrowRight')
  await dateButton('2026-12-01').waitFor()
  assert.equal(await dateButton('2026-12-01').getAttribute('aria-pressed'), 'true')
  assert.equal(await dateButton('2026-12-01').evaluate((el) => el === document.activeElement), true)
  await p.getByRole('button', { name: 'Next month', exact: true }).click()
  await p.getByRole('heading', { name: 'January 2027', exact: true }).waitFor()
  assert.match(await dateButton('2027-01-01').getAttribute('aria-label'), /1 task/)
  await p.getByRole('button', { name: 'Previous month', exact: true }).click()
  await p.getByRole('heading', { name: 'December 2026', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Today', exact: true }).click()
  assert.equal(await dateButton('2026-11-23').getAttribute('aria-pressed'), 'true')
  // Go to February 2028 and verify leap day and keyboard month clamping.
  for (let i = 0; i < 15; i++)
    await p.getByRole('button', { name: 'Next month', exact: true }).click()
  await p.getByRole('heading', { name: 'February 2028', exact: true }).waitFor()
  assert.equal(await p.locator('.calendar-day').count(), 29)
  await dateButton('2028-02-29').click()
  await p.keyboard.press('PageDown')
  await dateButton('2028-03-29').waitFor()
  await p.keyboard.press('Home')
  assert.equal(await dateButton('2028-03-26').getAttribute('aria-pressed'), 'true')
  await p.keyboard.press('End')
  assert.equal(await dateButton('2028-04-01').getAttribute('aria-pressed'), 'true')
  await p.getByRole('button', { name: 'Today', exact: true }).click()
  // Deleting through My Tasks updates the same repository-backed calendar.
  await p.goto(`${origin}/#/tasks`)
  await p.getByRole('button', { name: 'Delete Calendar-created task', exact: true }).click()
  await p.getByRole('button', { name: 'Delete task', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  await p.goto(`${origin}/#/`)
  await dateButton('2026-11-24').waitFor()
  assert.match(await dateButton('2026-11-24').getAttribute('aria-label'), /0 tasks/)
  await p.reload()
  await dateButton('2026-11-23').waitFor()
  assert.match(await dateButton('2026-11-22').getAttribute('aria-label'), /1 task, overdue/)
  await mkdir('artifacts', { recursive: true })
  await p.screenshot({ path: 'artifacts/milestone5-desktop-dark.png', fullPage: true })
  await p.getByRole('button', { name: 'Switch to light theme', exact: true }).click()
  await p.screenshot({ path: 'artifacts/milestone5-desktop-light.png', fullPage: true })
  for (const width of [820, 390, 320]) {
    await p.setViewportSize({ width, height: 1000 })
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `No overflow at ${width}`,
    )
  }
  await p.screenshot({ path: 'artifacts/milestone5-mobile.png', fullPage: true })
  assert.deepEqual(errors, [])
  // A negative timezone close to local midnight must not shift date-only task values.
  const west = await browser.newContext({ timezoneId: 'America/Los_Angeles' })
  const w = await west.newPage()
  await w.clock.install({ time: new Date('2026-11-23T23:30:00-08:00') })
  await w.goto(origin)
  await w.evaluate(
    (tasks) => localStorage.setItem('flowsync.tasks', JSON.stringify({ schemaVersion: 1, tasks })),
    records,
  )
  await w.reload()
  await w.locator('#calendar-2026-11-23').waitFor()
  assert.equal(await w.locator('#calendar-2026-11-23').getAttribute('aria-current'), 'date')
  await w.locator('#calendar-2026-11-24').click()
  await w
    .getByRole('region', { name: 'Selected date tasks', exact: true })
    .getByRole('button', { name: 'Open task Tomorrow plan', exact: true })
    .click()
  assert.equal(await w.getByLabel('Due date Optional').inputValue(), '2026-11-24')
  await w.getByRole('button', { name: 'Cancel', exact: true }).click()
  await w.clock.fastForward(31 * 60 * 1000)
  assert.equal(await w.locator('#calendar-2026-11-24').getAttribute('aria-current'), 'date')
  await west.close()
  console.log(
    'PASS: month/year navigation, Today, local dates in Manila and Los Angeles, leap day, keyboard selection/focus, task indicators, date-preselected creation, edit/remove/completion/reopening/deletion synchronization, overdue/upcoming sorting and exclusions, refresh persistence, midnight, themes, and responsive layouts.',
  )
} finally {
  await browser.close()
}
