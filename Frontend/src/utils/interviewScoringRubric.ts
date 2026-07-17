import type { InterviewQuestion } from '../types/interviewQuestion'
import type { PublishedInterviewScoringRubric, RatingAnchor } from '../types/interviewScoringRubric'
import type { JobRequirement } from '../types/jobRequirement'
import type { EvaluationRubric, RubricCriterion } from '../types/rubric'

export const DEFAULT_RATING_ANCHORS: RatingAnchor[] = [
  { rating: 1, label: 'No demonstrated evidence', description: 'The response did not provide a relevant example, clear personal contribution, or support for the competency.', observableIndicators: ['Unrelated response', 'No relevant example', 'No personal ownership', 'Unsupported claim'] },
  { rating: 2, label: 'Limited evidence', description: 'The response was somewhat relevant but lacked sufficient depth, ownership, detail, or outcome.', observableIndicators: ['General example', 'Unclear role', 'Limited depth', 'Missing outcome', 'Weak connection to requirement'] },
  { rating: 3, label: 'Meets requirement', description: 'The response provided a relevant example, explained the candidate role, and demonstrated adequate capability.', observableIndicators: ['Relevant example', 'Clear personal contribution', 'Reasonable approach', 'Sufficient job-related detail', 'Credible outcome'] },
  { rating: 4, label: 'Strong evidence', description: 'The response demonstrated clear ownership, depth, sound judgment, and a meaningful outcome.', observableIndicators: ['Specific complex example', 'Clear ownership', 'Relevant trade-offs', 'Strong reasoning', 'Observable impact'] },
  { rating: 5, label: 'Exceptional evidence', description: 'The response demonstrated advanced judgment across complex constraints, significant impact, and strong reflection.', observableIndicators: ['High-complexity example', 'Deep expertise', 'Leadership or broad ownership', 'Measurable impact', 'Strong reflection and alternatives'] },
]

function normalized(value: string) { return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }
function criterionText(criterion: RubricCriterion) { return normalized(`${criterion.key} ${criterion.name} ${criterion.description} ${criterion.evaluationGuidance}`) }
function criterionSupportsRequirement(criterion: RubricCriterion, requirement: JobRequirement) {
  const text = criterionText(criterion)
  const labelTokens = normalized(requirement.skillName ?? requirement.label).split(' ').filter((token) => token.length >= 3)
  if (labelTokens.some((token) => text.includes(token))) return true
  if (requirement.type === 'MINIMUM_EXPERIENCE') return /experience|seniority|career|background/.test(text)
  if (requirement.type === 'REQUIRED_SKILL' || requirement.type === 'PREFERRED_SKILL') return /technical|skill|technology|engineering|qualification|capability/.test(text)
  if (requirement.type === 'RESPONSIBILITY') return /relevant experience|role experience|responsibilit|delivery|ownership/.test(text)
  return false
}
function questionSupportsCriterion(question: InterviewQuestion, criterion: RubricCriterion) {
  if (question.criterionKeys.includes(criterion.key)) return true
  const text = criterionText(criterion)
  if (question.category === 'TECHNICAL' || question.category === 'ROLE_REQUIREMENT' || question.category === 'MISSING_EVIDENCE') return /technical|skill|technology|engineering|qualification/.test(text)
  if (question.category === 'INTRODUCTION') return /motivation|alignment|relevant experience/.test(text)
  if (question.category === 'PROBLEM_SOLVING') return /problem|judgment|reasoning|decision/.test(text)
  if (question.category === 'BEHAVIORAL') return /communication|collaboration|team|stakeholder/.test(text)
  if (question.category === 'EXPERIENCE' || question.category === 'SCREENING_FOLLOW_UP') return /experience|ownership|delivery|problem|technical/.test(text)
  return false
}

export function derivePublishedInterviewScoringRubric(rubric: EvaluationRubric, requirements: JobRequirement[], questions: InterviewQuestion[]): PublishedInterviewScoringRubric {
  const requiredIds = new Set(requirements.filter((item) => item.importance === 'REQUIRED').map((item) => item.id))
  return {
    id: `interview-scoring-${rubric.id}`, jobId: rubric.jobId, version: rubric.version, status: 'PUBLISHED', publishedAt: rubric.updatedAt, createdAt: rubric.createdAt, updatedAt: rubric.updatedAt,
    competencies: rubric.criteria.map((criterion) => {
      const mappedRequirements = requirements.filter((requirement) => criterionSupportsRequirement(criterion, requirement))
      const requirementIds = mappedRequirements.map((item) => item.id)
      const relatedQuestions = questions.filter((question) => question.requirementIds.some((id) => requirementIds.includes(id)) || questionSupportsCriterion(question, criterion))
      const mustHave = requirementIds.some((id) => requiredIds.has(id)) || /technical|experience|problem|security|quality|required/i.test(criterion.key)
      return { competencyKey: criterion.key, label: criterion.name, description: criterion.description, weight: criterion.weight, requirementIds, requirementLabels: Object.fromEntries(mappedRequirements.map((item) => [item.id, item.skillName ?? item.label])), criterionKeys: [criterion.key], questionIds: relatedQuestions.map((question) => question.id), importance: mustHave ? 'MUST_HAVE' as const : criterion.weight >= 15 ? 'IMPORTANT' as const : 'PREFERRED' as const, minimumPassingRating: mustHave ? 3 as const : undefined, anchors: DEFAULT_RATING_ANCHORS.map((anchor) => ({ ...anchor, observableIndicators: [...anchor.observableIndicators] })) }
    }),
  }
}

export function interviewScoringRubricIsValid(rubric: PublishedInterviewScoringRubric) { return rubric.status === 'PUBLISHED' && rubric.competencies.length > 0 && rubric.competencies.reduce((sum, item) => sum + item.weight, 0) === 100 && rubric.competencies.every((item) => item.anchors.length === 5) }
