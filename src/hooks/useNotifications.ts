import { useEffect, useMemo, useRef, useState } from 'react'
import { notificationRepository } from '../repositories/local/LocalNotificationRepository'
import type { NotificationAction } from '../repositories/interfaces/NotificationRepository'
import { getReminders, mergeReminders } from '../services/notificationService'
import type { NotificationRecord, TaskNotification } from '../types/notification'
import { useTasks } from './useTasks'
import { useLocalNow } from './useLocalNow'
import { localDateKey } from '../utils/calendar'

export function useNotifications() {
  const { tasks, ready, loading } = useTasks()
  const today = localDateKey(useLocalNow())
  const candidates = useMemo(() => getReminders(ready ? tasks : [], today), [tasks, ready, today])
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const session = useRef<NotificationRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!ready || loading) return
    function refresh() {
      try {
        session.current = notificationRepository.reconcile(candidates, session.current)
        setRecords(session.current)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Reminder state could not be saved.')
        session.current = mergeReminders(session.current, candidates)
        setRecords(session.current)
      }
    }
    refresh()
    return notificationRepository.subscribe((change) => {
      if (change.cleared || change.removed || change.replaced) {
        session.current = []
        setRecords([])
        setError(null)
      }
      // A full clear also invalidates tasks. Wait for their provider to reload
      // instead of recreating records from this effect's older task snapshot.
      if (!change.cleared && !change.replaced) refresh()
    })
  }, [candidates, ready, loading])
  const notifications: TaskNotification[] = candidates.flatMap((candidate) => {
    const record = records.find((record) => record.id === candidate.id)
    const task = tasks.find((task) => task.id === candidate.taskId)
    return record && task && !record.dismissedAt ? [{ ...record, task }] : []
  })
  function change(ids: string[], action: NotificationAction) {
    if (!ids.length) return
    try {
      session.current = notificationRepository.update(session.current, ids, action)
      setRecords(session.current)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reminder state could not be saved.')
      const now = new Date().toISOString()
      session.current = session.current.map((record) =>
        ids.includes(record.id)
          ? {
              ...record,
              readAt: record.readAt ?? now,
              ...(action === 'dismiss' ? { dismissedAt: record.dismissedAt ?? now } : {}),
            }
          : record,
      )
      setRecords(session.current)
    }
  }
  return { notifications: ready && !loading ? notifications : [], error, loading, ready, change }
}
