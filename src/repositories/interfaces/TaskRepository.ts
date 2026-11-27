import type { Task, TaskInput } from '../../types/task'

export interface TaskRepository {
  generation(): string
  subscribe(onChange: () => void): () => void
  list(): Promise<Task[]>
  create(input: TaskInput): Promise<Task>
  update(id: string, input: TaskInput, expectedUpdatedAt?: string): Promise<Task>
  delete(id: string, expectedUpdatedAt?: string): Promise<void>
}
