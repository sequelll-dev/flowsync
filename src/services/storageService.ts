export interface StorageResult<T> { value: T; error: string | null; missing?: boolean }

export const storageService = {
  subscribe(key: string, onChange: () => void): () => void {
    function changed(event: StorageEvent) {
      if (event.key === key || event.key === null) onChange()
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  },
  read(key: string, errorMessage?: string): StorageResult<unknown> {
    try {
      const raw = window.localStorage.getItem(key)
      return { value: raw === null ? null : JSON.parse(raw) as unknown, error: null, missing: raw === null }
    } catch {
      return { value: null, error: errorMessage ?? 'Saved appearance could not be read. Dark mode is being used. Choose a theme to save a new preference.' }
    }
  },
  write(key: string, value: unknown, errorMessage?: string): string | null {
    try {
      const serialized = JSON.stringify(value)
      if (window.localStorage.getItem(key) !== serialized) window.localStorage.setItem(key, serialized)
      return null
    } catch {
      return errorMessage ?? 'Your theme changed for this session, but could not be saved. Check browser storage permissions or available space.'
    }
  },
}
