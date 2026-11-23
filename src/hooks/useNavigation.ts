import { useEffect, useState } from 'react'

export function useNavigation() {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    function navigate() {
      setPath(window.location.hash.slice(1) || '/')
      document.getElementById('main-content')?.focus()
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  return path
}
