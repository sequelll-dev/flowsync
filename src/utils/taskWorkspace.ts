import type { Priority, Task, TaskStatus } from '../types/task'
import type { TaskSort } from '../types/preferences'
export interface TaskFilters {
  query: string
  priority: Priority | ''
  status: TaskStatus | ''
}
export function selectTasks(tasks: Task[], filters: TaskFilters, sort: TaskSort): Task[] {
  const query = filters.query.trim().toLocaleLowerCase()
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  return tasks
    .filter(
      (task) =>
        (!filters.priority || task.priority === filters.priority) &&
        (!filters.status || task.status === filters.status) &&
        (!query || `${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => {
      let result = 0
      if (sort === 'title') result = a.title.localeCompare(b.title)
      if (sort === 'priority') result = rank[a.priority] - rank[b.priority]
      if (sort === 'createdAt') result = b.createdAt.localeCompare(a.createdAt)
      if (sort === 'dueDate') result = (a.dueDate ?? '99999').localeCompare(b.dueDate ?? '99999')
      return result || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
    })
}
export function formatTaskDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}
