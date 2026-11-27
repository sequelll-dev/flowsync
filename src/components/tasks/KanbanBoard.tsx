import { useState } from 'react'
import { Plus } from 'lucide-react'
import { statuses, statusLabels } from '../../types/task'
import type { Task, TaskStatus } from '../../types/task'
import { TaskItem } from './TaskItem'
import type { TaskItemActions } from './TaskItem'

export function KanbanBoard({
  tasks,
  onAdd,
  ...actions
}: TaskItemActions & { tasks: Task[]; onAdd: (status: TaskStatus) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)
  function end() {
    setDragging(null)
    setOver(null)
  }
  return (
    <>
      <p className="board-hint">Drag the handle to move a task, or choose its status.</p>
      <div className="kanban-scroll" role="region" aria-label="Kanban board" tabIndex={0}>
        <div className="kanban-board">
          {statuses.map((status) => {
            const column = tasks.filter((task) => task.status === status)
            return (
              <section
                key={status}
                aria-label={`${statusLabels[status]} column`}
                className={`kanban-column ${over === status ? 'is-drop-target' : ''}`}
                onDragOver={(event) => {
                  if (!dragging || actions.saving) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setOver(status)
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                    setOver(null)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData('application/x-flowsync-task')
                  const task = tasks.find((task) => task.id === id)
                  if (task && id === dragging && !actions.saving && task.status !== status)
                    void actions.onStatus(task, status)
                  end()
                }}
              >
                <div className="column-heading">
                  <h3>
                    {statusLabels[status]} <span>{column.length}</span>
                  </h3>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Add task to ${statusLabels[status]}`}
                    disabled={actions.saving}
                    onClick={() => onAdd(status)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <ul className="kanban-tasks">
                  {column.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      {...actions}
                      board
                      dragging={dragging === task.id}
                      onDragStart={setDragging}
                      onDragEnd={end}
                    />
                  ))}
                </ul>
                {column.length === 0 && <p className="column-empty">No tasks in this column.</p>}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
