import type { PreferencesRepository } from '../interfaces/PreferencesRepository'
import { storageService } from '../../services/storageService'
import { sortOptions } from '../../types/preferences'
import type { Preferences, TaskSort } from '../../types/preferences'

const key = 'flowsync.preferences'
const defaults: Preferences = { theme: 'dark', taskView: 'kanban', taskSort: 'dueDate' }
export const preferencesRepository: PreferencesRepository = {
  subscribe(onChange) {
    return storageService.subscribe(key, onChange)
  },
  load() {
    const result = storageService.read(key)
    if (result.error || result.missing) return { value: defaults, error: result.error }
    const data = result.value
    if (
      typeof data === 'object' &&
      data !== null &&
      'schemaVersion' in data &&
      data.schemaVersion === 1 &&
      'preferences' in data &&
      typeof data.preferences === 'object' &&
      data.preferences !== null &&
      'theme' in data.preferences &&
      (data.preferences.theme === 'dark' || data.preferences.theme === 'light')
    ) {
      const saved = data.preferences as Record<string, unknown>
      if (
        (saved.taskView === undefined ||
          saved.taskView === 'kanban' ||
          saved.taskView === 'list') &&
        (saved.taskSort === undefined || sortOptions.some((option) => option === saved.taskSort))
      ) {
        return {
          value: {
            theme: data.preferences.theme,
            taskView: saved.taskView === 'list' ? 'list' : 'kanban',
            taskSort: (saved.taskSort as TaskSort | undefined) ?? 'dueDate',
          },
          error: null,
        }
      }
    }
    return {
      value: defaults,
      error:
        'Saved preferences have an unsupported format. Choose a preference to save a new setting.',
    }
  },
  save(preferences) {
    return storageService.write(
      key,
      { schemaVersion: 1, preferences },
      'Your preferences changed for this session, but could not be saved. Check browser storage permissions or available space.',
    )
  },
}
