import { useCallback, useEffect, useRef, useState } from 'react'
import type { JournalEntry } from '../types/writing'
import { journalRepository } from '../repositories/local/LocalJournalRepository'
import { localDateKey } from '../utils/calendar'
const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Journal changes could not be saved.'
export function useJournalState() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [draft, setDraftState] = useState<JournalEntry | null>(null)
  const current = useRef<JournalEntry | null>(null)
  const generation = useRef<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const unsaved = useRef(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('No entry selected')
  const setDraft = (entry: JournalEntry | null) => {
    current.current = entry
    setDraftState(entry)
  }
  const reload = useCallback(async () => {
    try {
      setEntries(await journalRepository.list())
      setReady(true)
    } catch (cause) {
      setError(message(cause))
      setReady(false)
    }
  }, [])
  useEffect(() => {
    void reload()
    return journalRepository.subscribe((change) => {
      if ((change.replaced || change.cleared) && !unsaved.current) {
        setDraft(null)
        setStatus('No entry selected')
      }
      void reload()
    })
  }, [reload])
  const save = useCallback(async () => {
    if (!unsaved.current) return true
    if (lock.current || !current.current) return false
    const snapshot = current.current
    lock.current = true
    setBusy(true)
    setStatus('Saving…')
    try {
      if (generation.current !== journalRepository.generation())
        throw new Error(
          'The workspace was replaced in another tab. Copy your draft, then reload the saved journal before continuing.',
        )
      const saved = await journalRepository.update(snapshot)
      setEntries(await journalRepository.list())
      setError(null)
      if (current.current?.id === snapshot.id) {
        const same =
          current.current.title === snapshot.title &&
          current.current.content === snapshot.content &&
          current.current.date === snapshot.date
        setDraft({ ...current.current, createdAt: saved.createdAt, updatedAt: saved.updatedAt })
        unsaved.current = !same
        setDirty(!same)
        setStatus(same ? 'Saved on this device' : 'Unsaved changes')
      }
      return !unsaved.current
    } catch (cause) {
      setError(message(cause))
      setStatus('Not saved — retry')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  useEffect(() => {
    if (!dirty || !draft) return
    const timer = window.setTimeout(() => {
      void save()
    }, 750)
    return () => window.clearTimeout(timer)
  }, [draft, dirty, save])
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (unsaved.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function flush() {
      if (document.visibilityState === 'hidden') void save()
    }
    const hide = () => {
      void save()
    }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('pagehide', hide)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('beforeunload', warn)
      window.removeEventListener('pagehide', hide)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [save])
  async function select(entry: JournalEntry) {
    if (entry.id === current.current?.id) return
    if (!(await save())) return
    generation.current = journalRepository.generation()
    setDraft(entry)
    setDirty(false)
    unsaved.current = false
    setError(null)
    setStatus('Saved on this device')
  }
  async function create() {
    if (lock.current || !(await save()) || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const entry = await journalRepository.create({
        date: localDateKey(new Date()),
        title: '',
        content: '',
      })
      setEntries(await journalRepository.list())
      generation.current = journalRepository.generation()
      setDraft(entry)
      setDirty(false)
      unsaved.current = false
      setStatus('Saved on this device')
      setError(null)
    } catch (cause) {
      setError(message(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function edit(patch: Partial<Pick<JournalEntry, 'title' | 'content' | 'date'>>) {
    if (!current.current) return
    setDraft({ ...current.current, ...patch })
    unsaved.current = true
    setDirty(true)
    setStatus('Unsaved changes')
  }
  async function remove() {
    if (lock.current || !current.current) return false
    lock.current = true
    setBusy(true)
    try {
      if (generation.current !== journalRepository.generation())
        throw new Error(
          'The workspace was replaced in another tab. Reload the saved journal before deleting.',
        )
      await journalRepository.delete(current.current)
      setDraft(null)
      setDirty(false)
      unsaved.current = false
      setEntries(await journalRepository.list())
      setError(null)
      setStatus('Entry deleted')
      return true
    } catch (cause) {
      setError(message(cause))
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function loadSaved() {
    if (
      unsaved.current &&
      !window.confirm('Discard this unsaved journal draft and load the saved version?')
    )
      return
    try {
      const records = await journalRepository.list()
      setEntries(records)
      const saved = records.find((entry) => entry.id === current.current?.id) ?? null
      generation.current = journalRepository.generation()
      setDraft(saved)
      setDirty(false)
      unsaved.current = false
      setReady(true)
      setError(null)
      setStatus(saved ? 'Saved on this device' : 'No entry selected')
    } catch (cause) {
      setError(message(cause))
    }
  }
  return {
    entries,
    draft,
    dirty,
    busy,
    ready,
    error,
    status,
    edit,
    select,
    create,
    save,
    remove,
    loadSaved,
  }
}
