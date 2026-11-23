import { useState } from 'react'
import type { FormEvent } from 'react'
import { priorities, priorityLabels, statuses, statusLabels } from '../../types/task'
import type { Priority, Task, TaskStatus } from '../../types/task'
import { useTasks } from '../../hooks/useTasks'
import { Modal } from '../shared/Modal'

export function TaskDialog({ task, initialStatus, initialDueDate, onClose }: { task?: Task; initialStatus?: TaskStatus; initialDueDate?: string; onClose: () => void }) {
  const { save, saving, error } = useTasks()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? 'todo')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? initialDueDate ?? '')
  const [validation, setValidation] = useState('')
  const [attempted, setAttempted] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setValidation('Enter a task title.'); return }
    setValidation(''); setAttempted(true)
    if (await save({ title, description, priority, status, dueDate }, task?.id, task?.updatedAt)) onClose()
  }
  return <Modal title={task ? 'Edit task' : 'New task'} id="task-dialog-title" busy={saving} onClose={onClose}>
    <form onSubmit={submit} className="task-form">
      <fieldset disabled={saving}>
        <label htmlFor="task-title">Title <span className="field-hint">Required</span></label>
        <input id="task-title" value={title} onChange={event => setTitle(event.target.value)} required autoFocus aria-invalid={!!validation} aria-describedby={validation ? 'title-error' : undefined} />
        {validation && <p id="title-error" className="form-error" role="alert">{validation}</p>}
        <label htmlFor="task-description">Description</label>
        <textarea id="task-description" rows={4} value={description} onChange={event => setDescription(event.target.value)} />
        <div className="form-grid"><div><label htmlFor="task-priority">Priority</label><select id="task-priority" value={priority} onChange={event => setPriority(event.target.value as Priority)}>{priorities.map(value => <option key={value} value={value}>{priorityLabels[value]}</option>)}</select></div>
        <div><label htmlFor="task-status">Status</label><select id="task-status" value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>{statuses.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></div></div>
        <label htmlFor="task-due">Due date <span className="field-hint">Optional</span></label>
        <input id="task-due" type="date" min="1000-01-01" max="9999-12-31" value={dueDate} onChange={event => setDueDate(event.target.value)} />
      </fieldset>
      {attempted && error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="button" type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save task'}</button></div>
    </form>
  </Modal>
}
