# FlowSync

Personal productivity and task management.

FlowSync is a local personal productivity workspace for task and deadline management, calendar integration, daily journaling, and check-ins. It is built incrementally with React, TypeScript, Vite, Tailwind CSS, and Lucide React.

## Project milestones

1. Project initialization — complete.
2. Visual foundation — complete.
3. Task engine — complete.
4. Task workspace — complete.
5. Dashboard and calendar — complete.
6. In-app notifications — complete.
7. Personal productivity tools — complete: daily check-ins and journal.
8. Settings and data management — complete.
9. Testing and refinement — complete.
10. Windows desktop application — complete (final milestone).

### Milestone 10 — Windows desktop application

Package the completed FlowSync application as an installable Windows desktop app, reusing the React interface, repository architecture, existing features, and all 19 design restrictions. Electron bundles the production app in an isolated native window; electron-builder produces the per-user Windows installer.

Deliverables and acceptance criteria:

- Build a Windows installer and launch FlowSync in its own application window, with a desktop shortcut option.
- Bundle the production application so normal use requires neither a running Vite server nor an internet connection.
- Preserve local data across application restarts and supported upgrades, without adding a backend or requiring an account.
- Support transferring browser data through the validated export/import functionality from milestone 8; do not assume browser LocalStorage is shared with the desktop app.
- Verify every implemented feature in the packaged app, including navigation, task views, calendar, reminders while the app is open, journal, check-ins, themes, and data management.
- Verify installation, launch, restart persistence, and uninstall behavior; document installer requirements, build steps, and local data location.

This extends the final project completion criteria to include a working, tested Windows desktop package and documented browser-to-desktop data transfer. Browser push, background reminders, and other previously excluded features remain outside scope. The desktop wrapper has no preload script or renderer-facing native bridge. The React interface and repository architecture are shared with the web build.

## Current milestone

**Milestone 10 — Windows desktop application — complete.** The installable Electron app runs the bundled interface offline, preserves local data, and supports browser backup transfer. Task creation, editing, confirmed deletion, completion/reopening, priorities, statuses, optional descriptions, and local due dates now work on My Tasks and the dashboard. The dashboard shows the shared Kanban/List task workspace and counts derived from all saved tasks. My Tasks keeps every task accessible, including completed tasks. Reusable native dialogs provide keyboard focus containment, Escape handling, validation, and save-failure feedback.

Task operations use an asynchronous repository contract and a versioned LocalStorage implementation at `flowsync.tasks`. Components and hooks never access LocalStorage directly. Changes appear after a successful save. Missing storage starts empty; malformed, incompatible, invalid-date, or duplicate-ID records block mutations without overwriting existing data. Failed writes preserve the editor draft and previously saved tasks.

The responsive shell, five navigation destinations, light/dark themes, saved appearance, and offline daily quote remain available. Navigation uses native hash links and browser history, with no routing dependency. Direct links such as `/#/tasks` work with Vite or a static host. Unknown routes offer a recovery link.

My Tasks now offers Kanban and List views over the same repository. Search matches titles and descriptions; priority and status filters combine with search and apply to both views. Clear filters resets all three. Sort by ascending due date (undated tasks last), priority (high first), creation (newest first), or title. View switching preserves the active filters and does not alter task records. The dashboard combines the task board with a monthly calendar, selected-date task details/creation, and sorted overdue/upcoming deadlines. Calendar and deadlines derive directly from the task repository. Completed tasks remain on their calendar dates but are excluded from active deadline lists; undated tasks appear in neither. In-app reminders now cover unfinished tasks due within three calendar days, today, or overdue. Daily check-ins and a searchable autosaving journal are available. Settings now includes full JSON export, validated import preview/replacement, and confirmed data clearing. No sample tasks are seeded into user storage.

## Requirements

- Node.js 22.12 or newer (Node.js 24 LTS recommended).
- pnpm 11, or npm supplied with a normal Node.js installation.
- Internet access to install packages; the running application has no external font or API requests.

## Development

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173. Stop the server with Ctrl+C. The server binds to the local machine by default.

If using npm instead, run `npm install` and `npm run dev`. pnpm is the project's package manager; commit changes to `pnpm-lock.yaml` when updating dependencies, and avoid maintaining competing lockfiles.

## Verification and production build

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification requires an installed Google Chrome browser by default. Playwright, axe-core, and Prettier are development dependencies; no machine-specific runtime paths are needed. `pnpm verify` checks formatting, checks TypeScript, builds the production bundle, starts a private local preview at http://127.0.0.1:4174, runs every milestone/audit suite, and stops its own preview server. It does not stop the development server or touch your regular browser profile. A failing check returns a nonzero exit code. Individual suites have a three-minute runtime limit.

To verify with installed Microsoft Edge in PowerShell:

```powershell
$env:FLOWSYNC_BROWSER = 'msedge'
pnpm verify
Remove-Item Env:\FLOWSYNC_BROWSER
```

`FLOWSYNC_TEST_URL` can point the runner at an already-running app instead of starting its own preview. Individual suites remain available through `node scripts/milestone8.smoke.mjs` and the other scripts. Older `FLOWSYNC_PLAYWRIGHT_MODULE` overrides are optional; leave them unset for the project-installed Playwright package.

```sh
pnpm typecheck
pnpm build
pnpm preview
pnpm format:check
pnpm format
```

The build writes `dist/`; standalone preview normally uses http://127.0.0.1:4173. `pnpm format` applies the checked-in formatting rules to source, tests, configuration, and documentation. npm equivalents use `npm run` before each script name. Do not maintain competing lockfiles when updating dependencies.

