import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const b = await chromium.launch({
  channel: process.env.FLOWSYNC_BROWSER ?? 'chrome',
  headless: true,
})
const c = await b.newContext()
const p = await c.newPage()
const origin = process.env.FLOWSYNC_TEST_URL ?? 'http://127.0.0.1:5173'
const stamp = '2026-11-20T00:00:00.000Z'
const task = {
  id: 'race-task',
  title: 'Original task',
  priority: 'medium',
  status: 'todo',
  createdAt: stamp,
  updatedAt: stamp,
}
const journal = {
  id: 'race-journal',
  date: '2026-11-20',
  title: 'Other store',
  content: 'Original writing',
  createdAt: stamp,
  updatedAt: stamp,
}
try {
  await p.goto(origin)
  await p.evaluate(
    ({ task, journal }) =>
      localStorage.setItem(
        'flowsync.workspace',
        JSON.stringify({
          schemaVersion: 1,
          revision: 'race-test',
          stores: {
            'flowsync.tasks': JSON.stringify({ schemaVersion: 1, tasks: [task] }),
            'flowsync.journal': JSON.stringify({ schemaVersion: 1, records: [journal] }),
            'flowsync.checkins': null,
            'flowsync.preferences': null,
            'flowsync.notifications': null,
          },
        }),
      ),
    { task, journal },
  )
  await p.reload()
  await p.goto(`${origin}/#/tasks`)
  await p.evaluate(() => {
    const original = Storage.prototype.setItem
    let injected = false
    Storage.prototype.setItem = function (key, value) {
      if (!injected && (key === 'flowsync.workspace' || key.endsWith('.flowsync.tasks'))) {
        const data =
          key === 'flowsync.workspace'
            ? JSON.parse(JSON.parse(value).stores['flowsync.tasks'])
            : JSON.parse(value)
        if (data.tasks?.[0]?.title === 'Edited task') {
          injected = true
          const live = JSON.parse(this.getItem('flowsync.workspace'))
          const writing = JSON.parse(live.stores['flowsync.journal'])
          writing.records[0].content = 'Concurrent writing preserved'
          if (key === 'flowsync.workspace') {
            live.stores['flowsync.journal'] = JSON.stringify(writing)
            original.call(this, key, JSON.stringify(live))
          } else
            original.call(
              this,
              `flowsync.store.${live.revision}.flowsync.journal`,
              JSON.stringify(writing),
            )
        }
      }
      return original.call(this, key, value)
    }
  })
  await p.getByRole('button', { name: 'Edit Original task', exact: true }).click()
  await p.getByLabel('Title Required').fill('Edited task')
  await p.getByRole('button', { name: 'Save task', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'hidden' })
  await p.reload()
  await p.goto(`${origin}/#/journal`)
  await p.locator('.writing-history').getByRole('button').filter({ hasText: 'Other store' }).click()
  assert.equal(
    await p.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Concurrent writing preserved',
    'A task save must not overwrite a write in another domain',
  )
  console.log('PASS: interleaved writes in independent logical stores are preserved')
  const during = await b.newContext()
  const q = await during.newPage()
  await q.goto(origin)
  await q.evaluate(
    ({ task }) =>
      localStorage.setItem(
        'flowsync.workspace',
        JSON.stringify({
          schemaVersion: 1,
          revision: 'before-clear',
          stores: {
            'flowsync.tasks': JSON.stringify({ schemaVersion: 1, tasks: [task] }),
            'flowsync.journal': null,
            'flowsync.checkins': null,
            'flowsync.preferences': null,
            'flowsync.notifications': null,
          },
        }),
      ),
    { task },
  )
  await q.reload()
  await q.goto(`${origin}/#/tasks`)
  await q.evaluate(() => {
    const native = Storage.prototype.setItem
    let changed = false
    Storage.prototype.setItem = function (key, value) {
      if (!changed && key === 'flowsync.store.before-clear.flowsync.tasks') {
        changed = true
        native.call(
          this,
          'flowsync.workspace',
          JSON.stringify({
            schemaVersion: 1,
            revision: 'after-clear',
            stores: {
              'flowsync.tasks': null,
              'flowsync.journal': null,
              'flowsync.checkins': null,
              'flowsync.preferences': null,
              'flowsync.notifications': null,
            },
          }),
        )
      }
      return native.call(this, key, value)
    }
  })
  await q.getByRole('button', { name: 'Edit Original task', exact: true }).click()
  await q.getByLabel('Title Required').fill('Draft during replacement')
  await q.getByRole('button', { name: 'Save task', exact: true }).click()
  await q.getByRole('dialog').getByRole('alert').waitFor()
  assert.equal(await q.getByLabel('Title Required').inputValue(), 'Draft during replacement')
  assert.equal(
    await q.evaluate(() => localStorage.getItem('flowsync.store.before-clear.flowsync.tasks')),
    null,
  )
  await during.close()
  console.log('PASS: mid-save replacement retains the draft and removes obsolete writes')
} finally {
  await b.close()
}
