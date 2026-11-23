import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Preferences, TaskSort, TaskView, Theme } from '../types/preferences'
import { preferencesRepository } from '../repositories/local/LocalPreferencesRepository'

interface PreferenceContextValue extends Preferences {
  setTheme: (theme: Theme) => void
  setTaskView: (view: TaskView) => void
  setTaskSort: (sort: TaskSort) => void
  error: string | null
}
const PreferenceContext = createContext<PreferenceContextValue | null>(null)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => preferencesRepository.load())
  const [preferences, setPreferences] = useState(initial.value)
  const current = useRef(initial.value)
  const saveFailed = useRef(false)
  const [error, setError] = useState<string | null>(initial.error)
  const { theme } = preferences
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101214' : '#F5F5F0')
  }, [theme])
  useEffect(() => preferencesRepository.subscribe(() => {
    const latest = preferencesRepository.load()
    setError(latest.error)
    if (!latest.error) {
      current.current = latest.value
      saveFailed.current = false
      setPreferences(latest.value)
    }
  }), [])
  function change(patch: Partial<Preferences>) {
    const latest = preferencesRepository.load()
    // Merge with current storage, retaining session preferences when writes fail.
    const next = { ...(!latest.error && !saveFailed.current ? latest.value : current.current), ...patch }
    current.current = next
    setPreferences(next)
    const failure = preferencesRepository.save(next)
    saveFailed.current = !!failure
    setError(failure)
  }
  return <PreferenceContext.Provider value={{ ...preferences, error,
    setTheme: theme => change({ theme }), setTaskView: taskView => change({ taskView }), setTaskSort: taskSort => change({ taskSort }),
  }}>{children}</PreferenceContext.Provider>
}
export function usePreferences() {
  const context = useContext(PreferenceContext)
  if (!context) throw new Error('Preferences must be used inside ThemeProvider.')
  return context
}
export const useTheme = usePreferences
