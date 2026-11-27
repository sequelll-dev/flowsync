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
  const c = await browser.newContext()
  try {
    const p = await c.newPage()
    await p.goto(`${origin}/#/tasks`)
    await p.getByRole('button', { name: 'New task', exact: true }).click()
    await p.getByLabel('Title Required').fill('Audit task')
    await p.getByLabel('Due date Optional').fill('2020-01-01')
    await p.getByRole('button', { name: 'Save task', exact: true }).click()
    await p.getByRole('dialog').waitFor({ state: 'hidden' })
    await p.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).waitFor()
    await run(c, p)
    console.log('PASS:', name)
  } catch (e) {
    failures++
    console.log('FAIL:', name, e.message)
  } finally {
    await c.close()
  }
}
try {
  await test('Browser storage clearing cannot resurrect archived reminder records', async (c, p) => {
    const other = await c.newPage()
    await other.goto(origin)
    await other.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).waitFor()
    await p.evaluate(() => localStorage.clear())
    await other.getByRole('button', { name: 'Notifications, 0 unread', exact: true }).waitFor()
    assert.equal(await other.evaluate(() => localStorage.getItem('flowsync.notifications')), null)
  })
  await test('Keyboard status movement preserves focus on the moved task', async (c, p) => {
    const control = p.getByLabel('Status for Audit task', { exact: true })
    await control.focus()
    await p.keyboard.press('End')
    await p.keyboard.press('Enter')
    await p
      .getByRole('region', { name: 'Completed column', exact: true })
      .getByRole('heading', { name: 'Audit task', exact: true })
      .waitFor()
    assert.equal(await control.evaluate((el) => el === document.activeElement), true)
  })
  await test('Dismissing the final reminder preserves keyboard focus in its dialog', async (c, p) => {
    await p.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click()
    await p.getByRole('button', { name: 'Dismiss reminder for Audit task', exact: true }).focus()
    await p.keyboard.press('Enter')
    await p.getByText('No reminders to show.', { exact: true }).waitFor()
    assert.equal(
      await p
        .getByRole('dialog')
        .evaluate(
          (el) =>
            el.contains(document.activeElement) && document.activeElement.tagName === 'BUTTON',
        ),
      true,
    )
  })
  await test('Read controls preserve keyboard focus when they become disabled', async (c, p) => {
    await p.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click()
    await p.getByRole('button', { name: 'Mark all as read', exact: true }).focus()
    await p.keyboard.press('Enter')
    await p.getByRole('button', { name: 'Mark all as read', exact: true }).waitFor()
    assert.equal(
      await p
        .getByRole('dialog')
        .evaluate((el) => el.contains(document.activeElement) && !document.activeElement.disabled),
      true,
    )
  })
} finally {
  await browser.close()
}
if (failures) process.exitCode = 1
