import { useEffect, useState } from 'react'

// Refresh calendar context at minute boundaries and after a sleeping tab returns.
export function useLocalNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setTimeout(refresh, 60_000 - (Date.now() % 60_000))
    function visible() {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('focus', refresh)
    }
  }, [now])
  return now
}
