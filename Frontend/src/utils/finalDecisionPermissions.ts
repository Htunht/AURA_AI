import type { HumanFinalDecision, SystemRecommendation } from '../types/finalEvaluation'
import type { UserRole } from '../types/role'

export const canRecordFinalDecision = (role: UserRole) => role === 'HIRING_MANAGER'
export const canManageEvaluationChallenges = (role: UserRole) => role === 'RECRUITER' || role === 'HIRING_MANAGER'
export function doesHumanDecisionDifferFromSystem(recommendation: SystemRecommendation, decision: HumanFinalDecision) {
  const aligned: Record<SystemRecommendation, HumanFinalDecision> = { ADVANCE: 'SELECTED', DO_NOT_ADVANCE: 'REJECTED', HOLD_FOR_REVIEW: 'HOLD', INSUFFICIENT_EVIDENCE: 'HOLD' }
  return aligned[recommendation] !== decision
}
