import type { Backup } from '../types/backup'
import { isTask } from '../utils/taskValidation'
import { isCheckIn, isJournal } from './writingStorage'
import { isNotificationRecord } from './notificationService'
import { sortOptions } from '../types/preferences'
import { storageService } from './storageService'
export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== 'object') throw new Error('The backup must be a JSON object.')
  const data = value as Record<string, unknown>
  if (data.schemaVersion !== 1)
    throw new Error('Unsupported backup schema version. FlowSync expects version 1.')
  if (
    typeof data.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.exportedAt)) ||
    new Date(data.exportedAt).toISOString() !== data.exportedAt
  )
    throw new Error('The backup has an invalid export timestamp.')
  const fields = [
    ['tasks', isTask],
    ['journalEntries', isJournal],
    ['checkIns', isCheckIn],
    ['notifications', isNotificationRecord],
  ] as const
  for (const [name, valid] of fields) {
    const records = data[name]
    if (!Array.isArray(records) || !records.every(valid))
      throw new Error(
        `The ${name} field is missing or contains invalid records, types, dates, or timestamps.`,
      )
    if (new Set(records.map((record) => record.id)).size !== records.length)
      throw new Error(`The ${name} field contains duplicate identifiers.`)
  }
  const checkIns = data.checkIns as Backup['checkIns']
  if (new Set(checkIns.map((entry) => entry.date)).size !== checkIns.length)
    throw new Error('The backup contains multiple check-ins for the same date.')
  const preferences = data.preferences
  if (
    !preferences ||
    typeof preferences !== 'object' ||
    !('theme' in preferences) ||
    (preferences.theme !== 'dark' && preferences.theme !== 'light') ||
    !('taskView' in preferences) ||
    (preferences.taskView !== 'kanban' && preferences.taskView !== 'list') ||
    !('taskSort' in preferences) ||
    !sortOptions.some((sort) => sort === preferences.taskSort)
  )
    throw new Error('The backup has missing or invalid preferences.')
  return {
    schemaVersion: 1,
    exportedAt: data.exportedAt,
    tasks: data.tasks as Backup['tasks'],
    journalEntries: data.journalEntries as Backup['journalEntries'],
    checkIns,
    preferences: preferences as Backup['preferences'],
    notifications: data.notifications as Backup['notifications'],
  }
}
export function parseBackup(text: string): Backup {
  let value: unknown
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('This file is not valid JSON. Choose a FlowSync JSON export.')
  }
  return validateBackup(value)
}
export function replaceBackup(data: Backup): string | null {
  const backup = validateBackup(data)
  return storageService.replace({
    'flowsync.tasks': { schemaVersion: 1, tasks: backup.tasks },
    'flowsync.journal': { schemaVersion: 1, records: backup.journalEntries },
    'flowsync.checkins': { schemaVersion: 1, records: backup.checkIns },
    'flowsync.preferences': { schemaVersion: 1, preferences: backup.preferences },
    'flowsync.notifications': { schemaVersion: 1, records: backup.notifications },
  })
}
export function clearWorkspace(): string | null {
  return storageService.replace({
    'flowsync.tasks': null,
    'flowsync.journal': null,
    'flowsync.checkins': null,
    'flowsync.preferences': null,
    'flowsync.notifications': null,
  })
}
