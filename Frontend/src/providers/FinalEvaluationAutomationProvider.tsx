import type { ReactNode } from 'react'
import { useFinalEvaluationAutomation } from '../hooks/useFinalEvaluationAutomation'

export function FinalEvaluationAutomationProvider({ children }: { children: ReactNode }) {
  useFinalEvaluationAutomation()
  return children
}
