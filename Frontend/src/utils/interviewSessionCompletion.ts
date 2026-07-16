import type { InterviewSession } from '../types/interviewSession'

export type InterviewSessionCompletionReadiness = { ready: boolean; askedCount: number; skippedCount: number; remainingCount: number; blockingIssues: string[]; warnings: string[] }
export function evaluateInterviewSessionCompletionReadiness(session: InterviewSession): InterviewSessionCompletionReadiness {
  const askedCount = session.questionProgress.filter((item) => item.status === 'ASKED').length
  const skippedCount = session.questionProgress.filter((item) => item.status === 'SKIPPED').length
  const remainingCount = session.questionProgress.filter((item) => item.status === 'CURRENT' || item.status === 'NOT_ASKED').length
  const blockingIssues: string[] = []
  if (!session.startedAt || session.status === 'NOT_STARTED') blockingIssues.push('Start the interview before completing it.')
  if (session.status === 'COMPLETED') blockingIssues.push('This interview session is already completed.')
  if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) blockingIssues.push('The session is not in a valid completion state.')
  return { ready: blockingIssues.length === 0, askedCount, skippedCount, remainingCount, blockingIssues, warnings: remainingCount ? [`${remainingCount} approved question${remainingCount === 1 ? ' has' : 's have'} not been reached. They will be marked as not reached.`] : [] }
}
