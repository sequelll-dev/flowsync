import { useRef, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { reminderLabels } from '../../types/notification'
import type { Task } from '../../types/task'
import { formatTaskDate } from '../../utils/taskWorkspace'
import { Modal } from '../shared/Modal'
import { TaskDialog } from '../tasks/TaskDialog'

export function NotificationCenter({ onOpen }: { onOpen: () => void }) {
  const { notifications, error, loading, ready, change } = useNotifications()
  const [open, setOpen] = useState(false)
  const [editor, setEditor] = useState<Task | null>(null)
  const bell = useRef<HTMLButtonElement>(null)
  const unread = notifications.filter(notification => !notification.readAt)
  function act(ids: string[], action: 'read' | 'dismiss', index = 0) {
    change(ids, action)
    window.requestAnimationFrame(() => {
      const dialog = document.getElementById('notifications-title')?.closest('dialog')
      if (!dialog?.open) return
      const tasks = dialog.querySelectorAll<HTMLButtonElement>('.notification-task')
      const next = tasks[Math.min(index, tasks.length - 1)] ?? dialog.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')
      next?.focus()
    })
  }
  return <>
    <button ref={bell} type="button" className="icon-button notification-trigger" aria-label={`Notifications, ${unread.length} unread`} aria-haspopup="dialog" onClick={() => { onOpen(); setOpen(true) }} title="Notifications">
      <Bell size={19} strokeWidth={1.7} aria-hidden="true" />{unread.length > 0 && <span className="notification-badge" aria-hidden="true">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <Modal title="Notifications" id="notifications-title" busy={false} onClose={() => setOpen(false)}>
      <p className="notification-intro">Reminders for unfinished tasks due within three days, today, or overdue.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="notification-empty" role="status">Loading reminders…</p> : !ready ? <p className="notification-empty">Tasks could not be loaded. Reload tasks in the task workspace.</p> : notifications.length === 0 ? <p className="notification-empty">No reminders to show.</p> : <>
        <div className="notification-tools"><p>{unread.length} unread</p><button type="button" className="button" disabled={unread.length === 0} onClick={() => act(unread.map(notification => notification.id), 'read')}>Mark all as read</button></div>
        <ul className="notification-list">{notifications.map((notification, index) => <li key={notification.id} className={`notification-item ${notification.readAt ? 'is-read' : 'is-unread'}`}>
          <div className="notification-kind"><span className={notification.type === 'overdue' ? 'overdue-text' : ''}>{reminderLabels[notification.type]}</span><span>{notification.readAt ? 'Read' : 'Unread'}</span></div>
          <button type="button" className="notification-task" aria-label={`Open reminder task ${notification.task.title}`} onClick={() => { change([notification.id], 'read'); setOpen(false); setEditor(notification.task) }}>{notification.task.title}</button>
          <time className="notification-date" dateTime={notification.dueDate}>Due {formatTaskDate(notification.dueDate)}</time>
          <div className="notification-actions"><button type="button" className="button" aria-label={`Mark reminder for ${notification.task.title} as read`} disabled={!!notification.readAt} onClick={() => act([notification.id], 'read', index)}><Check size={15} aria-hidden="true" />Mark as read</button>
          <button type="button" className="button" aria-label={`Dismiss reminder for ${notification.task.title}`} onClick={() => act([notification.id], 'dismiss', index)}><X size={15} aria-hidden="true" />Dismiss</button></div>
        </li>)}</ul>
      </>}
    </Modal>}
    {editor && <TaskDialog task={editor} onClose={() => { setEditor(null); window.requestAnimationFrame(() => bell.current?.focus()) }} />}
  </>
}
