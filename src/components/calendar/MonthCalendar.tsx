import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../../types/task'
import { formatTaskDate } from '../../utils/taskWorkspace'
import { localDate, localDateKey, monthCells, monthStart, shiftMonth } from '../../utils/calendar'

interface Props {
  month: Date; selected: string; today: string; dates: Map<string, Task[]>
  onMonth: (month: Date) => void; onSelect: (date: string) => void
}
export function MonthCalendar({ month, selected, today, dates, onMonth, onSelect }: Props) {
  const key = localDateKey(monthStart(month)).slice(0, 7)
  const tabDate = selected.startsWith(key) ? selected : `${key}-01`
  function move(date: string, event: KeyboardEvent<HTMLButtonElement>) {
    const next = localDate(date)
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -next.getDay(), End: 6 - next.getDay() }
    let target: Date
    if (Object.hasOwn(offsets, event.key)) { next.setDate(next.getDate() + offsets[event.key]); target = next }
    else if (event.key === 'PageUp' || event.key === 'PageDown') target = shiftMonth(next, event.key === 'PageUp' ? -1 : 1)
    else return
    event.preventDefault()
    if (target.getFullYear() < 1000 || target.getFullYear() > 9999) return
    const nextKey = localDateKey(target)
    onMonth(monthStart(target)); onSelect(nextKey)
    window.requestAnimationFrame(() => document.getElementById(`calendar-${nextKey}`)?.focus())
  }
  return <section className="month-calendar" aria-labelledby="calendar-title">
    <div className="calendar-heading"><h2 id="calendar-title">Calendar</h2><button type="button" className="text-link calendar-today" onClick={() => { onMonth(monthStart(localDate(today))); onSelect(today) }}>Today</button></div>
    <div className="calendar-month-controls"><button type="button" className="icon-button" aria-label="Previous month" disabled={key === '1000-01'} onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
      <h3 id="calendar-month" aria-live="polite">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}</h3>
      <button type="button" className="icon-button" aria-label="Next month" disabled={key === '9999-12'} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button></div>
    <table className="calendar-table" aria-labelledby="calendar-month"><thead><tr>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => <th key={day} scope="col"><abbr title={day}>{day.slice(0, 2)}</abbr></th>)}</tr></thead>
      <tbody>{monthCells(month).map((week, index) => <tr key={index}>{week.map((date, index) => {
        if (!date) return <td key={`blank-${index}`} />
        const tasks = dates.get(date) ?? []
        const overdue = date < today && tasks.some(task => task.status !== 'completed')
        return <td key={date}><button id={`calendar-${date}`} type="button" tabIndex={date === tabDate ? 0 : -1}
          aria-label={`${formatTaskDate(date)}, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}${overdue ? ', overdue tasks' : ''}`}
          aria-pressed={selected === date} aria-current={date === today ? 'date' : undefined}
          className={`calendar-day ${overdue ? 'has-overdue' : ''}`} onKeyDown={event => move(date, event)} onClick={() => onSelect(date)}>
          <span>{Number(date.slice(-2))}</span>{tasks.length > 0 && <span className="calendar-task-dot" aria-hidden="true" />}
        </button></td>
      })}</tr>)}</tbody></table>
    <p className="calendar-hint">Dots mark task dates. Use arrow keys to select a day.</p>
  </section>
}
