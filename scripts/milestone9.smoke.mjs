import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const browser = await chromium.launch({
  channel: process.env.FLOWSYNC_BROWSER ?? 'chrome',
  headless: true,
})
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const p = await c.newPage()
const issues = []
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
const stamp = '2026-11-20T00:00:00.000Z'
const task = {
  id: 'qa-task',
  title: 'Review accessible workspace',
  description: 'A useful task description.',
  status: 'todo',
  priority: 'high',
  dueDate: '2020-01-01',
  createdAt: stamp,
  updatedAt: stamp,
}
const journal = {
  id: 'qa-journal',
  date: '2026-11-20',
  title: 'A saved page',
  content: 'A thoughtful day.',
  createdAt: stamp,
  updatedAt: stamp,
}
async function audit(name) {
  const result = await new AxeBuilder({ page: p })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  for (const violation of result.violations)
    issues.push({
      name,
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })
  console.log(`Audited ${name}: ${result.violations.length} violations`)
}
try {
  await p.goto(origin)
  await p.evaluate(
    ({ task, journal }) => {
      localStorage.setItem('flowsync.tasks', JSON.stringify({ schemaVersion: 1, tasks: [task] }))
      localStorage.setItem(
        'flowsync.journal',
        JSON.stringify({ schemaVersion: 1, records: [journal] }),
      )
    },
    { task, journal },
  )
  await p.reload()
  for (const theme of ['dark', 'light']) {
    if ((await p.locator('html').getAttribute('data-theme')) !== theme)
      await p.getByRole('button', { name: `Switch to ${theme} theme`, exact: true }).click()
    for (const width of [1440, 820, 320]) {
      await p.setViewportSize({ width, height: 1000 })
      for (const route of ['/', '/tasks', '/check-in', '/journal', '/settings']) {
        await p.goto(`${origin}/#${route}`)
        await p.getByRole('heading', { level: 1 }).waitFor()
        if (route === '/journal')
          await p
            .locator('.writing-history')
            .getByRole('button')
            .filter({ hasText: 'A saved page' })
            .click()
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${theme} ${width} ${route} page overflow`,
        )
        await audit(`${theme}/${width}${route}`)
      }
    }
  }
  await p.setViewportSize({ width: 390, height: 844 })
  await p.goto(`${origin}/#/tasks`)
  await p.getByRole('button', { name: 'New task', exact: true }).click()
  await audit('task-dialog')
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await p.getByRole('button', { name: /^Notifications,/ }).click()
  await audit('notifications-dialog')
  await p.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await p.goto(`${origin}/#/settings`)
  await p.getByRole('button', { name: 'Clear application data', exact: true }).click()
  await audit('clear-dialog')
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await mkdir('artifacts', { recursive: true })
  const preview = {
    schemaVersion: 1,
    exportedAt: stamp,
    tasks: [task],
    journalEntries: [journal],
    checkIns: [],
    preferences: { theme: 'light', taskView: 'kanban', taskSort: 'dueDate' },
    notifications: [],
  }
  await p.getByLabel('Import backup file', { exact: true }).setInputFiles({
    name: 'qa.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(preview)),
  })
  await audit('import-preview-dialog')
  for (let index = 0; index < 12; index++) {
    await p.keyboard.press('Tab')
    assert.equal(
      await p.getByRole('dialog').evaluate((element) => element.contains(document.activeElement)),
      true,
      'Modal contains keyboard focus',
    )
  }
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await p.goto(`${origin}/#/journal`)
  await p
    .locator('.writing-history')
    .getByRole('button')
    .filter({ hasText: 'A saved page' })
    .click()
  await p.getByRole('button', { name: 'Delete journal entry', exact: true }).click()
  await audit('journal-delete-dialog')
  await p.getByRole('button', { name: 'Cancel', exact: true }).click()
  await p.goto(`${origin}/#/settings`)
  for (let index = 0; index < 24; index++) {
    await p.keyboard.press('Tab')
    assert.equal(
      await p.evaluate(
        () => document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'file',
      ),
      false,
      'Hidden file input must not be a keyboard stop',
    )
  }
  await p.setViewportSize({ width: 1440, height: 1000 })
  await p.goto(`${origin}/#/`)
  await p.waitForFunction(() => document.title === 'Dashboard · FlowSync')
  await p.screenshot({ path: 'artifacts/milestone9-dashboard.png', fullPage: true })
  await p.setViewportSize({ width: 320, height: 900 })
  await p.screenshot({ path: 'artifacts/milestone9-mobile.png', fullPage: true })
  const offlineContext = await browser.newContext()
  const offline = await offlineContext.newPage()
  const external = []
  await offline.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== new URL(origin).origin) {
      external.push(route.request().url())
      return route.abort()
    }
    return route.continue()
  })
  await offline.goto(`${origin}/#/tasks`)
  await offline.getByRole('button', { name: 'New task', exact: true }).click()
  await offline.getByLabel('Title Required').fill('Offline task')
  await offline.getByRole('button', { name: 'Save task', exact: true }).click()
  await offline.getByRole('dialog').waitFor({ state: 'hidden' })
  await offline.reload()
  await offline.getByRole('heading', { name: 'Offline task', exact: true }).waitFor()
  assert.deepEqual(external, [], 'Core use does not require an internet service')
  await offlineContext.close()
  await writeFile(
    'artifacts/milestone9-accessibility.json',
    JSON.stringify({ issues, errors }, null, 2),
  )
  console.log(
    JSON.stringify(
      issues.map((issue) => ({
        name: issue.name,
        id: issue.id,
        targets: issue.nodes.map((node) => node.target),
      })),
      null,
      2,
    ),
  )
  assert.deepEqual(errors, [])
  assert.equal(issues.length, 0, 'All reviewed screens must pass the selected axe rules')
} finally {
  await browser.close()
}
