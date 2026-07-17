export type PostDecisionWorkflowStatus =
  | 'ACTION_REQUIRED'
  | 'READY_FOR_COMMUNICATION'
  | 'COMMUNICATION_PREPARED'
  | 'FOLLOW_UP_SCHEDULED'
  | 'COMPLETED'

export type CandidateCommunicationType = 'SELECTION' | 'REJECTION'

export type CandidateCommunicationDraft = {
  id: string
  candidateId: string
  finalEvaluationId: string
  type: CandidateCommunicationType
  subject: string
  body: string
  status: 'DRAFT' | 'READY'
  createdAt: string
  updatedAt: string
}

export type HoldFollowUp = {
  id: string
  candidateId: string
  finalEvaluationId: string
  reason: string
  requiredReview: string
  assignedReviewer: string
  followUpAt: string
  status: 'OPEN' | 'READY_FOR_REVIEW' | 'CLOSED'
  createdAt: string
  updatedAt: string
  closedAt?: string
}
