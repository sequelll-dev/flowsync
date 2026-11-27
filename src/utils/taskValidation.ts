import { priorities, statuses } from '../types/task'
import type { Task, TaskInput } from '../types/task'

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    year >= 1000 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function normalizeTask(input: TaskInput): TaskInput {
  if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('Enter a task title.')
  if (!priorities.includes(input.priority) || !statuses.includes(input.status))
    throw new Error('Choose a valid priority and status.')
  if (input.description !== undefined && typeof input.description !== 'string')
    throw new Error('Description must be text.')
  if (input.dueDate !== undefined && input.dueDate !== '' && !isLocalDate(input.dueDate))
    throw new Error('Enter a valid due date.')
  return {
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    priority: input.priority,
    status: input.status,
    dueDate: input.dueDate || undefined,
  }
}

function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}
export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Record<string, unknown>
  return (
    typeof task.id === 'string' &&
    !!task.id.trim() &&
    typeof task.title === 'string' &&
    !!task.title.trim() &&
    (task.description === undefined || typeof task.description === 'string') &&
    priorities.some((priority) => priority === task.priority) &&
    statuses.some((status) => status === task.status) &&
    (task.dueDate === undefined || isLocalDate(task.dueDate)) &&
    timestamp(task.createdAt) &&
    timestamp(task.updatedAt) &&
    task.createdAt <= task.updatedAt &&
    (task.status === 'completed'
      ? timestamp(task.completedAt) &&
        task.completedAt >= task.createdAt &&
        task.completedAt <= task.updatedAt
      : task.completedAt === undefined)
  )
}
