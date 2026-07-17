import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { ApplicationStage } from '../../types/application'
import type { Decision } from '../../types/decision'
import type { Evaluation, Recommendation } from '../../types/evaluation'
import { formatApplicationStage, formatDateTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { ScreeningOverrideDialog } from './ScreeningOverrideDialog'

type HumanScreeningReviewProps = {
  candidateName: string
  evaluation: Evaluation
  decision?: Decision
  currentStage: ApplicationStage
  onConfirm: () => void
  onOverride: (recommendation: Recommendation, reason: string) => void
}

function workflowImpact(
  recommendation: Recommendation,
  currentStage: ApplicationStage,
) {
  if (
    currentStage === 'INTERVIEW' ||
    currentStage === 'FINAL_REVIEW' ||
    currentStage === 'DECISION' ||
    currentStage === 'COMMUNICATION' ||
    currentStage === 'SELECTED' ||
    currentStage === 'REJECTED' ||
    currentStage === 'HOLD'
  ) {
    return `The recruiter decision will be recorded. The current ${formatApplicationStage(currentStage).toLowerCase()} stage will be preserved.`
  }
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'The application will move to final review.'
  return 'The application will move to shortlisted.'
}

export function HumanScreeningReview({ candidateName, evaluation, decision, currentStage, onConfirm, onOverride }: HumanScreeningReviewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)

  if (decision) {
    return (
      <Card className="border-marine/25 p-5 md:p-6">
        <div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-full bg-glacier/20 text-marine"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Recruiter decision recorded</p><h2 className="mb-0 mt-1.5 text-lg font-semibold text-depth">{decision.reviewAction === 'CONFIRM' ? 'Recommendation confirmed' : 'Recommendation overridden'}</h2></div></div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-aura-sm bg-frost/65 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">AI recommendation</dt><dd className="mb-0 mt-2"><Badge>{getScreeningRecommendationLabel(decision.aiRecommendation)}</Badge></dd></div>
          <div className="rounded-aura-sm bg-frost/65 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Recruiter recommendation</dt><dd className="mb-0 mt-2"><Badge tone="accent">{getScreeningRecommendationLabel(decision.humanRecommendation)}</Badge></dd></div>
          <div><dt className="text-xs text-aura-text-muted">Review action</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{decision.reviewAction === 'CONFIRM' ? 'Confirmed' : 'Overridden'}</dd></div>
          <div><dt className="text-xs text-aura-text-muted">Decision date</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDateTime(decision.createdAt)}</dd></div>
        </dl>
        {decision.overrideReason ? <div className="mt-4 border-l-2 border-glacier pl-4"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Override reason</p><p className="mb-0 mt-1.5 text-sm leading-6 text-aura-text-secondary">{decision.overrideReason}</p></div> : null}
        <p className="mb-0 mt-5 flex items-center gap-2 text-xs font-medium text-harbor"><CheckCircle2 size={15} aria-hidden="true" />This audit record is complete and cannot be edited.</p>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-marine/25 p-5 md:p-6">
        <div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-full bg-glacier/20 text-marine"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Human review required</p><h2 className="mb-0 mt-1.5 text-lg font-semibold text-depth">Recruiter review required</h2><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Confirm the recommendation or record an override before moving the candidate to the next workflow stage.</p></div></div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => setConfirmOpen(true)}>Confirm recommendation</Button><Button variant="secondary" onClick={() => setOverrideOpen(true)}>Override recommendation</Button></div>
      </Card>
      <Dialog open={confirmOpen} title="Confirm screening recommendation" onClose={() => setConfirmOpen(false)}>
        <p className="mt-0 text-sm leading-6 text-aura-text-secondary">Confirm AURA’s recommendation of “<strong className="text-depth">{getScreeningRecommendationLabel(evaluation.recommendation)}</strong>” for {candidateName}?</p>
        <div className="mt-4 rounded-aura-sm border border-harbor/10 bg-frost/65 p-4"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Workflow impact</p><p className="mb-0 mt-2 text-sm font-medium text-depth">{workflowImpact(evaluation.recommendation, currentStage)}</p></div>
        <p className="mb-0 mt-4 text-xs leading-5 text-aura-text-muted">AURA provides recommendations. This confirmation records the recruiter’s human review.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button onClick={() => { onConfirm(); setConfirmOpen(false) }}>Confirm recommendation</Button></div>
      </Dialog>
      <ScreeningOverrideDialog open={overrideOpen} aiRecommendation={evaluation.recommendation} onClose={() => setOverrideOpen(false)} onSave={(recommendation, reason) => { onOverride(recommendation, reason); setOverrideOpen(false) }} />
    </>
  )
}
