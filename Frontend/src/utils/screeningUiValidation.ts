import { runCandidateScreening } from '../services/ai'
import { createFreshDemoState } from '../store/demoPersistence'
import { demoReducer, initialDemoState } from '../store/demoReducer'
import {
  selectCandidateListItems,
  selectCandidateScreeningViewModel,
  selectCandidateTimeline,
  selectLatestDecisionByApplicationId,
} from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import { validateApplicationFormDomain } from './applicationFormDomainValidation'
import { validateDemoData } from './demoDataValidation'
import { validateDemoPersistence } from './demoPersistenceValidation'
import { validateDemoStore } from './demoStoreValidation'
import { validateRecruitmentUiDomain } from './recruitmentUiValidation'

export type ScreeningUiValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

export async function validateScreeningUiDomain(): Promise<ScreeningUiValidationResult> {
  const errors: string[] = []
  const seedBefore = JSON.stringify(initialDemoState)
  const freshState = createFreshDemoState()
  const johnView = selectCandidateScreeningViewModel(
    freshState,
    'application-001',
  )

  recordCheck(
    errors,
    johnView?.candidate.fullName === 'John Doe' &&
      johnView.job.id === 'job-001',
    'John Doe screening view model did not resolve the job-001 application',
  )
  recordCheck(errors, Boolean(johnView?.rubric), 'John screening rubric did not resolve')
  recordCheck(
    errors,
    johnView?.screeningEvaluation?.recommendation === 'STRONG_YES',
    'John latest screening recommendation is not STRONG_YES',
  )
  const johnEvaluation = johnView?.screeningEvaluation
  recordCheck(
    errors,
    Boolean(
      johnEvaluation &&
        johnEvaluation.overallScore >= 0 &&
        johnEvaluation.overallScore <= 100,
    ),
    'John screening score is outside the supported range',
  )

  if (!johnView?.rubric || !johnEvaluation) {
    return { valid: false, errors }
  }

  const criterionKeys = new Set(
    johnView.rubric.criteria.map((criterion) => criterion.key),
  )
  recordCheck(
    errors,
    johnEvaluation.criterionScores.every((criterion) =>
      criterionKeys.has(criterion.criterionKey),
    ),
    'A screening criterion score references an unknown rubric criterion',
  )
  recordCheck(
    errors,
    johnEvaluation.criterionScores
      .flatMap((criterion) => criterion.evidence)
      .every((evidence) => evidence.excerpt.trim().length > 0),
    'A screening evidence reference is empty',
  )
  recordCheck(
    errors,
    Array.isArray(johnEvaluation.strengths) &&
      Array.isArray(johnEvaluation.concerns),
    'Screening strengths or concerns are not arrays',
  )

  const confirmBase = { ...freshState, applications: freshState.applications.map((item) => item.id === johnView.application.id ? { ...item, currentStage: 'SCREENING' as const } : item), interviews: freshState.interviews.filter((item) => item.applicationId !== johnView.application.id), interviewSessions: freshState.interviewSessions.filter((session) => !freshState.interviews.some((interview) => interview.applicationId === johnView.application.id && interview.id === session.interviewId)) }
  const confirmation: Decision = {
    id: 'decision-screening-validation-confirm',
    applicationId: johnView.application.id,
    evaluationId: johnEvaluation.id,
    reviewAction: 'CONFIRM',
    aiRecommendation: johnEvaluation.recommendation,
    humanRecommendation: johnEvaluation.recommendation,
    humanDecision: 'NEXT_STAGE',
    createdAt: '2026-07-16T12:00:00Z',
  }
  const confirmedWithDecision = demoReducer(confirmBase, {
    type: 'CONFIRM_RECOMMENDATION',
    payload: { decision: confirmation },
  })
  const confirmedState = confirmedWithDecision
  recordCheck(
    errors,
    confirmedState.decisions.length === freshState.decisions.length + 1,
    'Confirming a screening recommendation did not create one decision',
  )
  recordCheck(
    errors,
    confirmation.aiRecommendation === confirmation.humanRecommendation,
    'Confirmed human recommendation does not match the AI recommendation',
  )
  recordCheck(
    errors,
    confirmedState.applications.find(
      (application) => application.id === confirmation.applicationId,
    )?.currentStage === 'SHORTLISTED',
    'Confirmation did not transition the application to shortlist review',
  )

  const duplicateState = demoReducer(confirmedState, {
    type: 'CONFIRM_RECOMMENDATION',
    payload: { decision: { ...confirmation, id: 'decision-screening-validation-duplicate' } },
  })
  recordCheck(
    errors,
    duplicateState === confirmedState,
    'A duplicate decision was accepted for the same screening evaluation',
  )

  const override: Decision = {
    id: 'decision-screening-validation-override',
    applicationId: 'application-003',
    evaluationId: 'evaluation-screening-003',
    reviewAction: 'OVERRIDE',
    aiRecommendation: 'REVIEW',
    humanRecommendation: 'NO',
    humanDecision: 'NEXT_STAGE',
    overrideReason: 'The submitted evidence does not demonstrate required production ownership.',
    createdAt: '2026-07-16T12:05:00Z',
  }
  const overriddenWithDecision = demoReducer(freshState, {
    type: 'OVERRIDE_RECOMMENDATION',
    payload: { decision: override },
  })
  const overriddenState = overriddenWithDecision
  const storedOverride = selectLatestDecisionByApplicationId(
    overriddenState,
    override.applicationId,
  )
  recordCheck(
    errors,
    storedOverride?.aiRecommendation === 'REVIEW' &&
      storedOverride.humanRecommendation === 'NO' &&
      storedOverride.overrideReason === override.overrideReason,
    'Override did not preserve AI recommendation, human recommendation, and reason',
  )
  recordCheck(
    errors,
    overriddenState.applications.find(
      (application) => application.id === override.applicationId,
    )?.currentStage === 'FINAL_REVIEW',
    'Override did not transition using the human recommendation',
  )

  const confirmedTimeline = selectCandidateTimeline(
    confirmedState,
    confirmation.applicationId,
  )
  const overriddenTimeline = selectCandidateTimeline(
    overriddenState,
    override.applicationId,
  )
  recordCheck(
    errors,
    confirmedTimeline.some((event) => event.type === 'SCREENING_COMPLETED') &&
      confirmedTimeline.some(
        (event) => event.title === 'Screening recommendation confirmed',
      ),
    'Confirmed timeline is missing screening or decision activity',
  )
  recordCheck(
    errors,
    overriddenTimeline.some(
      (event) => event.title === 'Screening recommendation overridden',
    ),
    'Override timeline is missing the human decision',
  )
  recordCheck(
    errors,
    confirmedTimeline.every(
      (event, index) =>
        index === 0 ||
        confirmedTimeline[index - 1]!.occurredAt <= event.occurredAt,
    ),
    'Screening timeline is not ordered ascending',
  )

  const confirmedListItem = selectCandidateListItems(confirmedState).find(
    (item) => item.application.id === confirmation.applicationId,
  )
  recordCheck(
    errors,
    confirmedListItem?.screeningEvaluation?.id === johnEvaluation.id &&
      confirmedListItem.decision?.humanRecommendation === 'STRONG_YES',
    'Candidate list does not reflect screening and recruiter recommendation',
  )

  const newCandidate: Candidate = {
    id: 'candidate-screening-validation-new',
    fullName: 'Taylor Morgan',
    email: 'taylor.screening@example.com',
    phone: '+95 9 555 0199',
    currentPosition: 'Frontend Engineer',
    yearsExperience: 5,
    skills: ['React', 'TypeScript'],
    location: 'Yangon',
  }
  const newApplication: Application = {
    id: 'application-screening-validation-new',
    candidateId: newCandidate.id,
    jobId: 'job-001',
    status: 'SUBMITTED',
    currentStage: 'APPLICATION',
    answers: [
      {
        id: 'answer-screening-validation-project',
        fieldKey: 'best_project',
        label: 'Best project',
        value: 'I led a production React platform and measured improvements to delivery quality.',
      },
    ],
    documents: [],
    submittedAt: '2026-07-18T09:00:00Z',
  }
  const newState = {
    ...freshState,
    candidates: [...freshState.candidates, newCandidate],
    applications: [...freshState.applications, newApplication],
  }
  recordCheck(
    errors,
    !selectCandidateScreeningViewModel(newState, newApplication.id)
      ?.screeningEvaluation,
    'A new candidate application did not resolve to the not-started state',
  )
  const serviceInputsBefore = JSON.stringify({
    applications: newState.applications,
    evaluations: newState.evaluations,
    rubric: johnView.rubric,
  })
  const generatedResult = await runCandidateScreening({
    applicationId: newApplication.id,
    applications: newState.applications,
    evaluations: newState.evaluations,
    rubric: johnView.rubric,
    generatedAt: '2026-07-18T09:05:00Z',
    delayMs: 0,
  })
  recordCheck(
    errors,
    generatedResult.evaluation.applicationId === newApplication.id &&
      generatedResult.evaluation.status === 'COMPLETED',
    'Screening service did not generate a completed result for a new application',
  )
  recordCheck(
    errors,
    JSON.stringify({
      applications: newState.applications,
      evaluations: newState.evaluations,
      rubric: johnView.rubric,
    }) === serviceInputsBefore,
    'Screening service mutated its inputs',
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
    'An existing domain validator failed after screening changes',
  )
  recordCheck(
    errors,
    JSON.stringify(initialDemoState) === seedBefore,
    'Screening validation mutated the existing seed state',
  )
  try {
    JSON.stringify({ confirmedState, overriddenState, generatedResult })
  } catch {
    errors.push('Screening workflow state is not JSON serializable')
  }

  return { valid: errors.length === 0, errors }
}
