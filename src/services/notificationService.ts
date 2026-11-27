import type { Task } from '../types/task'
import { reminderTypes } from '../types/notification'
import type { NotificationRecord, ReminderCandidate, ReminderType } from '../types/notification'
import { isLocalDate } from '../utils/taskValidation'

export function reminderId(taskId: string, dueDate: string, type: ReminderType): string {
  return JSON.stringify([taskId, dueDate, type])
}
function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}
export function getReminders(tasks: Task[], today: string): ReminderCandidate[] {
  return tasks
    .flatMap((task) => {
      if (!task.dueDate || task.status === 'completed') return []
      const days = dayNumber(task.dueDate) - dayNumber(today)
      if (days > 3) return []
      const type: ReminderType = days < 0 ? 'overdue' : days === 0 ? 'due_today' : 'upcoming'
      return [
        {
          id: reminderId(task.id, task.dueDate, type),
          taskId: task.id,
          dueDate: task.dueDate,
          type,
        },
      ]
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))
}
export function mergeReminders(
  records: NotificationRecord[],
  candidates: ReminderCandidate[],
): NotificationRecord[] {
  const ids = new Set(records.map((record) => record.id))
  const now = new Date().toISOString()
  return [
    ...records,
    ...candidates
      .filter((candidate) => !ids.has(candidate.id))
      .map((candidate) => ({ ...candidate, createdAt: now })),
  ]
}
function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}
export function isNotificationRecord(value: unknown): value is NotificationRecord {
  if (typeof value !== 'object' || !value) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.taskId === 'string' &&
    !!record.taskId.trim() &&
    isLocalDate(record.dueDate) &&
    reminderTypes.some((type) => type === record.type) &&
    record.id === reminderId(record.taskId, record.dueDate, record.type as ReminderType) &&
    timestamp(record.createdAt) &&
    (record.readAt === undefined || timestamp(record.readAt)) &&
    (record.dismissedAt === undefined || timestamp(record.dismissedAt))
  )
}

// Read/dismiss actions are monotonic: merge saved and session state without reviving a reminder.
export function mergeNotificationState(
  saved: NotificationRecord[],
  session: NotificationRecord[],
): NotificationRecord[] {
  const result = new Map(saved.map((record) => [record.id, record]))
  session.forEach((record) => {
    const existing = result.get(record.id)
    result.set(
      record.id,
      existing
        ? {
            ...existing,
            readAt: existing.readAt ?? record.readAt,
            dismissedAt: existing.dismissedAt ?? record.dismissedAt,
          }
        : record,
    )
  })
  return [...result.values()]
}
