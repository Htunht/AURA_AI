import { resolveDemoWorkspaceMode } from '../config/workspaceMode'
import { buildDemoFinalDecisionContent, canShowDemoFinalDecisionHelper, isFinalDecisionFormValid } from './demoFinalDecision'

export type DemoFinalDecisionValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: unknown, message: string) => { if (!condition) errors.push(message) }

export function validateDemoFinalDecision(): DemoFinalDecisionValidationResult {
  const errors: string[] = []
  const rejected = buildDemoFinalDecisionContent('REJECTED', 'ADVANCE')
  const selected = buildDemoFinalDecisionContent('SELECTED', 'ADVANCE')
  const hold = buildDemoFinalDecisionContent('HOLD', 'HOLD_FOR_REVIEW')
  const alignedRejected = buildDemoFinalDecisionContent('REJECTED', 'DO_NOT_ADVANCE')

  check(errors, rejected.internalReason === 'The candidate met the published minimum requirements, but the reviewed interview evidence did not demonstrate enough depth in the role’s highest-priority production competencies to proceed.' && rejected.internalReason.length >= 20, 'Rejected demo decision did not fill the valid internal reason.')
  check(errors, rejected.candidateFacingReason === 'Thank you for your time and interest in the role. We decided to proceed with candidates whose recent experience more closely matches the position’s current production requirements.', 'Rejected demo decision did not fill the candidate-facing reason.')
  check(errors, selected.internalReason === 'The candidate demonstrated sufficient evidence across the role’s required competencies and met the published decision criteria.' && selected.internalReason.length >= 20, 'Selected demo decision did not fill the valid internal reason.')
  check(errors, hold.internalReason === 'The candidate demonstrated relevant evidence, but additional review is required before recording a final outcome.' && hold.internalReason.length >= 20, 'Hold demo decision did not fill the valid internal reason.')
  check(errors, rejected.disagreementReason === 'EVIDENCE_INTERPRETATION' && (rejected.disagreementExplanation?.length ?? 0) >= 20, 'Required demo disagreement fields were not filled.')
  check(errors, !selected.disagreementReason && !selected.disagreementExplanation && !alignedRejected.disagreementReason && !alignedRejected.disagreementExplanation, 'Demo disagreement fields were filled for an aligned decision.')
  check(errors, isFinalDecisionFormValid({ ready: true, internalReason: rejected.internalReason, differsFromSystem: true, disagreementExplanation: rejected.disagreementExplanation ?? '' }), 'Valid demo content did not enable the final-decision form.')
  check(errors, !('decision' in rejected) && !('submittedAt' in rejected), 'Demo content builder attempted to submit a final decision.')
  check(errors, canShowDemoFinalDecisionHelper({ demoMode: true, evaluationStatus: 'READY_FOR_DECISION', actorRole: 'HIRING_MANAGER' }), 'Authorized demo user could not access the helper.')
  check(errors, !canShowDemoFinalDecisionHelper({ demoMode: true, evaluationStatus: 'READY_FOR_DECISION', actorRole: 'RECRUITER' }) && !canShowDemoFinalDecisionHelper({ demoMode: true, evaluationStatus: 'READY_FOR_DECISION', actorRole: 'INTERVIEWER' }), 'Unauthorized role could access the demo helper.')
  check(errors, !canShowDemoFinalDecisionHelper({ demoMode: false, evaluationStatus: 'READY_FOR_DECISION', actorRole: 'HIRING_MANAGER' }) && !resolveDemoWorkspaceMode({ dev: false, configuredMode: 'production' }), 'Production mode exposed the demo helper.')
  check(errors, !canShowDemoFinalDecisionHelper({ demoMode: true, evaluationStatus: 'DECIDED', actorRole: 'HIRING_MANAGER' }), 'Decided evaluation exposed the demo helper.')
  return { valid: errors.length === 0, errors }
}
