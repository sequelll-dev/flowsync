import { createContext, useContext } from 'react'
export const WorkspaceResetContext = createContext<{
  reset: (message: string) => void
  message: string
}>({ reset: () => {}, message: '' })
export function useWorkspaceReset() {
  return useContext(WorkspaceResetContext)
}
