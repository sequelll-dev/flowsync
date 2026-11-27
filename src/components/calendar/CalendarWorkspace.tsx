import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Task } from '../../types/task'
import { useTasks } from '../../hooks/useTasks'
import { deadlineGroups, localDateKey, monthStart, tasksByDate } from '../../utils/calendar'
import { formatTaskDate } from '../../utils/taskWorkspace'
import { TaskDialog } from '../tasks/TaskDialog'
import { MonthCalendar } from './MonthCalendar'
import { DeadlineList } from './DeadlineList'

export function CalendarWorkspace({ now }: { now: Date }) {
  const { tasks, loading, ready, saving } = useTasks()
  const today = localDateKey(now)
  const [month, setMonth] = useState(() => monthStart(now))
  const [selected, setSelected] = useState(today)
  const [editor, setEditor] = useState<{ task?: Task; date?: string } | null>(null)
  const dates = tasksByDate(ready ? tasks : [])
  const deadlines = deadlineGroups(ready ? tasks : [], today)
  const open = (task: Task) => setEditor({ task })
  return (
    <div className="calendar-workspace">
      <MonthCalendar
        month={month}
        today={today}
        selected={selected}
        dates={dates}
        onMonth={setMonth}
        onSelect={setSelected}
      />
      <section className="selected-date-panel" aria-label="Selected date tasks">
        <div className="selected-date-heading">
          <h2>{formatTaskDate(selected)}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={`Add task for ${formatTaskDate(selected)}`}
            disabled={!ready || loading || saving}
            onClick={() => setEditor({ date: selected })}
          >
            <Plus size={18} />
          </button>
        </div>
        {loading ? (
          <p className="deadline-empty" role="status">
            Loading dated tasks…
          </p>
        ) : !ready ? (
          <p className="deadline-empty">
            Task data is unavailable. Reload tasks in the task workspace.
          </p>
        ) : (
          <DeadlineList
            title="Due on selected date"
            tasks={dates.get(selected) ?? []}
            today={today}
            onOpen={open}
            selectedDate
          />
        )}
      </section>
      {ready && !loading && (
        <div className="deadlines-panel">
          <DeadlineList
            title="Overdue"
            tasks={deadlines.overdue}
            today={today}
            onOpen={open}
            overdue
          />
          <DeadlineList
            title="Upcoming deadlines"
            tasks={deadlines.upcoming}
            today={today}
            onOpen={open}
          />
        </div>
      )}
      {editor && (
        <TaskDialog
          task={editor.task}
          initialDueDate={editor.date}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
