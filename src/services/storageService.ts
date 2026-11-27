export interface StorageChange {
  cleared: boolean
  removed: boolean
  replaced?: boolean
}
export interface StorageResult<T> {
  value: T
  error: string | null
  missing?: boolean
}
export const workspaceKey = 'flowsync.workspace'
export const storeKeys = [
  'flowsync.tasks',
  'flowsync.journal',
  'flowsync.checkins',
  'flowsync.preferences',
  'flowsync.notifications',
] as const
const overlayPrefix = 'flowsync.store.'
function overlayKey(revision: string, key: string) {
  return `${overlayPrefix}${revision}.${key}`
}
interface Workspace {
  schemaVersion: 1
  revision: string
  stores: Record<string, string | null>
}
function decode(raw: string | null): Workspace | null {
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (
    !value ||
    typeof value !== 'object' ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('revision' in value) ||
    typeof value.revision !== 'string' ||
    !value.revision ||
    !('stores' in value) ||
    !value.stores ||
    typeof value.stores !== 'object'
  )
    throw new Error('Invalid workspace storage.')
  for (const key of storeKeys)
    if (
      !(key in value.stores) ||
      ((value.stores as Record<string, unknown>)[key] !== null &&
        typeof (value.stores as Record<string, unknown>)[key] !== 'string')
    )
      throw new Error('Invalid workspace store.')
  return value as Workspace
}
function workspace() {
  return decode(window.localStorage.getItem(workspaceKey))
}
export const storageService = {
  generation() {
    try {
      return workspace()?.revision ?? 'legacy'
    } catch {
      return 'unavailable'
    }
  },
  subscribe(key: string, onChange: (change: StorageChange) => void): () => void {
    function changed(event: StorageEvent) {
      if (event.key === workspaceKey) {
        try {
          const before = decode(event.oldValue),
            after = decode(event.newValue)
          const replaced = before?.revision !== after?.revision
          if (replaced || before?.stores[key] !== after?.stores[key])
            onChange({ cleared: !after, removed: !after?.stores[key], replaced })
        } catch {
          onChange({ cleared: false, removed: false, replaced: true })
        }
      } else if (event.key?.startsWith(overlayPrefix)) {
        try {
          const current = workspace()
          if (current && event.key === overlayKey(current.revision, key))
            onChange({ cleared: false, removed: event.newValue === null })
        } catch {
          onChange({ cleared: false, removed: false })
        }
      } else if (event.key === null) onChange({ cleared: true, removed: true, replaced: true })
      else if (event.key === key && window.localStorage.getItem(workspaceKey) === null)
        onChange({ cleared: false, removed: event.newValue === null })
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  },
  read(key: string, errorMessage?: string): StorageResult<unknown> {
    try {
      const current = workspace()
      const raw = current
        ? (window.localStorage.getItem(overlayKey(current.revision, key)) ??
          current.stores[key] ??
          null)
        : window.localStorage.getItem(key)
      return {
        value: raw === null ? null : (JSON.parse(raw) as unknown),
        error: null,
        missing: raw === null,
      }
    } catch {
      return {
        value: null,
        error:
          errorMessage ?? 'Saved preferences could not be read. Existing data has been preserved.',
      }
    }
  },
  write(key: string, value: unknown, errorMessage?: string): string | null {
    try {
      const serialized = JSON.stringify(value),
        current = workspace()
      if (current) {
        const target = overlayKey(current.revision, key)
        const existing = window.localStorage.getItem(target) ?? current.stores[key]
        if (existing !== serialized) window.localStorage.setItem(target, serialized)
        if (workspace()?.revision !== current.revision) {
          window.localStorage.removeItem(target)
          return 'The workspace was replaced while saving. Your draft is still available; reload before trying again.'
        }
      } else {
        if (window.localStorage.getItem(key) !== serialized)
          window.localStorage.setItem(key, serialized)
        if (workspace()) {
          window.localStorage.removeItem(key)
          return 'The workspace was replaced while saving. Your draft is still available; reload before trying again.'
        }
      }
      return null
    } catch {
      return (
        errorMessage ??
        'Changes apply to this session only because browser storage could not be updated.'
      )
    }
  },
  replace(values: Record<(typeof storeKeys)[number], unknown | null>): string | null {
    // One atomic setItem commits the entire workspace. Existing storage remains
    // untouched if serialization, permissions, or quota checks fail.
    const oldOverlays = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index),
    ).filter(
      (key): key is string =>
        !!key &&
        key.startsWith(overlayPrefix) &&
        storeKeys.some((store) => key.endsWith('.' + store)),
    )
    const stores: Record<string, string | null> = {}
    for (const key of storeKeys)
      stores[key] = values[key] === null ? null : JSON.stringify(values[key])
    window.localStorage.setItem(
      workspaceKey,
      JSON.stringify({ schemaVersion: 1, revision: crypto.randomUUID(), stores }),
    )
    try {
      for (const key of [...storeKeys, ...oldOverlays]) window.localStorage.removeItem(key)
    } catch {
      return 'The workspace was replaced, but some legacy storage could not be removed. Retry clearing after checking browser permissions.'
    }
    return null
  },
}
