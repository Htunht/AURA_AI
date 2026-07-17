import type { DecisionDisagreementReason, FinalEvaluationStatus, HumanFinalDecision, SystemRecommendation } from '../types/finalEvaluation'
import type { UserRole } from '../types/role'
import { canRecordFinalDecision, doesHumanDecisionDifferFromSystem } from './finalDecisionPermissions'

const internalReasons: Record<HumanFinalDecision, string> = {
  REJECTED: 'The candidate met the published minimum requirements, but the reviewed interview evidence did not demonstrate enough depth in the role’s highest-priority production competencies to proceed.',
  SELECTED: 'The candidate demonstrated sufficient evidence across the role’s required competencies and met the published decision criteria.',
  HOLD: 'The candidate demonstrated relevant evidence, but additional review is required before recording a final outcome.',
}

const rejectedCandidateReason = 'Thank you for your time and interest in the role. We decided to proceed with candidates whose recent experience more closely matches the position’s current production requirements.'
const disagreementExplanation = 'The authorized decision maker reviewed the complete evidence trail and reached a different job-related conclusion from the system recommendation.'

export type DemoFinalDecisionContent = {
  internalReason: string
  candidateFacingReason?: string
  disagreementReason?: DecisionDisagreementReason
  disagreementExplanation?: string
}

export function buildDemoFinalDecisionContent(decision: HumanFinalDecision, systemRecommendation: SystemRecommendation): DemoFinalDecisionContent {
  const differs = doesHumanDecisionDifferFromSystem(systemRecommendation, decision)
  return {
    internalReason: internalReasons[decision],
    candidateFacingReason: decision === 'REJECTED' ? rejectedCandidateReason : undefined,
    disagreementReason: differs ? 'EVIDENCE_INTERPRETATION' : undefined,
    disagreementExplanation: differs ? disagreementExplanation : undefined,
  }
}

export function canShowDemoFinalDecisionHelper(input: { demoMode: boolean; evaluationStatus: FinalEvaluationStatus; actorRole: UserRole }) {
  return input.demoMode && input.evaluationStatus !== 'DECIDED' && canRecordFinalDecision(input.actorRole)
}

export function isFinalDecisionFormValid(input: { ready: boolean; internalReason: string; differsFromSystem: boolean; disagreementExplanation: string }) {
  return input.ready && input.internalReason.trim().length >= 20 && (!input.differsFromSystem || input.disagreementExplanation.trim().length >= 20)
}
