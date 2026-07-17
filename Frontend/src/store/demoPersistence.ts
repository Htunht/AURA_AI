import { validatePersistedDemoState } from '../utils/persistedDemoStateValidation'
import { createInitialDemoState } from './demoInitialState'
import { normalizeApplicationStage, synchronizeApplicationStages } from '../utils/applicationStage'
import type { DemoState } from './demoStateTypes'
import { migrateLegacyInterviewQuestions } from '../utils/interviewQuestionMigration'

export const DEMO_STORAGE_KEY = 'aura-ai-demo-state-v1'

export type PersistedDemoState = DemoState

export type DemoStateHydrationResult = {
  state: DemoState
  source: 'PERSISTED' | 'SEED'
  errors: string[]
}

export type DemoStatePersistenceResult = {
  success: boolean
  error?: string
}

const STORAGE_TEST_KEY = `${DEMO_STORAGE_KEY}-availability-test`

function canUseLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(STORAGE_TEST_KEY, STORAGE_TEST_KEY)
    window.localStorage.removeItem(STORAGE_TEST_KEY)
    return true
  } catch {
    return false
  }
}

export function createFreshDemoState(): DemoState {
  return createInitialDemoState()
}

export function hydratePersistedDemoStateValue(value: string | null, recoverActiveSessions = true): DemoState | undefined {
  if (value === null) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return undefined
  }
  const validation = validatePersistedDemoState(parsed)
  if (!validation.valid) return undefined
  return normalizePersistedDemoState(
    parsed as Omit<PersistedDemoState, 'screeningQueue' | 'interviewSchedulingPolicies' | 'interviewSchedulingInvitations' | 'interviewQuestionSets' | 'interviewSessions' | 'interviewTranscripts' | 'interviewAnalyses' | 'finalEvaluations' | 'evaluationChallenges' | 'candidateCommunicationDrafts' | 'holdFollowUps'> & {
      screeningQueue?: PersistedDemoState['screeningQueue']
      interviewSchedulingPolicies?: PersistedDemoState['interviewSchedulingPolicies']
      interviewSchedulingInvitations?: PersistedDemoState['interviewSchedulingInvitations']
      interviewQuestionSets?: PersistedDemoState['interviewQuestionSets']
      interviewSessions?: PersistedDemoState['interviewSessions']
      interviewTranscripts?: PersistedDemoState['interviewTranscripts']
      interviewAnalyses?: PersistedDemoState['interviewAnalyses']
      finalEvaluations?: PersistedDemoState['finalEvaluations']
      evaluationChallenges?: PersistedDemoState['evaluationChallenges']
      candidateCommunicationDrafts?: PersistedDemoState['candidateCommunicationDrafts']
      holdFollowUps?: PersistedDemoState['holdFollowUps']
    },
    recoverActiveSessions,
  )
}

function collectStateTimestamps(value: unknown, key: string | undefined, timestamps: number[]) {
  if (typeof value === 'string') {
    const timestampKey = key?.endsWith('At') && key !== 'expiresAt'
    const timestamp = timestampKey ? Date.parse(value) : Number.NaN
    if (Number.isFinite(timestamp)) timestamps.push(timestamp)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStateTimestamps(item, undefined, timestamps))
    return
  }
  if (typeof value === 'object' && value !== null) {
    Object.entries(value).forEach(([property, item]) => collectStateTimestamps(item, property, timestamps))
  }
}

export function getDemoStateRevision(state: DemoState): number {
  const timestamps: number[] = []
  collectStateTimestamps(state, undefined, timestamps)
  return Math.max(0, ...timestamps)
}

export function shouldAcceptSynchronizedDemoState(current: DemoState, incoming: DemoState): boolean {
  return getDemoStateRevision(incoming) > getDemoStateRevision(current)
}

export function resolveSynchronizedDemoState(
  current: DemoState,
  storageKey: string | null,
  value: string | null,
): DemoState | undefined {
  if (storageKey !== DEMO_STORAGE_KEY) return undefined
  const incoming = hydratePersistedDemoStateValue(value, false)
  return incoming && shouldAcceptSynchronizedDemoState(current, incoming) ? incoming : undefined
}

export function recoverInterruptedInterviewSessions(state: DemoState): DemoState {
  if (!state.interviewSessions.some((session) => session.status === 'IN_PROGRESS')) return state
  return { ...state, interviewSessions: state.interviewSessions.map((session) => session.status === 'IN_PROGRESS' ? { ...session, status: 'PAUSED', pausedAt: session.pausedAt ?? session.updatedAt } : session) }
}

