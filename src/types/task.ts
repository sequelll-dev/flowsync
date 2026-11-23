export const priorities = ['high', 'medium', 'low'] as const
export const statuses = ['todo', 'in_progress', 'completed'] as const
export type Priority = typeof priorities[number]
export type TaskStatus = typeof statuses[number]
export interface TaskInput {
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  dueDate?: string
}
export interface Task extends TaskInput {
  id: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}
export const statusLabels: Record<TaskStatus, string> = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' }
export const priorityLabels: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }
