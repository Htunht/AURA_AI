import type { Candidate } from '../types/candidate'
import type { FinalEvaluation } from '../types/finalEvaluation'
import type { Job } from '../types/job'
import type { CandidateCommunicationDraft, HoldFollowUp } from '../types/postDecision'
import type { UserRole } from '../types/role'

export const canPrepareCandidateOutcome = (role: UserRole) => role === 'RECRUITER' || role === 'HIRING_MANAGER'
export const canManageHoldFollowUp = canPrepareCandidateOutcome
export const canReopenHoldDecision = (role: UserRole) => role === 'HIRING_MANAGER'

export function createCandidateCommunicationDraft(input: {
  evaluation: FinalEvaluation
  candidate: Candidate
  job: Job
  companyName?: string
  createdAt: string
}): CandidateCommunicationDraft {
  const { evaluation, candidate, job, createdAt } = input
  if (evaluation.status !== 'DECIDED' || !evaluation.humanDecision || evaluation.humanDecision === 'HOLD') throw new Error('A selected or rejected final decision is required.')
  const companyName = input.companyName ?? 'AURA AI'
  const selection = evaluation.humanDecision === 'SELECTED'
  const candidateReason = evaluation.candidateFacingReasonDraft?.trim() || 'We decided to proceed with candidates whose recent experience more closely matches the position’s current requirements.'
  return {
    id: `candidate-communication-${evaluation.id}`,
    candidateId: candidate.id,
    finalEvaluationId: evaluation.id,
    type: selection ? 'SELECTION' : 'REJECTION',
    subject: selection ? `Next steps for the ${job.title} role` : `Update on your application for ${job.title}`,
    body: selection
      ? `Hello ${candidate.fullName},\n\nThank you for your time throughout the interview process.\n\nWe are pleased to let you know that we would like to move forward with you for the ${job.title} position.\n\nOur team will contact you with the next steps.\n\nBest,\n${companyName}`
      : `Hello ${candidate.fullName},\n\nThank you for your time and interest in the ${job.title} role.\n\n${candidateReason}\n\nWe appreciate the time you spent with our team.\n\nBest,\n${companyName}`,
    status: 'DRAFT',
    createdAt,
    updatedAt: createdAt,
  }
}

export function validateCommunicationDraft(subject: string, body: string) {
  const errors: string[] = []
  if (subject.trim().length < 5 || subject.trim().length > 200) errors.push('Subject must be between 5 and 200 characters.')
  if (body.trim().length < 40 || body.trim().length > 5000) errors.push('Message must be between 40 and 5000 characters.')
  return { valid: errors.length === 0, errors }
}

export function validateHoldFollowUp(input: Pick<HoldFollowUp, 'reason' | 'requiredReview' | 'assignedReviewer' | 'followUpAt'>, now: string) {
  const errors: string[] = []
  const reasonLength = input.reason.trim().length
  const reviewLength = input.requiredReview.trim().length
  const followUpTime = Date.parse(input.followUpAt)
  if (reasonLength < 20 || reasonLength > 1000) errors.push('Follow-up reason must be between 20 and 1000 characters.')
  if (reviewLength < 20 || reviewLength > 1000) errors.push('Required review must be between 20 and 1000 characters.')
  if (!input.assignedReviewer.trim()) errors.push('Assigned reviewer is required.')
  if (!Number.isFinite(followUpTime) || followUpTime <= Date.parse(now)) errors.push('Follow-up date must be in the future.')
  return { valid: errors.length === 0, errors }
}
