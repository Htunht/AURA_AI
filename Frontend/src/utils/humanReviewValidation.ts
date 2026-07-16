import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import {
  selectCandidateListItems,
  selectCandidateTimeline,
  selectDashboardMetrics,
  selectHumanReviewQueueItem,
  selectHumanReviewQueueItems,
  selectHumanReviewQueueSummary,
} from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import type { Evaluation, Recommendation } from '../types/evaluation'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import { getPostScreeningStage } from './screeningWorkflow'

export type HumanReviewValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function createFixture(index: number, recommendation: Recommendation, confidence: number) {
  const sourceCandidate = initialDemoState.candidates[0]
  const sourceApplication = initialDemoState.applications[0]
  const sourceEvaluation = initialDemoState.evaluations.find(
    (item) => item.evaluationType === 'SCREENING',
  )
  if (!sourceCandidate || !sourceApplication || !sourceEvaluation) {
    throw new Error('Human review validation requires screening seed fixtures.')
  }

  const suffix = String(index).padStart(2, '0')
  const candidate: Candidate = {
    ...sourceCandidate,
    id: `candidate-review-validation-${suffix}`,
    fullName: `Review Candidate ${suffix}`,
    email: `review.candidate.${suffix}@example.com`,
  }
  const application: Application = {
    ...sourceApplication,
    id: `application-review-validation-${suffix}`,
    candidateId: candidate.id,
    status: 'IN_REVIEW',
    currentStage: 'AI_SCREENING',
    submittedAt: `2026-07-${String(10 + index).padStart(2, '0')}T09:00:00Z`,
  }
  const evaluation: Evaluation = {
    ...sourceEvaluation,
    id: `evaluation-review-validation-${suffix}`,
    applicationId: application.id,
    recommendation,
    confidence,
    overallScore:
      recommendation === 'STRONG_YES'
        ? 94
        : recommendation === 'YES'
          ? 82
          : recommendation === 'REVIEW'
            ? 68
            : recommendation === 'NO'
              ? 48
              : 35,
    createdAt: `2026-07-${String(10 + index).padStart(2, '0')}T09:05:00Z`,
  }
  return { candidate, application, evaluation }
}

function createReviewState(): DemoState {
  const fixtures = [
    createFixture(1, 'STRONG_YES', 92),
    createFixture(2, 'YES', 84),
    createFixture(3, 'REVIEW', 88),
    createFixture(4, 'YES', 70),
    createFixture(5, 'NO', 68),
    createFixture(6, 'NO', 91),
    createFixture(7, 'STRONG_NO', 94),
  ]
  const failed = createFixture(8, 'REVIEW', 80)
  const failedQueueItem: ScreeningQueueItem = {
    id: `screening-queue-${failed.application.id}`,
    applicationId: failed.application.id,
    jobId: failed.application.jobId,
    status: 'FAILED',
    queuedAt: failed.application.submittedAt,
    startedAt: '2026-07-18T09:01:00Z',
    completedAt: '2026-07-18T09:02:00Z',
    error: 'Application evidence could not be processed.',
    attemptCount: 1,
  }

  return {
    ...initialDemoState,
    candidates: [...fixtures.map((item) => item.candidate), failed.candidate],
    applications: [...fixtures.map((item) => item.application), failed.application],
    evaluations: fixtures.map((item) => item.evaluation),
    decisions: [],
    screeningQueue: [failedQueueItem],
    interviews: [],
    transcripts: [],
    communications: [],
  }
}

function decisionFor(
  evaluation: Evaluation,
  reviewAction: Decision['reviewAction'],
  humanRecommendation: Recommendation,
  overrideReason?: string,
): Decision {
  return {
    id: `decision-${evaluation.id}`,
    applicationId: evaluation.applicationId,
    evaluationId: evaluation.id,
    reviewAction,
    aiRecommendation: evaluation.recommendation,
    humanRecommendation,
    humanDecision: 'NEXT_STAGE',
    ...(overrideReason ? { overrideReason } : {}),
    createdAt: '2026-07-20T10:00:00Z',
  }
}

function applyDecision(state: DemoState, decision: Decision): DemoState {
  const decidedState = demoReducer(state, {
    type:
      decision.reviewAction === 'CONFIRM'
        ? 'CONFIRM_RECOMMENDATION'
        : 'OVERRIDE_RECOMMENDATION',
    payload: { decision },
  })
  if (decidedState === state) return state
  return demoReducer(decidedState, {
    type: 'UPDATE_APPLICATION_STAGE',
    payload: {
      applicationId: decision.applicationId,
      stage: getPostScreeningStage(decision.humanRecommendation),
    },
  })
}

