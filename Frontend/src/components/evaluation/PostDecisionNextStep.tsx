import { ArrowRight, CalendarClock, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectPostDecisionWorkflow } from '../../store/demoSelectors'
import type { HoldFollowUp } from '../../types/postDecision'
import { formatDate } from '../../utils/helpers'
import { canManageHoldFollowUp, canPrepareCandidateOutcome, canReopenHoldDecision } from '../../utils/postDecisionWorkflow'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { HoldFollowUpDialog } from './HoldFollowUpDialog'

const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export function PostDecisionNextStep({ candidateId, showReturn = false }: { candidateId: string; showReturn?: boolean }) {
  const { state, dispatch } = useDemoStore()
  const { currentUser } = useAuth()
  const workflow = selectPostDecisionWorkflow(state, candidateId)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  if (!workflow) return null
  const { evaluation, candidate, holdFollowUp, communicationDraft } = workflow
  const decision = evaluation.humanDecision

  function saveFollowUp(values: Pick<HoldFollowUp, 'reason' | 'requiredReview' | 'assignedReviewer' | 'followUpAt'>) {
    const now = new Date().toISOString()
    dispatch({ type: 'UPSERT_HOLD_FOLLOW_UP', payload: { actorRole: currentUser.role, followUp: { id: holdFollowUp?.id ?? `hold-follow-up-${evaluation.id}`, candidateId: candidate.id, finalEvaluationId: evaluation.id, ...values, status: 'OPEN', createdAt: holdFollowUp?.createdAt ?? now, updatedAt: now } } })
  }

  function markReady() {
    if (!holdFollowUp) return
    dispatch({ type: 'MARK_HOLD_FOLLOW_UP_READY', payload: { followUpId: holdFollowUp.id, updatedAt: new Date().toISOString(), actorRole: currentUser.role } })
  }

  function reopenReview() {
    if (!holdFollowUp) return
    dispatch({ type: 'REOPEN_HOLD_DECISION_REVIEW', payload: { finalEvaluationId: evaluation.id, followUpId: holdFollowUp.id, reopenedAt: new Date().toISOString(), reopenedBy: currentUser.name, actorRole: currentUser.role } })
  }

  if (decision === 'SELECTED' || decision === 'REJECTED') {
    const selected = decision === 'SELECTED'
    return <Card className="overflow-hidden border-marine/20"><div className="border-l-4 border-marine p-5"><div className="flex items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Next step</p><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Candidate {selected ? 'selected' : 'rejected'}</h2></div><Badge tone={selected ? 'success' : 'danger'}>{communicationDraft?.status === 'READY' ? 'Message ready' : 'Action required'}</Badge></div><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">{selected ? 'Prepare the candidate-facing selection message and confirm the next hiring step.' : 'Review the candidate-facing reason and prepare the rejection communication.'}</p><div className="mt-4 flex flex-wrap gap-2">{canPrepareCandidateOutcome(currentUser.role) ? <Link className={linkClass} to={`/candidates/${candidate.id}/outcome`}>{workflow.actionLabel}<ArrowRight size={15} /></Link> : <span className="text-xs text-aura-text-muted">Outcome preparation is available to recruiters and hiring managers.</span>}{showReturn ? <Link className="inline-flex h-10 items-center px-3 text-sm font-semibold text-harbor" to={`/candidates/${candidate.id}`}>Return to candidate</Link> : null}</div></div></Card>
  }

  if (workflow.status === 'COMPLETED') return <Card className="border-aura-success/25 bg-aura-success-soft p-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 text-aura-success" size={20} /><div><h2 className="m-0 text-base font-semibold text-depth">Final decision review reopened</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">The original HOLD decision remains in the audit history. Record the next authorized decision when review is complete.</p><Link className="mt-3 inline-flex text-sm font-semibold text-harbor" to={`/candidates/${candidate.id}/final-evaluation`}>Open decision review</Link></div></div></Card>

  return <><Card className="overflow-hidden border-aura-warning/30"><div className="border-l-4 border-aura-warning p-5"><div className="flex items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-aura-warning">Next step</p><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Candidate placed on hold</h2></div><Badge tone="warning">{holdFollowUp?.status === 'READY_FOR_REVIEW' ? 'Review ready' : holdFollowUp ? 'Follow-up scheduled' : 'Action required'}</Badge></div><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Additional review is required before a final outcome can be communicated.</p>{holdFollowUp ? <dl className="mt-4 grid gap-3 rounded-aura-sm bg-frost/70 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-aura-text-muted">Review date</dt><dd className="mb-0 mt-1 font-semibold text-depth">{formatDate(holdFollowUp.followUpAt)}</dd></div><div><dt className="text-xs text-aura-text-muted">Assigned reviewer</dt><dd className="mb-0 mt-1 font-semibold text-depth">{holdFollowUp.assignedReviewer}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-aura-text-muted">Required review</dt><dd className="mb-0 mt-1 leading-6 text-aura-text-secondary">{holdFollowUp.requiredReview}</dd></div></dl> : null}<div className="mt-4 flex flex-wrap gap-2">{!holdFollowUp && canManageHoldFollowUp(currentUser.role) ? <Button onClick={() => setFollowUpOpen(true)}>Set follow-up</Button> : null}{holdFollowUp?.status === 'OPEN' && canManageHoldFollowUp(currentUser.role) ? <><Button variant="secondary" onClick={() => setFollowUpOpen(true)}>Edit follow-up</Button><Button onClick={markReady}>Mark ready for review</Button></> : null}{holdFollowUp?.status === 'READY_FOR_REVIEW' && canReopenHoldDecision(currentUser.role) ? <Button onClick={reopenReview}>Reopen decision review</Button> : null}{holdFollowUp && !canManageHoldFollowUp(currentUser.role) ? <span className="inline-flex items-center gap-1.5 text-xs text-aura-text-muted"><CalendarClock size={14} />Follow-up is visible but cannot be changed with this role.</span> : null}{showReturn ? <Link className="inline-flex h-10 items-center px-3 text-sm font-semibold text-harbor" to={`/candidates/${candidate.id}`}>Return to candidate</Link> : null}</div></div></Card><HoldFollowUpDialog open={followUpOpen} initial={holdFollowUp?.status === 'OPEN' ? holdFollowUp : undefined} onClose={() => setFollowUpOpen(false)} onSave={saveFollowUp} /></>
}