export function recoverInterruptedScreeningQueue(state: DemoState): DemoState {
  const hasInterruptedItems = state.screeningQueue.some(
    (item) => item.status === 'PROCESSING',
  )

  if (!hasInterruptedItems) return state

  return {
    ...state,
    screeningQueue: state.screeningQueue.map((item) =>
      item.status === 'PROCESSING'
        ? {
            ...item,
            status: 'QUEUED',
            startedAt: undefined,
          }
        : item,
    ),
  }
}

export function normalizePersistedDemoState(
  state: Omit<DemoState, 'screeningQueue' | 'interviewSchedulingPolicies' | 'interviewSchedulingInvitations' | 'interviewQuestionSets' | 'interviewSessions' | 'interviewTranscripts' | 'interviewAnalyses' | 'finalEvaluations' | 'evaluationChallenges' | 'candidateCommunicationDrafts' | 'holdFollowUps'> & {
    screeningQueue?: DemoState['screeningQueue']
    interviewSchedulingPolicies?: DemoState['interviewSchedulingPolicies']
    interviewSchedulingInvitations?: DemoState['interviewSchedulingInvitations']
    interviewQuestionSets?: DemoState['interviewQuestionSets']
    interviewSessions?: DemoState['interviewSessions']
    interviewTranscripts?: DemoState['interviewTranscripts']
    interviewAnalyses?: DemoState['interviewAnalyses']
    finalEvaluations?: DemoState['finalEvaluations']
    evaluationChallenges?: DemoState['evaluationChallenges']
    candidateCommunicationDrafts?: DemoState['candidateCommunicationDrafts']
    holdFollowUps?: DemoState['holdFollowUps']
  },
  recoverActiveSessions = true,
): DemoState {
  const seedPolicies = createInitialDemoState().interviewSchedulingPolicies
  const persistedPolicies = Array.isArray(state.interviewSchedulingPolicies)
    ? state.interviewSchedulingPolicies
    : seedPolicies
  const normalizedPolicies = persistedPolicies.map((policy) => {
    const job = policy.jobId ? state.jobs.find((item) => item.id === policy.jobId) : undefined
    return {
      ...policy,
      scope: policy.scope ?? 'JOB' as const,
      displayName: policy.displayName ?? `Custom policy for ${job?.title ?? 'this job'}`,
      workingDays: [...policy.workingDays],
      requiredInterviewerRoles: [...policy.requiredInterviewerRoles],
      fixedInterviewerIds: [...policy.fixedInterviewerIds],
    }
  })
  const organizationSeed = seedPolicies.find((policy) => policy.scope === 'ORGANIZATION')
  if (organizationSeed && !normalizedPolicies.some((policy) => policy.scope === 'ORGANIZATION')) {
    normalizedPolicies.push({
      ...organizationSeed,
      workingDays: [...organizationSeed.workingDays],
      requiredInterviewerRoles: [...organizationSeed.requiredInterviewerRoles],
      fixedInterviewerIds: [...organizationSeed.fixedInterviewerIds],
    })
  }
  const experienceAnswerKeys = new Set([
    'years_of_experience',
    'years_experience',
    'yearsExperience',
  ])
  const candidates = state.candidates.map((candidate) => {
    if (candidate.yearsExperience > 0) return candidate

    const submittedExperience = state.applications
      .filter((application) => application.candidateId === candidate.id)
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
      .flatMap((application) => application.answers)
      .find((answer) => experienceAnswerKeys.has(answer.fieldKey))?.value
    const normalizedExperience =
      typeof submittedExperience === 'number'
        ? submittedExperience
        : typeof submittedExperience === 'string' &&
            submittedExperience.trim() !== ''
          ? Number(submittedExperience)
          : Number.NaN

    return Number.isFinite(normalizedExperience) && normalizedExperience >= 0
      ? { ...candidate, yearsExperience: normalizedExperience }
      : candidate
  })

  const normalized = recoverInterruptedScreeningQueue({
    ...state,
    applications: state.applications.map((application) => ({ ...application, currentStage: normalizeApplicationStage(application.currentStage) })),
    candidates,
    jobs: state.jobs.map((job) => ({
      ...job,
      employmentType: job.employmentType ?? 'FULL_TIME',
      workArrangement: job.workArrangement ?? 'REMOTE',
      minimumExperienceYears: Number.isFinite(job.minimumExperienceYears)
        ? job.minimumExperienceYears
        : Math.max(0, ...job.requiredSkills.map((skill) => skill.minimumYears ?? 0)),
      updatedAt: job.updatedAt ?? job.createdAt,
      openedAt: job.openedAt ?? (job.status === 'OPEN' ? job.createdAt : undefined),
      requiredSkills: job.requiredSkills.map((skill) => ({ ...skill })),
    })),
    applicationForms: state.applicationForms.map((form) => ({
      ...form,
      fields: form.fields.map((field) => ({
        ...field,
        options: field.options?.map((option) => ({ ...option })),
        screeningMapping: field.screeningMapping ? { ...field.screeningMapping, requirementIds: [...field.screeningMapping.requirementIds], criterionKeys: [...field.screeningMapping.criterionKeys] } : undefined,
      })),
    })),
    rubrics: state.rubrics.map((rubric) => ({
      ...rubric,
      status: rubric.status ?? 'PUBLISHED',
      version: Number.isInteger(rubric.version) && rubric.version > 0 ? rubric.version : 1,
      createdAt: rubric.createdAt ?? state.jobs.find((job) => job.id === rubric.jobId)?.createdAt ?? '2026-07-01T00:00:00.000Z',
      updatedAt: rubric.updatedAt ?? rubric.createdAt ?? state.jobs.find((job) => job.id === rubric.jobId)?.createdAt ?? '2026-07-01T00:00:00.000Z',
      criteria: rubric.criteria.map((criterion) => ({ ...criterion })),
      requirementRules: rubric.requirementRules?.map((rule) => ({ ...rule, fieldKeys: [...rule.fieldKeys] })),
    })),
    screeningQueue: Array.isArray(state.screeningQueue)
      ? state.screeningQueue
      : [],
    interviewSchedulingPolicies: normalizedPolicies,
    interviewSchedulingInvitations: Array.isArray(state.interviewSchedulingInvitations)
      ? state.interviewSchedulingInvitations.map((invitation) => {
          const delivery = invitation.delivery ?? { provider: 'EMAILJS' as const, status: 'NOT_SENT' as const, attemptCount: 0 }
          return {
            ...invitation,
            delivery: delivery.status === 'SENDING'
              ? { ...delivery, status: 'QUEUED' as const, sendingStartedAt: undefined }
              : { ...delivery },
          }
        })
      : [],
    interviewQuestionSets: migrateLegacyInterviewQuestions(state.interviews, Array.isArray(state.interviewQuestionSets) ? state.interviewQuestionSets : []),
    interviewSessions: Array.isArray(state.interviewSessions) ? state.interviewSessions.map((session) => ({ ...session, questionProgress: session.questionProgress.map((progress) => ({ ...progress, followUpNotes: [...progress.followUpNotes] })) })) : [],
    interviewTranscripts: Array.isArray(state.interviewTranscripts) ? state.interviewTranscripts.map((transcript) => ({ ...transcript, segments: transcript.segments.map((segment) => ({ ...segment })) })) : [],
    interviewAnalyses: Array.isArray(state.interviewAnalyses) ? state.interviewAnalyses.map((analysis) => ({ ...analysis, evidence: analysis.evidence.map((item) => ({ ...item, transcriptSegmentIds: [...item.transcriptSegmentIds], questionIds: [...item.questionIds], requirementIds: [...item.requirementIds], criterionKeys: [...item.criterionKeys] })), strengths: [...analysis.strengths], concerns: [...analysis.concerns], missingEvidence: [...analysis.missingEvidence] })) : [],
    finalEvaluations: Array.isArray(state.finalEvaluations) ? state.finalEvaluations.map((evaluation) => ({ ...evaluation, questionAssessments: evaluation.questionAssessments.map((item) => ({ ...item, transcriptSegmentIds: [...item.transcriptSegmentIds], evidenceIds: [...item.evidenceIds], requirementIds: [...item.requirementIds], criterionKeys: [...item.criterionKeys], competencyKeys: [...item.competencyKeys], reviewReasons: [...item.reviewReasons] })), competencyAssessments: evaluation.competencyAssessments.map((item) => ({ ...item, questionAssessmentIds: [...item.questionAssessmentIds], evidenceIds: [...item.evidenceIds], requirementIds: [...item.requirementIds], criterionKeys: [...item.criterionKeys], strengths: [...item.strengths], concerns: [...item.concerns], missingEvidence: [...item.missingEvidence], reviewReasons: [...item.reviewReasons] })), mustHaveGaps: [...evaluation.mustHaveGaps], unresolvedEvidence: [...evaluation.unresolvedEvidence], dataQualityIssues: [...evaluation.dataQualityIssues] })) : [],
    evaluationChallenges: Array.isArray(state.evaluationChallenges) ? state.evaluationChallenges.map((challenge) => ({ ...challenge, questionAssessmentIds: [...challenge.questionAssessmentIds], competencyAssessmentIds: [...challenge.competencyAssessmentIds], transcriptSegmentIds: [...challenge.transcriptSegmentIds], evidenceIds: [...challenge.evidenceIds] })) : [],
    candidateCommunicationDrafts: Array.isArray(state.candidateCommunicationDrafts) ? state.candidateCommunicationDrafts.map((draft) => ({ ...draft })) : [],
    holdFollowUps: Array.isArray(state.holdFollowUps) ? state.holdFollowUps.map((followUp) => ({ ...followUp })) : [],
  })
  const recovered = recoverActiveSessions ? recoverInterruptedInterviewSessions(normalized) : normalized
  return synchronizeApplicationStages(recovered)
}

