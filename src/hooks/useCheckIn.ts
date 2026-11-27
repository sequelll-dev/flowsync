import { useCallback, useEffect, useRef, useState } from 'react'
import type { CheckIn, CheckInInput } from '../types/writing'
import { checkInRepository } from '../repositories/local/LocalCheckInRepository'
import { localDateKey } from '../utils/calendar'
const empty = (date: string): CheckInInput => ({
  date,
  mood: '',
  dailyGoal: '',
  reflection: '',
  accomplishments: '',
})
export function useCheckInState() {
  const generation = useRef<string | null>(null)
  const [entries, setEntries] = useState<CheckIn[]>([])
  const [draft, setDraft] = useState<CheckInInput>(() => empty(localDateKey(new Date())))
  const [previous, setPrevious] = useState<CheckIn | undefined>()
  const [dirty, setDirty] = useState(false)
  const unsaved = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Not saved yet')
  const reload = useCallback(async () => {
    try {
      const records = await checkInRepository.list()
      setEntries(records)
      setReady(true)
      return records
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-ins could not be loaded.')
      setReady(false)
      return null
    }
  }, [])
  useEffect(() => {
    void reload()
    return checkInRepository.subscribe(() => {
      void reload()
    })
  }, [reload])
  useEffect(() => {
    if (dirty) return
    const saved = entries.find((entry) => entry.date === draft.date)
    generation.current = checkInRepository.generation()
    setPrevious(saved)
    setDraft(saved ?? empty(draft.date))
    setStatus(saved ? 'Saved on this device' : 'Not saved yet')
  }, [entries, dirty, draft.date])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  function edit(patch: Partial<CheckInInput>) {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
    unsaved.current = true
    setStatus('Unsaved changes')
  }
  function select(date: string) {
    if (dirty && !window.confirm('Discard unsaved check-in changes and switch dates?')) return
    setDirty(false)
    unsaved.current = false
    setError(null)
    const saved = entries.find((entry) => entry.date === date)
    generation.current = checkInRepository.generation()
    setPrevious(saved)
    setDraft(saved ?? empty(date))
    setStatus(saved ? 'Saved on this device' : 'Not saved yet')
  }
  async function save() {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    try {
      if (dirty && generation.current !== checkInRepository.generation())
        throw new Error(
          'The workspace was replaced in another tab. Copy your draft, then reload saved check-ins.',
        )
      const saved = await checkInRepository.save(draft, previous)
      setPrevious(saved)
      setDraft(saved)
      setDirty(false)
      unsaved.current = false
      setEntries(await checkInRepository.list())
      setError(null)
      setStatus('Saved on this device')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-in could not be saved.')
      setStatus('Not saved — retry')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function loadSaved() {
    if (dirty && !window.confirm('Discard this unsaved check-in draft and load saved data?')) return
    const records = await reload()
    if (records) {
      setDirty(false)
      unsaved.current = false
      setError(null)
      const saved = records.find((entry) => entry.date === draft.date)
      generation.current = checkInRepository.generation()
      setPrevious(saved)
      setDraft(saved ?? empty(draft.date))
      setStatus(saved ? 'Saved on this device' : 'Not saved yet')
    }
  }
  return { entries, draft, dirty, ready, busy, error, status, edit, select, save, loadSaved }
}
