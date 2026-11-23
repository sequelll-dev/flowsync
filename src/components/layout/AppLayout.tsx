import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Menu, Moon, Search, Sun, X } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { destinations, Sidebar } from './Sidebar'

export function AppLayout({ path, children }: { path: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [searchRequested, setSearchRequested] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const { theme, setTheme, error } = useTheme()
  const page = destinations.find(item => item.path === path)?.label ?? 'Page not found'
  useEffect(() => { document.title = `${page} · FlowSync` }, [page])
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) { setOpen(false); menuButton.current?.focus() }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])

  useEffect(() => {
    if (!searchRequested || path !== '/tasks') return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('task-search')?.focus()
      setSearchRequested(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [searchRequested, path])

  function navigate() {
    setSearchRequested(false)
    setOpen(false)
    document.getElementById('main-content')?.focus()
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => {
      event.preventDefault(); document.getElementById('main-content')?.focus()
    }}>Skip to content</a>
    <Sidebar path={path} open={open} onNavigate={navigate} />
    <header className="topbar">
      <button ref={menuButton} className="icon-button mobile-menu" type="button" onClick={() => setOpen(!open)}
        aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation">
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>
      <div className="breadcrumb"><span>Personal workspace</span><span aria-hidden="true">/</span><span>{page}</span></div>
      <a className="icon-button header-search" href="#/tasks" aria-label="Search tasks" title="Search tasks" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { setOpen(false); setSearchRequested(true) } }}><Search size={19} strokeWidth={1.7} aria-hidden="true" /></a>
      <button type="button" className="icon-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={19} strokeWidth={1.7} /> : <Moon size={19} strokeWidth={1.7} />}
      </button>
    </header>
    <main id="main-content" className="main-content" tabIndex={-1}>
      {error && <p className="storage-message" role="alert">{error}</p>}
      {children}
    </main>
  </div>
}
