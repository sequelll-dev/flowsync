import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { Modal } from '../components/shared/Modal'
import { useWriting } from '../hooks/useWriting'
import { formatTaskDate } from '../utils/taskWorkspace'
export function Journal() {
  const { journal: state } = useWriting()
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('newest')
  const [deleting, setDeleting] = useState(false)
  const text = query.trim().toLocaleLowerCase()
  const entries = state.entries
    .filter((entry) => `${entry.title} ${entry.content}`.toLocaleLowerCase().includes(text))
    .sort(
      (a, b) =>
        (order === 'newest' ? -1 : 1) *
          (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) ||
        a.id.localeCompare(b.id),
    )
  return (
    <>
      <PageHeader title="Daily Journal" description="A quiet place to collect your thoughts." />
      <div className="journal-toolbar">
        <button
          className="button button-primary"
          type="button"
          disabled={!state.ready || state.busy}
          onClick={() => void state.create()}
        >
          <Plus size={17} aria-hidden="true" />
          New entry
        </button>
        <p className="writing-help">Changes save automatically after you pause.</p>
      </div>
      {state.error && (
        <div className="writing-error">
          <p role="alert">{state.error}</p>
          <button
            className="button"
            type="button"
            disabled={state.busy}
            onClick={() => void state.loadSaved()}
          >
            Reload saved journal
          </button>
        </div>
      )}
      <div className="writing-layout">
        <section className="writing-editor journal-editor" aria-label="Journal editor">
          {state.draft ? (
            <>
              <div className="writing-save-row">
                <p role="status">{state.status}</p>
                <div className="journal-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={state.busy || !state.dirty}
                    onClick={() => void state.save()}
                  >
                    {state.busy ? 'Saving…' : 'Save now'}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Delete journal entry"
                    disabled={state.busy}
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="task-form">
                <label htmlFor="journal-date">Entry date</label>
                <input
                  id="journal-date"
                  type="date"
                  min="1000-01-01"
                  max="9999-12-31"
                  required
                  value={state.draft.date}
                  onChange={(event) => state.edit({ date: event.target.value })}
                />
                <label htmlFor="journal-title">Title</label>
                <input
                  id="journal-title"
                  value={state.draft.title}
                  placeholder="Untitled entry"
                  onChange={(event) => state.edit({ title: event.target.value })}
                />
                <label htmlFor="journal-content">Your thoughts</label>
                <textarea
                  id="journal-content"
                  className="journal-content"
                  rows={16}
                  value={state.draft.content}
                  placeholder="Start writing…"
                  onChange={(event) => state.edit({ content: event.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="writing-empty">
              <h2>A page for your thoughts.</h2>
              <p>Create an entry or choose one from your history.</p>
            </div>
          )}
        </section>
        <aside className="writing-history" aria-labelledby="journal-history-title">
          <h2 id="journal-history-title">Your entries</h2>
          <label className="history-label" htmlFor="journal-search">
            Search entries
          </label>
          <input
            id="journal-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titles and content"
          />
          <label className="history-label" htmlFor="journal-sort">
            Sort entries
          </label>
          <select
            id="journal-sort"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {!state.ready && !state.error ? (
            <p role="status">Loading entries…</p>
          ) : entries.length === 0 ? (
            <p>{query ? 'No matching entries.' : 'No saved entries yet.'}</p>
          ) : (
            <ul>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={state.busy}
                    aria-pressed={state.draft?.id === entry.id}
                    onClick={() => void state.select(entry)}
                  >
                    <strong>{entry.title.trim() || 'Untitled entry'}</strong>
                    <time dateTime={entry.date}>{formatTaskDate(entry.date)}</time>
                    <span className="history-preview">
                      {entry.content.trim() || 'An unwritten page.'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      {deleting && state.draft && (
        <Modal
          title="Delete journal entry?"
          id="journal-delete-title"
          busy={state.busy}
          onClose={() => setDeleting(false)}
        >
          <p className="delete-explanation">
            Permanently delete “{state.draft.title.trim() || 'Untitled entry'}” and any unsaved
            changes? This cannot be undone.
          </p>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              autoFocus
              disabled={state.busy}
              onClick={() => setDeleting(false)}
            >
              Cancel
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={state.busy}
              onClick={async () => {
                if (await state.remove()) setDeleting(false)
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
