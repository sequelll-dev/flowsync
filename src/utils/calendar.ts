import type { Task } from '../types/task'

export function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
export function monthStart(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1, 12) }
export function shiftMonth(date: Date, amount: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate()
  first.setDate(Math.min(date.getDate(), lastDay))
  return first
}
export function monthCells(month: Date): (string | null)[][] {
  const first = monthStart(month)
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate()
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let day = 1; day <= total; day++) cells.push(localDateKey(new Date(first.getFullYear(), first.getMonth(), day, 12)))
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))
}
export function tasksByDate(tasks: Task[]): Map<string, Task[]> {
  const dates = new Map<string, Task[]>()
  tasks.forEach(task => {
    if (task.dueDate) dates.set(task.dueDate, [...(dates.get(task.dueDate) ?? []), task])
  })
  return dates
}
export function deadlineGroups(tasks: Task[], today: string) {
  const dated = tasks.filter((task): task is Task & { dueDate: string } => !!task.dueDate && task.status !== 'completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  return { overdue: dated.filter(task => task.dueDate < today), upcoming: dated.filter(task => task.dueDate >= today) }
}
