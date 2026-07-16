import type { ReactNode } from 'react'
import {
  InterviewSchedulingAutomationContext,
  useInterviewSchedulingAutomationController,
} from '../hooks/useInterviewSchedulingAutomation'

export function InterviewSchedulingAutomationProvider({ children }: { children: ReactNode }) {
  const controller = useInterviewSchedulingAutomationController()
  return (
    <InterviewSchedulingAutomationContext.Provider value={controller}>
      {children}
    </InterviewSchedulingAutomationContext.Provider>
  )
}
