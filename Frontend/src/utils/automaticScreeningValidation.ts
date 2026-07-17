import { runBatchCandidateScreening, runCandidateScreening } from '../services/ai'
import { initialDemoState, demoReducer, type DemoState } from '../store/demoReducer'
import {
  findApplicationsRequiringAutomaticScreening,
  selectCandidateListItems,
  selectDashboardMetrics,
  selectScreeningQueueSummary,
} from '../store/demoSelectors'
import {
  normalizePersistedDemoState,
  recoverInterruptedScreeningQueue,
} from '../store/demoPersistence'
import type { Application } from '../types/application'
import type { BatchScreeningCandidateInput } from '../types/batchScreening'
import type { Candidate } from '../types/candidate'

export type AutomaticScreeningValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function createApplicationFixture(): {
  candidate: Candidate
  application: Application
} {
  const source = initialDemoState.applications[0]
  if (!source) throw new Error('Automatic screening validation requires an application fixture.')

  const candidate: Candidate = {
    id: 'candidate-automatic-validation',
    fullName: 'Morgan Rivera',
    email: 'morgan.rivera.automatic@example.com',
    phone: '+95 9 555 0101',
    currentPosition: 'Frontend Engineer',
    yearsExperience: 5,
    skills: ['React', 'TypeScript'],
    location: 'Yangon',
  }
  const application: Application = {
    ...source,
    id: 'application-automatic-validation',
    candidateId: candidate.id,
    status: 'SUBMITTED',
    currentStage: 'APPLICATION',
    answers: source.answers.map((answer, index) => ({
      ...answer,
      id: `answer-automatic-validation-${index + 1}`,
    })),
    documents: source.documents.map((document, index) => ({
      ...document,
      id: `document-automatic-validation-${index + 1}`,
    })),
    submittedAt: '2026-07-16T11:00:00Z',
  }

  return { candidate, application }
}

