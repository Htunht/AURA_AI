import { createInitialDemoState } from '../store/demoInitialState'
import { generateInterviewQuestions, getInterviewQuestionBudget } from '../services/interviewQuestionGeneration'
import { deriveJobRequirements } from './jobRequirements'

export type InterviewQuestionGenerationValidationResult = { valid: boolean; errors: string[] }

export function validateInterviewQuestionGenerationDomain(): InterviewQuestionGenerationValidationResult {
  const errors: string[] = []
  const state = createInitialDemoState()
  const interview = state.interviews.find((item) => item.status === 'SCHEDULED') ?? state.interviews[0]
  const application = state.applications.find((item) => item.id === interview?.applicationId)
  const candidate = state.candidates.find((item) => item.id === application?.candidateId)
  const job = state.jobs.find((item) => item.id === application?.jobId)
  if (!interview || !application || !candidate || !job) return { valid: false, errors: ['Scheduled interview references could not be resolved.'] }
  const evaluation = state.evaluations.find((item) => item.applicationId === application.id && item.evaluationType === 'SCREENING')
  const form = state.applicationForms.find((item) => item.jobId === job.id && item.status === 'PUBLISHED')
  const requirements = deriveJobRequirements(job)
  const input = { interview, application, candidate, job, screeningEvaluation: evaluation, form, requirements, durationMinutes: 45 }
  const snapshot = JSON.stringify(input)
  const first = generateInterviewQuestions(input)
  const second = generateInterviewQuestions(input)
  if (JSON.stringify(first) !== JSON.stringify(second)) errors.push('Generation is not deterministic.')
  if (JSON.stringify(input) !== snapshot) errors.push('Generation mutated its input.')
  if (new Set(first.questions.map((question) => question.id)).size !== first.questions.length) errors.push('Question IDs are not unique.')
  if (new Set(first.questions.map((question) => question.text.trim().toLocaleLowerCase())).size !== first.questions.length) errors.push('Duplicate question text was generated.')
  if (first.questions.some((question, index) => question.order !== index + 1 || !question.text.trim() || question.estimatedMinutes < 1 || question.estimatedMinutes > 15)) errors.push('Question shape, order, or duration is invalid.')
  for (const durationMinutes of [30, 45, 60, 90]) {
    const end = new Date(Date.parse(interview.scheduledStart) + durationMinutes * 60_000).toISOString()
    const result = generateInterviewQuestions({ ...input, interview: { ...interview, scheduledEnd: end }, durationMinutes })
    const budget = getInterviewQuestionBudget(durationMinutes)
    if (result.questions.length < budget.minimum || result.questions.length > budget.maximum) errors.push(`${durationMinutes}-minute question count is outside its budget.`)
    if (result.questions.reduce((sum, question) => sum + question.estimatedMinutes, 0) > budget.usableMinutes) errors.push(`${durationMinutes}-minute question time exceeds its budget.`)
  }
  const covered = new Set(first.questions.flatMap((question) => question.requirementIds))
  if (requirements.some((item) => item.importance === 'REQUIRED' && !covered.has(item.id))) errors.push('Required qualifications are not fully covered.')
  if (candidate.yearsExperience < job.minimumExperienceYears && !first.questions.some((question) => question.category === 'SCREENING_FOLLOW_UP' && question.generationReason?.includes('minimum'))) errors.push('Minimum-experience gap follow-up is missing.')
  if (!first.questions.some((question) => question.category === 'PROBLEM_SOLVING')) errors.push('Problem-solving question is missing for a 45-minute interview.')
  if (!first.questions.some((question) => question.category === 'BEHAVIORAL')) errors.push('Behavioral question is missing.')
  if (!first.questions.some((question) => question.category === 'CANDIDATE_QUESTION')) errors.push('Candidate closing question is missing.')
  const changed = generateInterviewQuestions({ ...input, candidate: { ...candidate, skills: [] }, application: { ...application, answers: [] } })
  if (changed.questions.map((question) => question.text).join('|') === first.questions.map((question) => question.text).join('|')) errors.push('Question text does not respond to candidate evidence changes.')
  const noOptional = generateInterviewQuestions({ ...input, form: undefined, screeningEvaluation: undefined })
  if (!noOptional.warnings.length || !noOptional.questions.length) errors.push('Missing optional context did not produce warnings and usable output.')
  if (JSON.stringify(state) !== JSON.stringify(createInitialDemoState())) errors.push('Initial state changed during generation validation.')
  return { valid: errors.length === 0, errors }
}
