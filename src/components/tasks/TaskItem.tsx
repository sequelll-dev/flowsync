import { Check, GripVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { Task, TaskStatus } from '../../types/task'
import { priorityLabels, statuses, statusLabels } from '../../types/task'
import { formatTaskDate } from '../../utils/taskWorkspace'

export interface TaskItemActions {
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatus: (task: Task, status: TaskStatus) => Promise<void>
  saving: boolean
}
interface Props extends TaskItemActions { task: Task; board?: boolean; compact?: boolean; dragging?: boolean; onDragStart?: (id: string) => void; onDragEnd?: () => void }
export function TaskItem({ task, board, compact, dragging, onDragStart, onDragEnd, onEdit, onDelete, onStatus, saving }: Props) {
  return <li className={`task-record ${board ? 'task-card' : ''} ${task.status === 'completed' ? 'is-completed' : ''} ${dragging ? 'is-dragging' : ''}`}>
    {board ? <div className="drag-handle" draggable={!saving} onDragStart={event => {
      event.dataTransfer.setData('application/x-flowsync-task', task.id)
      event.dataTransfer.effectAllowed = 'move'; onDragStart?.(task.id)
    }} onDragEnd={onDragEnd} title="Drag to another column, or use the Status control" aria-hidden="true"><GripVertical size={18} /></div> :
      <button type="button" className="icon-button completion-button" aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`} disabled={saving} onClick={() => void onStatus(task, task.status === 'completed' ? 'todo' : 'completed')}>{task.status === 'completed' ? <RotateCcw size={18} /> : <Check size={18} />}</button>}
    <div className="task-copy"><h3>{task.title}</h3>{task.description && <p className="task-description">{task.description}</p>}
      <div className="task-metadata"><span className={`priority-${task.priority}`}>{priorityLabels[task.priority]} priority</span>{compact && <span>{statusLabels[task.status]}</span>}{task.dueDate ? <time dateTime={task.dueDate}>Due {formatTaskDate(task.dueDate)}</time> : !compact && <span>No due date</span>}{!compact && !board && <time dateTime={task.createdAt}>Created {new Date(task.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>}</div>
      {!compact && <label className="inline-status"><span className="sr-only">Status for {task.title}</span><select aria-label={`Status for ${task.title}`} disabled={saving} value={task.status} onChange={event => void onStatus(task, event.target.value as TaskStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>}
    </div>
    <div className="task-actions"><button type="button" className="icon-button" aria-label={`Edit ${task.title}`} disabled={saving} onClick={() => onEdit(task)}><Pencil size={17} /></button><button type="button" className="icon-button" aria-label={`Delete ${task.title}`} disabled={saving} onClick={() => onDelete(task)}><Trash2 size={17} /></button></div>
  </li>
}
