import type { StorageChange } from '../../services/storageService'
import type { NotificationRecord, ReminderCandidate } from '../../types/notification'
export type NotificationAction = 'read' | 'dismiss'
export interface NotificationRepository {
  list(): NotificationRecord[]
  reconcile(candidates: ReminderCandidate[], session: NotificationRecord[]): NotificationRecord[]
  update(
    session: NotificationRecord[],
    ids: string[],
    action: NotificationAction,
  ): NotificationRecord[]
  subscribe(onChange: (change: StorageChange) => void): () => void
}
