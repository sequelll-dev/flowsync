export type Theme = 'dark' | 'light'
export type TaskView = 'kanban' | 'list'
export const sortOptions = ['dueDate', 'priority', 'createdAt', 'title'] as const
export type TaskSort = (typeof sortOptions)[number]
export const sortLabels: Record<TaskSort, string> = {
  dueDate: 'Due date',
  priority: 'Priority',
  createdAt: 'Newest first',
  title: 'Title',
}
export interface Preferences {
  theme: Theme
  taskView: TaskView
  taskSort: TaskSort
}
