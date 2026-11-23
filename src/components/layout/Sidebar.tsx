import { ArrowUpRight, BookOpen, CheckCheck, ClipboardCheck, LayoutDashboard, ListTodo, Settings } from 'lucide-react'

export const destinations = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tasks', label: 'My Tasks', icon: ListTodo },
  { path: '/check-in', label: 'Daily Check-In', icon: ClipboardCheck },
  { path: '/journal', label: 'Daily Journal', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
]

interface Props { path: string; open: boolean; onNavigate: () => void }
export function Sidebar({ path, open, onNavigate }: Props) {
  return <aside className={`sidebar ${open ? 'is-open' : ''}`} id="primary-navigation">
    <a className="brand" href="#/" onClick={onNavigate} aria-label="FlowSync dashboard">
      <CheckCheck size={27} strokeWidth={1.7} aria-hidden="true" /><span>FlowSync<span className="brand-caption">Personal workspace</span></span>
    </a>
    <nav aria-label="Main navigation">
      {destinations.map(({ path: target, label, icon: Icon }) =>
        <a key={target} href={`#${target}`} className={`nav-link ${path === target ? 'is-active' : ''}`}
          aria-current={path === target ? 'page' : undefined} onClick={onNavigate}>
          <Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
        </a>)}
    </nav>
    <div className="sidebar-footer">
      <span className="local-indicator">Local workspace</span>
      <p>No account required.</p>
      <a href="#/settings" onClick={onNavigate}>Workspace preferences<ArrowUpRight size={15} aria-hidden="true" /></a>
    </div>
  </aside>
}
