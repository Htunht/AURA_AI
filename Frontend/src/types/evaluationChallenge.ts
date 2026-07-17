export type EvaluationChallengeReason = 'WRONG_TRANSCRIPT_MAPPING' | 'EVIDENCE_INCORRECTLY_ATTRIBUTED' | 'RELEVANT_EVIDENCE_OMITTED' | 'RUBRIC_INCORRECTLY_APPLIED' | 'TRANSCRIPT_DATA_QUALITY' | 'QUESTION_STATUS_INCORRECT'
export type EvaluationChallengeStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'
export type EvaluationChallenge = {
  id: string
  finalEvaluationId: string
  reason: EvaluationChallengeReason
  explanation: string
  questionAssessmentIds: string[]
  competencyAssessmentIds: string[]
  transcriptSegmentIds: string[]
  evidenceIds: string[]
  status: EvaluationChallengeStatus
  createdBy: string
  createdAt: string
  resolvedAt?: string
  resolutionNote?: string
}
