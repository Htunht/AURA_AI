import { demoReducer, type DemoState } from '../store/demoReducer'
import { selectCandidateListItems, selectPostDecisionDashboard, selectPostDecisionWorkflow } from '../store/demoSelectors'
import type { FinalEvaluation, HumanFinalDecision } from '../types/finalEvaluation'
import type { HoldFollowUp } from '../types/postDecision'
import { createFinalEvaluationValidationFixture } from './finalEvaluationValidationFixture'
import { createCandidateCommunicationDraft, validateHoldFollowUp } from './postDecisionWorkflow'

export type PostDecisionWorkflowValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: boolean, message: string) => { if (!condition) errors.push(message) }

function decidedState(decision: HumanFinalDecision): { state: DemoState; evaluation: FinalEvaluation; fixture: ReturnType<typeof createFinalEvaluationValidationFixture> } {
  const fixture = createFinalEvaluationValidationFixture()
  const evaluation: FinalEvaluation = { ...fixture.evaluation, status: 'DECIDED', humanDecision: decision, humanDecisionReason: 'The authorized decision reflects the published job requirements and reviewed evidence.', candidateFacingReasonDraft: decision === 'REJECTED' ? 'We decided to proceed with candidates whose recent experience more closely matches the role requirements.' : undefined, decidedBy: 'Avery Morgan', decidedByRole: 'HIRING_MANAGER', decidedAt: fixture.stamp, updatedAt: fixture.stamp }
  return { fixture, evaluation, state: { ...fixture.state, applications: fixture.state.applications.map((item) => item.id === fixture.application.id ? { ...item, currentStage: decision } : item), finalEvaluations: [evaluation], candidateCommunicationDrafts: [], holdFollowUps: [] } }
}

