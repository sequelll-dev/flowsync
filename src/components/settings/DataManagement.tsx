import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { useWriting } from '../../hooks/useWriting'
import { useWorkspaceReset } from '../../hooks/useWorkspaceReset'
import { Modal } from '../shared/Modal'
import { downloadBackup, exportBackup } from '../../services/exportService'
import { clearWorkspace, parseBackup, replaceBackup } from '../../services/importService'
import type { Backup } from '../../types/backup'

export function DataManagement() {
  const { journal, checkIn } = useWriting()
  const { reset, message } = useWorkspaceReset()
  const [preview, setPreview] = useState<Backup | null>(null)
  const [clearing, setClearing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [word, setWord] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const dirty = journal.dirty || checkIn.dirty
  const saving = busy || journal.busy || checkIn.busy
  async function exportData() {
    setBusy(true)
    setError('')
    try {
      if (!(await journal.save()))
        throw new Error('The journal draft could not be saved. Resolve it before exporting.')
      if (checkIn.dirty && !(await checkIn.save()))
        throw new Error('The check-in draft could not be saved. Resolve it before exporting.')
      downloadBackup(await exportBackup())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }
  async function readFile(file: File) {
    setBusy(true)
    setError('')
    setPreview(null)
    setAccepted(false)
    setDiscard(false)
    try {
      setPreview(parseBackup(await file.text()))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be read.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  function commit() {
    if (saving || (dirty && !discard) || (preview && !accepted) || (clearing && word !== 'CLEAR'))
      return
    setBusy(true)
    setError('')
    try {
      const warning = preview ? replaceBackup(preview) : clearWorkspace()
      reset(
        warning ??
          (preview
            ? 'Backup imported. All application data was replaced.'
            : 'Application data cleared. Default preferences restored.'),
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Data could not be replaced. Your current workspace was not changed.',
      )
      setBusy(false)
    }
  }
  return (
    <section className="settings-section data-management" aria-labelledby="data-title">
      <h2 id="data-title">Data management</h2>
      <p className="save-feedback">
        Back up your workspace or restore a previous export. Files include tasks, writing,
        preferences, and reminder state.
      </p>
      {message && (
        <p className="data-message" role="status">
          {message}
        </p>
      )}
      {error && !preview && !clearing && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="data-actions">
        <button
          className="button"
          type="button"
          disabled={saving}
          onClick={() => void exportData()}
        >
          <Download size={17} aria-hidden="true" />
          {busy ? 'Working…' : 'Export JSON'}
        </button>
        <button
          className="button"
          type="button"
          disabled={saving}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} aria-hidden="true" />
          Import JSON
        </button>
        <input
          ref={input}
          type="file"
          tabIndex={-1}
          accept=".json,application/json"
          aria-label="Import backup file"
          className="sr-only"
          disabled={saving}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void readFile(file)
          }}
        />
      </div>
      <div className="data-danger">
        <h3>Clear application data</h3>
        <p>
          This permanently removes your locally saved FlowSync information. Export a backup first if
          you want to keep it.
        </p>
        <button
          className="button button-danger"
          type="button"
          disabled={saving}
          onClick={() => {
            setClearing(true)
            setWord('')
            setDiscard(false)
            setError('')
          }}
        >
          <Trash2 size={17} aria-hidden="true" />
          Clear application data
        </button>
      </div>
      {(preview || clearing) && (
        <Modal
          title={preview ? 'Replace all application data?' : 'Clear all application data?'}
          id="data-confirm-title"
          busy={saving}
          onClose={() => {
            setPreview(null)
            setClearing(false)
            setError('')
          }}
        >
          {preview ? (
            <>
              <p className="delete-explanation">
                This backup will replace your current workspace. Nothing is merged.
              </p>
              <dl className="import-preview">
                <div>
                  <dt>Exported</dt>
                  <dd>{new Date(preview.exportedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Tasks</dt>
                  <dd>{preview.tasks.length}</dd>
                </div>
                <div>
                  <dt>Journal entries</dt>
                  <dd>{preview.journalEntries.length}</dd>
                </div>
                <div>
                  <dt>Check-ins</dt>
                  <dd>{preview.checkIns.length}</dd>
                </div>
                <div>
                  <dt>Reminder records</dt>
                  <dd>{preview.notifications.length}</dd>
                </div>
                <div>
                  <dt>Appearance / task view</dt>
                  <dd>
                    {preview.preferences.theme} / {preview.preferences.taskView}
                  </dd>
                </div>
              </dl>
              <label className="data-confirm-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
                I understand this replaces all saved FlowSync data.
              </label>
            </>
          ) : (
            <>
              <p className="delete-explanation">
                All saved tasks, journal entries, check-ins, reminder state, and preferences will be
                permanently removed from this browser. This cannot be undone.
              </p>
              <label className="history-label" htmlFor="clear-word">
                Type CLEAR to confirm
              </label>
              <input
                className="clear-word"
                id="clear-word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                autoComplete="off"
              />
            </>
          )}
          {dirty && (
            <label className="data-confirm-check">
              <input
                type="checkbox"
                checked={discard}
                onChange={(event) => setDiscard(event.target.checked)}
              />
              Discard my unsaved writing drafts too.
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              disabled={saving}
              onClick={() => {
                setPreview(null)
                setClearing(false)
                setError('')
              }}
            >
              Cancel
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={
                saving ||
                (dirty && !discard) ||
                (!!preview && !accepted) ||
                (clearing && word !== 'CLEAR')
              }
              onClick={commit}
            >
              {saving ? 'Replacing…' : preview ? 'Replace data' : 'Clear all data'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
