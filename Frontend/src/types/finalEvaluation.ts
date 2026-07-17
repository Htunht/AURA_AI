import type { CompetencyAssessment } from './competencyAssessment'
import type { AssessmentConfidence } from './interviewQuestionAssessment'
import type { InterviewQuestionAssessment } from './interviewQuestionAssessment'

export type FinalEvaluationStatus = 'GENERATING' | 'DRAFT' | 'READY_FOR_DECISION' | 'DECIDED' | 'GENERATION_FAILED'
export type SystemRecommendation = 'ADVANCE' | 'HOLD_FOR_REVIEW' | 'DO_NOT_ADVANCE' | 'INSUFFICIENT_EVIDENCE'
export type HumanFinalDecision = 'SELECTED' | 'REJECTED' | 'HOLD'
export type DecisionDisagreementReason = 'ADDITIONAL_VERIFIED_INFORMATION' | 'EVIDENCE_INTERPRETATION' | 'COMPARATIVE_CANDIDATE_DECISION' | 'ROLE_OR_ORGANIZATIONAL_CHANGE' | 'LEGAL_OR_POLICY_REVIEW' | 'OTHER_JOB_RELATED_REASON'

export type FinalEvaluation = {
  id: string
  version: number
  candidateId: string
  applicationId: string
  jobId: string
  interviewId: string
  interviewAnalysisId: string
  rubricId: string
  rubricVersion: number
  status: FinalEvaluationStatus
  questionAssessments: InterviewQuestionAssessment[]
  competencyAssessments: CompetencyAssessment[]
  weightedEvidenceScore?: number
  assessedWeightPercent: number
  mustHavePassed: number
  mustHaveTotal: number
  mustHaveGaps: string[]
  unresolvedEvidence: string[]
  dataQualityIssues: string[]
  overallConfidence: AssessmentConfidence
  systemRecommendation: SystemRecommendation
  systemRecommendationRationale: string
  systemScoreLocked: boolean
  systemRecommendationLocked: boolean
  humanDecision?: HumanFinalDecision
  humanDecisionReason?: string
  candidateFacingReasonDraft?: string
  differsFromSystem?: boolean
  disagreementReason?: DecisionDisagreementReason
  disagreementExplanation?: string
  holdReviewDate?: string
  decidedBy?: string
  decidedByRole?: string
  decidedAt?: string
  generatedAt?: string
  generationError?: string
  supersededByEvaluationId?: string
  createdAt: string
  updatedAt: string
}
