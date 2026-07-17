import { useState } from 'react'
import type { DecisionDisagreementReason, FinalEvaluation, HumanFinalDecision as HumanDecision } from '../../types/finalEvaluation'
import type { DemoUser } from '../../types/role'
import { buildDemoFinalDecisionContent, canShowDemoFinalDecisionHelper, isFinalDecisionFormValid } from '../../utils/demoFinalDecision'
import { canRecordFinalDecision, doesHumanDecisionDifferFromSystem } from '../../utils/finalDecisionPermissions'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'

const fieldClass = 'mt-1 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2 text-sm text-depth focus:outline-none focus:ring-2 focus:ring-glacier/40'
export type FinalDecisionDraft = { decision: HumanDecision; decisionReason: string; candidateFacingReasonDraft?: string; disagreementReason?: DecisionDisagreementReason; disagreementExplanation?: string; holdReviewDate?: string }

export function HumanFinalDecision({ evaluation, actor, ready, demoMode = false, onRecord }: { evaluation: FinalEvaluation; actor: DemoUser; ready: boolean; demoMode?: boolean; onRecord: (draft: FinalDecisionDraft) => void }) {
  const [decision, setDecision] = useState<HumanDecision>('HOLD')
  const [reason, setReason] = useState('')
  const [candidateReason, setCandidateReason] = useState('')
  const [disagreementReason, setDisagreementReason] = useState<DecisionDisagreementReason>('EVIDENCE_INTERPRETATION')
  const [explanation, setExplanation] = useState('')
  const [reviewDate, setReviewDate] = useState('')
  const [confirm, setConfirm] = useState(false)

  if (evaluation.status === 'DECIDED') return <Card className="p-5"><div className="flex items-center justify-between gap-2"><h2 className="m-0 text-base font-semibold text-depth">Final decision</h2><Badge tone="accent">{evaluation.humanDecision?.toLocaleLowerCase()}</Badge></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Decision maker</dt><dd className="mb-0 mt-1 font-semibold text-depth">{evaluation.decidedBy}</dd></div><div><dt className="text-xs text-aura-text-muted">Reason</dt><dd className="mb-0 mt-1 text-aura-text-secondary">{evaluation.humanDecisionReason}</dd></div>{evaluation.candidateFacingReasonDraft ? <div><dt className="text-xs text-aura-text-muted">Candidate-facing draft</dt><dd className="mb-0 mt-1 text-aura-text-secondary">{evaluation.candidateFacingReasonDraft}</dd></div> : null}{evaluation.differsFromSystem ? <div><dt className="text-xs text-aura-text-muted">Recommendation disagreement</dt><dd className="mb-0 mt-1 text-aura-text-secondary">{evaluation.disagreementReason?.replaceAll('_', ' ').toLocaleLowerCase()} · {evaluation.disagreementExplanation}</dd></div> : null}</dl></Card>
  if (!canRecordFinalDecision(actor.role)) return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Decision restricted</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">An authorized decision maker must record the outcome.</p></Card>

  const differs = doesHumanDecisionDifferFromSystem(evaluation.systemRecommendation, decision)
  const valid = isFinalDecisionFormValid({ ready, internalReason: reason, differsFromSystem: differs, disagreementExplanation: explanation })
  const showDemoHelper = canShowDemoFinalDecisionHelper({ demoMode, evaluationStatus: evaluation.status, actorRole: actor.role })

  function fillDemoDecision() {
    const content = buildDemoFinalDecisionContent(decision, evaluation.systemRecommendation)
    setReason(content.internalReason)
    setCandidateReason(content.candidateFacingReason ?? '')
    setDisagreementReason(content.disagreementReason ?? 'EVIDENCE_INTERPRETATION')
    setExplanation(content.disagreementExplanation ?? '')
  }

  return <>
    <Card className="p-5">
      <h2 className="m-0 text-base font-semibold text-depth">Record final decision</h2>
      {showDemoHelper ? <div className="mt-4 rounded-aura-sm bg-frost p-3"><Button className="w-full" variant="secondary" onClick={fillDemoDecision}>Fill demo decision</Button><p className="mb-0 mt-2 text-xs leading-5 text-aura-text-muted">Demo content only. Review before recording the decision.</p></div> : null}
      <fieldset className="mt-4 grid gap-2">
        <legend className="text-sm font-semibold text-depth">Candidate outcome</legend>
        {([['SELECTED', 'Select candidate'], ['REJECTED', 'Reject candidate'], ['HOLD', 'Place on hold']] as const).map(([value, label]) => <label className={`flex cursor-pointer items-center gap-2 rounded-aura-sm border p-3 text-sm font-medium text-depth transition-colors ${decision === value ? 'border-marine/40 bg-glacier/10' : 'border-harbor/15 bg-white'}`} key={value}><input type="radio" name="decision" checked={decision === value} onChange={() => setDecision(value)} />{label}</label>)}
      </fieldset>
      <label className="mt-4 block text-sm font-semibold text-depth">Decision reason<span className="mt-1 block text-xs font-normal text-aura-text-muted">Use job-related evidence. Minimum 20 characters.</span><textarea className={`${fieldClass} min-h-28`} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {decision === 'REJECTED' ? <label className="mt-4 block text-sm font-semibold text-depth">Candidate-facing reason draft<textarea className={`${fieldClass} min-h-24`} maxLength={2000} value={candidateReason} onChange={(event) => setCandidateReason(event.target.value)} /></label> : null}
      {decision === 'HOLD' ? <label className="mt-4 block text-sm font-semibold text-depth">Optional review date<input className={fieldClass} type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label> : null}
      {differs ? <div className="mt-4 rounded-aura-sm border border-aura-warning/30 bg-aura-warning-soft p-4"><p className="m-0 text-sm font-semibold text-depth">This outcome differs from AURA’s recommendation.</p><label className="mt-3 block text-sm font-semibold text-depth">Reason for disagreement<select className={fieldClass} value={disagreementReason} onChange={(event) => setDisagreementReason(event.target.value as DecisionDisagreementReason)}><option value="ADDITIONAL_VERIFIED_INFORMATION">Additional verified information</option><option value="EVIDENCE_INTERPRETATION">Evidence interpretation</option><option value="COMPARATIVE_CANDIDATE_DECISION">Comparative candidate decision</option><option value="ROLE_OR_ORGANIZATIONAL_CHANGE">Role or organizational change</option><option value="LEGAL_OR_POLICY_REVIEW">Legal or policy review</option><option value="OTHER_JOB_RELATED_REASON">Other job-related reason</option></select></label><label className="mt-3 block text-sm font-semibold text-depth">Detailed job-related explanation<textarea className={`${fieldClass} min-h-24`} maxLength={2000} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label></div> : null}
      <Button className="mt-5 w-full" disabled={!valid} onClick={() => setConfirm(true)}>Record final decision</Button>
      {!ready ? <p className="mb-0 mt-2 text-xs leading-5 text-aura-warning">Review and resolve the evidence issues shown in the decision brief first.</p> : null}
    </Card>
    <Dialog open={confirm} title="Record final candidate decision?" onClose={() => setConfirm(false)}>
      <p className="mt-0 text-sm leading-6 text-aura-text-secondary">This records the decision and locks the evaluation.</p>
      <dl className="grid gap-2 rounded-aura-sm bg-frost p-3 text-sm"><div><dt className="text-xs text-aura-text-muted">AURA recommendation</dt><dd className="m-0 font-semibold text-depth">{evaluation.systemRecommendation.replaceAll('_', ' ').toLocaleLowerCase()}</dd></div><div><dt className="text-xs text-aura-text-muted">Human decision</dt><dd className="m-0 font-semibold text-depth">{decision.toLocaleLowerCase()}</dd></div><div><dt className="text-xs text-aura-text-muted">Decision maker</dt><dd className="m-0 font-semibold text-depth">{actor.name}</dd></div></dl>
      <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={() => { onRecord({ decision, decisionReason: reason, candidateFacingReasonDraft: candidateReason || undefined, disagreementReason: differs ? disagreementReason : undefined, disagreementExplanation: differs ? explanation : undefined, holdReviewDate: reviewDate || undefined }); setConfirm(false) }}>Record decision</Button></div>
    </Dialog>
  </>
}
