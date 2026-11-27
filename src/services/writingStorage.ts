import { storageService } from './storageService'
import { isLocalDate } from '../utils/taskValidation'
import { moods } from '../types/writing'
import type { CheckIn, DatedRecord, JournalEntry } from '../types/writing'
function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}
function base(value: unknown): value is DatedRecord {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    !!item.id.trim() &&
    isLocalDate(item.date) &&
    timestamp(item.createdAt) &&
    timestamp(item.updatedAt) &&
    item.createdAt <= item.updatedAt
  )
}
export function isJournal(value: unknown): value is JournalEntry {
  return (
    base(value) &&
    'title' in value &&
    typeof value.title === 'string' &&
    'content' in value &&
    typeof value.content === 'string'
  )
}
export function isCheckIn(value: unknown): value is CheckIn {
  if (!base(value)) return false
  const item = value as unknown as Record<string, unknown>
  return (
    moods.some((mood) => mood === item.mood) &&
    ['dailyGoal', 'reflection', 'accomplishments'].every((field) => typeof item[field] === 'string')
  )
}
export function readWriting<T extends DatedRecord>(
  key: string,
  valid: (value: unknown) => value is T,
  uniqueDates = false,
): T[] {
  const result = storageService.read(
    key,
    'Saved writing could not be read. Existing data has been preserved.',
  )
  if (result.error) throw new Error(result.error)
  if (result.missing) return []
  const data = result.value
  if (
    typeof data !== 'object' ||
    !data ||
    !('schemaVersion' in data) ||
    data.schemaVersion !== 1 ||
    !('records' in data) ||
    !Array.isArray(data.records) ||
    !data.records.every(valid) ||
    new Set(data.records.map((record) => record.id)).size !== data.records.length ||
    (uniqueDates && new Set(data.records.map((record) => record.date)).size !== data.records.length)
  )
    throw new Error(
      'Saved writing has an invalid or unsupported format. Existing data has been preserved; changes are blocked until it is restored.',
    )
  return data.records
}
export function writeWriting(key: string, records: DatedRecord[]) {
  const error = storageService.write(
    key,
    { schemaVersion: 1, records },
    'Writing could not be saved. Your draft is still here. Check browser storage permissions or available space, then retry.',
  )
  if (error) throw new Error(error)
}
export function nextTimestamp(previous?: DatedRecord) {
  return new Date(
    Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0),
  ).toISOString()
}
export function assertRevision(
  current: DatedRecord | undefined,
  previous: DatedRecord,
): asserts current is DatedRecord {
  if (!current || current.id !== previous.id || current.updatedAt !== previous.updatedAt)
    throw new Error(
      'This entry changed or was deleted in another tab. Copy your draft before reloading the saved entry.',
    )
}
