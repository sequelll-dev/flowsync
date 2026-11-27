import type { StorageChange } from '../../services/storageService'
import type { JournalEntry, JournalInput } from '../../types/writing'
export interface JournalRepository {
  generation(): string
  list(): Promise<JournalEntry[]>
  create(input: JournalInput): Promise<JournalEntry>
  update(entry: JournalEntry): Promise<JournalEntry>
  delete(entry: JournalEntry): Promise<void>
  subscribe(onChange: (change: StorageChange) => void): () => void
}
