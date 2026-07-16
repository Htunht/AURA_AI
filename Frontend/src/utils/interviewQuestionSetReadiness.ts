import type { Interview } from '../types/interview'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { JobRequirement } from '../types/jobRequirement'
import { getInterviewQuestionBudget } from '../services/interviewQuestionGeneration'

export type InterviewQuestionSetReadiness = {
  ready: boolean
  questionCount: number
  estimatedMinutes: number
  availableMinutes: number
  coveredRequirementIds: string[]
  uncoveredRequiredRequirementIds: string[]
  blockingIssues: string[]
  warnings: string[]
}

const normalizeText = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')

export function evaluateInterviewQuestionSetReadiness({ questionSet, interview, requirements }: { questionSet: InterviewQuestionSet; interview: Interview; requirements: JobRequirement[] }): InterviewQuestionSetReadiness {
  const duration = Math.max(0, Math.round((Date.parse(interview.scheduledEnd) - Date.parse(interview.scheduledStart)) / 60_000))
  const availableMinutes = getInterviewQuestionBudget(duration).usableMinutes
  const estimatedMinutes = questionSet.questions.reduce((sum, question) => sum + question.estimatedMinutes, 0)
  const coveredRequirementIds = [...new Set(questionSet.questions.flatMap((question) => question.requirementIds))]
  const uncoveredRequiredRequirementIds = requirements.filter((item) => item.importance === 'REQUIRED' && !coveredRequirementIds.includes(item.id)).map((item) => item.id)
  const blockingIssues: string[] = []
  const warnings: string[] = []
  if (!questionSet.questions.length) blockingIssues.push('Add at least one interview question.')
  if (questionSet.questions.some((question) => question.text.trim().length < 10)) blockingIssues.push('Every question must contain at least 10 characters.')
  if (questionSet.questions.some((question) => question.estimatedMinutes < 1 || question.estimatedMinutes > 15)) blockingIssues.push('Question time must be between 1 and 15 minutes.')
  const orders = questionSet.questions.map((question) => question.order)
  if (new Set(orders).size !== orders.length || [...orders].sort((a, b) => a - b).some((order, index) => order !== index + 1)) blockingIssues.push('Question order is invalid.')
  const texts = questionSet.questions.map((question) => normalizeText(question.text))
  if (new Set(texts).size !== texts.length) blockingIssues.push('Duplicate question text must be changed before approval.')
  if (estimatedMinutes > availableMinutes) blockingIssues.push('The question plan exceeds the available interview time.')
  if (uncoveredRequiredRequirementIds.length) blockingIssues.push(`${uncoveredRequiredRequirementIds.length} required qualification${uncoveredRequiredRequirementIds.length === 1 ? ' is' : 's are'} not covered.`)
  const uncoveredPreferred = requirements.filter((item) => item.importance === 'PREFERRED' && !coveredRequirementIds.includes(item.id))
  if (uncoveredPreferred.length) warnings.push(`${uncoveredPreferred.length} preferred qualification${uncoveredPreferred.length === 1 ? ' is' : 's are'} not covered.`)
  if (questionSet.questions.filter((question) => question.priority === 'OPTIONAL').length > Math.max(2, Math.floor(questionSet.questions.length / 3))) warnings.push('Consider reducing optional questions to protect core interview time.')
  const categoryCounts = questionSet.questions.reduce<Record<string, number>>((counts, question) => ({ ...counts, [question.category]: (counts[question.category] ?? 0) + 1 }), {})
  if (Object.values(categoryCounts).some((count) => count > Math.ceil(questionSet.questions.length * 0.6))) warnings.push('The plan is heavily concentrated in one question category.')
  if (duration >= 60 && !questionSet.questions.some((question) => question.category === 'BEHAVIORAL')) warnings.push('Add a behavioral question for this interview length.')
  if (!questionSet.questions.some((question) => question.category === 'CANDIDATE_QUESTION')) warnings.push('Reserve a closing question for the candidate.')
  return { ready: blockingIssues.length === 0, questionCount: questionSet.questions.length, estimatedMinutes, availableMinutes, coveredRequirementIds, uncoveredRequiredRequirementIds, blockingIssues, warnings }
}
