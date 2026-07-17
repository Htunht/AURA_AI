import type { CompetencyAssessment } from '../types/competencyAssessment'
import type { InterviewEvidence } from '../types/interviewEvidence'
import type { InterviewQuestionAssessment } from '../types/interviewQuestionAssessment'
import type { EvidenceRating, PublishedInterviewScoringRubric } from '../types/interviewScoringRubric'
import { createCompetencyAssessmentId } from '../utils/finalEvaluationIds'

export type CompetencyAggregationResult = { competencyAssessments: CompetencyAssessment[]; warnings: string[] }
const normalized = (rating: EvidenceRating) => (rating - 1) * 25

export function aggregateCompetencyScores(input: { finalEvaluationId: string; interviewId: string; rubric: PublishedInterviewScoringRubric; questionAssessments: InterviewQuestionAssessment[]; evidence: InterviewEvidence[]; createdAt: string; questionPriorities?: Record<string, 'CORE' | 'FOLLOW_UP' | 'OPTIONAL'> }): CompetencyAggregationResult {
  const warnings: string[] = []
  const competencyAssessments = input.rubric.competencies.map((rule) => {
    const questions = input.questionAssessments.filter((item) => item.competencyKeys.includes(rule.competencyKey))
    const assessed = questions.filter((item) => item.systemRating !== undefined)
    const contribution = (questionId: string) => input.questionPriorities?.[questionId] === 'OPTIONAL' ? 0.5 : input.questionPriorities?.[questionId] === 'FOLLOW_UP' ? 0.75 : 1
    const contributionTotal = assessed.reduce((sum, item) => sum + contribution(item.questionId), 0)
    const systemRating = assessed.length ? Math.max(1, Math.min(5, Math.round(assessed.reduce((sum, item) => sum + (item.systemRating ?? 0) * contribution(item.questionId), 0) / contributionTotal))) as EvidenceRating : undefined
    const evidenceIds = [...new Set(questions.flatMap((item) => item.evidenceIds))]
    const confidence = !assessed.length || assessed.some((item) => item.confidence === 'LOW') ? 'LOW' as const : assessed.every((item) => item.confidence === 'HIGH') ? 'HIGH' as const : 'MEDIUM' as const
    const reviewReasons = [...new Set(questions.flatMap((item) => item.reviewReasons))]
    const gatePassed = rule.importance === 'MUST_HAVE' && systemRating !== undefined ? systemRating >= (rule.minimumPassingRating ?? 3) : undefined
    if (!assessed.length) warnings.push(`${rule.label} was not assessed.`)
    return {
      id: createCompetencyAssessmentId(input.interviewId, rule.competencyKey), finalEvaluationId: input.finalEvaluationId, competencyKey: rule.competencyKey, label: rule.label, weight: rule.weight, importance: rule.importance,
      assessmentState: systemRating === undefined ? 'NOT_ASSESSED' as const : systemRating === 1 ? 'NOT_DEMONSTRATED' as const : systemRating === 2 ? 'PARTIALLY_DEMONSTRATED' as const : 'DEMONSTRATED' as const,
      systemRating, normalizedScore: systemRating === undefined ? undefined : normalized(systemRating), confidence, questionAssessmentIds: questions.map((item) => item.id), evidenceIds, requirementIds: [...rule.requirementIds], criterionKeys: [...rule.criterionKeys],
      rationale: systemRating === undefined ? 'No assessable question evidence was mapped to this competency.' : `${assessed.length} assessed question${assessed.length === 1 ? '' : 's'} produced a competency rating of ${systemRating} using the published behavioral anchors.`,
      strengths: systemRating !== undefined && systemRating >= 3 ? [`Evidence met or exceeded the published anchor for ${rule.label}.`] : [], concerns: systemRating !== undefined && systemRating < 3 ? [`Evidence remained below the published meets-requirement anchor for ${rule.label}.`] : [], missingEvidence: systemRating === undefined ? [`No assessable evidence was available for ${rule.label}.`] : [], minimumPassingRating: rule.minimumPassingRating, gatePassed, requiresHumanReview: confidence === 'LOW' || reviewReasons.some((item) => ['TRANSCRIPT_MAPPING_UNCERTAIN', 'RUBRIC_MAPPING_MISSING', 'CONFLICTING_EVIDENCE', 'DATA_QUALITY_ISSUE'].includes(item)), reviewReasons, createdAt: input.createdAt, updatedAt: input.createdAt,
    } satisfies CompetencyAssessment
  })
  return { competencyAssessments, warnings }
}
