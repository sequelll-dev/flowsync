import type { TaskRepository } from '../interfaces/TaskRepository'
import type { Task, TaskInput } from '../../types/task'
import { storageService } from '../../services/storageService'
import { isTask, normalizeTask } from '../../utils/taskValidation'

const key = 'flowsync.tasks'
function read(): Task[] {
  const result = storageService.read(key, 'Saved tasks could not be read. Existing data has been preserved. Check browser storage access or restore your data before trying again.')
  if (result.error) throw new Error(result.error)
  if (result.missing) return []
  const value = result.value
  if (typeof value !== 'object' || !value || !('schemaVersion' in value) || value.schemaVersion !== 1 ||
    !('tasks' in value) || !Array.isArray(value.tasks) || !value.tasks.every(isTask) ||
    new Set(value.tasks.map(task => task.id)).size !== value.tasks.length) {
    throw new Error('Saved tasks have an invalid or unsupported format. Existing data has been preserved; task changes are blocked until the data is restored.')
  }
  return value.tasks
}
function write(tasks: Task[]) {
  const error = storageService.write(key, { schemaVersion: 1, tasks }, 'Tasks could not be saved. Check browser storage permissions or free some space, then try again. Your saved tasks have not changed.')
  if (error) throw new Error(error)
}
function update(id: string, input: TaskInput, expectedUpdatedAt?: string): Task {
  const data = normalizeTask(input)
  const tasks = read()
  const current = tasks.find(task => task.id === id)
  if (!current) throw new Error('This task no longer exists. Reload tasks to see the latest data.')
  if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) throw new Error('This task changed in another tab. Copy your draft, then close and reopen the editor before saving.')
  const now = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString()
  const task: Task = { ...current, ...data, updatedAt: now,
    completedAt: data.status === 'completed' ? current.completedAt ?? now : undefined }
  write(tasks.map(item => item.id === id ? task : item))
  return task
}
export const taskRepository: TaskRepository = {
  subscribe(onChange) { return storageService.subscribe(key, onChange) },
  async list() { return read() },
  async create(input) {
    const data = normalizeTask(input)
    const tasks = read()
    const now = new Date().toISOString()
    const task: Task = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
      completedAt: data.status === 'completed' ? now : undefined }
    write([...tasks, task])
    return task
  },
  async update(id, input, expectedUpdatedAt) { return update(id, input, expectedUpdatedAt) },
  async delete(id, expectedUpdatedAt) {
    const tasks = read()
    if (!tasks.some(task => task.id === id)) throw new Error('This task no longer exists. Reload tasks to see the latest data.')
    if (expectedUpdatedAt && tasks.find(task => task.id === id)?.updatedAt !== expectedUpdatedAt) throw new Error('This task changed in another tab. Close this confirmation and review the latest task before deleting.')
    write(tasks.filter(task => task.id !== id))
  },
}
