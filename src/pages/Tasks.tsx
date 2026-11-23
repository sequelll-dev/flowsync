import { PageHeader } from '../components/shared/PageHeader'
import { TaskCollection } from '../components/tasks/TaskCollection'
export function Tasks() {
  return <><PageHeader title="My Tasks" description="A place for what needs your attention." /><TaskCollection /></>
}
