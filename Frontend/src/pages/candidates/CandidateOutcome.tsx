import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectPostDecisionWorkflow } from '../../store/demoSelectors'
import { formatDateTime } from '../../utils/helpers'
import { canPrepareCandidateOutcome, createCandidateCommunicationDraft, validateCommunicationDraft } from '../../utils/postDecisionWorkflow'
import type { FinalEvaluation, HumanFinalDecision } from '../../types/finalEvaluation'

const linkClass = 'inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

function assertDecidedEvaluation(evaluation: FinalEvaluation): asserts evaluation is FinalEvaluation & { humanDecision: HumanFinalDecision } {
  if (!evaluation.humanDecision) throw new Error('A final decision is required.')
}

export default function CandidateOutcome() {
  const { candidateId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const { currentUser } = useAuth()
  const workflow = selectPostDecisionWorkflow(state, candidateId)
  const evaluation = workflow?.evaluation
  const candidate = workflow?.candidate
  const job = workflow?.job
  const [createdAt] = useState(() => new Date().toISOString())
  const generated = useMemo(() => evaluation && candidate && job && evaluation.humanDecision !== 'HOLD' ? createCandidateCommunicationDraft({ evaluation, candidate, job, createdAt }) : undefined, [candidate, createdAt, evaluation, job])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const source = workflow?.communicationDraft ?? generated
    setSubject(source?.subject ?? '')
    setBody(source?.body ?? '')
  }, [generated, workflow?.communicationDraft])

  if (!workflow || !generated || workflow.evaluation.humanDecision === 'HOLD') return <PageContainer eyebrow="Candidate outcome" title="Outcome preparation unavailable"><Card className="p-8 text-sm text-aura-text-secondary">A selected or rejected final decision is required before preparing candidate communication.</Card></PageContainer>
  assertDecidedEvaluation(workflow.evaluation)
  const draft = workflow.communicationDraft
  const allowed = canPrepareCandidateOutcome(currentUser.role)
  const validation = validateCommunicationDraft(subject, body)
  const readOnly = draft?.status === 'READY' || !allowed

  function saveDraft() {
    const now = new Date().toISOString()
    if (draft) dispatch({ type: 'UPDATE_CANDIDATE_COMMUNICATION_DRAFT', payload: { draftId: draft.id, subject, body, updatedAt: now, actorRole: currentUser.role } })
    else dispatch({ type: 'ADD_CANDIDATE_COMMUNICATION_DRAFT', payload: { actorRole: currentUser.role, draft: { ...generated!, subject, body, createdAt: now, updatedAt: now } } })
    setSaved(true)
  }

  function markReady() {
    const now = new Date().toISOString()
    if (!draft) dispatch({ type: 'ADD_CANDIDATE_COMMUNICATION_DRAFT', payload: { actorRole: currentUser.role, draft: { ...generated!, subject, body, createdAt: now, updatedAt: now } } })
    else dispatch({ type: 'UPDATE_CANDIDATE_COMMUNICATION_DRAFT', payload: { draftId: draft.id, subject, body, updatedAt: now, actorRole: currentUser.role } })
    dispatch({ type: 'MARK_CANDIDATE_COMMUNICATION_READY', payload: { draftId: draft?.id ?? generated!.id, updatedAt: now, actorRole: currentUser.role } })
  }

  return <PageContainer eyebrow="Candidate outcome" title="Prepare candidate communication" description="Review the candidate-facing message. This workspace prepares a draft and does not send email." actions={<Link className={linkClass} to={`/candidates/${candidateId}`}>Return to candidate</Link>}><div className="grid items-start gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]"><Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Outcome summary</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Candidate</dt><dd className="mb-0 mt-1 font-semibold text-depth">{workflow.candidate.fullName}</dd></div><div><dt className="text-xs text-aura-text-muted">Job</dt><dd className="mb-0 mt-1 font-semibold text-depth">{workflow.job.title}</dd></div><div><dt className="text-xs text-aura-text-muted">Final decision</dt><dd className="mb-0 mt-1"><Badge tone={workflow.evaluation.humanDecision === 'SELECTED' ? 'success' : 'danger'}>{workflow.evaluation.humanDecision.toLocaleLowerCase()}</Badge></dd></div><div><dt className="text-xs text-aura-text-muted">Decision date</dt><dd className="mb-0 mt-1 font-medium text-depth">{workflow.evaluation.decidedAt ? formatDateTime(workflow.evaluation.decidedAt) : 'Not available'}</dd></div><div><dt className="text-xs text-aura-text-muted">Communication type</dt><dd className="mb-0 mt-1 font-medium capitalize text-depth">{generated.type.toLocaleLowerCase()}</dd></div><div><dt className="text-xs text-aura-text-muted">Readiness</dt><dd className="mb-0 mt-1 font-medium text-depth">{draft?.status === 'READY' ? 'Ready' : draft ? 'Draft saved' : 'Not saved'}</dd></div></dl></Card><Card className="p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-depth">Candidate-facing message</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">Internal scores, recommendations, transcript details, and disagreement notes are excluded.</p></div><Badge tone={draft?.status === 'READY' ? 'success' : 'accent'}>{draft?.status === 'READY' ? 'Ready' : 'Draft'}</Badge></div><label className="mt-5 grid gap-1.5 text-sm font-semibold text-depth">Subject<Input disabled={readOnly} maxLength={200} value={subject} onChange={(event) => { setSubject(event.target.value); setSaved(false) }} /></label><label className="mt-4 grid gap-1.5 text-sm font-semibold text-depth">Body<textarea className="min-h-80 rounded-aura-sm border border-harbor/20 bg-white px-3 py-3 text-sm leading-6 text-depth focus:outline-none focus:ring-2 focus:ring-glacier/35 disabled:bg-frost disabled:text-aura-text-secondary" disabled={readOnly} maxLength={5000} value={body} onChange={(event) => { setBody(event.target.value); setSaved(false) }} /></label>{!validation.valid ? <p className="mb-0 mt-2 text-xs text-aura-danger">{validation.errors[0]}</p> : saved ? <p className="mb-0 mt-2 text-xs font-semibold text-aura-success" role="status">Draft saved.</p> : null}<div className="mt-5 flex flex-wrap gap-2">{allowed && !readOnly ? <><Button variant="secondary" disabled={!validation.valid} onClick={saveDraft}>Save draft</Button><Button disabled={!validation.valid} onClick={markReady}>Mark ready</Button></> : null}<Link className={linkClass} to={`/candidates/${candidateId}`}>Return to candidate</Link></div>{!allowed ? <p className="mb-0 mt-3 text-xs text-aura-text-muted">This role may view outcome status but cannot prepare candidate communication.</p> : null}</Card></div></PageContainer>
}
