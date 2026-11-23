# FlowSync

Personal productivity and task management.

FlowSync is a local personal productivity workspace for task and deadline management, calendar integration, daily journaling, and check-ins. It is built incrementally with React, TypeScript, Vite, Tailwind CSS, and Lucide React.

The FlowSync name replaces the original project name. All previously established features, architecture requirements, milestone boundaries, and 19 design restrictions remain unchanged.

## Current milestone

**Milestone 5 — Dashboard and calendar.** Task creation, editing, confirmed deletion, completion/reopening, priorities, statuses, optional descriptions, and local due dates now work on My Tasks and the dashboard. The dashboard shows the shared Kanban/List task workspace and counts derived from all saved tasks. My Tasks keeps every task accessible, including completed tasks. Reusable native dialogs provide keyboard focus containment, Escape handling, validation, and save-failure feedback.

Task operations use an asynchronous repository contract and a versioned LocalStorage implementation at `flowsync.tasks`. Components and hooks never access LocalStorage directly. Changes appear after a successful save. Missing storage starts empty; malformed, incompatible, invalid-date, or duplicate-ID records block mutations without overwriting existing data. Failed writes preserve the editor draft and previously saved tasks.

The responsive shell, five navigation destinations, light/dark themes, saved appearance, and offline daily quote remain available. Navigation uses native hash links and browser history, with no routing dependency. Direct links such as `/#/tasks` work with Vite or a static host. Unknown routes offer a recovery link.

My Tasks now offers Kanban and List views over the same repository. Search matches titles and descriptions; priority and status filters combine with search and apply to both views. Clear filters resets all three. Sort by ascending due date (undated tasks last), priority (high first), creation (newest first), or title. View switching preserves the active filters and does not alter task records. The dashboard combines the task board with a monthly calendar, selected-date task details/creation, and sorted overdue/upcoming deadlines. Calendar and deadlines derive directly from the task repository. Completed tasks remain on their calendar dates but are excluded from active deadline lists; undated tasks appear in neither. Reminders, journal/check-in tools, and import/export remain in later milestones. No sample tasks are seeded into user storage.

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
pnpm typecheck
pnpm build
pnpm preview
```

The build checks TypeScript and writes the production bundle to `dist/`. Preview serves that bundle locally, normally at http://127.0.0.1:4173. npm equivalents are `npm run typecheck`, `npm run build`, and `npm run preview`.

Milestone 2 includes `scripts/milestone2.smoke.mjs`. It uses Playwright with an installed Chrome browser. Supply an existing Playwright module through `FLOWSYNC_PLAYWRIGHT_MODULE`, or install Playwright in your test environment. Run `node scripts/milestone2.smoke.mjs` while the development server is running. `FLOWSYNC_TEST_URL` optionally changes the test URL. Screenshots are written to the Git-ignored `artifacts/` directory. Test storage uses isolated browser contexts and does not alter your browsing profile.

Milestone 1 verification: dependency installation and `pnpm build` passed using Node.js 24.22.3 and pnpm 11.25.0. The Vite development server started successfully at http://127.0.0.1:5173. The startup page and icon rendered in the in-app browser, with no browser console warnings or errors captured.

## Project structure

```text
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

Empty directories contain `.gitkeep` files to preserve the planned structure in Git. Components and hooks do not access LocalStorage directly. `LocalPreferencesRepository` validates schema version 1 at `flowsync.preferences`; `storageService` owns JSON parsing and storage access. Reads never silently replace invalid data. A deliberate theme change can save a valid preference, and write failures leave a working session theme with feedback. The task repository now uses the same centralized service with task-specific error messages. Journal and check-in repositories remain for later milestones.

## Next milestone

Milestone 6 adds in-app deadline reminders, persistent deduplication, a notification panel, read state, and dismissal. Development stops after Milestone 5 until the next instruction.

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
