import type { ReactNode } from 'react'; import { useInterviewAnalysisAutomation } from '../hooks/useInterviewAnalysisAutomation'
export function InterviewAnalysisAutomationProvider({ children }: { children: ReactNode }) { useInterviewAnalysisAutomation(); return children }
