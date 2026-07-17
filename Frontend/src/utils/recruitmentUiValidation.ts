import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CandidateCard } from '../components/candidates/CandidateCard'
import { CandidateTable } from '../components/candidates/CandidateTable'
import { initialDemoState } from '../store/demoReducer'
import {
  selectActiveJobs,
  selectCandidateApplications,
  selectCandidateListItems,
  selectCandidateTimeline,
  selectDashboardMetrics,
  selectRecentApplications,
  selectScreeningQueueSummary,
  selectUpcomingInterviews,
} from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import {
  formatCandidateResultCount,
  formatCandidateSubmittedDate,
  formatScreeningAutomationSummary,
} from './candidateListPresentation'

export type RecruitmentUiValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

export function validateRecruitmentUiDomain(): RecruitmentUiValidationResult {
  const errors: string[] = []
  const sourceBefore = JSON.stringify(initialDemoState)
  const now = new Date('2026-07-16T10:30:00Z')
  const metrics = selectDashboardMetrics(initialDemoState, now)
  const activeJobs = selectActiveJobs(initialDemoState)
  const recentApplications = selectRecentApplications(initialDemoState)
  const upcomingInterviews = selectUpcomingInterviews(initialDemoState, now)
  const candidateList = selectCandidateListItems(initialDemoState)
  const johnApplications = selectCandidateApplications(
    initialDemoState,
    'candidate-001',
  )
  const johnApplication = johnApplications[0]?.application
  const johnTimeline = johnApplication
    ? selectCandidateTimeline(initialDemoState, johnApplication.id)
    : []

  recordCheck(
    errors,
    Object.values(metrics).every((value) => value >= 0),
    'Dashboard metrics contain a negative value',
  )
  recordCheck(
    errors,
    activeJobs.length === 2 && activeJobs.every((job) => job.status === 'OPEN'),
    'Active jobs selector did not return the two open jobs',
  )
  recordCheck(
    errors,
    recentApplications.every(
      (item) =>
        item.application.candidateId === item.candidate.id &&
        item.application.jobId === item.job.id,
    ),
    'Recent applications contain an invalid candidate or job reference',
  )
  recordCheck(
    errors,
    upcomingInterviews.every(
      (item) =>
        item.interview.applicationId === item.application.id &&
        item.application.candidateId === item.candidate.id &&
        item.application.jobId === item.job.id,
    ),
    'Upcoming interviews contain an invalid joined reference',
  )
  recordCheck(
    errors,
    candidateList.length === 5 &&
      candidateList.every((item) => item.job.id === 'job-001'),
    'Candidate list does not contain five primary job applications',
  )

  const expectedRecommendations = new Map([
    ['John Doe', 'STRONG_YES'],
    ['Mary Smith', 'YES'],
    ['Alex Chen', 'REVIEW'],
    ['David Lee', 'NO'],
    ['Sarah Kim', 'STRONG_NO'],
  ])
  recordCheck(
    errors,
    candidateList.every(
      (item) =>
        item.screeningEvaluation?.recommendation ===
        expectedRecommendations.get(item.candidate.fullName),
    ),
    'Candidate list recommendations do not match the expected source data',
  )
  recordCheck(
    errors,
    candidateList.every(
      (item) =>
        Boolean(
          item.candidate.fullName &&
            item.candidate.email &&
            item.job.title &&
            item.candidate.skills.length,
        ),
    ),
    'Candidate search source data is incomplete',
  )

  const sampleItem = candidateList.find(
    (item) => item.candidate.currentPosition !== item.job.title,
  ) ?? candidateList[0]
  if (sampleItem) {
    const renderInRouter = (element: ReturnType<typeof createElement>) =>
      renderToStaticMarkup(
        createElement(MemoryRouter, null, element),
      )
    const tableMarkup = renderInRouter(
      createElement(CandidateTable, {
        items: [sampleItem],
        onRetryFailed: () => undefined,
      }),
    )
    const cardMarkup = renderInRouter(
      createElement(CandidateCard, {
        item: sampleItem,
        onRetryFailed: () => undefined,
      }),
    )
    const queuedMarkup = renderInRouter(
      createElement(CandidateTable, {
        items: [{
          ...sampleItem,
          screeningStatus: 'QUEUED',
          screeningEvaluation: undefined,
          decision: undefined,
        }],
        onRetryFailed: () => undefined,
      }),
    )
    const failedMarkup = renderInRouter(
      createElement(CandidateTable, {
        items: [{
          ...sampleItem,
          screeningStatus: 'FAILED',
          screeningEvaluation: undefined,
          decision: undefined,
        }],
        onRetryFailed: () => undefined,
      }),
    )

    recordCheck(
      errors,
      tableMarkup.includes(sampleItem.candidate.fullName) &&
        tableMarkup.includes(sampleItem.candidate.email),
      'Candidate row does not show name and email',
    )
    recordCheck(
      errors,
      sampleItem.candidate.currentPosition === sampleItem.job.title ||
        !tableMarkup.includes(sampleItem.candidate.currentPosition),
      'Candidate row repeats profile role text outside the Role column',
    )
    recordCheck(
      errors,
      tableMarkup.includes(sampleItem.job.title) &&
        tableMarkup.includes(`${sampleItem.candidate.yearsExperience} years`),
      'Candidate row does not show experience beneath the applied role',
    )
    recordCheck(
      errors,
      Boolean(
        sampleItem.screeningEvaluation &&
          tableMarkup.includes(`${Math.round(sampleItem.screeningEvaluation.overallScore)} / 100`),
      ),
      'Completed screening does not show recommendation score',
    )
    recordCheck(
      errors,
      !tableMarkup.includes('confidence') &&
        !tableMarkup.includes('Recruiter confirmed') &&
        !tableMarkup.includes('Overrode AURA'),
      'Candidate row renders confidence or recruiter override notes as normal text',
    )
    recordCheck(
      errors,
      queuedMarkup.includes('Queued') && !queuedMarkup.includes(' / 100'),
      'Queued screening does not show a score-free queued state',
    )
    recordCheck(
      errors,
      failedMarkup.includes('Failed') && failedMarkup.includes('Retry screening'),
      'Failed screening state or retry action is missing',
    )
    recordCheck(
      errors,
      tableMarkup.includes('Stage') &&
        tableMarkup.includes(sampleItem.operationalStatus?.label ?? ''),
      'Candidate row does not show broad stage and operational detail',
    )
    recordCheck(
      errors,
      tableMarkup.includes(`aria-label="View candidate ${sampleItem.candidate.fullName}"`),
      'Candidate row action does not have an accessible name',
    )
    recordCheck(
      errors,
      cardMarkup.includes(sampleItem.candidate.fullName) &&
        cardMarkup.includes(sampleItem.job.title) &&
        Boolean(
          sampleItem.screeningEvaluation &&
            cardMarkup.includes(`${Math.round(sampleItem.screeningEvaluation.overallScore)} / 100`),
        ) &&
        cardMarkup.includes('Recommendation') &&
        cardMarkup.includes('Stage') &&
        cardMarkup.includes('View candidate'),
      'Mobile candidate card does not contain the required candidate workflow information',
    )
  }

  recordCheck(
    errors,
    formatCandidateSubmittedDate('2026-07-16T09:00:00Z', 2026) === 'Jul 16' &&
      formatCandidateSubmittedDate('2025-07-16T09:00:00Z', 2026) === 'Jul 16, 2025',
    'Candidate submitted date is not compact for the current year',
  )
  recordCheck(
    errors,
    formatCandidateResultCount(5, 12) === '5 of 12 candidates' &&
      formatCandidateResultCount(12, 12) === '12 candidates',
    'Candidate result count does not distinguish filtered and unfiltered results',
  )
  const queueSummary = selectScreeningQueueSummary(initialDemoState)
  const automationSummary = formatScreeningAutomationSummary(queueSummary)
  recordCheck(
    errors,
    automationSummary.includes(`${queueSummary.completed} completed`) &&
      automationSummary.includes(`${queueSummary.processing} processing`) &&
      automationSummary.includes(`${queueSummary.failed} failed`) &&
      (queueSummary.queued === 0 || automationSummary.includes(`${queueSummary.queued} queued`)),
    'Compact screening automation summary is incomplete',
  )
  recordCheck(errors, johnApplications.length > 0, 'John has no application')
  recordCheck(
    errors,
    Boolean(johnApplication?.answers.length),
    'John application answers are missing',
  )
  recordCheck(
    errors,
    Boolean(
      johnApplication?.documents.some(
        (document) => document.documentType === 'CV',
      ),
    ),
    'John application does not contain a CV document',
  )

  const johnEventTypes = new Set(johnTimeline.map((event) => event.type))
  for (const type of [
    'APPLICATION_SUBMITTED',
    'SCREENING_COMPLETED',
    'INTERVIEW_COMPLETED',
    'FINAL_EVALUATION_COMPLETED',
  ] as const) {
    recordCheck(errors, johnEventTypes.has(type), `John timeline is missing ${type}`)
  }
  recordCheck(
    errors,
    johnTimeline.every(
      (event, index) =>
        index === 0 ||
        johnTimeline[index - 1]!.occurredAt <= event.occurredAt,
    ),
    'John timeline is not ordered ascending',
  )

  const persistedCandidate: Candidate = {
    id: 'candidate-validation-persisted',
    fullName: 'Taylor Morgan',
    email: 'taylor.morgan@example.com',
    phone: '+1 555 0199',
    currentPosition: 'Frontend Engineer',
    yearsExperience: 5,
    skills: ['React', 'TypeScript'],
    location: 'Yangon',
  }
  const persistedApplication: Application = {
    id: 'application-validation-persisted',
    candidateId: persistedCandidate.id,
    jobId: 'job-001',
    status: 'SUBMITTED',
    currentStage: 'APPLICATION',
    answers: [],
    documents: [],
    submittedAt: '2026-07-18T09:00:00Z',
  }
  const hydratedState = {
    ...initialDemoState,
    candidates: [...initialDemoState.candidates, persistedCandidate],
    applications: [...initialDemoState.applications, persistedApplication],
  }
  recordCheck(
    errors,
    selectCandidateListItems(hydratedState).some(
      (item) => item.candidate.id === persistedCandidate.id,
    ),
    'Persisted candidates require a JSON source change to appear in selectors',
  )
  recordCheck(
    errors,
    JSON.stringify(initialDemoState) === sourceBefore,
    'Recruitment UI selectors mutated the source state',
  )

  return { valid: errors.length === 0, errors }
}
