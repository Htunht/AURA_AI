import type { AssessmentConfidence, AssessmentReviewReason } from './interviewQuestionAssessment'
import type { EvidenceAssessmentState, EvidenceRating } from './interviewScoringRubric'

export type CompetencyAssessment = {
  id: string
  finalEvaluationId: string
  competencyKey: string
  label: string
  weight: number
  importance: 'MUST_HAVE' | 'IMPORTANT' | 'PREFERRED'
  assessmentState: EvidenceAssessmentState
  systemRating?: EvidenceRating
  normalizedScore?: number
  confidence: AssessmentConfidence
  questionAssessmentIds: string[]
  evidenceIds: string[]
  requirementIds: string[]
  criterionKeys: string[]
  rationale: string
  strengths: string[]
  concerns: string[]
  missingEvidence: string[]
  minimumPassingRating?: EvidenceRating
  gatePassed?: boolean
  requiresHumanReview: boolean
  reviewReasons: AssessmentReviewReason[]
  createdAt: string
  updatedAt: string
}
