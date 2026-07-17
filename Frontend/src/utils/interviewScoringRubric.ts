import type { InterviewQuestion } from '../types/interviewQuestion'
import type { PublishedInterviewScoringRubric, RatingAnchor } from '../types/interviewScoringRubric'
import type { JobRequirement } from '../types/jobRequirement'
import type { EvaluationRubric } from '../types/rubric'

export const DEFAULT_RATING_ANCHORS: RatingAnchor[] = [
  { rating: 1, label: 'No demonstrated evidence', description: 'The response did not provide a relevant example, clear personal contribution, or support for the competency.', observableIndicators: ['Unrelated response', 'No relevant example', 'No personal ownership', 'Unsupported claim'] },
  { rating: 2, label: 'Limited evidence', description: 'The response was somewhat relevant but lacked sufficient depth, ownership, detail, or outcome.', observableIndicators: ['General example', 'Unclear role', 'Limited depth', 'Missing outcome', 'Weak connection to requirement'] },
  { rating: 3, label: 'Meets requirement', description: 'The response provided a relevant example, explained the candidate role, and demonstrated adequate capability.', observableIndicators: ['Relevant example', 'Clear personal contribution', 'Reasonable approach', 'Sufficient job-related detail', 'Credible outcome'] },
  { rating: 4, label: 'Strong evidence', description: 'The response demonstrated clear ownership, depth, sound judgment, and a meaningful outcome.', observableIndicators: ['Specific complex example', 'Clear ownership', 'Relevant trade-offs', 'Strong reasoning', 'Observable impact'] },
  { rating: 5, label: 'Exceptional evidence', description: 'The response demonstrated advanced judgment across complex constraints, significant impact, and strong reflection.', observableIndicators: ['High-complexity example', 'Deep expertise', 'Leadership or broad ownership', 'Measurable impact', 'Strong reflection and alternatives'] },
]

export function derivePublishedInterviewScoringRubric(rubric: EvaluationRubric, requirements: JobRequirement[], questions: InterviewQuestion[]): PublishedInterviewScoringRubric {
  const requiredIds = new Set(requirements.filter((item) => item.importance === 'REQUIRED').map((item) => item.id))
  return {
    id: `interview-scoring-${rubric.id}`,
    jobId: rubric.jobId,
    version: rubric.version,
    status: 'PUBLISHED',
    publishedAt: rubric.updatedAt,
    createdAt: rubric.createdAt,
    updatedAt: rubric.updatedAt,
    competencies: rubric.criteria.map((criterion) => {
      const relatedQuestions = questions.filter((question) => question.criterionKeys.includes(criterion.key))
      const requirementIds = [...new Set(relatedQuestions.flatMap((question) => question.requirementIds))]
      const mustHave = requirementIds.some((id) => requiredIds.has(id)) || /technical|experience|problem|security|quality|required/i.test(criterion.key)
      return { competencyKey: criterion.key, label: criterion.name, description: criterion.description, weight: criterion.weight, requirementIds, criterionKeys: [criterion.key], questionIds: relatedQuestions.map((question) => question.id), importance: mustHave ? 'MUST_HAVE' as const : criterion.weight >= 15 ? 'IMPORTANT' as const : 'PREFERRED' as const, minimumPassingRating: mustHave ? 3 as const : undefined, anchors: DEFAULT_RATING_ANCHORS.map((anchor) => ({ ...anchor, observableIndicators: [...anchor.observableIndicators] })) }
    }),
  }
}

export function interviewScoringRubricIsValid(rubric: PublishedInterviewScoringRubric) {
  return rubric.status === 'PUBLISHED' && rubric.competencies.length > 0 && rubric.competencies.reduce((sum, item) => sum + item.weight, 0) === 100 && rubric.competencies.every((item) => item.anchors.length === 5)
}