Test browsers use isolated contexts and fixtures. They never clear or seed your normal browser profile. Screenshots and the axe report (`artifacts/milestone9-accessibility.json`) are Git-ignored. Automated accessibility checks supplement keyboard and visual checks; they are not a substitute for a manual screen-reader or physical-device audit.

## Project structure

```text
desktop/                   Electron main process and Windows icon
electron-builder.json      Windows installer configuration
public/                    Static assets
src/
  assets/                  Bundled application assets
  components/
    layout/                Shared application layout
    dashboard/             Dashboard components
    tasks/                 Task controls and views
    calendar/              Monthly calendar
    journal/               Journal components
    checkin/               Daily check-in components
    notifications/         In-app reminders
    settings/              Preference and data controls
    shared/                Reusable UI primitives
  pages/                   Page-level components
  hooks/                   Shared state and behavior
  repositories/
    interfaces/            Storage-independent contracts
    local/                 LocalStorage implementations
  services/                Storage, reminders, import and export
  types/                   Domain types
  utils/                   Pure helpers and local-date handling
  styles/index.css         Tailwind, semantic palettes, responsive layout
  App.tsx                  Page routing and shared theme provider
  main.tsx                 React entry point
vite.config.ts             React and Tailwind plugins
tsconfig*.json             Strict app and tooling type checks
```

Empty directories contain `.gitkeep` files to preserve the planned structure in Git. Components and hooks do not access LocalStorage directly. `LocalPreferencesRepository` validates schema version 1 at `flowsync.preferences`; `storageService` owns JSON parsing and storage access. Reads never silently replace invalid data. A deliberate theme change can save a valid preference, and write failures leave a working session theme with feedback. The task repository now uses the same centralized service with task-specific error messages. Journal and check-in repositories use separate validated logical stores. After an import or clear, `flowsync.workspace` supplies an immutable generation snapshot and ordinary updates use independent `flowsync.store.<revision>.<logical-key>` records. This keeps task and journal writes from replacing each other. Import/clear publishes a new snapshot atomically and cleans up old generation records. Backup JSON exports logical data rather than these internal storage details.

## Windows desktop app

The final milestone packages the verified web application with Electron. See the build, installation, and data-transfer instructions below.

## Configuration references