export function validatePostDecisionWorkflowDomain(): PostDecisionWorkflowValidationResult {
  const errors: string[] = []
  const selected = decidedState('SELECTED')
  const rejected = decidedState('REJECTED')
  const held = decidedState('HOLD')
  check(errors, selectPostDecisionWorkflow(selected.state, selected.fixture.candidate.id)?.actionLabel === 'Prepare selection message', 'SELECTED did not show the selection-message action.')
  check(errors, selectPostDecisionWorkflow(rejected.state, rejected.fixture.candidate.id)?.actionLabel === 'Prepare rejection message', 'REJECTED did not show the rejection-message action.')
  check(errors, selectPostDecisionWorkflow(held.state, held.fixture.candidate.id)?.actionLabel === 'Set follow-up', 'HOLD did not show the follow-up action.')

  const selectedDraft = createCandidateCommunicationDraft({ evaluation: selected.evaluation, candidate: selected.fixture.candidate, job: selected.fixture.job, createdAt: selected.fixture.stamp })
  const rejectedDraft = createCandidateCommunicationDraft({ evaluation: rejected.evaluation, candidate: rejected.fixture.candidate, job: rejected.fixture.job, createdAt: rejected.fixture.stamp })
  for (const draft of [selectedDraft, rejectedDraft]) {
    const privateValues = [String(draft.type === 'SELECTION' ? selected.evaluation.weightedEvidenceScore : rejected.evaluation.weightedEvidenceScore), selected.evaluation.systemRecommendation, selected.evaluation.humanDecisionReason!, selected.evaluation.disagreementExplanation ?? 'private-disagreement-marker']
    check(errors, privateValues.every((value) => !draft.body.includes(value)), `${draft.type} draft exposed internal scoring or decision data.`)
  }
  let selectedWithDraft = demoReducer(selected.state, { type: 'ADD_CANDIDATE_COMMUNICATION_DRAFT', payload: { draft: selectedDraft, actorRole: 'RECRUITER' } })
  check(errors, selectedWithDraft.candidateCommunicationDrafts.length === 1 && selectedWithDraft.communications.length === selected.state.communications.length, 'Outcome draft creation sent email or failed to persist.')
  check(errors, demoReducer(selected.state, { type: 'ADD_CANDIDATE_COMMUNICATION_DRAFT', payload: { draft: selectedDraft, actorRole: 'INTERVIEWER' } }) === selected.state, 'INTERVIEWER prepared candidate communication.')
  selectedWithDraft = demoReducer(selectedWithDraft, { type: 'MARK_CANDIDATE_COMMUNICATION_READY', payload: { draftId: selectedDraft.id, updatedAt: '2026-07-18T09:00:00.000Z', actorRole: 'RECRUITER' } })
  check(errors, selectedWithDraft.candidateCommunicationDrafts[0]?.status === 'READY', 'Valid outcome draft could not be marked ready.')

  const now = '2026-07-17T09:00:00.000Z'
  check(errors, !validateHoldFollowUp({ reason: 'A sufficiently detailed follow-up reason.', requiredReview: 'Review the remaining comparative production evidence.', assignedReviewer: '', followUpAt: '2026-07-24T09:00:00.000Z' }, now).valid, 'Hold follow-up did not require a reviewer.')
  check(errors, !validateHoldFollowUp({ reason: 'A sufficiently detailed follow-up reason.', requiredReview: 'Review the remaining comparative production evidence.', assignedReviewer: 'Avery Morgan', followUpAt: '2026-07-16T09:00:00.000Z' }, now).valid, 'Hold follow-up accepted a past date.')
  const followUp: HoldFollowUp = { id: `hold-follow-up-${held.evaluation.id}`, candidateId: held.fixture.candidate.id, finalEvaluationId: held.evaluation.id, reason: 'Compare the candidate against the remaining qualified shortlist.', requiredReview: 'Compare production experience with the remaining shortlisted candidates.', assignedReviewer: 'Avery Morgan', followUpAt: '2026-07-24T09:00:00.000Z', status: 'OPEN', createdAt: now, updatedAt: now }
  const scheduled = demoReducer(held.state, { type: 'UPSERT_HOLD_FOLLOW_UP', payload: { followUp, actorRole: 'RECRUITER' } })
  check(errors, scheduled.holdFollowUps.length === 1 && scheduled.applications.find((item) => item.id === held.fixture.application.id)?.currentStage === 'HOLD', 'HOLD follow-up did not persist while preserving HOLD stage.')
  const duplicate = demoReducer(scheduled, { type: 'UPSERT_HOLD_FOLLOW_UP', payload: { followUp: { ...followUp, id: `${followUp.id}-duplicate` }, actorRole: 'RECRUITER' } })
  check(errors, duplicate === scheduled, 'Duplicate open HOLD follow-up was accepted.')
  const ready = demoReducer(scheduled, { type: 'MARK_HOLD_FOLLOW_UP_READY', payload: { followUpId: followUp.id, updatedAt: '2026-07-24T10:00:00.000Z', actorRole: 'RECRUITER' } })
  const auditSnapshot = JSON.stringify(ready.finalEvaluations[0])
  const reopened = demoReducer(ready, { type: 'REOPEN_HOLD_DECISION_REVIEW', payload: { finalEvaluationId: held.evaluation.id, followUpId: followUp.id, reopenedAt: '2026-07-24T11:00:00.000Z', reopenedBy: 'Avery Morgan', actorRole: 'HIRING_MANAGER' } })
  check(errors, reopened.finalEvaluations.length === 2 && JSON.stringify(reopened.finalEvaluations[0]) === auditSnapshot && reopened.finalEvaluations[1]?.reopenedFromEvaluationId === held.evaluation.id, 'HOLD review did not preserve Decision v1 and create Decision v2.')
  check(errors, reopened.applications.find((item) => item.id === held.fixture.application.id)?.currentStage === 'HOLD', 'Reopening changed the candidate stage before a new decision.')
  const nextEvaluation = reopened.finalEvaluations[1]!
  const selectedAfterHold = demoReducer(reopened, { type: 'RECORD_HUMAN_FINAL_DECISION', payload: { finalEvaluationId: nextEvaluation.id, decision: 'SELECTED', decisionReason: 'The completed follow-up supplied sufficient job-related evidence for selection.', disagreementReason: 'EVIDENCE_INTERPRETATION', disagreementExplanation: 'The authorized decision maker reviewed the complete follow-up evidence and reached a job-related conclusion.', decidedBy: 'Avery Morgan', decidedByRole: 'HIRING_MANAGER', decidedAt: '2026-07-24T12:00:00.000Z' } })
  check(errors, selectedAfterHold.finalEvaluations.length === 2 && selectedAfterHold.finalEvaluations[0]?.humanDecision === 'HOLD' && selectedAfterHold.finalEvaluations[1]?.humanDecision === 'SELECTED' && selectedAfterHold.applications.find((item) => item.id === held.fixture.application.id)?.currentStage === 'SELECTED', 'Decision v2 did not preserve HOLD history and update the candidate stage.')
  check(errors, demoReducer(ready, { type: 'REOPEN_HOLD_DECISION_REVIEW', payload: { finalEvaluationId: held.evaluation.id, followUpId: followUp.id, reopenedAt: '2026-07-24T11:00:00.000Z', reopenedBy: 'Recruiter', actorRole: 'RECRUITER' } }) === ready, 'Unauthorized recruiter reopened final decision review.')
  check(errors, demoReducer({ ...selected.state, holdFollowUps: [followUp] }, { type: 'REOPEN_HOLD_DECISION_REVIEW', payload: { finalEvaluationId: selected.evaluation.id, followUpId: followUp.id, reopenedAt: now, reopenedBy: 'Avery Morgan', actorRole: 'HIRING_MANAGER' } }).finalEvaluations.length === 1, 'SELECTED reopened through HOLD workflow.')
  check(errors, demoReducer({ ...rejected.state, holdFollowUps: [followUp] }, { type: 'REOPEN_HOLD_DECISION_REVIEW', payload: { finalEvaluationId: rejected.evaluation.id, followUpId: followUp.id, reopenedAt: now, reopenedBy: 'Avery Morgan', actorRole: 'HIRING_MANAGER' } }).finalEvaluations.length === 1, 'REJECTED reopened through HOLD workflow.')

  const listItem = selectCandidateListItems(scheduled).find((item) => item.application.id === held.fixture.application.id)
  check(errors, listItem?.operationalStatus?.label === 'Follow-up due', 'Candidate List HOLD secondary status is incorrect.')
  check(errors, selectPostDecisionWorkflow(scheduled, held.fixture.candidate.id)?.actionLabel === 'View follow-up', 'Candidate Detail or Final Evaluation next action is incorrect.')
  const dashboard = selectPostDecisionDashboard(scheduled, new Date(now))
  check(errors, dashboard.holdFollowUpsDue === 1 && dashboard.items[0]?.candidate.id === held.fixture.candidate.id, 'Dashboard post-decision counts are incorrect.')
  return { valid: errors.length === 0, errors }
}
