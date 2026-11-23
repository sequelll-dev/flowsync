import { TaskProvider } from './hooks/useTasks'
import { AppLayout } from './components/layout/AppLayout'
import { PageHeader } from './components/shared/PageHeader'
import { useNavigation } from './hooks/useNavigation'
import { ThemeProvider } from './hooks/useTheme'
import { Dashboard } from './pages/Dashboard'
import { Tasks } from './pages/Tasks'
import { CheckIn } from './pages/CheckIn'
import { Journal } from './pages/Journal'
import { Settings } from './pages/Settings'

export default function App() {
  const path = useNavigation()
  const pages: Record<string, React.ReactNode> = {
    '/': <Dashboard />, '/tasks': <Tasks />, '/check-in': <CheckIn />, '/journal': <Journal />, '/settings': <Settings />,
  }
  return <ThemeProvider><TaskProvider><AppLayout path={path}>{(Object.hasOwn(pages, path) ? pages[path] : null) ?? <>
    <PageHeader title="Page not found" description="This address does not belong to your workspace." />
    <a className="text-link" href="#/">Return to dashboard</a>
  </>}</AppLayout></TaskProvider></ThemeProvider>
}
