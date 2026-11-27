import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright'
import { readFile } from 'node:fs/promises'
const env = { ...process.env, FLOWSYNC_DESKTOP_TEST: '1' }
delete env.ELECTRON_RUN_AS_NODE
assert.ok(env.FLOWSYNC_DESKTOP_EXE && env.FLOWSYNC_TEST_PROFILE)
const app = await electron.launch({ executablePath: env.FLOWSYNC_DESKTOP_EXE, env })
try {
  const page = await app.firstWindow()
  await page.getByRole('button', { name: 'New task', exact: true }).waitFor()
  const info = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    profile: app.getPath('userData'),
    packaged: app.isPackaged,
  }))
  assert.equal(info.version, env.FLOWSYNC_EXPECTED_VERSION ?? '0.1.0')
  assert.equal(info.profile, env.FLOWSYNC_TEST_PROFILE)
  assert.ok(info.packaged)
  const expected = JSON.parse(await readFile('artifacts/desktop-upgrade-transfer.json', 'utf8'))
  const actual = await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem('flowsync.workspace'))
    const read = (key) =>
      JSON.parse(
        localStorage.getItem(`flowsync.store.${snapshot.revision}.${key}`) ?? snapshot.stores[key],
      )
    return {
      tasks: read('flowsync.tasks').tasks,
      checkIns: read('flowsync.checkins').records,
      journalEntries: read('flowsync.journal').records,
      preferences: read('flowsync.preferences').preferences,
      notifications: read('flowsync.notifications').records,
    }
  })
  for (const key of Object.keys(actual))
    assert.deepEqual(actual[key], expected[key], `Retained ${key}`)
  console.log(`Installed FlowSync ${info.version}: all saved data retained.`)
} finally {
  await app.close()
}
