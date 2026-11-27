export interface DatedRecord {
  id: string
  date: string
  createdAt: string
  updatedAt: string
}
export interface JournalInput {
  date: string
  title: string
  content: string
}
export interface JournalEntry extends DatedRecord, JournalInput {}
export const moods = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'] as const
export type Mood = (typeof moods)[number]
export interface CheckInInput {
  date: string
  mood: Mood
  dailyGoal: string
  reflection: string
  accomplishments: string
}
export interface CheckIn extends DatedRecord, CheckInInput {}
