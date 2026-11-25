import type { NotificationRepository } from '../interfaces/NotificationRepository'
import type { NotificationRecord } from '../../types/notification'
import { isNotificationRecord, mergeReminders, mergeNotificationState } from '../../services/notificationService'
import { storageService } from '../../services/storageService'
const key = 'flowsync.notifications'
function load(): NotificationRecord[] {
  const result = storageService.read(key, 'Saved reminder state could not be read. It has been preserved; reminder changes will apply only to this session.')
  if (result.error) throw new Error(result.error)
  if (result.missing) return []
  const value = result.value
  if (typeof value !== 'object' || !value || !('schemaVersion' in value) || value.schemaVersion !== 1 ||
    !('records' in value) || !Array.isArray(value.records) || !value.records.every(isNotificationRecord) ||
    new Set(value.records.map(record => record.id)).size !== value.records.length) {
    throw new Error('Saved reminder state has an invalid or unsupported format. It has been preserved; changes will apply only to this session.')
  }
  return value.records
}
function save(records: NotificationRecord[]) {
  const error = storageService.write(key, { schemaVersion: 1, records }, 'Reminder changes could not be saved. They apply to this session only. Check browser storage permissions or available space.')
  if (error) throw new Error(error)
}
export const notificationRepository: NotificationRepository = {
  reconcile(candidates, session) {
    const current = mergeNotificationState(load(), session)
    const merged = mergeReminders(current, candidates)
    if (merged.length) save(merged)
    return merged
  },
  update(session, ids, action) {
    const now = new Date().toISOString()
    const records = mergeNotificationState(load(), session).map(record => ids.includes(record.id) ? {
      ...record, readAt: record.readAt ?? now, ...(action === 'dismiss' ? { dismissedAt: record.dismissedAt ?? now } : {}),
    } : record)
    save(records)
    return records
  },
  subscribe(onChange) { return storageService.subscribe(key, onChange) },
}
