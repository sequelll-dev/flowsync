import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Task, TaskInput } from '../types/task'
import { taskRepository } from '../repositories/local/LocalTaskRepository'

interface TaskContextValue {
  tasks: Task[]; loading: boolean; saving: boolean; error: string | null; ready: boolean
  reload: () => Promise<void>
  save: (input: TaskInput, id?: string, expectedUpdatedAt?: string) => Promise<boolean>
  remove: (id: string, expectedUpdatedAt?: string) => Promise<boolean>
}
const TaskContext = createContext<TaskContextValue | null>(null)
export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const reload = useCallback(async () => {
    setLoading(true)
    try { setTasks(await taskRepository.list()); setError(null); setReady(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tasks could not be loaded.'); setReady(false) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload(); return taskRepository.subscribe(() => { void reload() }) }, [reload])
  async function mutate(action: () => Promise<unknown>) {
    if (busy.current) return false
    busy.current = true; setSaving(true); setError(null)
    try { await action(); setTasks(await taskRepository.list()); return true }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Task changes could not be saved.'); return false }
    finally { busy.current = false; setSaving(false) }
  }
  return <TaskContext.Provider value={{ tasks, loading, ready, saving, error, reload,
    save: (input, id, expectedUpdatedAt) => mutate(() => id ? taskRepository.update(id, input, expectedUpdatedAt) : taskRepository.create(input)),
    remove: (id, expectedUpdatedAt) => mutate(() => taskRepository.delete(id, expectedUpdatedAt)),
  }}>{children}</TaskContext.Provider>
}
export function useTasks() {
  const context = useContext(TaskContext)
  if (!context) throw new Error('useTasks must be used inside TaskProvider.')
  return context
}
