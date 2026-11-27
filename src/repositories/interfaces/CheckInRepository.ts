import type { CheckIn, CheckInInput } from '../../types/writing'
export interface CheckInRepository {
  generation(): string
  list(): Promise<CheckIn[]>
  save(input: CheckInInput, previous?: CheckIn): Promise<CheckIn>
  subscribe(onChange: () => void): () => void
}
