import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
const {chromium}=await import(process.env.FLOWSYNC_PLAYWRIGHT_MODULE?pathToFileURL(process.env.FLOWSYNC_PLAYWRIGHT_MODULE).href:'playwright')
const browser=await chromium.launch({channel:'chrome',headless:true})
const origin=process.env.FLOWSYNC_TEST_URL??'http://127.0.0.1:5173'
const seed=[
 {id:'overdue',title:'Overdue draft',dueDate:'2026-11-24',status:'todo'},
 {id:'today',title:'Today review',dueDate:'2026-11-25',status:'in_progress'},
 {id:'soon',title:'Soon plan',dueDate:'2026-11-28',status:'todo'},
 {id:'far',title:'Far future',dueDate:'2026-12-15',status:'todo'},
 {id:'done',title:'Finished task',dueDate:'2026-11-24',status:'completed'},
 {id:'undated',title:'Undated note',status:'todo'},
].map(task=>({...task,priority:'medium',createdAt:'2026-11-20T00:00:00.000Z',updatedAt:'2026-11-20T00:00:00.000Z',...(task.status==='completed'?{completedAt:'2026-11-20T00:00:00.000Z'}:{})}))
async function setup(timezone='Asia/Manila',time='2026-11-25T12:00:00+08:00',extra){
 const c=await browser.newContext({timezoneId:timezone,viewport:{width:1440,height:1000}})
 const p=await c.newPage();await p.clock.install({time:new Date(time)});await p.goto(origin)
 await p.evaluate(tasks=>localStorage.setItem('flowsync.tasks',JSON.stringify({schemaVersion:1,tasks})),seed)
 if(extra)await extra(p)
 await p.reload();return {c,p}
}
const bell=p=>p.getByRole('button',{name:/^Notifications, \d+ unread$/})
const panel=p=>p.getByRole('dialog',{name:'Notifications',exact:true})
const records=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('flowsync.notifications')).records)
async function close(p){await panel(p).getByRole('button',{name:'Close dialog',exact:true}).click()}
try{
 const {c,p}=await setup();const errors=[];p.on('pageerror',error=>errors.push(error.message))
 await p.getByRole('button',{name:'Notifications, 3 unread',exact:true}).waitFor();await bell(p).click()
 assert.deepEqual(await panel(p).locator('.notification-task').allTextContents(),['Overdue draft','Today review','Soon plan'])
 assert.deepEqual(await panel(p).locator('.notification-kind > span:first-child').allTextContents(),['Overdue','Due today','Due soon'])
 assert.equal((await records(p)).length,3)
 await close(p);assert.equal(await bell(p).evaluate(el=>el===document.activeElement),true)
 // Rerenders and page reloads cannot generate duplicate IDs.
 await p.getByRole('button',{name:'Switch to light theme',exact:true}).click();await p.reload()
 await p.getByRole('button',{name:'Notifications, 3 unread',exact:true}).waitFor();assert.equal((await records(p)).length,3)
 await bell(p).click();await panel(p).getByRole('button',{name:'Mark reminder for Overdue draft as read',exact:true}).click()
 assert.equal((await records(p)).filter(record=>record.readAt).length,1)
 await panel(p).getByRole('button',{name:'Dismiss reminder for Today review',exact:true}).click()
 assert.equal(await panel(p).getByRole('button',{name:'Open reminder task Today review',exact:true}).count(),0)
 await close(p);await p.reload();await p.getByRole('button',{name:'Notifications, 1 unread',exact:true}).waitFor()
 await bell(p).click();assert.equal(await panel(p).locator('.notification-item').count(),2)
 await panel(p).getByRole('button',{name:'Open reminder task Soon plan',exact:true}).click()
 await p.getByRole('dialog',{name:'Edit task',exact:true}).waitFor()
 assert.equal(await p.getByLabel('Title Required').inputValue(),'Soon plan')
 await p.getByRole('dialog').getByLabel('Status',{exact:true}).selectOption('completed')
 await p.getByRole('button',{name:'Save task',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'})
 await p.getByRole('button',{name:'Notifications, 0 unread',exact:true}).waitFor()
 // Cross-tab read/dismiss updates must merge without reviving the first action.
 const b=await c.newPage();await b.clock.install({time:new Date('2026-11-25T12:00:00+08:00')});await b.goto(origin)
 await bell(b).click();await panel(b).getByRole('button',{name:'Dismiss reminder for Overdue draft',exact:true}).click()
 await bell(p).click();await panel(p).getByText('No reminders to show.',{exact:true}).waitFor()
 await close(p)
 await p.reload();await bell(p).click();await panel(p).getByText('No reminders to show.',{exact:true}).waitFor();await close(p)
 assert.deepEqual(errors,[]);await c.close()
 // Midnight changes reminder type once and observes the local date, including a negative offset.
 const clocked=await setup('America/Los_Angeles','2026-11-24T23:59:00-08:00')
 await bell(clocked.p).click();assert.match(await panel(clocked.p).innerText(),/Due today/)
 await close(clocked.p);await clocked.p.clock.fastForward(61000)
 await bell(clocked.p).click();const overdueItem=panel(clocked.p).locator('.notification-item').filter({hasText:'Overdue draft'})
 assert.match(await overdueItem.innerText(),/Overdue/)
 const before=(await records(clocked.p)).length
 await close(clocked.p);await clocked.p.clock.fastForward(61000);await bell(clocked.p).click()
 assert.equal((await records(clocked.p)).length,before)
 await close(clocked.p);await clocked.c.close()
 // Due-date edits and deletion invalidate old reminders immediately.
 const edited=await setup();await edited.p.goto(`${origin}/#/tasks`)
 await edited.p.getByRole('button',{name:'Edit Overdue draft',exact:true}).click();await edited.p.getByLabel('Due date Optional').fill('2027-01-01')
 await edited.p.getByRole('button',{name:'Save task',exact:true}).click();await edited.p.getByRole('dialog').waitFor({state:'hidden'})
 await edited.p.getByRole('button',{name:'Delete Today review',exact:true}).click();await edited.p.getByRole('button',{name:'Delete task',exact:true}).click();await edited.p.getByRole('dialog').waitFor({state:'hidden'})
 await bell(edited.p).click();assert.deepEqual(await panel(edited.p).locator('.notification-task').allTextContents(),['Soon plan'])
 await panel(edited.p).getByRole('button',{name:'Mark all as read',exact:true}).click();assert.equal(await panel(edited.p).getByRole('button',{name:'Mark all as read',exact:true}).isDisabled(),true)
 await close(edited.p);await edited.c.close()
 // Damaged notification data must not be replaced, while session reminders remain usable.
 for(const raw of ['{broken','null',JSON.stringify({schemaVersion:99,records:[]}),JSON.stringify({schemaVersion:1,records:[{id:'invalid'}]})]){
  const bad=await setup('Asia/Manila','2026-11-25T12:00:00+08:00',async page=>page.evaluate(value=>localStorage.setItem('flowsync.notifications',value),raw))
  await bell(bad.p).click();await panel(bad.p).getByRole('alert').waitFor()
  assert.equal(await bad.p.evaluate(()=>localStorage.getItem('flowsync.notifications')),raw)
  await panel(bad.p).getByRole('button',{name:'Dismiss reminder for Overdue draft',exact:true}).click()
  assert.equal(await panel(bad.p).getByRole('button',{name:'Open reminder task Overdue draft',exact:true}).count(),0)
  assert.equal(await bad.p.evaluate(()=>localStorage.getItem('flowsync.notifications')),raw)
  await bad.c.close()
 }
 // Simulate quota failure and later recovery; session dismissals must be persisted on recovery.
 const quota=await setup();await quota.p.evaluate(()=>{window.restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='flowsync.notifications')throw new DOMException('Full','QuotaExceededError');return window.restoreStorage.call(this,key,value)}})
 await bell(quota.p).click();await panel(quota.p).getByRole('button',{name:'Dismiss reminder for Overdue draft',exact:true}).click();await panel(quota.p).getByRole('alert').waitFor()
 await close(quota.p);await quota.p.goto(`${origin}/#/tasks`);await bell(quota.p).click()
 assert.equal(await panel(quota.p).getByRole('button',{name:'Open reminder task Overdue draft',exact:true}).count(),0)
 await quota.p.evaluate(()=>{Storage.prototype.setItem=window.restoreStorage})
 await panel(quota.p).getByRole('button',{name:'Mark reminder for Today review as read',exact:true}).click()
 assert.ok((await records(quota.p)).find(record=>record.taskId==='overdue').dismissedAt)
 await close(quota.p);await quota.p.reload();await bell(quota.p).click()
 assert.equal(await panel(quota.p).getByRole('button',{name:'Open reminder task Overdue draft',exact:true}).count(),0)
 await quota.c.close()
 // Desktop/mobile, focus restoration, and day/night appearance.
 const visual=await setup();await bell(visual.p).click();await mkdir('artifacts',{recursive:true})
 await visual.p.screenshot({path:'artifacts/milestone6-dark.png',fullPage:true})
 await close(visual.p);await visual.p.getByRole('button',{name:'Switch to light theme',exact:true}).click();await bell(visual.p).click()
 await visual.p.screenshot({path:'artifacts/milestone6-light.png',fullPage:true})
 await close(visual.p)
 for(const width of [820,390,320]){
  await visual.p.setViewportSize({width,height:844});assert.equal(await visual.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await bell(visual.p).click();assert.ok((await panel(visual.p).boundingBox()).width<=width)
  if(width===320)await visual.p.screenshot({path:'artifacts/milestone6-mobile.png',fullPage:true})
  await visual.p.keyboard.press('Escape');await panel(visual.p).waitFor({state:'hidden'});assert.equal(await bell(visual.p).evaluate(el=>el===document.activeElement),true)
 }
 await visual.c.close()
 console.log('PASS: reminder eligibility/local dates, exclusions, persistent deduplication/read/dismiss, task editing/completion/date changes/deletion, cross-tab state, midnight transitions, mark-all-read, corruption preservation, quota recovery, themes, responsive panel, and keyboard focus.')
}finally{await browser.close()}
