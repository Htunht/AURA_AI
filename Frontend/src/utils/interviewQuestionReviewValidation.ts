import { demoReducer } from '../store/demoReducer'
import { createInitialDemoState } from '../store/demoInitialState'
import { generateInterviewQuestions } from '../services/interviewQuestionGeneration'
import { deriveJobRequirements } from './jobRequirements'
import { evaluateInterviewQuestionSetReadiness } from './interviewQuestionSetReadiness'
import { normalizePersistedDemoState } from '../store/demoPersistence'
import { selectCandidateTimeline, selectInterviewQuestionPreparationStatus } from '../store/demoSelectors'

export type InterviewQuestionReviewValidationResult = { valid: boolean; errors: string[] }

export function validateInterviewQuestionReviewDomain(): InterviewQuestionReviewValidationResult {
  const errors: string[] = []
  const initial = createInitialDemoState()
  const interview = initial.interviews.find((item) => item.status === 'SCHEDULED')
  const application = initial.applications.find((item) => item.id === interview?.applicationId)
  const candidate = initial.candidates.find((item) => item.id === application?.candidateId)
  const job = initial.jobs.find((item) => item.id === application?.jobId)
  if (!interview || !application || !candidate || !job) return { valid: false, errors: ['Review validation fixtures could not be resolved.'] }
  const createdAt = '2026-07-16T12:00:00.000Z'
  const generated = generateInterviewQuestions({ interview, application, candidate, job, requirements: deriveJobRequirements(job), form: initial.applicationForms.find((item) => item.jobId === job.id), screeningEvaluation: initial.evaluations.find((item) => item.applicationId === application.id && item.evaluationType === 'SCREENING'), durationMinutes: 45 })
  const set = { id: `question-set-${interview.id}-v001`, interviewId: interview.id, version: 1, status: 'DRAFT' as const, questions: generated.questions, generatedAt: createdAt, createdAt, updatedAt: createdAt }
  let state = demoReducer(initial, { type: 'ADD_INTERVIEW_QUESTION_SET', payload: { questionSet: set } })
  if (state.interviewQuestionSets.length !== 1 || selectInterviewQuestionPreparationStatus(state, interview.id) !== 'DRAFT_READY') errors.push('Draft question set was not added or derived correctly.')
  const duplicate = demoReducer(state, { type: 'ADD_INTERVIEW_QUESTION_SET', payload: { questionSet: { ...set, id: `${set.id}-duplicate` } } })
  if (duplicate !== state) errors.push('Duplicate active draft was not prevented.')
  const firstQuestion = state.interviewQuestionSets[0].questions[0]
  state = demoReducer(state, { type: 'UPDATE_INTERVIEW_QUESTION', payload: { questionSetId: set.id, questionId: firstQuestion.id, changes: { text: `${firstQuestion.text} Please be specific.` }, updatedAt: createdAt } })
  if (!state.interviewQuestionSets[0].questions[0].text.includes('Please be specific')) errors.push('Draft question edit failed.')
  const beforeMove = state.interviewQuestionSets[0].questions[0].id
  state = demoReducer(state, { type: 'MOVE_INTERVIEW_QUESTION', payload: { questionSetId: set.id, questionId: beforeMove, direction: 'DOWN', updatedAt: createdAt } })
  if (state.interviewQuestionSets[0].questions[1].id !== beforeMove || state.interviewQuestionSets[0].questions.some((question, index) => question.order !== index + 1)) errors.push('Question reordering or normalization failed.')
  const readiness = evaluateInterviewQuestionSetReadiness({ questionSet: state.interviewQuestionSets[0], interview, requirements: deriveJobRequirements(job) })
  if (!readiness.ready || readiness.questionCount !== set.questions.length) errors.push(`Generated draft is not approval-ready: ${readiness.blockingIssues.join(' ')}`)
  state = demoReducer(state, { type: 'APPROVE_INTERVIEW_QUESTION_SET', payload: { questionSetId: set.id, approvedAt: '2026-07-16T12:05:00.000Z', approvedBy: 'Recruitment Team' } })
  const approved = state.interviewQuestionSets[0]
  if (approved.status !== 'APPROVED' || approved.questions.some((question) => question.status !== 'APPROVED') || !approved.approvedAt) errors.push('Valid draft approval failed.')
  const afterApprovedEdit = demoReducer(state, { type: 'UPDATE_INTERVIEW_QUESTION', payload: { questionSetId: set.id, questionId: approved.questions[0].id, changes: { text: 'This edit must not be accepted.' }, updatedAt: createdAt } })
  if (afterApprovedEdit !== state) errors.push('Approved question set was editable.')
  const timeline = selectCandidateTimeline(state, application.id)
  if (!timeline.some((event) => event.type === 'INTERVIEW_QUESTIONS_PREPARED') || !timeline.some((event) => event.type === 'INTERVIEW_PLAN_APPROVED')) errors.push('Question preparation timeline events are missing.')
  const persisted = normalizePersistedDemoState(JSON.parse(JSON.stringify(state)))
  if (persisted.interviewQuestionSets[0]?.status !== 'APPROVED') errors.push('Question set persistence normalization failed.')
  const legacy = normalizePersistedDemoState({ ...JSON.parse(JSON.stringify(initial)), interviewQuestionSets: undefined })
  if (!legacy.interviewQuestionSets.some((item) => item.interviewId === interview.id && item.questions.length === interview.questions.length)) errors.push('Legacy interview questions did not migrate safely.')
  if (JSON.stringify(initial) !== JSON.stringify(createInitialDemoState())) errors.push('Initial state changed during review validation.')
  return { valid: errors.length === 0, errors }
}
