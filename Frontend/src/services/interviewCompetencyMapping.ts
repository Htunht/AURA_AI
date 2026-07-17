import type { InterviewEvidence } from '../types/interviewEvidence'
import type { InterviewQuestion } from '../types/interviewQuestion'
import type { CompetencyScoringRule } from '../types/interviewScoringRubric'

export type CompetencyQuestionMatch = { type: 'REQUIREMENT' | 'CRITERION' | 'QUESTION'; value: string; label: string }

function shared(left: string[], right: string[]) {
  const rightValues = new Set(right)
  return left.find((value) => rightValues.has(value))
}

export function resolveCompetencyQuestionMatch(rule: CompetencyScoringRule, question: InterviewQuestion): CompetencyQuestionMatch | undefined {
  const requirementId = shared(rule.requirementIds, question.requirementIds)
  if (requirementId) return { type: 'REQUIREMENT', value: requirementId, label: rule.requirementLabels?.[requirementId] ?? requirementId }
  const criterionKey = shared(rule.criterionKeys, question.criterionKeys)
  if (criterionKey) return { type: 'CRITERION', value: criterionKey, label: criterionKey.replaceAll('_', ' ') }
  if (rule.questionIds.includes(question.id)) return { type: 'QUESTION', value: question.id, label: `Question ${question.order}` }
  return undefined
}

export function evidenceMatchesQuestion(evidence: InterviewEvidence, question: InterviewQuestion) {
  return evidence.questionIds.includes(question.id) ||
    Boolean(shared(evidence.requirementIds, question.requirementIds)) ||
    Boolean(shared(evidence.criterionKeys, question.criterionKeys))
}
