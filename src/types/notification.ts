import type { Task } from './task'
export const reminderTypes = ['overdue', 'due_today', 'upcoming'] as const
export type ReminderType = (typeof reminderTypes)[number]
export const reminderLabels: Record<ReminderType, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  upcoming: 'Due soon',
}
export interface ReminderCandidate {
  id: string
  taskId: string
  dueDate: string
  type: ReminderType
}
export interface NotificationRecord extends ReminderCandidate {
  createdAt: string
  readAt?: string
  dismissedAt?: string
}
export interface TaskNotification extends NotificationRecord {
  task: Task
}
