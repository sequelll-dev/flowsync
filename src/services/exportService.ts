import { taskRepository } from '../repositories/local/LocalTaskRepository'
import { journalRepository } from '../repositories/local/LocalJournalRepository'
import { checkInRepository } from '../repositories/local/LocalCheckInRepository'
import { preferencesRepository } from '../repositories/local/LocalPreferencesRepository'
import { notificationRepository } from '../repositories/local/LocalNotificationRepository'
import { validateBackup } from './importService'
import type { Backup } from '../types/backup'
export async function exportBackup(): Promise<Backup> {
  const preferences = preferencesRepository.load()
  if (preferences.error) throw new Error(preferences.error)
  const [tasks, journalEntries, checkIns] = await Promise.all([
    taskRepository.list(),
    journalRepository.list(),
    checkInRepository.list(),
  ])
  return validateBackup({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    journalEntries,
    checkIns,
    preferences: preferences.value,
    notifications: notificationRepository.list(),
  })
}
export function downloadBackup(backup: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `flowsync-backup-${backup.exportedAt.replace(/[:.]/g, '-')}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
