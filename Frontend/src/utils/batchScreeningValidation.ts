import {
  runBatchCandidateScreening,
  runCandidateScreening,
} from '../services/ai'
import {
  createFreshDemoState,
  normalizePersistedDemoState,
  recoverInterruptedScreeningQueue,
} from '../store/demoPersistence'
import { demoReducer, initialDemoState } from '../store/demoReducer'
import {
  selectCandidateListItems,
  selectScreeningQueueSummary,
  selectUnscreenedApplicationIds,
} from '../store/demoSelectors'
import type { BatchScreeningCandidateInput } from '../types/batchScreening'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import { validateApplicationFormDomain } from './applicationFormDomainValidation'
import { validateDemoData } from './demoDataValidation'
import { validateDemoPersistence } from './demoPersistenceValidation'
import { validateDemoStore } from './demoStoreValidation'
import { validateRecruitmentUiDomain } from './recruitmentUiValidation'
import { validatePersistedDemoState } from './persistedDemoStateValidation'

export type BatchScreeningValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function resolveBatchInput(
  state: ReturnType<typeof createFreshDemoState>,
  applicationId: string,
): BatchScreeningCandidateInput | undefined {
  const application = state.applications.find(
    (item) => item.id === applicationId,
  )
  const candidate = application
    ? state.candidates.find((item) => item.id === application.candidateId)
    : undefined
  const job = application
    ? state.jobs.find((item) => item.id === application.jobId)
    : undefined
  const rubric = job
    ? state.rubrics.find((item) => item.jobId === job.id)
    : undefined
  return application && candidate && job && rubric
    ? { application, candidate, job, rubric }
    : undefined
}

