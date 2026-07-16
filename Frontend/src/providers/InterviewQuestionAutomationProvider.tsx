import type { ReactNode } from 'react'
import { InterviewQuestionAutomationContext, useInterviewQuestionAutomationController } from '../hooks/useInterviewQuestionAutomation'

export function InterviewQuestionAutomationProvider({ children }: { children: ReactNode }) {
  const controller = useInterviewQuestionAutomationController()
  return <InterviewQuestionAutomationContext.Provider value={controller}>{children}</InterviewQuestionAutomationContext.Provider>
}
