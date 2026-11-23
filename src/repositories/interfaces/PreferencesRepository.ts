import type { Preferences } from '../../types/preferences'
import type { StorageResult } from '../../services/storageService'

export interface PreferencesRepository {
  subscribe(onChange: () => void): () => void
  load(): StorageResult<Preferences>
  save(preferences: Preferences): string | null
}
