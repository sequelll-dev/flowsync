import assert from 'node:assert/strict'
import { _electron as electron, chromium } from 'playwright'
import { mkdtemp, readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = resolve(root, 'artifacts')
await mkdir(artifacts, { recursive: true })
const profile =
  process.env.FLOWSYNC_TEST_PROFILE ?? (await mkdtemp(join(tmpdir(), 'flowsync-desktop-test-')))
const executablePath =
  process.env.FLOWSYNC_DESKTOP_EXE ?? resolve(root, 'release/win-unpacked/FlowSync.exe')
const env = { ...process.env, FLOWSYNC_DESKTOP_TEST: '1', FLOWSYNC_TEST_PROFILE: profile }
delete env.ELECTRON_RUN_AS_NODE
const report = { executablePath, profile, checks: [], errors: [] }
let application
let page
let browser
let server
const timeout = setTimeout(() => {
  application?.process().kill()
  server?.kill()
  console.error('Desktop verification exceeded its time limit.')
  process.exit(1)
}, 180_000)
async function start() {
  application = await electron.launch({ executablePath, env, timeout: 30_000 })
  page = await application.firstWindow()
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (error) => report.errors.push(error.message))
  await page.getByRole('button', { name: 'New task', exact: true }).waitFor()
  assert.equal(await page.title(), 'Dashboard · FlowSync')
}
async function stop() {
  const child = application.process()
  const exited =
    child.exitCode === null ? new Promise((done) => child.once('exit', done)) : Promise.resolve()
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await exited
  application = null
}
async function navigate(label) {
  await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click()
}
async function saveTask() {
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function importFile(target, filename) {
  await target.getByLabel('Import backup file', { exact: true }).setInputFiles(filename)
  await target
    .getByRole('checkbox', {
      name: 'I understand this replaces all saved FlowSync data.',
      exact: true,
    })
    .check()
  await target.getByRole('button', { name: 'Replace data', exact: true }).click()
  await target.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function exported(name) {
  const destination = join(artifacts, `${name}-${Date.now()}.json`)
  await application.evaluate(({ session }, filename) => {
    session.defaultSession.once('will-download', (_event, item) => item.setSavePath(filename))
  }, destination)
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click()
  for (let i = 0; i < 80; i++) {
    try {
      return JSON.parse(await readFile(destination, 'utf8'))
    } catch {}
    await pause(100)
  }
  throw new Error('Desktop backup download did not finish')
}
async function screenshot(name) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(150)
  const data = await application.evaluate(async ({ BrowserWindow }) => {
    const image = await BrowserWindow.getAllWindows()[0].webContents.capturePage()
    return image.toDataURL()
  })
  await writeFile(join(artifacts, name), Buffer.from(data.split(',')[1], 'base64'))
}
async function browserBackup() {
  // Produce the transfer file through the real web export flow in an isolated browser.
  server = spawn(
    process.execPath,
    [
      resolve(root, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4184',
      '--strictPort',
    ],
    { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let announced = false
  let launchError
  server.stdout.on('data', (data) => {
    if (data.toString().includes('http://127.0.0.1:4184')) announced = true
  })
  server.on('error', (error) => {
    launchError = error
  })
  for (let i = 0; i < 100 && !announced; i++) {
    if (launchError) throw launchError
    if (server.exitCode !== null) throw new Error('Transfer preview failed to start')
    await pause(100)
  }
  assert.ok(announced, 'Transfer preview must be our own server')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext()
  const web = await context.newPage()
  await web.goto('http://127.0.0.1:4184/#/tasks')
  await web.getByRole('button', { name: 'New task', exact: true }).click()
  await web.getByLabel('Title Required').fill('Browser transfer task')
  await web.getByLabel('Due date Optional').fill('2020-01-01')
  await web.getByRole('button', { name: 'Save task', exact: true }).click()
  await web.getByRole('dialog').waitFor({ state: 'hidden' })
  await web.getByRole('navigation').getByRole('link', { name: 'Settings', exact: true }).click()
  const download = web.waitForEvent('download')
  await web.getByRole('button', { name: 'Export JSON', exact: true }).click()
  const filename = join(artifacts, 'desktop-browser-transfer.json')
  await (await download).saveAs(filename)
  await browser.close()
  browser = null
  server.kill()
  await new Promise((done) => server.once('exit', done))
  server = null
  return filename
}
try {
  await access(executablePath)
  const transfer = await browserBackup()
  await start()
  const configuration = await application.evaluate(({ app, BrowserWindow }) => {
    const preferences = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
    return {
      packaged: app.isPackaged,
      userData: app.getPath('userData'),
      nodeIntegration: preferences.nodeIntegration,
      contextIsolation: preferences.contextIsolation,
      sandbox: preferences.sandbox,
    }
  })
  assert.deepEqual(configuration, {
    packaged: true,
    userData: profile,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  })
  assert.ok(page.url().startsWith('app://flowsync/index.html'))
  assert.deepEqual(await page.evaluate(() => [typeof window.require, typeof window.process]), [
    'undefined',
    'undefined',
  ])
  // Main-process request filter and renderer CSP deny external and local-file access.
  assert.equal(
    await application.evaluate(async ({ session }) => {
      try {
        await session.defaultSession.fetch('https://example.com')
        return false
      } catch {
        return true
      }
    }),
    true,
  )
  assert.equal(
    await application.evaluate(async ({ session }) => {
      try {
        await session.defaultSession.fetch('file:///C:/Windows/win.ini')
        return false
      } catch {
        return true
      }
    }),
    true,
  )
  assert.equal(
    await application.evaluate(
      async ({ session }) =>
        (await session.defaultSession.fetch('app://flowsync/%2e%2e%5cpackage.json')).status,
    ),
    404,
  )
  await page.evaluate(() => {
    window.open('https://example.com')
    const link = document.createElement('a')
    link.href = 'https://example.com'
    document.body.append(link)
    link.click()
    link.remove()
  })
  await pause(100)
  assert.equal(
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
    1,
  )
  assert.ok(page.url().startsWith('app://flowsync/'))
  report.checks.push(
    'Packaged offline origin; isolated, sandboxed renderer; denied remote/file requests, traversal, navigation and popups',
  )
  await page.reload()
  await navigate('Settings')
  await importFile(page, transfer)
  await navigate('My Tasks')
  await page.getByRole('heading', { name: 'Browser transfer task', exact: true }).waitFor()
  report.checks.push('Real browser JSON export imported into desktop')
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Title Required').fill('Desktop task')
  await page.getByLabel('Description', { exact: true }).fill('A desktop-specific task')
  await page.getByRole('dialog').getByLabel('Priority', { exact: true }).selectOption('high')
  await page.getByLabel('Due date Optional').fill('2020-01-02')
  await saveTask()
  await page.getByRole('button', { name: 'Complete Desktop task', exact: true }).click()
  await page.getByRole('button', { name: 'Reopen Desktop task', exact: true }).click()
  await page.getByRole('button', { name: 'Edit Desktop task', exact: true }).click()
  await page.getByLabel('Description', { exact: true }).fill('Updated desktop task')
  await saveTask()
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('Updated desktop')
  assert.equal(await page.locator('.task-record').count(), 1)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await page.getByLabel('Sort by', { exact: true }).selectOption('title')
  await page.getByRole('button', { name: 'Kanban', exact: true }).click()
  await page.getByRole('region', { name: 'Kanban board' }).waitFor()
  await page.getByLabel('Status for Desktop task', { exact: true }).selectOption('in_progress')
  await page
    .getByRole('region', { name: 'In Progress column', exact: true })
    .getByRole('heading', { name: 'Desktop task', exact: true })
    .waitFor()
  await page
    .locator('.task-card')
    .filter({ has: page.getByRole('heading', { name: 'Desktop task', exact: true }) })
    .locator('.drag-handle')
    .dragTo(
      page
        .getByRole('region', { name: 'Completed column', exact: true })
        .locator('.column-heading'),
      { timeout: 15_000 },
    )
  await page
    .getByRole('region', { name: 'Completed column', exact: true })
    .getByRole('heading', { name: 'Desktop task', exact: true })
    .waitFor()
  await page.getByLabel('Status for Desktop task', { exact: true }).selectOption('in_progress')
  report.checks.push('Task CRUD, native drag-and-drop, keyboard status, search, sort, Kanban/List')
  await navigate('Dashboard')
  await page
    .getByRole('region', { name: 'Overdue', exact: true })
    .getByRole('button', { name: 'Open task Desktop task', exact: true })
    .waitFor()
  const currentDate = await page.locator('[aria-current="date"]').getAttribute('id')
  await page.locator(`#${currentDate}`).click()
  await page.getByRole('button', { name: /^Add task for / }).click()
  assert.equal(
    await page.getByLabel('Due date Optional').inputValue(),
    currentDate.replace('calendar-', ''),
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: /^Notifications, / }).click()
  await page
    .getByRole('button', { name: 'Mark reminder for Desktop task as read', exact: true })
    .click()
  await page.keyboard.press('Escape')
  report.checks.push(
    'Calendar date selection and task prefill; overdue list and in-app reminder read state',
  )
  await navigate('Daily Check-In')
  await page.getByLabel('Daily goal', { exact: true }).fill('Finish the desktop milestone')
  await page.getByRole('radio', { name: 'Good', exact: true }).check()
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click()
  await page.getByText('Saved on this device', { exact: true }).waitFor()
  await navigate('Daily Journal')
  await page.getByRole('button', { name: 'New entry', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Desktop journal')
  await page.getByLabel('Your thoughts', { exact: true }).fill('Offline writing survives restart.')
  await page.getByText('Saved on this device', { exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Search entries', exact: true }).fill('Offline writing')
  assert.equal(await page.locator('.writing-history li').count(), 1)
  await page.getByRole('searchbox', { name: 'Search entries', exact: true }).fill('not present')
  await page.getByText('No matching entries.', { exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Search entries', exact: true }).fill('')
  await page.getByLabel('Sort entries', { exact: true }).selectOption('oldest')
  await page.getByRole('button', { name: 'New entry', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Temporary entry')
  await page.getByText('Saved on this device', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Delete journal entry', exact: true }).click()
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.locator('.writing-history button').filter({ hasText: 'Desktop journal' }).click()
  assert.equal(
    await page.getByLabel('Your thoughts', { exact: true }).inputValue(),
    'Offline writing survives restart.',
  )
  await navigate('Settings')
  await page.getByRole('radio', { name: 'Light', exact: true }).check()
  const before = await exported('desktop-before-restart')
  assert.equal(before.tasks.length, 2)
  assert.equal(before.checkIns[0].dailyGoal, 'Finish the desktop milestone')
  assert.equal(before.journalEntries[0].content, 'Offline writing survives restart.')
  assert.equal(before.preferences.theme, 'light')
  assert.ok(before.notifications.some((record) => record.readAt))
  report.checks.push('Check-in save, journal autosave, theme change, native desktop JSON download')
  await screenshot('milestone10-settings.png')
  await stop()
  await start()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await navigate('Settings')
  const after = await exported('desktop-after-restart')
  for (const key of ['tasks', 'checkIns', 'journalEntries', 'preferences', 'notifications'])
    assert.deepEqual(after[key], before[key], `Persisted ${key}`)
  report.checks.push('Graceful close/relaunch retained all five data domains and preferences')
  // Close warning is tested by substituting only the native dialog response.
  await navigate('Daily Check-In')
  await page.getByLabel('Daily goal', { exact: true }).fill('Unsaved test draft')
  await application.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = () => 1
    BrowserWindow.getAllWindows()[0].close()
  })
  await pause(200)
  assert.equal(
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
    1,
  )
  assert.equal(
    await page.getByLabel('Daily goal', { exact: true }).inputValue(),
    'Unsaved test draft',
  )
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBoxSync = () => 0
  })
  await stop()
  await start()
  await navigate('Daily Check-In')
  assert.equal(
    await page.getByLabel('Daily goal', { exact: true }).inputValue(),
    'Finish the desktop milestone',
  )
  report.checks.push('Unsaved-writing close warning supports keep-writing and explicit discard')
  await navigate('My Tasks')
  await page.getByRole('button', { name: 'Delete Desktop task', exact: true }).click()
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('heading', { name: 'Desktop task', exact: true }).count(), 0)
  await navigate('Settings')
  await page.getByRole('button', { name: 'Clear application data', exact: true }).click()
  await page.getByLabel('Type CLEAR to confirm', { exact: true }).fill('CLEAR')
  await page.getByRole('button', { name: 'Clear all data', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  const empty = await exported('desktop-cleared')
  assert.equal(
    empty.tasks.length +
      empty.journalEntries.length +
      empty.checkIns.length +
      empty.notifications.length,
    0,
  )
  const upgradeBackup = join(artifacts, 'desktop-upgrade-transfer.json')
  await writeFile(upgradeBackup, JSON.stringify(before))
  await importFile(page, upgradeBackup)
  await navigate('Dashboard')
  await screenshot('milestone10-dashboard.png')
  assert.deepEqual(report.errors, [])
  report.checks.push(
    'Confirmed task deletion, typed data clearing, restoration after clear; no renderer errors',
  )
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error)
  if (page && !page.isClosed()) {
    await page
      .screenshot({ path: join(artifacts, 'milestone10-failure.png'), timeout: 2000 })
      .catch(() => {})
    console.error((await page.locator('body').innerText()).slice(0, 5000))
  }
  throw error
} finally {
  clearTimeout(timeout)
  await browser?.close()
  server?.kill()
  if (application) await application.close()
  await writeFile(join(artifacts, 'milestone10-desktop.json'), JSON.stringify(report, null, 2))
}