- [Vite guide](https://vite.dev/guide/)
- [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite)

No environment variables or secrets are required.

## Milestone 2 report

- **Implemented:** dark/light semantic palettes, Geist hierarchy, responsive layout, sidebar, five page destinations, browser history, page titles, theme toggle and Settings radio controls, persistent appearance, visible focus, skip link, mobile Escape handling, and FlowSync favicon.
- **Created:** layout and shared components; five pages; navigation/theme hooks; preferences types and repository contract/implementation; centralized storage service; favicon; `scripts/milestone2.smoke.mjs`.
- **Modified:** `src/App.tsx`, `src/styles/index.css`, `index.html`, `.gitignore`, and this README. No dependency changes were needed. Dependency links were rebuilt after the folder rename.
- **Verified:** browser navigation and active links, history and direct links, unknown-route recovery, theme selection and refresh persistence, malformed/unsupported preference handling, quota/write failures, mobile menu and Escape/focus return, keyboard skip link, and no page overflow at 1440, 820, 390, and 320 CSS pixels. Dark/light and mobile screenshots were visually reviewed. Browser checks captured no errors.
- **Build:** TypeScript and Vite production build passed.
- **Known limits:** task and writing pages are milestone-aware development states; their features are intentionally not implemented yet. Search/notification controls arrive with the associated features. Testing used desktop Chrome with responsive viewports; physical device testing has not been performed.
- **Next:** Milestone 3 task engine, pending the next development instruction.

## Daily motivational quote

The dashboard footer includes a daily motivational quote at the bottom right on desktop and in the normal content flow on mobile. Original FlowSync reflections rotate using the local calendar date, remain consistent across refreshes, and update at local midnight or when the tab becomes visible again. Quotes are bundled locally and require no API, network access, or stored user data.

## Milestone 3 report

- **Implemented:** complete task CRUD with trimming and validation; medium/To Do/no-date defaults; descriptions; high/medium/low priorities; all three statuses; completion and reopening timestamps; local due-date creation/editing/removal; real dashboard counts and recent tasks; accessible task and deletion dialogs; loading, empty, error, retry, and saving states.
- **Created:** `src/types/task.ts`, `src/utils/taskValidation.ts`, `src/repositories/interfaces/TaskRepository.ts`, `src/repositories/local/LocalTaskRepository.ts`, `src/hooks/useTasks.tsx`, `src/components/shared/Modal.tsx`, `src/components/tasks/TaskDialog.tsx`, `src/components/tasks/TaskCollection.tsx`, and `scripts/milestone3.smoke.mjs`.
- **Modified:** `src/services/storageService.ts` (shared error handling and missing-value detection), `src/App.tsx` (task provider), `src/pages/Tasks.tsx`, `src/pages/Dashboard.tsx`, `src/styles/index.css`, and this README. No dependencies added.
- **Persistence:** schema version 1 with unique IDs, validated records/dates/timestamps, `createdAt`/`updatedAt`, and completion metadata. Reads and mutations preserve malformed or incompatible storage. Repository methods return promises so UI callers can support a future asynchronous backend.
- **Verified:** browser CRUD, trim/blank-title handling, form defaults, status/priority/date edits and removal, completion timestamps, preserving completion time on edits, clearing completion time when reopened, refresh/navigation persistence, dashboard counts, deletion cancellation/confirmation, 320px dialog layout, Escape/focus restoration, failed-save draft retention, corrupt/unsupported/null/duplicate/impossible-date storage preservation, and no runtime errors. Existing milestone 2 navigation/theme/responsive checks passed. Desktop and mobile screenshots were visually reviewed; test data stayed in isolated browser contexts.
- **Build:** TypeScript and Vite production build passed.
- **Known limits:** basic task rows are used until the milestone 4 workspace; no Kanban/search/filter controls are added yet. Physical-device and non-Chrome browser testing have not been performed. There are no known blocking milestone 3 issues.
- **Next:** Milestone 4, pending the next development instruction.

To rerun the task checks, start `pnpm dev` and run `node scripts/milestone3.smoke.mjs` with the same Playwright setup described above. Tests use isolated browser contexts and never modify real browser-profile tasks. Screenshots in `artifacts/` are test-only previews and are excluded from Git.

## Milestone 4 report

- **Implemented:** three Kanban columns with filtered counts and status-specific creation; native browser drag-and-drop with a visible handle, dragged-card state, and drop-target highlight; status selects in both views for touch and keyboard alternatives; List view with task title, description, priority, status, due date, creation date, edit/delete and completion actions; live title/description search; combinable priority/status filters and reset; four sorting options; saved default view and sort; functional Settings selectors and header search access.
- **Architecture:** both views use the existing task provider and repository. View switching never writes task records. Task moves use the existing validation, timestamps, completion/reopen behavior, and storage failure handling. No dependencies added. Search and filters are temporary workspace state; view and sorting are persisted preferences. Existing schema-version-1 theme-only preferences are accepted with Kanban/due-date defaults. Updating any preference preserves the others.
- **Created:** `src/components/tasks/WorkspaceControls.tsx`, `src/components/tasks/TaskItem.tsx`, `src/components/tasks/KanbanBoard.tsx`, `src/utils/taskWorkspace.ts`, and `scripts/milestone4.smoke.mjs`.
- **Modified:** `src/components/tasks/TaskCollection.tsx`, `src/components/tasks/TaskDialog.tsx`, `src/components/layout/AppLayout.tsx`, `src/hooks/useTheme.tsx`, `src/types/preferences.ts`, `src/repositories/local/LocalPreferencesRepository.ts`, `src/pages/Settings.tsx`, `src/styles/index.css`, the milestone 3 test (explicit List mode and scoped form selectors), and this README.
- **Verified:** real mouse drags into In Progress and Completed; status-based reopening; column-specific creation and completion timestamps; keyboard status selection; no duplicated or mutated task data when switching views; search by title/description, each priority/status filter, combined filters, no-match state, clear filters, all sort orders including missing due dates; saved view/sort through refresh and Settings; migration of theme-only preferences; theme preservation; failed-move data preservation; header search focus; responsive views at 1440, 820, 390, and 320 pixels; visual review of desktop and mobile screenshots. All browser test data stayed in isolated contexts.
- **Build/regression:** production build and TypeScript passed. Milestone 2 and 3 browser suites passed alongside the new workspace suite.
- **Known limits:** native dragging is intended for desktop mouse use; touch and keyboard users can use each task's status selector. Physical-device and non-Chrome testing have not been performed. There are no known blocking milestone 4 issues. Notification and calendar controls remain for their specified milestones.
- **Next:** Milestone 5, pending the next development instruction.

Run `node scripts/milestone4.smoke.mjs` with the same Playwright setup and running dev server described above. The selected task view and sorting can be set either in My Tasks or in Settings; both controls use the same saved preferences. On smaller screens, the Kanban region scrolls horizontally without expanding the page, and its status controls remain available without dragging.

## Workspace debugging audit — November 23, 2026

The audit covered the implemented milestone 1–4 source, persistence boundaries, navigation, task dialogs and operations, Kanban/List behavior, preference handling, dashboard date/quote, build setup, existing browser suites, dependency advisories, and credential-pattern checks. Later milestones remain intentionally unimplemented.

Reproduced and fixed:

1. **Malformed route crash:** a hash such as `#__proto__` indexed an inherited property on the page map. Routing now requires an own property and otherwise shows the existing recovery page.
2. **Stale dashboard date:** the quote maintained its own date while the heading was calculated only when the dashboard rendered. A shared local clock now refreshes the greeting, date, and quote at minute boundaries and when the page regains visibility/focus.
3. **Stale task edits/deletes:** a second tab could edit a task while the first tab still held its older record. Task mutations now include the version (`updatedAt`) seen by the caller; the repository rejects stale changes and retains an edit draft or deletion confirmation with a useful error. Repository subscriptions refresh task views when another tab updates storage.
4. **Preferences overwritten across tabs:** theme changes previously saved a whole preference object from stale component state. Preference changes now merge against current saved preferences and use repository subscriptions to refresh other tabs. Failed writes retain working session settings for subsequent changes.
5. **Mobile search navigation:** the header search left mobile navigation expanded and used a fixed delay to focus the input. Search now closes navigation and schedules focus after the Tasks route renders, with cleanup when navigation changes.

Changed files: `src/App.tsx`; `src/hooks/useLocalNow.ts` (new), `useTheme.tsx`, and `useTasks.tsx`; `src/pages/Dashboard.tsx`; `src/components/dashboard/DailyQuote.tsx`; `src/components/layout/AppLayout.tsx`; task collection/dialog callers; task/preferences repository contracts and implementations; and `src/services/storageService.ts`. Added `scripts/workspace.audit.mjs` with seven targeted browser regressions and updated this documentation.

Verification: the initial audit reproduced all five issues before fixes. All seven targeted regressions passed afterward, including stale-delete preservation and preference write-failure behavior. Milestone 2, 3, and 4 browser suites passed. TypeScript and the production build passed. The package security audit reported zero known advisories, and the project credential-pattern scan found no matching keys/tokens. Test browsers used isolated contexts; existing user tasks and preferences were not cleared or seeded.

Run the targeted audit with `node scripts/workspace.audit.mjs`, using the existing Playwright setup and a running local dev server. Tests cover Chrome and responsive viewport simulation; physical-device and other-browser behavior remains unverified. LocalStorage has no cross-tab database transaction guarantee: stale-version checks protect ordinary stale edits but do not claim atomic multi-tab transactions. No Milestone 5 features were added.

## Milestone 5 report

- **Implemented:** dashboard monthly calendar with previous/next month and Today; current-day and selected-day states; due-date indicators including completed tasks; selected-date task list; direct access to the existing task editor; creation with the selected date prefilled; sorted overdue and upcoming task deadlines; explicit due-today and overdue text; responsive supporting column and intentional mobile ordering. The shared Kanban/List board, search, filters, task counts, personal-section links, and daily quote remain available on the dashboard.
- **Date behavior:** date-only task fields remain `YYYY-MM-DD` strings. Calendar calculations use local numeric date fields and local noon, with no UTC parsing of due dates. Keyboard arrows move by day/week; Home/End select week boundaries; PageUp/PageDown change month and clamp to valid days. Tab visits a single date in the visible month. Monthly navigation preserves the selected date until another date or Today is chosen. The Today indicator and overdue groups follow the shared local clock through midnight.
- **Architecture:** no separate calendar data store, new dependency, or notification behavior. Calendar dates, selected-date tasks, and deadline groups are derived from the existing shared task provider. Date changes, completion/reopening, deletion, and cross-tab provider refreshes update those views. Existing repository validation, stale-edit protection, and save-failure feedback also apply to tasks opened from the calendar. Calendar creation is disabled while tasks are loading or unavailable.
- **Created:** `src/utils/calendar.ts`, `src/components/calendar/MonthCalendar.tsx`, `src/components/calendar/CalendarWorkspace.tsx`, `src/components/calendar/DeadlineList.tsx`, and `scripts/milestone5.smoke.mjs`.
- **Modified:** `src/pages/Dashboard.tsx`, `src/components/tasks/TaskDialog.tsx` (optional initial due date), `src/styles/index.css`, and this README.
- **Verified:** monthly and year-boundary navigation; Today; leap February; date indicators; selected-date task details; date-prefilled creation; due-date edits/removal; completion/reopening and deletion synchronization; exclusion of undated/completed tasks from active deadlines; due-date sorting and overdue/today labels; refresh persistence; local-midnight behavior in Manila and Los Angeles; keyboard navigation/focus; both themes; no horizontal page overflow at 820, 390, and 320 pixels. Screenshots at desktop and mobile widths were visually reviewed. All tests used isolated browser contexts and test-only data.
- **Build/regression:** TypeScript and Vite production build passed. Milestone 2, 3, and 4 browser suites and all seven workspace audit regressions passed alongside the calendar suite. No runtime errors were captured in the calendar suite.
- **Known limits:** physical-device and non-Chrome testing remain unverified. There are no known blocking milestone 5 issues. Notifications remain for milestone 6.
- **Next:** Milestone 6, pending the next development instruction.

Run `node scripts/milestone5.smoke.mjs` with the existing Playwright setup and running dev server described above. Desktop and mobile calendar previews are written into the ignored `artifacts/` folder. To use the calendar, select a date and use its add button, or open a task from the selected-date, overdue, or upcoming section. Dates without tasks remain selectable.

## Milestone 6 report

- **Implemented:** a header notification button and unread count; an accessible notification dialog; overdue, due-today, and due-soon reminders; opening the associated task in the existing editor; individual read and dismissal controls; mark-all-as-read; visible read/unread states; empty/loading/unavailable states; storage failure feedback; responsive light/dark styling and keyboard focus restoration.
- **Reminder policy:** due-soon means one to three local calendar days ahead. Completed/undated tasks and tasks more than three days away generate no current reminder. The identifier combines task ID, date-only deadline, and reminder type. An upcoming reminder can become a separate due-today or overdue reminder, once per type/deadline. An overdue reminder is not recreated every day. Read/dismiss state persists across rerenders and refreshes, including when a completed task is later reopened with the same deadline/type. Changed due dates use new identities. Deleted, completed, undated, rescheduled, and outdated-type reminders are hidden from the current panel.
- **Architecture:** eligibility is derived from the existing task provider and shared local-clock hook. A notification repository stores schema-version-1 records at `flowsync.notifications`, through the centralized storage service. Records store IDs, deadline/type, generation time, and read/dismiss timestamps; titles always come from the current task. Historical state is retained for deduplication and future export. There is no separate task database, new dependency, browser notification permission, push/email integration, service worker, or background delivery.
- **Reliability:** validation rejects malformed JSON, incompatible schemas, invalid records, and duplicate notification IDs without overwriting them. Read/dismiss actions merge with the latest saved state across tabs. Storage failures retain usable session-only reminders and actions with an explicit warning; those actions can be persisted when storage recovers. Unchanged state is not rewritten to LocalStorage.
- **Created:** `src/types/notification.ts`, `src/services/notificationService.ts`, `src/repositories/interfaces/NotificationRepository.ts`, `src/repositories/local/LocalNotificationRepository.ts`, `src/hooks/useNotifications.ts`, `src/components/notifications/NotificationCenter.tsx`, and `scripts/milestone6.smoke.mjs`.
- **Modified:** `src/components/layout/AppLayout.tsx` (notification access), `src/styles/index.css` (notification UI and compact mobile header spacing), and this README.
- **Verified:** correct reminder types and ordering; completed/undated/far-future exclusions; persistent deduplication, read, and dismissed state; task editing and completion through a reminder; date-edit and deletion invalidation; cross-tab state; local-midnight transitions in a negative UTC offset; mark-all-as-read; malformed/unsupported data preservation; quota failure/session behavior and recovery; both themes; responsive widths at desktop, 820, 390, and 320 pixels; Escape and focus restoration. Desktop/light/dark/mobile screenshots were visually reviewed. Tests used isolated browser contexts and did not seed or clear actual user data.
- **Build/regression:** TypeScript and Vite production build passed. Milestone 2, 3, 4, and 5 browser suites and all seven workspace audit checks passed alongside the reminder suite.
- **Known limits:** reminders are evaluated only while the app is open. They do not run when it is closed. Physical-device and non-Chrome testing remain unverified; LocalStorage does not provide atomic database transactions across simultaneous tabs. There are no known blocking milestone 6 issues.
- **Next:** Milestone 7, pending the next development instruction. Windows desktop packaging remains the final milestone (10).

Run `node scripts/milestone6.smoke.mjs` with the existing Playwright setup and local dev server described above. Notification screenshots are saved in the Git-ignored `artifacts/` directory. Use the bell in the header to review reminders; opening one also marks it as read. Dismissing one does not delete its task.

## Full debug pass — November 25, 2026

Ran every implemented milestone 2–6 browser suite and the existing workspace audit, then added targeted checks for storage resets and keyboard focus. The existing baseline passed; four additional assertions initially failed and now pass:

- **Cross-tab reminder-cache restoration:** a storage-clear event previously merged old in-memory reminder history back into cleared storage. Storage subscriptions now distinguish clear/remove events. The reminder hook drops cached history on reset and waits for refreshed tasks after a full clear, rather than regenerating records from the previous task snapshot.
- **Task status focus loss:** moving a task to another Kanban column remounted its controls and lost keyboard focus. Status actions now restore focus to the moved task's status/completion control after a save (or back to the search field when filtering removes the task).
- **Reminder dismissal focus loss:** removing the focused reminder left focus on a noninteractive part of its dialog. Dismiss actions now focus the next/previous reminder title or the close control if the list is empty.
- **Read-action focus loss:** read controls become disabled after use. Read actions now focus an enabled reminder title rather than leaving keyboard focus on a disabled control.

Files changed: `src/services/storageService.ts`, `src/repositories/interfaces/NotificationRepository.ts`, `src/hooks/useNotifications.ts`, `src/components/tasks/TaskItem.tsx`, `src/components/tasks/TaskCollection.tsx`, `src/components/notifications/NotificationCenter.tsx`, this README, and new `scripts/workspace.audit2.mjs`.

Verification: all milestone browser suites (2–6), the original seven audit checks, and all four new checks passed. TypeScript and Vite production build passed. The dependency advisory audit returned zero known vulnerabilities, and the credential-pattern scan found no matches. Tests ran in isolated Chrome contexts; no existing user data was cleared or replaced. Physical-device and non-Chrome behavior remains unverified. Milestone 7 was not started.

Run `node scripts/workspace.audit2.mjs` with the same Playwright configuration and running dev server described above to rerun the new regressions.

## Milestone 7 report

- **Daily Check-In:** create/edit one entry per local date; optional text-based mood selection, daily goal, reflection, and accomplishments; dated history; explicit save state; automatic loading of an existing check-in when its date is selected. Unsaved drafts remain available across in-app navigation. Switching dates or reloading a dirty draft asks before discarding it.
- **Daily Journal:** create multiple dated entries; edit title, date, and content; search titles/content; browse history; sort newest/oldest; confirm permanent deletion. An explicit New entry action creates a saved blank page (displayed as Untitled entry until named). Changes autosave after a 750 ms pause, with Save now/retry and clear unsaved/saving/saved/error feedback. Content formatting is preserved.
- **Draft protection:** the shared writing provider remains mounted across navigation. Journal saves flush when the page is hidden; unsaved writing triggers an unload warning. Failed writes retain the current draft. Revision checks reject stale edits/deletions without overwriting another tab's saved version. Reloading saved data asks before discarding a dirty draft. Unsaved drafts are held in memory, so a failed save must be resolved or copied before closing the browser; they are not claimed to survive a forced browser shutdown.
- **Persistence:** independent version-1 stores at `flowsync.journal` and `flowsync.checkins`, with stable IDs and created/updated timestamps. Both repositories have asynchronous contracts and storage subscriptions. All LocalStorage access remains centralized in `storageService`. Validation rejects malformed JSON, unsupported schemas, invalid dates/types/timestamps, duplicate IDs, and duplicate check-in dates without silently replacing data. Check-in uniqueness is rechecked on every save.
- **Created:** `src/types/writing.ts`; `src/repositories/interfaces/JournalRepository.ts` and `CheckInRepository.ts`; `src/repositories/local/LocalJournalRepository.ts` and `LocalCheckInRepository.ts`; `src/services/writingStorage.ts`; `src/hooks/useJournal.ts`, `useCheckIn.ts`, and `useWriting.tsx`; `scripts/milestone7.smoke.mjs`.
- **Modified:** `src/pages/CheckIn.tsx`, `src/pages/Journal.tsx`, `src/App.tsx`, `src/pages/Dashboard.tsx` (removed the obsolete writing-tools notice), `src/styles/index.css`, and this README. No dependencies added.
- **Verified:** check-in creation/editing/history, saved ID/date uniqueness, optional fields, refresh persistence, draft retention across navigation, stale check-in rejection, and unload warnings; journal creation/editing/autosave, navigation and refresh persistence, title/content search, date sorting, delete cancellation/confirmation, stale-tab conflict protection, quota failure/retry/recovery; independent stores; malformed/duplicate/invalid-date/schema preservation; both themes and responsive layouts at desktop, 820, 390, and 320 pixels. Desktop and mobile screenshots were visually reviewed. Test contexts were isolated from actual user data.
- **Build/regression:** TypeScript and production build passed. Milestone 2–6 browser suites and both workspace audit suites (eleven checks) passed alongside the milestone 7 suite. No runtime errors were captured in the writing test context.
- **Known limits:** check-ins use explicit saving; the journal autosaves. LocalStorage is not an atomic multi-tab database. Physical-device and non-Chrome testing remain unverified. There are no known blocking milestone 7 issues.
- **Next:** Milestone 8, pending the next development instruction. Windows desktop packaging remains milestone 10.

Run `node scripts/milestone7.smoke.mjs` with the existing Playwright setup and running dev server. Use Daily Check-In or Daily Journal in the sidebar to open the new tools. Screenshots are saved under the Git-ignored `artifacts/` directory.

## Milestone 8 report

- **Export:** Settings → Export JSON downloads a versioned backup with an export timestamp, tasks, journal entries, check-ins, preferences, and persistent reminder history/read/dismiss state. Pending journal and check-in drafts are saved first; a failed writing save or unreadable store blocks export with an error rather than silently omitting data.
- **Import:** Import JSON validates syntax, schema version, required fields, strict value types, task statuses/priorities, valid local dates and timestamps, unique IDs within each collection, unique check-in dates, complete preferences, and canonical notification identifiers. Valid files open a preview showing counts, export time, theme, and task view. Replacement requires explicit acknowledgement; cancellation leaves current data unchanged. Imports replace rather than merge. Historical reminder records may reference deleted tasks because they preserve deduplication state; only current unfinished tasks can produce visible reminders.
- **Clear:** Clear application data requires typing CLEAR. It removes FlowSync's saved tasks, writing, preferences, and reminder state, restores dark/Kanban/due-date defaults, resets in-memory providers, and preserves unrelated browser storage. Unsaved writing drafts require a separate discard acknowledgement for either replacement action.
- **Atomic storage:** existing installations keep using the five original keys until a confirmed import/clear. That action commits a complete versioned `flowsync.workspace` envelope using one atomic LocalStorage write. Ordinary repository reads/writes then use its logical stores through `storageService`; legacy keys are removed after the commit. If quota/permission/serialization fails before commit, the prior workspace remains untouched. If legacy cleanup fails after commit, an explicit warning reports it. No backend or new dependency was added. LocalStorage still does not provide concurrent multi-tab database transactions.
- **Draft/cache safety:** replacement remounts the current tab's providers without a browser reload, clearing old autosave timers and reminder caches. Other tabs refresh changed logical stores. Workspace generation checks prevent open task editors and dirty writing drafts from saving over a replacement import, even if entry IDs/timestamps are unchanged. Those drafts remain available to copy before reloading the imported version.
- **Backup schema:** top-level `schemaVersion: 1`, `exportedAt`, `tasks`, `journalEntries`, `checkIns`, `preferences`, and `notifications`. The backup format is independent of the internal workspace envelope. Invalid existing storage can be recovered through a valid confirmed import; unsafe export of corrupted data is blocked.
- **Created:** `src/types/backup.ts`, `src/services/importService.ts`, `src/services/exportService.ts`, `src/components/settings/DataManagement.tsx`, `src/hooks/useWorkspaceReset.tsx`, and `scripts/milestone8.smoke.mjs`.
- **Modified:** `src/services/storageService.ts`; `src/App.tsx`; `src/pages/Settings.tsx`; task/journal/check-in repository generation contracts and implementations; the notification repository's read contract/implementation; journal/check-in hooks for replacement protection and export save results; `src/hooks/useNotifications.ts`; `src/components/tasks/TaskDialog.tsx`; `src/styles/index.css`; and this README. Existing user changes outside this scope were preserved.
- **Verified:** actual JSON download and all five data groups round-tripping; syntax/version/field/type/date/status/ID validation; import preview, cancellation, acknowledgement, and dirty-draft protection; appearance/view/sort restoration; atomic quota failure with byte-for-byte preservation of the old workspace; cross-tab dirty-check-in and task-editor protection; confirmed clearing and cancellation; unrelated storage preservation; post-import editing/persistence; post-clear task creation/persistence; corrupted envelope recovery; dark/light and responsive layouts at 820, 390, and 320 pixels. Screenshots were visually reviewed. Tests used isolated contexts and did not import into or clear actual user data.
- **Build/regression:** milestone 2–8 browser suites and both audit suites (eleven audit checks) passed. TypeScript and Vite production build passed. No runtime errors were captured in the main import/export test context.
- **Known limits:** physical-device and non-Chrome testing remain unverified. Browser storage quota still applies to the full workspace. There are no known blocking milestone 8 issues.
- **Next:** Milestone 9, pending the next instruction. Windows desktop packaging remains the final milestone (10).

Run `node scripts/milestone8.smoke.mjs` with the existing Playwright setup and dev server. The suite downloads temporary JSON files, imports test fixtures, simulates failures, and clears only its isolated browser contexts. Settings preview screenshots are written to the ignored `artifacts/` directory.

## Milestone 9 report

- **Repeatable verification:** `pnpm verify` runs formatting, strict TypeScript, production build, all milestone 2–9 browser suites, both audit suites, and the persistence regression suite against its own production preview. It cleans up only the preview process it launched and reports failures with a nonzero exit code. The runner waits for its own server announcement and bounds suite execution to prevent silent hangs.
- **Accessibility/responsive review:** axe-core checks all five pages in dark/light themes at 1440, 820, and 320 pixels, plus task, notification, clear, import-preview, and journal-delete dialogs (35 scans per browser). The suite checks page overflow, keyboard containment, hidden file-input tab stops, and core task persistence while external requests are blocked. Existing suites additionally cover 390-pixel layouts, keyboard status changes, calendar navigation, Escape/focus restoration, validation, error states, and destructive confirmations. Desktop/mobile screenshots were visually reviewed. The 19 design restrictions remain unchanged.
- **Persistence fixes:** a deterministic interleaving test reproduced task saves overwriting concurrent journal writes after import. Normal updates now write only their own generation-specific logical store, leaving the import snapshot immutable. Import/clear still commits one atomic snapshot and removes previous generation records. A second regression verifies that replacement during a save removes the obsolete write, retains the editor draft, and reports the conflict. These changes preserve existing legacy storage and the version-1 backup format.
- **Keyboard/browser fixes:** calendar keyboard focus now updates during the render commit, allowing rapid consecutive keypresses across month boundaries. Dialogs explicitly wrap Tab/Shift+Tab through enabled controls; hidden file inputs are no longer tab stops. Removing a drag-time pointer-events rule fixed native task dragging in Edge while preserving the status-control alternative and drag feedback.
- **Cleanup:** removed the unused `FeatureState` placeholder component, obsolete compact-task branches, and their unused styles. Applied checked-in Prettier formatting across source/tests/configuration and standardized Git text line endings. Existing user content, including daily quotes, was preserved.
- **Tooling/files:** added `.prettierrc.json`, `.gitattributes`, `scripts/verify.mjs`, `scripts/milestone9.smoke.mjs`, and `scripts/persistence.refinement.mjs`. Added Playwright, axe-core's Playwright integration, and Prettier as development dependencies; updated `package.json`/`pnpm-lock.yaml`. Behavioral changes are concentrated in storage, calendar, modal, import input, and task workspace components; other source/test changes primarily improve formatting and browser selection. Updated this README's setup, verification, and storage documentation.
- **Security/dependencies:** the updated dependency audit reported zero known advisories, and the credential-pattern scan found no matches. Core application use makes no external service requests; the new testing dependencies do not enter the production browser bundle.
- **Verification:** final production verification passed in both Chrome and Microsoft Edge: formatting, TypeScript, production build, all milestone 2–9 suites, both audit suites, persistence regressions, keyboard containment, and external-request-blocked core use. Axe reported zero violations across 35 scans in each browser. All tests used isolated contexts, including tests that import/clear data. Actual user browser data was not seeded or cleared. This supersedes earlier reports that listed Edge testing as unverified.
- **Limits:** automated accessibility checks do not certify complete accessibility. Manual screen-reader/physical-device testing and Safari/Firefox are unverified. Same-store simultaneous multi-tab writes remain subject to LocalStorage's lack of database transactions; ordinary stale edits are rejected by revision checks. Desktop installation is milestone 10.
- **Status:** no known blocking web-build or runtime issues remain in the verified scope. Milestone 9 is complete. Milestone 10 completion is documented below.

## Windows installation and development

The release targets Windows 10/11 x64, consistent with [Electron platform support](https://github.com/electron/electron#platform-support). This workspace is tested on Windows 11 x64; Windows 10 and ARM hardware have not been tested. Users do not need Node.js, a web server, or internet access to install from the full installer and use the app.

Open `release/FlowSync-Setup-0.1.0-x64.exe`, choose an installation folder and the optional desktop shortcut, and launch FlowSync from the Start menu or shortcut. Installation is for the current Windows user and requests no administrator elevation. The full installer bundles the application and runtime. The installer and executables are currently unsigned: Windows may show an unknown-publisher or SmartScreen prompt. Public signed distribution requires your own code-signing certificate; no certificate or signing password is included in this repository.

For development/builds on Windows x64:

```sh
pnpm install --frozen-lockfile
pnpm desktop
pnpm desktop:pack
pnpm desktop:dist
pnpm verify:desktop
```

- `desktop` installs the official Electron runtime if absent, builds React, and opens the native app. It uses the production bundle, so restart the command after source changes; Vite hot reload remains available through `pnpm dev` for web development.
- `desktop:pack` builds an unpacked Windows application at `release/win-unpacked/FlowSync.exe`. Keep that entire folder together.
- `desktop:dist` builds the full NSIS installer in `release/`. Build tools download Electron/NSIS components on the first build; subsequent ordinary app use is offline. Bump `package.json` version for releases, retain the app ID/product name/origin/profile path, and run the new installer to upgrade. Automatic updates are not configured.
- `verify:desktop` exercises the packaged app with a fresh temporary profile, including an actual web-export-to-desktop-import transfer. It briefly starts its own local preview only to produce the browser backup, then stops it before desktop testing. It never uses your normal browser or desktop profile. Test windows can appear without taking focus. Screenshots and reports are ignored under `artifacts/`.
- `verify:installer` performs installation/upgrade/uninstallation checks in a workspace test folder. It refuses to run if FlowSync is already installed or its shortcuts exist, and removes the test installation afterward. Before running it, build the 0.1.0 release, then create a separate test-only 0.1.1 installer with the command below. The project version remains 0.1.0; do not distribute the upgrade-test artifact.

```sh
pnpm exec electron-builder --config electron-builder.json --config.extraMetadata.version=0.1.1 --config.directories.output=release/upgrade-test --win nsis --x64
pnpm verify:installer
```

No Rust, Visual Studio C++ build tools, or separate database is required by the current app. The checked-in Windows icon is compiled from `public/favicon.svg`; `pnpm desktop:icon` regenerates it using installed Chrome.

### Desktop data and browser transfer

FlowSync stores desktop data in `%APPDATA%\FlowSync`, with Chromium local storage under `Local Storage/leveldb`. The stable `app://flowsync` origin and profile path keep data independent of the installation folder and version. Do not edit LevelDB files by hand or copy them while the app is running. Use JSON backups for transfers and recovery. Desktop data is local and is not encrypted by FlowSync.

To bring existing browser data across:

1. Open the browser version containing your data. In Settings, choose **Export JSON** and keep the downloaded backup.
2. Open the desktop app. In Settings, choose **Import JSON** and select that backup.
3. Review its counts and confirm replacement. Import replaces the destination workspace; export any existing desktop data first if needed.

Browser and desktop workspaces are independent and do not sync automatically. Desktop export uses a native Save dialog; importing uses the normal file picker. The same validated backup format works in both directions. Journal autosave and manual check-in saving keep their existing behavior. Closing with unsaved writing asks whether to keep writing or discard it. Reminders are in-app only while FlowSync is running; there is no background tray process, system push, or startup task.

Uninstall through Windows Settings → Apps → Installed apps → FlowSync. Normal uninstall removes program files and shortcuts while retaining local data for reinstallation. For a full data removal, use **Clear application data** inside FlowSync before uninstalling, or remove `%APPDATA%\FlowSync` yourself after closing/uninstalling. Keep a JSON backup before clearing data or upgrading.

### Desktop implementation notes

The sandboxed renderer has context isolation enabled, Node integration disabled, and no preload/IPC bridge. A [registered standard secure protocol](https://www.electronjs.org/docs/latest/api/protocol/) serves an allowlisted set of bundled asset types within `dist`; a restrictive Content Security Policy, denied permissions, request filter, blocked new windows, and navigation checks prevent the app from loading remote pages or arbitrary local files. These choices follow [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security/). The [NSIS configuration](https://www.electron.build/nsis/) uses an assisted per-user installer with shortcut selection and preserves user data on normal uninstall.

Electron and packaging tools are development dependencies and are pinned by `pnpm-lock.yaml`. Targeted minimatch overrides in `pnpm-workspace.yaml` address [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) in two build-tool consumers; they use compatible named APIs and should be removed once upstream ranges include the fix. The unused Squirrel installer dependency's build script is explicitly disabled; this project builds NSIS installers. Keep Electron and packaging dependencies updated and rerun web, desktop, and installer verification for releases.

## Milestone 10 completion report

- **Delivered:** Electron 45.5.0 native Windows window, bundled offline assets/fonts, the existing React interface and all five pages, FlowSync executable/installer icons, a full per-user NSIS installer with desktop/Start menu shortcuts, single-instance behavior, native backup file dialogs, and unsaved-writing close protection. No backend, account, new product features, or design changes were introduced.
- **Verified on Windows 11 x64:** the unpacked and installed executables passed browser-to-desktop backup transfer, all page navigation, task CRUD/native drag-and-drop/status/completion/search/sort/views, calendar task prefill and overdue display, reminder read state, check-in saving, journal autosave/history/search/sort/deletion, theme persistence, desktop backup export, typed clearing/restoration, and graceful restart persistence across all saved data domains. Remote/local-file requests, path traversal, popups, and external navigation were rejected; the renderer has no Node globals. Native window screenshots were visually reviewed.
- **Installer lifecycle:** silent per-user installation created its registration and both shortcuts; a separately built 0.1.1 test installer upgraded 0.1.0 and retained all saved data. Uninstall removed program files, registration, and shortcuts, preserved a marker in the default data directory and the isolated test profile, and reinstall recovered all saved data. The test installation and marker were removed afterward. The interactive install wizard and SmartScreen experience were not manually tested.
- **Regression checks:** `pnpm verify` passed formatting, TypeScript, production build, all previous milestone/audit suites, persistence-race checks, and 35 automated accessibility scans with no violations in Chrome. The new desktop suite and installer lifecycle suite passed. The dependency audit reported no known advisories after the targeted build-tool fix. Earlier milestone 9 also passed Edge; its full suite was not repeated for this packaging change.
- **Artifacts:** `release/FlowSync-Setup-0.1.0-x64.exe` is the installer; `release/win-unpacked/FlowSync.exe` is the unpacked launcher. `release/SHA256SUMS.txt` records the installer checksum. Desktop and installer reports/screenshots are in ignored `artifacts/`. Build outputs and test backups are Git-ignored; distribute the installer through a release attachment rather than committing it to source control.
- **Limits:** the installer is unsigned, automatic updates are not configured, and Windows 10/ARM, other operating systems, manual screen readers, and physical touch devices remain unverified. Normal uninstall retains data by design. The web and desktop workspaces are independent; JSON export/import is the supported transfer path.
- **Status:** all ten milestones are complete within the verified scope. The Windows installer is ready for local use and review.
