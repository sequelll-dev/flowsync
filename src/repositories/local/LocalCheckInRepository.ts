import type { CheckInRepository } from '../interfaces/CheckInRepository'
import {
  assertRevision,
  isCheckIn,
  nextTimestamp,
  readWriting,
  writeWriting,
} from '../../services/writingStorage'
import { isLocalDate } from '../../utils/taskValidation'
import { storageService } from '../../services/storageService'
import { moods } from '../../types/writing'
const key = 'flowsync.checkins'
export const checkInRepository: CheckInRepository = {
  generation() {
    return storageService.generation()
  },
  async list() {
    return readWriting(key, isCheckIn, true)
  },
  async save(input, previous) {
    if (
      !isLocalDate(input.date) ||
      !moods.includes(input.mood) ||
      ![input.dailyGoal, input.reflection, input.accomplishments].every(
        (value) => typeof value === 'string',
      )
    )
      throw new Error('Enter a valid date, mood, and text for your check-in.')
    const records = readWriting(key, isCheckIn, true)
    const current = records.find((record) => record.date === input.date)
    if (previous) assertRevision(current, previous)
    else if (current)
      throw new Error(
        'A check-in for this date already exists. Copy your draft and reload the saved check-in before editing it.',
      )
    const now = nextTimestamp(current)
    const entry = {
      ...input,
      dailyGoal: input.dailyGoal.trim(),
      reflection: input.reflection.trim(),
      accomplishments: input.accomplishments.trim(),
      id: current?.id ?? crypto.randomUUID(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    writeWriting(
      key,
      current
        ? records.map((record) => (record.id === current.id ? entry : record))
        : [...records, entry],
    )
    return entry
  },
  subscribe(onChange) {
    return storageService.subscribe(key, onChange)
  },
}