export async function validateBatchScreeningDomain(): Promise<BatchScreeningValidationResult> {
  const errors: string[] = []
  const seedBefore = JSON.stringify(initialDemoState)
  const freshState = createFreshDemoState()
  recordCheck(
    errors,
    freshState.screeningQueue.length === 0,
    'Fresh state does not have an empty screening queue',
  )

  const { screeningQueue: _screeningQueue, ...olderPersistedState } = freshState
  const normalizedOlderState = normalizePersistedDemoState(olderPersistedState)
  recordCheck(
    errors,
    validatePersistedDemoState(olderPersistedState).valid &&
      normalizedOlderState.screeningQueue.length === 0,
    'Older persisted state without screeningQueue did not hydrate with an empty queue',
  )

  const queueBase = {
    ...freshState,
    evaluations: freshState.evaluations.filter(
      (evaluation) =>
        evaluation.evaluationType !== 'SCREENING' ||
        !['application-001', 'application-002'].includes(
          evaluation.applicationId,
        ),
    ),
  }
  const queuedState = demoReducer(queueBase, {
    type: 'QUEUE_SCREENING_APPLICATIONS',
    payload: {
      applicationIds: [
        'application-001',
        'application-001',
        'application-missing',
        'application-003',
        'application-002',
      ],
      queuedAt: '2026-07-18T10:00:00Z',
    },
  })
  recordCheck(
    errors,
    queuedState.screeningQueue.length === 2 &&
      queuedState.screeningQueue[0]?.id ===
        'screening-queue-application-001' &&
      queuedState.screeningQueue[1]?.id ===
        'screening-queue-application-002',
    'Queueing did not create ordered deterministic items or filter duplicates and completed applications',
  )

  const processingState = demoReducer(queuedState, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-001',
      startedAt: '2026-07-18T10:01:00Z',
    },
  })
  const processingItem = processingState.screeningQueue.find(
    (item) => item.applicationId === 'application-001',
  )
  recordCheck(
    errors,
    processingItem?.status === 'PROCESSING' &&
      processingItem.attemptCount === 1,
    'Starting a queue item did not transition it or increment attempt count',
  )

  const completedState = demoReducer(processingState, {
    type: 'COMPLETE_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-001',
      completedAt: '2026-07-18T10:02:00Z',
    },
  })
  recordCheck(
    errors,
    completedState.screeningQueue.find(
      (item) => item.applicationId === 'application-001',
    )?.status === 'COMPLETED',
    'Processing queue item did not transition to completed',
  )

  const secondProcessingState = demoReducer(completedState, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-002',
      startedAt: '2026-07-18T10:01:30Z',
    },
  })
  const failedState = demoReducer(secondProcessingState, {
    type: 'FAIL_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-002',
      completedAt: '2026-07-18T10:02:30Z',
      error: 'Screening evidence could not be resolved.',
    },
  })
  recordCheck(
    errors,
    failedState.screeningQueue.find(
      (item) => item.applicationId === 'application-002',
    )?.status === 'FAILED',
    'Processing queue item did not transition to failed',
  )

  const retriedState = demoReducer(failedState, {
    type: 'RETRY_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-002',
      queuedAt: '2026-07-18T10:03:00Z',
    },
  })
  const retriedItem = retriedState.screeningQueue.find(
    (item) => item.applicationId === 'application-002',
  )
  recordCheck(
    errors,
    retriedItem?.status === 'QUEUED' &&
      retriedItem.attemptCount === 1 &&
      !retriedItem.error &&
      !retriedItem.startedAt,
    'Retry did not requeue safely while preserving attempt count',
  )
  const restartedState = demoReducer(retriedState, {
    type: 'START_SCREENING_QUEUE_ITEM',
    payload: {
      queueItemId: 'screening-queue-application-002',
      startedAt: '2026-07-18T10:04:00Z',
    },
  })
  recordCheck(
    errors,
    restartedState.screeningQueue.find(
      (item) => item.applicationId === 'application-002',
    )?.attemptCount === 2,
    'A retried queue item did not increment its attempt count when restarted',
  )

  const clearedState = demoReducer(restartedState, {
    type: 'CLEAR_COMPLETED_SCREENING_QUEUE_ITEMS',
  })
  recordCheck(
    errors,
    clearedState.screeningQueue.length === 1 &&
      clearedState.screeningQueue[0]?.status === 'PROCESSING',
    'Clearing completed queue items removed an active item or retained a completed item',
  )
  const recoveredState = recoverInterruptedScreeningQueue(restartedState)
  const recoveredItem = recoveredState.screeningQueue.find(
    (item) => item.applicationId === 'application-002',
  )
  recordCheck(
    errors,
    recoveredItem?.status === 'QUEUED' &&
      recoveredItem.attemptCount === 2 &&
      !recoveredItem.startedAt,
    'Interrupted processing item did not recover as queued',
  )
  const screeningOne = freshState.evaluations.find(
    (evaluation) => evaluation.id === 'evaluation-screening-001',
  )
  const completedSelectorState = {
    ...completedState,
    evaluations: screeningOne
      ? [...completedState.evaluations, screeningOne]
      : completedState.evaluations,
  }
  const completedAndQueuedIds = selectUnscreenedApplicationIds(
    completedSelectorState,
  )
  const processingIds = selectUnscreenedApplicationIds({
    ...secondProcessingState,
    evaluations: completedSelectorState.evaluations,
  })
  const failedIds = selectUnscreenedApplicationIds({
    ...failedState,
    evaluations: completedSelectorState.evaluations,
  })
  recordCheck(
    errors,
    !completedAndQueuedIds.includes('application-001') &&
      !completedAndQueuedIds.includes('application-002') &&
      !processingIds.includes('application-002') &&
      !failedIds.includes('application-002') &&
      !completedAndQueuedIds.includes('application-003'),
    'Unscreened selector included completed, queued, or failed applications',
  )

  const batchInputs = ['application-001', 'application-002', 'application-003']
    .map((applicationId) => resolveBatchInput(freshState, applicationId))
    .filter((item): item is BatchScreeningCandidateInput => Boolean(item))
  const batchInputsBefore = JSON.stringify(batchInputs)
  let activeCount = 0
  let maximumActiveCount = 0
  const progressEvents: string[] = []
  const batchResult = await runBatchCandidateScreening({
    candidates: batchInputs,
    concurrency: 2,
    delayMsPerCandidate: 0,
    shouldFailApplication: (applicationId) =>
      applicationId === 'application-002',
    onProgress: (event) => {
      progressEvents.push(`${event.type}:${event.applicationId}`)
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
    batchResult.completed.map((evaluation) => evaluation.applicationId).join() ===
      'application-001,application-003' &&
      batchResult.failed[0]?.applicationId === 'application-002',
    'Batch service did not preserve input order or isolate a failed item',
  )
  recordCheck(
    errors,
    maximumActiveCount === 2,
    'Batch service did not enforce the requested concurrency',
  )
  recordCheck(
    errors,
    progressEvents.filter((event) => event.startsWith('ITEM_STARTED')).length ===
      3 &&
      progressEvents.filter((event) => event.startsWith('ITEM_COMPLETED')).length ===
        2 &&
      progressEvents.filter((event) => event.startsWith('ITEM_FAILED')).length ===
        1,
    'Batch service did not emit the expected progress events',
  )
  recordCheck(
    errors,
    JSON.stringify(batchInputs) === batchInputsBefore,
    'Batch service mutated its source inputs',
  )

  const deduplicatedResult = await runBatchCandidateScreening({
    candidates: [batchInputs[0]!, batchInputs[0]!, batchInputs[2]!],
    delayMsPerCandidate: 0,
  })
  recordCheck(
    errors,
    deduplicatedResult.completed.length === 2,
    'Batch service did not deduplicate repeated application inputs',
  )
  const existingSingleResult = await runCandidateScreening({
    applicationId: 'application-001',
    applications: freshState.applications,
    evaluations: freshState.evaluations,
    delayMs: 0,
  })
  recordCheck(
    errors,
    existingSingleResult.evaluation.id === 'evaluation-screening-001',
    'Existing single-candidate screening behavior changed',
  )
  const evaluationAddedState = demoReducer(queueBase, {
    type: 'ADD_EVALUATION',
    payload: batchResult.completed[0]!,
  })
  const duplicateEvaluationState = demoReducer(evaluationAddedState, {
    type: 'ADD_EVALUATION',
    payload: batchResult.completed[0]!,
  })
  recordCheck(
    errors,
    duplicateEvaluationState === evaluationAddedState,
    'Duplicate completed evaluation creation was not prevented',
  )

  const statusQueue: ScreeningQueueItem[] = [
    {
      id: 'screening-queue-application-002',
      applicationId: 'application-002',
      jobId: 'job-001',
      status: 'QUEUED',
      queuedAt: '2026-07-18T11:00:00Z',
      attemptCount: 0,
    },
    {
      id: 'screening-queue-application-003',
      applicationId: 'application-003',
      jobId: 'job-001',
      status: 'PROCESSING',
      queuedAt: '2026-07-18T11:00:01Z',
      startedAt: '2026-07-18T11:01:00Z',
      attemptCount: 1,
    },
    {
      id: 'screening-queue-application-004',
      applicationId: 'application-004',
      jobId: 'job-001',
      status: 'FAILED',
      queuedAt: '2026-07-18T11:00:02Z',
      completedAt: '2026-07-18T11:02:00Z',
      error: 'Screening could not be completed.',
      attemptCount: 1,
    },
  ]
  const statusState = {
    ...freshState,
    evaluations: freshState.evaluations.filter(
      (evaluation) =>
        evaluation.evaluationType !== 'SCREENING' ||
        evaluation.applicationId === 'application-001',
    ),
    screeningQueue: statusQueue,
  }
  const statuses = new Map(
    selectCandidateListItems(statusState).map((item) => [
      item.application.id,
      item.screeningStatus,
    ]),
  )
  recordCheck(
    errors,
    statuses.get('application-001') === 'COMPLETED' &&
      statuses.get('application-002') === 'QUEUED' &&
      statuses.get('application-003') === 'PROCESSING' &&
      statuses.get('application-004') === 'FAILED' &&
      statuses.get('application-005') === 'NOT_SCREENED',
    'Candidate list did not derive all five screening display statuses',
  )
  const queueSummary = selectScreeningQueueSummary(statusState)
  recordCheck(
    errors,
    queueSummary.total === 3 &&
      queueSummary.queued === 1 &&
      queueSummary.processing === 1 &&
      queueSummary.failed === 1,
    'Dashboard queue summary does not match queue state',
  )

  const existingValidations = [
    validateDemoData(),
    validateDemoStore(),
    validateApplicationFormDomain(),
    validateDemoPersistence(),
    validateRecruitmentUiDomain(),
  ]
  recordCheck(
    errors,
    existingValidations.every((validation) => validation.valid),
    'An existing validator failed after batch screening changes',
  )
  try {
    JSON.stringify({ queuedState, recoveredState, batchResult, statusState })
  } catch {
    errors.push('Queue state is not JSON serializable')
  }
  recordCheck(
    errors,
    JSON.stringify(initialDemoState) === seedBefore,
    'Batch screening validation mutated initial seed state',
  )

  return { valid: errors.length === 0, errors }
}
