import { PageHeader } from '../components/shared/PageHeader'
import { useWriting } from '../hooks/useWriting'
import { moods } from '../types/writing'
import { formatTaskDate } from '../utils/taskWorkspace'
import { isLocalDate } from '../utils/taskValidation'
export function CheckIn() {
  const { checkIn: state } = useWriting()
  return (
    <>
      <PageHeader
        title="Daily Check-In"
        description="Pause, take stock, and choose a focus for today."
      />
      <div className="writing-layout">
        <section className="writing-editor" aria-label="Check-in editor">
          {state.error && (
            <div className="writing-error">
              <p role="alert">{state.error}</p>
              <button
                className="button"
                type="button"
                disabled={state.busy}
                onClick={() => void state.loadSaved()}
              >
                Reload saved check-ins
              </button>
            </div>
          )}
          <form
            className="task-form"
            onSubmit={(event) => {
              event.preventDefault()
              void state.save()
            }}
          >
            <fieldset disabled={!state.ready || state.busy}>
              <label htmlFor="checkin-date">Check-in date</label>
              <input
                id="checkin-date"
                type="date"
                min="1000-01-01"
                max="9999-12-31"
                required
                value={state.draft.date}
                onChange={(event) => {
                  if (isLocalDate(event.target.value)) state.select(event.target.value)
                }}
              />
              <fieldset className="mood-options">
                <legend>How are you feeling?</legend>
                {moods.map((mood) => (
                  <label key={mood || 'unset'}>
                    <input
                      type="radio"
                      name="mood"
                      checked={state.draft.mood === mood}
                      onChange={() => state.edit({ mood })}
                    />
                    <span>{mood || 'Not set'}</span>
                  </label>
                ))}
              </fieldset>
              <label htmlFor="daily-goal">Daily goal</label>
              <textarea
                id="daily-goal"
                rows={2}
                value={state.draft.dailyGoal}
                onChange={(event) => state.edit({ dailyGoal: event.target.value })}
              />
              <label htmlFor="reflection">Reflection</label>
              <textarea
                id="reflection"
                rows={4}
                value={state.draft.reflection}
                onChange={(event) => state.edit({ reflection: event.target.value })}
              />
              <label htmlFor="accomplishments">Accomplishments</label>
              <textarea
                id="accomplishments"
                rows={3}
                value={state.draft.accomplishments}
                onChange={(event) => state.edit({ accomplishments: event.target.value })}
              />
              <div className="writing-save-row">
                <p role="status">{state.status}</p>
                <button type="submit" className="button button-primary">
                  {state.busy ? 'Saving…' : 'Save check-in'}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
        <aside className="writing-history" aria-labelledby="checkin-history-title">
          <h2 id="checkin-history-title">Previous check-ins</h2>
          {!state.ready && !state.error ? (
            <p role="status">Loading check-ins…</p>
          ) : state.entries.length === 0 ? (
            <p>No saved check-ins yet.</p>
          ) : (
            <ul>
              {[...state.entries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={state.busy}
                      aria-pressed={state.draft.date === entry.date}
                      onClick={() => state.select(entry.date)}
                    >
                      <time dateTime={entry.date}>{formatTaskDate(entry.date)}</time>
                      <span>{entry.mood || 'Mood not set'}</span>
                      {entry.dailyGoal && (
                        <span className="history-preview">{entry.dailyGoal}</span>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  )
}
