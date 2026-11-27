import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useJournalState } from './useJournal'
import { useCheckInState } from './useCheckIn'
interface WritingState {
  journal: ReturnType<typeof useJournalState>
  checkIn: ReturnType<typeof useCheckInState>
}
const WritingContext = createContext<WritingState | null>(null)
export function WritingProvider({ children }: { children: ReactNode }) {
  const journal = useJournalState()
  const checkIn = useCheckInState()
  return <WritingContext.Provider value={{ journal, checkIn }}>{children}</WritingContext.Provider>
}
export function useWriting() {
  const state = useContext(WritingContext)
  if (!state) throw new Error('Writing tools require WritingProvider.')
  return state
}