export function loadPersistedDemoState(): DemoStateHydrationResult {
  if (!canUseLocalStorage()) {
    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Demo persistence is unavailable in this browser environment.'],
    }
  }

  let storedValue: string | null

  try {
    storedValue = window.localStorage.getItem(DEMO_STORAGE_KEY)
  } catch {
    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Demo persistence is unavailable in this browser environment.'],
    }
  }

  if (storedValue === null) {
    return { state: createFreshDemoState(), source: 'SEED', errors: [] }
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(storedValue)
  } catch {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
    } catch {
      // The invalid value is ignored even if this browser blocks its removal.
    }

    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Stored AURA AI demo state could not be parsed.'],
    }
  }

  const validation = validatePersistedDemoState(parsedValue)

  if (!validation.valid) {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
    } catch {
      // The invalid value is ignored even if this browser blocks its removal.
    }

    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Stored AURA AI demo state is invalid.', ...validation.errors],
    }
  }

  return {
    state: normalizePersistedDemoState(
      parsedValue as Omit<PersistedDemoState, 'screeningQueue' | 'interviewSchedulingPolicies' | 'interviewSchedulingInvitations' | 'interviewQuestionSets' | 'interviewSessions' | 'interviewTranscripts' | 'interviewAnalyses' | 'finalEvaluations' | 'evaluationChallenges' | 'candidateCommunicationDrafts' | 'holdFollowUps'> & {
        screeningQueue?: PersistedDemoState['screeningQueue']
        interviewSchedulingPolicies?: PersistedDemoState['interviewSchedulingPolicies']
        interviewSchedulingInvitations?: PersistedDemoState['interviewSchedulingInvitations']
        interviewQuestionSets?: PersistedDemoState['interviewQuestionSets']
        interviewSessions?: PersistedDemoState['interviewSessions']
        interviewTranscripts?: PersistedDemoState['interviewTranscripts']
        interviewAnalyses?: PersistedDemoState['interviewAnalyses']
        finalEvaluations?: PersistedDemoState['finalEvaluations']
        evaluationChallenges?: PersistedDemoState['evaluationChallenges']
        candidateCommunicationDrafts?: PersistedDemoState['candidateCommunicationDrafts']
        holdFollowUps?: PersistedDemoState['holdFollowUps']
      },
    ),
    source: 'PERSISTED',
    errors: [],
  }
}

export function savePersistedDemoState(
  state: DemoState,
): DemoStatePersistenceResult {
  if (!canUseLocalStorage()) {
    return {
      success: false,
      error: 'AURA AI demo state could not be saved.',
    }
  }

  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'AURA AI demo state could not be saved.',
    }
  }
}

export function clearPersistedDemoState(): DemoStatePersistenceResult {
  if (!canUseLocalStorage()) {
    return {
      success: false,
      error: 'AURA AI demo state could not be cleared.',
    }
  }

  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'AURA AI demo state could not be cleared.',
    }
  }
}
