import type { Task } from '../../types/task'
import { priorityLabels, statusLabels } from '../../types/task'
import { formatTaskDate } from '../../utils/taskWorkspace'

export function DeadlineList({ title, tasks, today, onOpen, overdue = false, selectedDate = false }: {
  title: string; tasks: Task[]; today: string; onOpen: (task: Task) => void; overdue?: boolean; selectedDate?: boolean
}) {
  return <section className={`deadline-section ${overdue ? 'overdue-section' : ''}`} aria-label={title}>
    <h3>{title} <span className="deadline-count">{tasks.length}</span></h3>
    {tasks.length === 0 ? <p className="deadline-empty">{selectedDate ? 'No tasks due on this date.' : overdue ? 'No overdue tasks.' : 'No upcoming deadlines.'}</p> :
      <ul className="deadline-list">{tasks.map(task => <li key={task.id}><button type="button" className="deadline-task" aria-label={`Open task ${task.title}`} onClick={() => onOpen(task)}>
        <span className={task.status === 'completed' ? 'deadline-title completed-title' : 'deadline-title'}>{task.title}</span>
        <span className="deadline-meta"><span className={`priority-${task.priority}`}>{priorityLabels[task.priority]} priority</span><span>{statusLabels[task.status]}</span></span>
        {task.dueDate && <span className={`deadline-date ${task.status !== 'completed' && task.dueDate < today ? 'overdue-text' : ''}`}>
          {task.status === 'completed' ? 'Completed · ' : task.dueDate < today ? 'Overdue · ' : task.dueDate === today ? 'Due today · ' : 'Due '}
          <time dateTime={task.dueDate}>{formatTaskDate(task.dueDate)}</time></span>}
      </button></li>)}</ul>}
  </section>
}
