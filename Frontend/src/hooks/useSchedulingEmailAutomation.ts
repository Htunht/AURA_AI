import { createContext, useContext } from 'react'

export type SchedulingEmailAutomationController = {
  emailConfigured: boolean
  retryEmail: (invitationId: string) => void
  retryAllFailed: () => void
}

export const SchedulingEmailAutomationContext = createContext<SchedulingEmailAutomationController | undefined>(undefined)
export function useSchedulingEmailAutomation() {
  const value = useContext(SchedulingEmailAutomationContext)
  if (!value) throw new Error('useSchedulingEmailAutomation must be used within SchedulingEmailAutomationProvider')
  return value
}
