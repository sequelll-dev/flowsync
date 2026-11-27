import { DataManagement } from '../components/settings/DataManagement'
import { sortLabels, sortOptions } from '../types/preferences'
import type { TaskSort, TaskView } from '../types/preferences'
import { Check, Moon, Sun } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../types/preferences'

export function Settings() {
  const { theme, setTheme, error, taskView, setTaskView, taskSort, setTaskSort } = useTheme()
  return (
    <>
      <PageHeader title="Settings" description="Make the workspace feel like your own." />
      <section className="settings-section" aria-labelledby="appearance-title">
        <div>
          <h2 id="appearance-title">Appearance</h2>
          <p>Choose your preferred theme.</p>
        </div>
        <fieldset className="theme-options">
          <legend className="sr-only">Color theme</legend>
          {(['dark', 'light'] as Theme[]).map((option) => (
            <label key={option} className={`theme-option ${theme === option ? 'selected' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              <span className={`theme-preview preview-${option}`} aria-hidden="true">
                <span />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className="theme-option-label">
                {option === 'dark' ? (
                  <Moon size={17} aria-hidden="true" />
                ) : (
                  <Sun size={17} aria-hidden="true" />
                )}
                {option === 'dark' ? 'Dark' : 'Light'}
                {theme === option && <Check size={17} className="theme-check" aria-hidden="true" />}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="save-feedback" role="status">
          {error
            ? 'Theme is active for this session. See the storage message above.'
            : 'Appearance changes are saved on this device.'}
        </p>
      </section>
      <section className="settings-section task-preferences" aria-labelledby="preferences-title">
        <h2 id="preferences-title">Task preferences</h2>
        <p className="save-feedback">
          Your selected view and sorting are remembered across visits.
        </p>
        <div className="filter-row">
          <label>
            Default task view
            <select
              aria-label="Default task view"
              value={taskView}
              onChange={(event) => setTaskView(event.target.value as TaskView)}
            >
              <option value="kanban">Kanban</option>
              <option value="list">List</option>
            </select>
          </label>
          <label>
            Default sorting
            <select
              aria-label="Default sorting"
              value={taskSort}
              onChange={(event) => setTaskSort(event.target.value as TaskSort)}
            >
              {sortOptions.map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabels[sort]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <DataManagement />
    </>
  )
}
