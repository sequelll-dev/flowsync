import { BookOpen } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { FeatureState } from '../components/shared/FeatureState'
export function Journal() {
  return <><PageHeader title="Daily Journal" description="A quiet place to collect your thoughts." />
    <div className="workspace-panel"><FeatureState icon={BookOpen} title="A fresh page, soon." milestone={7}>
      Journal writing, saved entries, and search will arrive together. This space is reserved for your personal writing.
    </FeatureState></div></>
}
