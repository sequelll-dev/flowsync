import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { FeatureState } from '../components/shared/FeatureState'
export function CheckIn() {
  return <><PageHeader title="Daily Check-In" description="Pause, take stock, and choose a focus for today." />
    <div className="workspace-panel"><FeatureState icon={ClipboardCheck} title="Room for a daily pause." milestone={7}>
      Mood, daily goals, reflections, and accomplishments will be available here, with one editable check-in for each day.
    </FeatureState></div></>
}
