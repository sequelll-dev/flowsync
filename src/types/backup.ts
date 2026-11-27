import type { Task } from './task'
import type { CheckIn, JournalEntry } from './writing'
import type { Preferences } from './preferences'
import type { NotificationRecord } from './notification'
export interface Backup {
  schemaVersion: 1
  exportedAt: string
  tasks: Task[]
  journalEntries: JournalEntry[]
  checkIns: CheckIn[]
  preferences: Preferences
  notifications: NotificationRecord[]
}
