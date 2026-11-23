import type { LucideIcon } from 'lucide-react'

interface Props { icon: LucideIcon; title: string; children: React.ReactNode; milestone: number }
export function FeatureState({ icon: Icon, title, children, milestone }: Props) {
  return <section className="feature-state" aria-label={title}>
    <Icon size={30} strokeWidth={1.4} aria-hidden="true" />
    <h2>{title}</h2>
    <p>{children}</p>
    <span className="development-note">Planned for milestone {milestone}</span>
  </section>
}