export async function validateAutomaticScreeningDomain(): Promise<AutomaticScreeningValidationResult> {
  const errors: string[] = []
  const initialSnapshot = JSON.stringify(initialDemoState)
  const { candidate, application } = createApplicationFixture()
  const rubric = initialDemoState.rubrics.find(
    (item) => item.jobId === application.jobId,
  )
  const job = initialDemoState.jobs.find((item) => item.id === application.jobId)

  if (!rubric || !job) {
    return {
      valid: false,
      errors: ['Automatic screening validation fixtures could not resolve a job and rubric.'],
    }
  }

  let state = demoReducer(initialDemoState, {
    type: 'ADD_CANDIDATE',
    payload: candidate,
  })
  state = demoReducer(state, { type: 'ADD_APPLICATION', payload: application })
  state = demoReducer(state, {
    type: 'QUEUE_SCREENING_APPLICATION',
    payload: {
      applicationId: application.id,
      queuedAt: application.submittedAt,
    },
  })

  const queuedItem = state.screeningQueue.find(
    (item) => item.applicationId === application.id,
  )
  recordCheck(errors, Boolean(queuedItem), 'Successful submission did not create a screening queue item')
  recordCheck(
    errors,
    queuedItem?.id === `screening-queue-${application.id}`,
    'Automatic screening queue ID is not deterministic',
  )
  recordCheck(
    errors,
    queuedItem?.applicationId === application.id && queuedItem.jobId === application.jobId,
    'Automatic screening queue item references are invalid',
  )
  recordCheck(
    errors,
    state.applications.find((item) => item.id === application.id)?.currentStage === 'SCREENING',
    'Queued application did not enter SCREENING',
  )
  recordCheck(
    errors,
    queuedItem?.status === 'QUEUED',
    'Candidate submission state was not available before screening work began',
  )

  const duplicateQueueState = demoReducer(state, {
    type: 'QUEUE_SCREENING_APPLICATION',
    payload: { applicationId: application.id, queuedAt: application.submittedAt },
  })
  recordCheck(
    errors,
    duplicateQueueState === state,
    'Duplicate automatic queue records were not prevented',
  )

  const startedAt = '2026-07-16T11:00:01Z'
  state = demoReducer(state, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: { queueItemId: queuedItem?.id ?? '', startedAt },
  })
  recordCheck(
    errors,
    state.screeningQueue.find((item) => item.id === queuedItem?.id)?.status === 'PROCESSING',
    'QUEUED did not transition to PROCESSING',
  )

  const serviceInputSnapshot = JSON.stringify({
    applications: state.applications,
    evaluations: state.evaluations,
    rubric,
  })
  const screeningResult = await runCandidateScreening({
    applicationId: application.id,
    applications: state.applications,
    evaluations: state.evaluations,
    rubric,
    generatedAt: '2026-07-16T11:00:02Z',
    delayMs: 0,
  })
  recordCheck(
    errors,
    JSON.stringify({
      applications: state.applications,
      evaluations: state.evaluations,
      rubric,
    }) === serviceInputSnapshot,
    'Automatic screening service mutated its inputs',
  )

  state = demoReducer(state, {
    type: 'ADD_EVALUATION',
    payload: screeningResult.evaluation,
  })
  state = demoReducer(state, {
    type: 'COMPLETE_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: queuedItem?.id ?? '',
      completedAt: '2026-07-16T11:00:03Z',
    },
  })
  recordCheck(
    errors,
    state.screeningQueue.find((item) => item.id === queuedItem?.id)?.status === 'COMPLETED',
    'PROCESSING did not transition to COMPLETED after evaluation creation',
  )
  recordCheck(
    errors,
    state.evaluations.filter(
      (item) =>
        item.applicationId === application.id &&
        item.evaluationType === 'SCREENING' &&
        item.status === 'COMPLETED',
    ).length === 1,
    'Completed automatic evaluation was not stored exactly once',
  )
  recordCheck(
    errors,
    !findApplicationsRequiringAutomaticScreening(state).includes(application.id),
    'Completed application was eligible for screening after provider remount',
  )

  const readdedEvaluationState = demoReducer(state, {
    type: 'ADD_EVALUATION',
    payload: screeningResult.evaluation,
  })
  recordCheck(
    errors,
    readdedEvaluationState === state,
    'Evaluation idempotency did not prevent a duplicate evaluation',
  )

  const failedApplication: Application = {
    ...application,
    id: 'application-automatic-failed',
    submittedAt: '2026-07-16T11:05:00Z',
  }
  let failedState: DemoState = {
    ...initialDemoState,
    candidates: [...initialDemoState.candidates, candidate],
    applications: [...initialDemoState.applications, failedApplication],
  }
  failedState = demoReducer(failedState, {
    type: 'QUEUE_SCREENING_APPLICATION',
    payload: {
      applicationId: failedApplication.id,
      queuedAt: failedApplication.submittedAt,
    },
  })
  const failedQueueId = `screening-queue-${failedApplication.id}`
  failedState = demoReducer(failedState, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: { queueItemId: failedQueueId, startedAt },
  })
  failedState = demoReducer(failedState, {
    type: 'FAIL_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: failedQueueId,
      completedAt: '2026-07-16T11:05:02Z',
      error: 'Application evidence is incomplete.',
    },
  })
  recordCheck(
    errors,
    !findApplicationsRequiringAutomaticScreening(failedState).includes(failedApplication.id),
    'Failed screening was automatically eligible for an infinite retry',
  )
  const failedAttemptCount = failedState.screeningQueue[0]?.attemptCount
  failedState = demoReducer(failedState, {
    type: 'RETRY_SCREENING_QUEUE_ITEM',
    payload: { queueItemId: failedQueueId, queuedAt: '2026-07-16T11:06:00Z' },
  })
  recordCheck(
    errors,
    failedState.screeningQueue[0]?.status === 'QUEUED' &&
      failedState.screeningQueue[0]?.attemptCount === failedAttemptCount,
    'Manual retry did not transition FAILED to QUEUED while preserving attempts',
  )

  const interruptedState = demoReducer(failedState, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: { queueItemId: failedQueueId, startedAt: '2026-07-16T11:06:01Z' },
  })
  const recoveredState = recoverInterruptedScreeningQueue(interruptedState)
  recordCheck(
    errors,
    recoveredState.screeningQueue[0]?.status === 'QUEUED' &&
      recoveredState.screeningQueue[0]?.startedAt === undefined,
    'Interrupted PROCESSING item did not recover to QUEUED',
  )
  recordCheck(
    errors,
    recoveredState.screeningQueue.some((item) => item.status === 'QUEUED'),
    'Recovered queue item is unavailable for automatic provider resumption',
  )

  const { screeningQueue: omittedQueue, ...legacyState } = state
  void omittedQueue
  const normalizedLegacyState = normalizePersistedDemoState(legacyState)
  recordCheck(
    errors,
    Array.isArray(normalizedLegacyState.screeningQueue) &&
      normalizedLegacyState.screeningQueue.length === 0,
    'Older persisted state without screeningQueue did not hydrate safely',
  )

  const queuedListItem = selectCandidateListItems(recoveredState).find(
    (item) => item.application.id === failedApplication.id,
  )
  recordCheck(
    errors,
    queuedListItem?.screeningStatus === 'QUEUED',
    'Candidate list automatic screening status was derived incorrectly',
  )
  const queueSummary = selectScreeningQueueSummary(recoveredState)
  recordCheck(
    errors,
    queueSummary.queued === 1 && queueSummary.processing === 0,
    'Dashboard automation counts were derived incorrectly',
  )

  const reviewEvaluation = {
    ...screeningResult.evaluation,
    recommendation: 'REVIEW' as const,
  }
  const reviewState = {
    ...initialDemoState,
    evaluations: [...initialDemoState.evaluations, reviewEvaluation],
    applications: [...initialDemoState.applications, application],
  }
  recordCheck(
    errors,
    selectDashboardMetrics(reviewState, new Date('2026-07-16T12:00:00Z'))
      .pendingRecruiterReviews >= 1,
    'Pending recruiter review count does not include REVIEW recommendations',
  )

  const seedWithoutEvaluation: DemoState = {
    ...initialDemoState,
    evaluations: initialDemoState.evaluations.filter(
      (item) =>
        item.applicationId !== initialDemoState.applications[0]?.id ||
        item.evaluationType !== 'SCREENING',
    ),
  }
  const seedApplicationId = initialDemoState.applications[0]?.id ?? ''
  const discoveredIds = findApplicationsRequiringAutomaticScreening(seedWithoutEvaluation)
  recordCheck(
    errors,
    discoveredIds.includes(seedApplicationId),
    'Existing unscreened seed application was not discovered during initialization',
  )
  const bootstrappedState = demoReducer(seedWithoutEvaluation, {
    type: 'QUEUE_SCREENING_APPLICATION',
    payload: {
      applicationId: seedApplicationId,
      queuedAt: initialDemoState.applications[0]?.submittedAt ?? '',
    },
  })
  recordCheck(
    errors,
    !findApplicationsRequiringAutomaticScreening(bootstrappedState).includes(seedApplicationId),
    'Existing unscreened application was discovered more than once',
  )

  const batchInputs: BatchScreeningCandidateInput[] = Array.from(
    { length: 5 },
    (_, index) => ({
      application: {
        ...application,
        id: `application-automatic-batch-${index + 1}`,
      },
      candidate,
      job,
      rubric,
    }),
  )
  let activeCount = 0
  let maximumActiveCount = 0
  const batchResult = await runBatchCandidateScreening({
    candidates: batchInputs,
    concurrency: 3,
    delayMsPerCandidate: 1,
    shouldFailApplication: (applicationId) => applicationId.endsWith('-3'),
    onProgress: (event) => {
      if (event.type === 'ITEM_STARTED') {
        activeCount += 1
        maximumActiveCount = Math.max(maximumActiveCount, activeCount)
      } else {
        activeCount -= 1
      }
    },
  })
  recordCheck(
    errors,
    maximumActiveCount <= 3,
    'Automatic screening exceeded maximum concurrency 3',
  )
  recordCheck(
    errors,
    batchResult.failed.length === 1 && batchResult.completed.length === 4,
    'One failed screening stopped other automatic queue items',
  )
  const evaluatedSeedApplication = initialDemoState.evaluations.find(
    (item) => item.evaluationType === 'SCREENING' && item.status === 'COMPLETED',
  )?.applicationId
  recordCheck(
    errors,
    Boolean(evaluatedSeedApplication) &&
      !findApplicationsRequiringAutomaticScreening(initialDemoState).includes(
        evaluatedSeedApplication ?? '',
      ),
    'Existing evaluated applications were selected for reprocessing',
  )
  recordCheck(
    errors,
    JSON.stringify(initialDemoState) === initialSnapshot,
    'Automatic screening validation mutated initial seed state',
  )
  try {
    JSON.stringify(state)
  } catch {
    errors.push('Automatic screening state is not JSON serializable')
  }

  return { valid: errors.length === 0, errors }
}
