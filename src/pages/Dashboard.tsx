import { CalendarWorkspace } from '../components/calendar/CalendarWorkspace'
import { useLocalNow } from '../hooks/useLocalNow'
import { DailyQuote } from '../components/dashboard/DailyQuote'
import { ArrowRight, BookOpen, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { TaskCollection } from '../components/tasks/TaskCollection'

export function Dashboard() {
  const now = useLocalNow()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.'
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  return (
    <div className="dashboard-page">
      <PageHeader
        title={greeting}
        description="A little space to put your day in order."
        detail={date}
      />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <TaskCollection />
          <aside className="daily-space" aria-labelledby="daily-space-title">
            <h2 id="daily-space-title">A moment for yourself</h2>
            <a className="workspace-link" href="#/check-in">
              <ClipboardCheck size={21} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3>Daily Check-In</h3>
                <p>Set an intention. Reflect on the day.</p>
              </div>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="workspace-link" href="#/journal">
              <BookOpen size={21} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3>Daily Journal</h3>
                <p>Make room for your thoughts.</p>
              </div>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </aside>
        </div>
        <aside className="dashboard-support" aria-label="Calendar and deadlines">
          <CalendarWorkspace now={now} />
        </aside>
      </div>
      <footer className="dashboard-footer">
        <p className="workspace-footnote">
          FlowSync <span aria-hidden="true">·</span> Your personal workspace, taking shape.
        </p>
        <DailyQuote date={now} />
      </footer>
    </div>
  )
}
