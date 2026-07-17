import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CandidateApplicationSelector } from '../components/candidates/CandidateApplicationSelector'
import { CandidateCurrentAction } from '../components/candidates/CandidateCurrentAction'
import { CandidateProfile } from '../components/candidates/CandidateProfile'
import { CandidateRecruitmentProgress } from '../components/candidates/CandidateRecruitmentProgress'
import { CandidateInterviewWorkflow } from '../components/interviews/CandidateInterviewWorkflow'
import { Tabs } from '../components/ui/Tabs'
import { createInitialDemoState } from '../store/demoInitialState'
import {
  selectCandidateApplications,
  selectInterviewAnalysisPreparationStatus,
  selectInterviewQuestionPreparationStatus,
  selectInterviewSessionOperationalStatus,
} from '../store/demoSelectors'
import type { CandidateApplicationItem } from '../store/demoSelectors'
import {
  candidateTabAvailability,
  getCandidateNextActionKind,
  getRecruitmentProgress,
} from './candidateDetailPresentation'

export type CandidateDetailUxValidationResult = {
  valid: boolean
  errors: string[]
}

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function renderInRouter(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, element))
}

export function validateCandidateDetailUxDomain(): CandidateDetailUxValidationResult {
  const errors: string[] = []
  const state = createInitialDemoState()
  const scheduledInterview = state.interviews.find((item) => item.status === 'SCHEDULED')
  const completedInterview = state.interviews.find((item) => item.status === 'COMPLETED')
  const scheduledApplication = scheduledInterview
    ? state.applications.find((item) => item.id === scheduledInterview.applicationId)
    : undefined
  const scheduledCandidate = scheduledApplication
    ? state.candidates.find((item) => item.id === scheduledApplication.candidateId)
    : undefined
  const scheduledJob = scheduledApplication
    ? state.jobs.find((item) => item.id === scheduledApplication.jobId)
    : undefined
  const shortlistedApplication = state.applications.find((item) => item.currentStage === 'SHORTLISTED')

  if (!scheduledInterview || !completedInterview || !scheduledApplication || !scheduledCandidate || !scheduledJob || !shortlistedApplication) {
    return { valid: false, errors: ['Candidate detail validation fixtures are unavailable.'] }
  }

  const profileMarkup = renderInRouter(createElement(CandidateProfile, {
    candidate: scheduledCandidate,
    application: scheduledApplication,
    job: scheduledJob,
  }))
  check(errors, profileMarkup.includes(scheduledJob.title), 'Selected application does not control the displayed role')
  check(errors, scheduledCandidate.currentPosition === scheduledJob.title || !profileMarkup.includes(scheduledCandidate.currentPosition), 'Candidate header displays a conflicting profile role')
  check(errors, profileMarkup.includes('Interview') && !profileMarkup.includes('Submitted'), 'Candidate header does not show only the broad primary stage')

  const alternativeJob = state.jobs.find((item) => item.id !== scheduledJob.id)!
  const multipleApplications: CandidateApplicationItem[] = [
    { application: scheduledApplication, job: scheduledJob, interview: scheduledInterview },
    { application: { ...scheduledApplication, id: 'application-detail-validation-alternative', jobId: alternativeJob.id }, job: alternativeJob },
  ]
  const selectorMarkup = renderInRouter(createElement(CandidateApplicationSelector, {
    applications: multipleApplications,
    selectedApplicationId: scheduledApplication.id,
    onChange: () => undefined,
  }))
  check(errors, selectorMarkup.includes('Application') && selectorMarkup.includes(scheduledJob.title) && selectorMarkup.includes(alternativeJob.title), 'Multiple applications do not render a compact contextual selector')

  const progress = getRecruitmentProgress('SHORTLISTED')
  const progressMarkup = renderInRouter(createElement(CandidateRecruitmentProgress, { stage: 'SHORTLISTED' }))
  check(errors, progress[0]?.state === 'COMPLETED' && progress[1]?.state === 'COMPLETED' && progress[2]?.state === 'CURRENT', 'Shortlisted recruitment progress is incorrect')
  check(errors, progressMarkup.includes('Application') && progressMarkup.includes('Screening') && progressMarkup.includes('Interview') && progressMarkup.includes('current'), 'Recruitment progress does not expose accessible state text')

  const shortlistedActionMarkup = renderInRouter(createElement(CandidateCurrentAction, {
    application: shortlistedApplication,
    candidateId: shortlistedApplication.candidateId,
    sessionStatus: 'UNAVAILABLE',
    onSelectTab: () => undefined,
  }))
  const scheduledActionMarkup = renderInRouter(createElement(CandidateCurrentAction, {
    application: scheduledApplication,
    candidateId: scheduledCandidate.id,
    interview: scheduledInterview,
    sessionStatus: selectInterviewSessionOperationalStatus(state, scheduledInterview.id),
    onSelectTab: () => undefined,
  }))
  const cancelledInterview = { ...scheduledInterview, status: 'CANCELLED' as const, updatedAt: '2026-07-17T08:00:00.000Z' }
  const cancelledActionMarkup = renderInRouter(createElement(CandidateCurrentAction, {
    application: scheduledApplication,
    candidateId: scheduledCandidate.id,
    interview: cancelledInterview,
    sessionStatus: 'UNAVAILABLE',
    onSelectTab: () => undefined,
  }))
  check(errors, getCandidateNextActionKind({ stage: shortlistedApplication.currentStage }) === 'SCHEDULE_INTERVIEW' && shortlistedActionMarkup.includes('Prepare interview scheduling'), 'Shortlisted candidate does not receive the scheduling action')
  check(errors, scheduledActionMarkup.includes('Open interview workspace'), 'Scheduled interview does not receive the workspace action')
  check(errors, cancelledActionMarkup.includes('Reschedule interview'), 'Cancelled interview does not receive the reschedule action')

  const cancelledWorkflowMarkup = renderInRouter(createElement(CandidateInterviewWorkflow, {
    candidateId: scheduledCandidate.id,
    interview: cancelledInterview,
    questionPlanStatus: 'NOT_PREPARED',
    sessionStatus: 'UNAVAILABLE',
    reviewStatus: 'TRANSCRIPT_REQUIRED',
  }))
  check(errors, cancelledWorkflowMarkup.includes('Cancelled interview') && !cancelledWorkflowMarkup.includes('Question plan') && !cancelledWorkflowMarkup.includes('Transcript'), 'Cancelled interview renders active workflow statuses')

  const completedApplication = state.applications.find((item) => item.id === completedInterview.applicationId)!
  const completedCandidate = state.candidates.find((item) => item.id === completedApplication.candidateId)!
  const completedWorkflowMarkup = renderInRouter(createElement(CandidateInterviewWorkflow, {
    candidateId: completedCandidate.id,
    interview: completedInterview,
    questionPlanStatus: selectInterviewQuestionPreparationStatus(state, completedInterview.id),
    sessionStatus: selectInterviewSessionOperationalStatus(state, completedInterview.id),
    reviewStatus: selectInterviewAnalysisPreparationStatus(state, completedInterview.id),
  }))
  check(errors, completedWorkflowMarkup.includes('Transcript required'), 'Completed interview does not show the transcript dependency')
  check(errors, completedWorkflowMarkup.includes('Available after transcript approval') && completedWorkflowMarkup.includes('Available after analysis approval'), 'Future interview phases do not explain their dependencies')

  const availability = candidateTabAvailability({ stage: 'SCREENING', hasInterview: false, hasFinalEvaluation: false })
  const tabsMarkup = renderInRouter(createElement(Tabs, {
    items: [
      { id: 'application', label: 'Application' },
      { id: 'interview', label: 'Interview', disabled: !availability.interviewAvailable, availabilityText: 'After screening review' },
      { id: 'final', label: 'Final Evaluation', disabled: !availability.finalEvaluationAvailable, availabilityText: 'After interview evidence' },
    ],
    activeId: 'application',
    onChange: () => undefined,
  }))
  check(errors, tabsMarkup.includes('aria-disabled="true"') && tabsMarkup.includes('After screening review') && tabsMarkup.includes('After interview evidence'), 'Unavailable workflow tabs are not de-emphasized with explanations')
  check(errors, profileMarkup.includes(scheduledCandidate.email) && scheduledActionMarkup.includes('Next action'), 'Compact candidate layout does not include identity metadata and the next action')

  const selectedApplications = selectCandidateApplications({
    ...state,
    applications: [...state.applications, multipleApplications[1]!.application],
  }, scheduledCandidate.id)
  check(errors, selectedApplications.some((item) => item.application.id === scheduledApplication.id) && selectedApplications.some((item) => item.application.id === multipleApplications[1]!.application.id), 'Selected application context cannot persist while navigating candidate tabs')

  return { valid: errors.length === 0, errors }
}