export function validateHumanReviewDomain(): HumanReviewValidationResult {
  const errors: string[] = []
  const sourceSnapshot = JSON.stringify(initialDemoState)
  const state = createReviewState()
  const items = selectHumanReviewQueueItems(state)

  recordCheck(
    errors,
    items.length === state.applications.length &&
      items.every(
        (item) =>
          item.application.candidateId === item.candidate.id &&
          item.application.jobId === item.job.id,
      ),
    'Review queue did not resolve valid candidate, application, and job references',
  )
  recordCheck(
    errors,
    items.filter((item) => item.category !== 'FAILED').every((item) => item.evaluation?.applicationId === item.application.id),
    'Review queue did not resolve screening evaluations correctly',
  )

  const expectedCategories: Array<[number, string]> = [
    [1, 'RECOMMENDED'],
    [2, 'RECOMMENDED'],
    [3, 'NEEDS_REVIEW'],
    [4, 'NEEDS_REVIEW'],
    [5, 'NEEDS_REVIEW'],
    [6, 'NOT_RECOMMENDED'],
    [7, 'NOT_RECOMMENDED'],
    [8, 'FAILED'],
  ]
  for (const [index, category] of expectedCategories) {
    const applicationId = `application-review-validation-${String(index).padStart(2, '0')}`
    recordCheck(
      errors,
      selectHumanReviewQueueItem(state, applicationId)?.category === category,
      `${applicationId} did not derive ${category}`,
    )
  }

  const summary = selectHumanReviewQueueSummary(state)
  recordCheck(
    errors,
    summary.total === 8 &&
      summary.recommended === 2 &&
      summary.needsReview === 3 &&
      summary.notRecommended === 2 &&
      summary.failed === 1 &&
      summary.reviewed === 0,
    'Review queue summary counts do not match derived categories',
  )
  const priority = ['NEEDS_REVIEW', 'FAILED', 'RECOMMENDED', 'NOT_RECOMMENDED', 'REVIEWED']
  recordCheck(
    errors,
    items.every(
      (item, index) =>
        index === 0 ||
        priority.indexOf(items[index - 1]!.category) <= priority.indexOf(item.category),
    ),
    'Review queue ordering does not follow operational priority',
  )
  const needsReview = items.filter((item) => item.category === 'NEEDS_REVIEW')
  recordCheck(
    errors,
    needsReview.every(
      (item, index) =>
        index === 0 ||
        (needsReview[index - 1]!.evaluation?.confidence ?? 101) <=
          (item.evaluation?.confidence ?? 101),
    ),
    'Needs-review items are not ordered by lower confidence first',
  )

  const positiveEvaluation = state.evaluations.find(
    (item) => item.recommendation === 'STRONG_YES',
  )!
  const positiveDecision = decisionFor(
    positiveEvaluation,
    'CONFIRM',
    positiveEvaluation.recommendation,
  )
  const pendingBefore = selectDashboardMetrics(
    state,
    new Date('2026-07-20T09:00:00Z'),
  ).pendingRecruiterReviews
  const confirmedState = applyDecision(state, positiveDecision)
  const storedConfirmation = confirmedState.decisions.find(
    (item) => item.id === positiveDecision.id,
  )
  recordCheck(errors, confirmedState.decisions.length === 1, 'Confirming a recommendation did not create one decision')
  recordCheck(
    errors,
    storedConfirmation?.humanRecommendation === storedConfirmation?.aiRecommendation,
    'Confirmed recruiter recommendation does not match the AI recommendation',
  )
  recordCheck(
    errors,
    confirmedState.applications.find((item) => item.id === positiveDecision.applicationId)?.currentStage === 'SHORTLIST_REVIEW',
    'Positive confirmation did not move to SHORTLIST_REVIEW',
  )
  recordCheck(
    errors,
    selectHumanReviewQueueItem(confirmedState, positiveDecision.applicationId)?.category === 'REVIEWED',
    'Confirmed decision did not appear as REVIEWED',
  )
  recordCheck(
    errors,
    selectDashboardMetrics(confirmedState, new Date('2026-07-20T09:00:00Z')).pendingRecruiterReviews === pendingBefore - 1,
    'Dashboard pending-review count did not decrease after a decision',
  )

  const reviewEvaluation = state.evaluations.find((item) => item.recommendation === 'REVIEW')!
  const reviewConfirmedState = applyDecision(
    state,
    decisionFor(reviewEvaluation, 'CONFIRM', 'REVIEW'),
  )
  recordCheck(
    errors,
    reviewConfirmedState.applications.find((item) => item.id === reviewEvaluation.applicationId)?.currentStage === 'SHORTLIST_REVIEW',
    'REVIEW confirmation did not move to SHORTLIST_REVIEW',
  )

  const negativeEvaluation = state.evaluations.find(
    (item) => item.recommendation === 'STRONG_NO',
  )!
  const negativeConfirmedState = applyDecision(
    state,
    decisionFor(negativeEvaluation, 'CONFIRM', negativeEvaluation.recommendation),
  )
  recordCheck(
    errors,
    negativeConfirmedState.applications.find((item) => item.id === negativeEvaluation.applicationId)?.currentStage === 'DECISION',
    'Negative confirmation did not move to DECISION',
  )

  const noEvaluation = state.evaluations.find(
    (item) => item.recommendation === 'NO' && item.confidence >= 75,
  )!
  const overrideReason = 'The candidate supplied relevant production evidence during recruiter review.'
  const positiveOverride = decisionFor(noEvaluation, 'OVERRIDE', 'YES', overrideReason)
  const positiveOverrideState = applyDecision(state, positiveOverride)
  const storedOverride = positiveOverrideState.decisions.find(
    (item) => item.id === positiveOverride.id,
  )
  recordCheck(
    errors,
    storedOverride?.aiRecommendation === 'NO' && storedOverride.humanRecommendation === 'YES',
    'Override did not preserve AI and human recommendations',
  )
  recordCheck(errors, storedOverride?.overrideReason === overrideReason, 'Override reason was not stored')
  recordCheck(
    errors,
    positiveOverrideState.applications.find((item) => item.id === noEvaluation.applicationId)?.currentStage === 'SHORTLIST_REVIEW',
    'Positive override did not move to SHORTLIST_REVIEW',
  )

  const yesEvaluation = state.evaluations.find(
    (item) => item.recommendation === 'YES' && item.confidence >= 75,
  )!
  const negativeOverrideState = applyDecision(
    state,
    decisionFor(yesEvaluation, 'OVERRIDE', 'NO', overrideReason),
  )
  recordCheck(
    errors,
    negativeOverrideState.applications.find((item) => item.id === yesEvaluation.applicationId)?.currentStage === 'DECISION',
    'Negative override did not move to DECISION',
  )

  const sameRecommendationState = demoReducer(state, {
    type: 'OVERRIDE_RECOMMENDATION',
    payload: {
      decision: decisionFor(yesEvaluation, 'OVERRIDE', 'YES', overrideReason),
    },
  })
  recordCheck(errors, sameRecommendationState === state, 'Same-recommendation override was accepted')
  const shortReasonState = demoReducer(state, {
    type: 'OVERRIDE_RECOMMENDATION',
    payload: {
      decision: decisionFor(yesEvaluation, 'OVERRIDE', 'NO', 'Too short'),
    },
  })
  recordCheck(errors, shortReasonState === state, 'Short override reason was accepted')
  const duplicateDecisionState = demoReducer(confirmedState, {
    type: 'CONFIRM_RECOMMENDATION',
    payload: { decision: { ...positiveDecision, id: 'decision-duplicate' } },
  })
  recordCheck(errors, duplicateDecisionState === confirmedState, 'Duplicate human decision was accepted')

  const timeline = selectCandidateTimeline(
    positiveOverrideState,
    noEvaluation.applicationId,
  )
  recordCheck(
    errors,
    timeline.some(
      (event) =>
        event.type === 'DECISION_RECORDED' &&
        event.title === 'Screening recommendation overridden',
    ),
    'Candidate timeline does not include the recruiter decision event',
  )
  const finalCandidateItem = selectCandidateListItems(
    positiveOverrideState,
  ).find((item) => item.application.id === noEvaluation.applicationId)
  recordCheck(
    errors,
    finalCandidateItem?.decision?.humanRecommendation === 'YES' &&
      finalCandidateItem.screeningEvaluation?.recommendation === 'NO',
    'Candidate list did not resolve final and original recommendations',
  )

  recordCheck(
    errors,
    JSON.stringify(initialDemoState) === sourceSnapshot,
    'Human review validation mutated the source state',
  )
  try {
    JSON.stringify(positiveOverrideState)
  } catch {
    errors.push('Human review state is not JSON serializable')
  }

  return { valid: errors.length === 0, errors }
}
