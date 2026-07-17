import type { EvidenceAssessmentState, EvidenceRating } from './interviewScoringRubric'

export type AssessmentConfidence = 'LOW' | 'MEDIUM' | 'HIGH'
export type AssessmentReviewReason = 'INSUFFICIENT_EVIDENCE' | 'TRANSCRIPT_MAPPING_UNCERTAIN' | 'QUESTION_NOT_REACHED' | 'ANSWER_NOT_RESPONSIVE' | 'RUBRIC_MAPPING_MISSING' | 'CONFLICTING_EVIDENCE' | 'DATA_QUALITY_ISSUE'

export type InterviewQuestionAssessment = {
  id: string
  finalEvaluationId: string
  questionId: string
  assessmentState: EvidenceAssessmentState
  systemRating?: EvidenceRating
  confidence: AssessmentConfidence
  matchedAnchorRating?: EvidenceRating
  matchedAnchorLabel?: string
  evidenceSummary: string
  rationale: string
  transcriptSegmentIds: string[]
  evidenceIds: string[]
  requirementIds: string[]
  criterionKeys: string[]
  competencyKeys: string[]
  reviewReasons: AssessmentReviewReason[]
  requiresHumanReview: boolean
  createdAt: string
  updatedAt: string
}
