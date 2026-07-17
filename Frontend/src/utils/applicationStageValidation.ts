import { createInitialDemoState } from '../store/demoInitialState'
import { selectCandidateListItems, selectCandidateOperationalStatus } from '../store/demoSelectors'
import { advanceApplicationStage, synchronizeApplicationStages } from './applicationStage'
import { getInterviewDetailPath } from './interviewRoutes'

export type ApplicationStageValidationResult = { valid: boolean; errors: string[] }

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

export function validateApplicationStageDomain(): ApplicationStageValidationResult {
  const errors: string[] = []
  const initial = createInitialDemoState()
  const sourceInterview = initial.interviews[0]
  const sourceApplication = sourceInterview ? initial.applications.find((item) => item.id === sourceInterview.applicationId) : undefined
  if (!sourceInterview || !sourceApplication) return { valid: false, errors: ['Stage validation fixtures are unavailable.'] }

  check(errors, advanceApplicationStage('SHORTLISTED', 'INTERVIEW') === 'INTERVIEW', 'Stage precedence did not advance SHORTLISTED to INTERVIEW.')
  check(errors, advanceApplicationStage('FINAL_REVIEW', 'INTERVIEW') === 'FINAL_REVIEW', 'Stage precedence allowed FINAL_REVIEW to move backwards.')
  check(errors, advanceApplicationStage('SELECTED', 'INTERVIEW') === 'SELECTED', 'Scheduling automation overwrote a terminal stage.')

  const scheduledState = synchronizeApplicationStages({
    ...initial,
    applications: initial.applications.map((item) => item.id === sourceApplication.id ? { ...item, currentStage: 'SHORTLIST_REVIEW' as const } : item),
    interviews: initial.interviews.map((item) => item.id === sourceInterview.id ? { ...item, status: 'SCHEDULED' as const } : item),
    interviewSessions: initial.interviewSessions.filter((item) => item.interviewId !== sourceInterview.id),
    interviewTranscripts: initial.interviewTranscripts.filter((item) => item.interviewId !== sourceInterview.id),
    interviewAnalyses: initial.interviewAnalyses.filter((item) => item.interviewId !== sourceInterview.id),
    finalEvaluations: initial.finalEvaluations.filter((item) => item.applicationId !== sourceApplication.id),
  })
  check(errors, scheduledState.applications.find((item) => item.id === sourceApplication.id)?.currentStage === 'INTERVIEW', 'Legacy shortlisted application with an interview did not migrate to INTERVIEW.')

  const completedState = synchronizeApplicationStages({
    ...scheduledState,
    applications: scheduledState.applications.map((item) => item.id === sourceApplication.id ? { ...item, currentStage: 'INTERVIEW' as const } : item),
    interviews: scheduledState.interviews.map((item) => item.id === sourceInterview.id ? { ...item, status: 'COMPLETED' as const } : item),
  })
  check(errors, completedState.applications.find((item) => item.id === sourceApplication.id)?.currentStage === 'FINAL_REVIEW', 'Completed interview did not migrate its application to FINAL_REVIEW.')
  check(errors, selectCandidateOperationalStatus(completedState, sourceApplication.id)?.label === 'Final review started', 'Candidate operational status did not explain the broad FINAL_REVIEW stage.')
  check(errors, selectCandidateListItems(completedState).find((item) => item.application.id === sourceApplication.id)?.application.currentStage === 'FINAL_REVIEW', 'Candidate list did not expose the synchronized broad stage.')

  const terminalState = synchronizeApplicationStages({
    ...scheduledState,
    applications: scheduledState.applications.map((item) => item.id === sourceApplication.id ? { ...item, currentStage: 'REJECTED' as const } : item),
  })
  check(errors, terminalState.applications.find((item) => item.id === sourceApplication.id)?.currentStage === 'REJECTED', 'Recovery normalization overwrote a terminal decision stage.')
  check(errors, getInterviewDetailPath(sourceInterview.id) === `/interviews/${sourceInterview.id}`, 'Interview Detail link did not resolve to the dedicated route.')

  return { valid: errors.length === 0, errors }
}
