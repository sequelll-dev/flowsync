import { Columns3, List, Search } from 'lucide-react'
import { priorities, priorityLabels, statuses, statusLabels } from '../../types/task'
import type { Priority, TaskStatus } from '../../types/task'
import { sortLabels, sortOptions } from '../../types/preferences'
import type { TaskSort } from '../../types/preferences'
import type { TaskFilters } from '../../utils/taskWorkspace'
import { usePreferences } from '../../hooks/useTheme'

export function WorkspaceControls({ filters, onChange, count, total }: {
  filters: TaskFilters; onChange: (filters: TaskFilters) => void; count: number; total: number
}) {
  const { taskView, setTaskView, taskSort, setTaskSort } = usePreferences()
  const active = !!(filters.query || filters.priority || filters.status)
  return <div className="workspace-controls">
    <div className="workspace-search-row"><div className="task-search"><Search size={17} aria-hidden="true" /><input id="task-search" type="search" aria-label="Search tasks" placeholder="Search titles and descriptions…" value={filters.query} onChange={event => onChange({ ...filters, query: event.target.value })} /></div>
      <div className="view-switch" role="group" aria-label="Task view"><button type="button" aria-pressed={taskView === 'kanban'} onClick={() => setTaskView('kanban')}><Columns3 size={16} aria-hidden="true" />Kanban</button><button type="button" aria-pressed={taskView === 'list'} onClick={() => setTaskView('list')}><List size={16} aria-hidden="true" />List</button></div></div>
    <div className="filter-row"><label>Priority<select aria-label="Priority" value={filters.priority} onChange={event => onChange({ ...filters, priority: event.target.value as Priority | '' })}><option value="">All priorities</option>{priorities.map(priority => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></label>
      <label>Status<select aria-label="Status" value={filters.status} onChange={event => onChange({ ...filters, status: event.target.value as TaskStatus | '' })}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
      <label>Sort by<select aria-label="Sort by" value={taskSort} onChange={event => setTaskSort(event.target.value as TaskSort)}>{sortOptions.map(sort => <option key={sort} value={sort}>{sortLabels[sort]}</option>)}</select></label>
      {active && <button type="button" className="button clear-filters" onClick={() => onChange({ query: '', priority: '', status: '' })}>Clear filters</button>}
    </div><p className="filter-summary" role="status">{active ? `${count} of ${total} tasks match your filters` : `${total} ${total === 1 ? 'task' : 'tasks'}`}</p>
  </div>
}
