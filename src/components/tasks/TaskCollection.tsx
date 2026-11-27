import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Task, TaskStatus } from '../../types/task'
import { statusLabels } from '../../types/task'
import { useTasks } from '../../hooks/useTasks'
import { usePreferences } from '../../hooks/useTheme'
import { selectTasks } from '../../utils/taskWorkspace'
import type { TaskFilters } from '../../utils/taskWorkspace'
import { Modal } from '../shared/Modal'
import { TaskDialog } from './TaskDialog'
import { WorkspaceControls } from './WorkspaceControls'
import { KanbanBoard } from './KanbanBoard'
import { TaskItem } from './TaskItem'

export function TaskCollection() {
  const { tasks, loading, ready, saving, error, save, remove, reload } = useTasks()
  const { taskView, taskSort } = usePreferences()
  const [filters, setFilters] = useState<TaskFilters>({ query: '', priority: '', status: '' })
  const [editor, setEditor] = useState<{ task?: Task; status?: TaskStatus } | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [deleteAttempted, setDeleteAttempted] = useState(false)
  const [message, setMessage] = useState('')
  const displayed = selectTasks(tasks, filters, taskSort)
  const active = !!(filters.query || filters.priority || filters.status)
  const counts = { todo: 0, in_progress: 0, completed: 0 }
  tasks.forEach((task) => counts[task.status]++)
  async function changeStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return
    const focused = document.activeElement
    const restoreFocus =
      focused?.closest('[data-task-id]')?.getAttribute('data-task-id') === task.id
    const target = focused?.tagName === 'SELECT' ? 'select' : '.completion-button'
    if (await save({ ...task, status }, task.id, task.updatedAt))
      setMessage(`${task.title} moved to ${statusLabels[status]}.`)
    if (restoreFocus)
      window.requestAnimationFrame(() => {
        const row = Array.from(document.querySelectorAll<HTMLElement>('[data-task-id]')).find(
          (element) => element.dataset.taskId === task.id,
        )
        const control =
          row?.querySelector<HTMLElement>(target) ??
          document.getElementById('task-search') ??
          document.getElementById('main-content')
        control?.focus()
      })
  }
  const actions = {
    saving,
    onEdit: (task: Task) => setEditor({ task }),
    onDelete: (task: Task) => {
      setDeleting(task)
      setDeleteAttempted(false)
    },
    onStatus: changeStatus,
  }
  return (
    <section
      className={`task-workspace ${taskView === 'kanban' ? 'board-workspace' : ''}`}
      aria-label="Tasks"
    >
      <div className="task-toolbar">
        <div>
          <h2>All tasks</h2>
          <p className="task-counts">
            {counts.todo} to do <span>·</span> {counts.in_progress} in progress <span>·</span>{' '}
            {counts.completed} completed
          </p>
        </div>
        <button
          type="button"
          className="button button-primary"
          disabled={!ready || loading || saving}
          onClick={() => setEditor({})}
        >
          <Plus size={17} aria-hidden="true" />
          New task
        </button>
      </div>
      <WorkspaceControls
        filters={filters}
        onChange={setFilters}
        count={displayed.length}
        total={tasks.length}
      />
      {error && (
        <div className="task-error">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="button"
            disabled={saving || loading}
            onClick={() => void reload()}
          >
            Reload tasks
          </button>
        </div>
      )}
      {loading ? (
        <p className="task-empty" role="status">
          Loading tasks…
        </p>
      ) : (
        ready && (
          <>
            {active && displayed.length === 0 && (
              <p className="task-empty">No matching tasks. Change or clear your filters.</p>
            )}
            {taskView === 'kanban' ? (
              <KanbanBoard
                tasks={displayed}
                {...actions}
                onAdd={(status) => setEditor({ status })}
              />
            ) : displayed.length === 0 && !active ? (
              <div className="task-empty">
                <h3>No tasks yet.</h3>
                <p>Add a task when you know what needs your attention.</p>
              </div>
            ) : (
              displayed.length > 0 && (
                <ul className="task-records" aria-label="Task list">
                  {displayed.map((task) => (
                    <TaskItem key={task.id} task={task} {...actions} />
                  ))}
                </ul>
              )
            )}
          </>
        )
      )}
      <p className="sr-only" role="status">
        {message}
      </p>
      {editor && (
        <TaskDialog
          task={editor.task}
          initialStatus={editor.status}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <Modal
          title="Delete task?"
          id="delete-task-title"
          busy={saving}
          onClose={() => setDeleting(null)}
        >
          <p className="delete-explanation">
            Permanently delete “{deleting.title}”? This cannot be undone.
          </p>
          {deleteAttempted && error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              autoFocus
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={saving}
              onClick={async () => {
                setDeleteAttempted(true)
                if (await remove(deleting.id, deleting.updatedAt)) {
                  setDeleting(null)
                  setMessage('Task deleted.')
                }
              }}
            >
              {saving ? 'Deleting…' : 'Delete task'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
