import type { JournalRepository } from '../interfaces/JournalRepository'
import {
  assertRevision,
  isJournal,
  nextTimestamp,
  readWriting,
  writeWriting,
} from '../../services/writingStorage'
import { isLocalDate } from '../../utils/taskValidation'
import { storageService } from '../../services/storageService'
import type { JournalInput } from '../../types/writing'
const key = 'flowsync.journal'
function validate(input: JournalInput) {
  if (
    !isLocalDate(input.date) ||
    typeof input.title !== 'string' ||
    typeof input.content !== 'string'
  )
    throw new Error('Enter a valid date and text for your journal entry.')
}
export const journalRepository: JournalRepository = {
  generation() {
    return storageService.generation()
  },
  async list() {
    return readWriting(key, isJournal)
  },
  async create(input) {
    validate(input)
    const records = readWriting(key, isJournal)
    const now = nextTimestamp()
    const entry = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    writeWriting(key, [...records, entry])
    return entry
  },
  async update(entry) {
    validate(entry)
    const records = readWriting(key, isJournal)
    const current = records.find((record) => record.id === entry.id)
    assertRevision(current, entry)
    const saved = { ...entry, createdAt: current.createdAt, updatedAt: nextTimestamp(current) }
    writeWriting(
      key,
      records.map((record) => (record.id === entry.id ? saved : record)),
    )
    return saved
  },
  async delete(entry) {
    const records = readWriting(key, isJournal)
    assertRevision(
      records.find((record) => record.id === entry.id),
      entry,
    )
    writeWriting(
      key,
      records.filter((record) => record.id !== entry.id),
    )
  },
  subscribe(onChange) {
    return storageService.subscribe(key, onChange)
  },
}
