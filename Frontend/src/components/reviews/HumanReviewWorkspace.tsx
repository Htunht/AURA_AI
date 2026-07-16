import { AlertCircle, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useScreeningAutomation } from '../../hooks/useScreeningAutomation'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectActiveInterviewSchedulingPolicy, selectSchedulingInvitationByApplicationId } from '../../store/demoSelectors'
import type { Decision } from '../../types/decision'
import type { Recommendation } from '../../types/evaluation'
import type { HumanReviewQueueItem } from '../../types/reviewQueue'
import { formatApplicationStage, formatDateTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { getPostScreeningStage } from '../../utils/screeningWorkflow'
import { ScreeningCriteria } from '../screening/ScreeningCriteria'
import { ScreeningEvidence } from '../screening/ScreeningEvidence'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ConfirmRecommendationDialog } from './ConfirmRecommendationDialog'
import { OverrideRecommendationDialog } from './OverrideRecommendationDialog'

function recommendationTone(recommendation?: Recommendation) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function HumanReviewWorkspace({ item }: { item: HumanReviewQueueItem }) {
  const { state, dispatch } = useDemoStore()
  const { retryFailed } = useScreeningAutomation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const evaluation = item.evaluation
  const rubric = state.rubrics.find((entry) => entry.jobId === item.job.id && entry.status === 'PUBLISHED')
  const schedulingInvitation = selectSchedulingInvitationByApplicationId(state, item.application.id)
  const schedulingPolicy = selectActiveInterviewSchedulingPolicy(state, item.job.id)

  function recordDecision(
    reviewAction: Decision['reviewAction'],
    recommendation: Recommendation,
    overrideReason?: string,
  ) {
    if (!evaluation || item.decision) return
    const createdAt = new Date().toISOString()
    const decision: Decision = {
      id: `decision-${evaluation.id}`,
      applicationId: item.application.id,
      evaluationId: evaluation.id,
      reviewAction,
      aiRecommendation: evaluation.recommendation,
      humanRecommendation: recommendation,
      humanDecision: 'NEXT_STAGE',
      ...(overrideReason ? { overrideReason } : {}),
      createdAt,
    }
    dispatch({
      type:
        reviewAction === 'CONFIRM'
          ? 'CONFIRM_RECOMMENDATION'
          : 'OVERRIDE_RECOMMENDATION',
      payload: { decision },
    })
    dispatch({
      type: 'UPDATE_APPLICATION_STAGE',
      payload: {
        applicationId: item.application.id,
        stage: getPostScreeningStage(recommendation),
      },
    })
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-aura-md border border-harbor/15 bg-depth p-5 text-frost md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-glacier">Recruiter evidence review</p>
            <h2 className="mb-0 mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">{item.candidate.fullName}</h2>
            <p className="mb-0 mt-2 text-sm text-frost/65">{item.candidate.currentPosition} · {item.job.title}</p>
            <p className="mb-0 mt-1 text-xs text-frost/50">Current stage: {formatApplicationStage(item.application.currentStage)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
            <div className="rounded-aura-sm border border-white/10 bg-white/[0.06] p-3"><p className="m-0 text-[9px] font-bold uppercase tracking-wide text-frost/45">AURA recommendation</p><div className="mt-2"><Badge tone={recommendationTone(evaluation?.recommendation)}>{evaluation ? getScreeningRecommendationLabel(evaluation.recommendation) : 'Unavailable'}</Badge></div></div>
            <div className="rounded-aura-sm border border-white/10 bg-white/[0.06] p-3"><p className="m-0 text-[9px] font-bold uppercase tracking-wide text-frost/45">Score</p><p className="mb-0 mt-2 text-xl font-bold text-white">{evaluation ? Math.round(evaluation.overallScore) : '—'}</p></div>
            <div className="rounded-aura-sm border border-white/10 bg-white/[0.06] p-3"><p className="m-0 text-[9px] font-bold uppercase tracking-wide text-frost/45">Confidence</p><p className="mb-0 mt-2 text-xl font-bold text-white">{evaluation ? `${evaluation.confidence}%` : '—'}</p></div>
          </div>
        </div>
        <p className="mb-0 mt-5 border-l-2 border-glacier pl-3 text-xs leading-5 text-frost/65">AURA’s recommendation is advisory and must be reviewed before the candidate advances or exits the process.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-aura-sm border border-harbor/10 bg-frost/60 px-4 py-3">
        <div><p className="m-0 text-xs font-semibold text-depth">Why this candidate is here</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">{item.reviewReasons.join(' · ')}</p></div>
        <Link className="text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${item.candidate.id}`}>Open full candidate profile</Link>
      </div>

      {evaluation ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5"><h3 className="m-0 flex items-center gap-2 text-base font-semibold text-depth"><CheckCircle2 size={17} className="text-aura-success" aria-hidden="true" />Strengths</h3><div className="mt-4 grid gap-3">{evaluation.strengths.length ? evaluation.strengths.map((strength) => <article key={strength.id}><h4 className="m-0 text-sm font-semibold text-depth">{strength.title}</h4><p className="mb-0 mt-1 text-sm leading-6 text-aura-text-secondary">{strength.description}</p></article>) : <p className="m-0 text-sm text-aura-text-secondary">No major strengths were returned.</p>}</div></Card>
            <Card className="p-5"><h3 className="m-0 flex items-center gap-2 text-base font-semibold text-depth"><AlertCircle size={17} className="text-aura-warning" aria-hidden="true" />Concerns</h3><div className="mt-4 grid gap-3">{evaluation.concerns.length ? evaluation.concerns.map((concern) => <article key={concern.id}><h4 className="m-0 text-sm font-semibold text-depth">{concern.title}</h4><p className="mb-0 mt-1 text-sm leading-6 text-aura-text-secondary">{concern.description}</p></article>) : <p className="m-0 text-sm text-aura-text-secondary">No significant concerns were returned.</p>}</div></Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5"><ScreeningCriteria evaluation={evaluation} rubric={rubric} /></Card>
            <Card className="p-5"><ScreeningEvidence application={item.application} evaluation={evaluation} /></Card>
          </div>
        </>
      ) : null}

      {item.category === 'FAILED' ? (
        <Card className="border-aura-danger/20 p-5">
          <h3 className="m-0 text-base font-semibold text-depth">{rubric ? 'Screening must be retried before a hiring recommendation can be reviewed.' : 'Screening setup is required for this role.'}</h3>
          <p className="mb-0 mt-2 text-sm text-aura-text-secondary">{rubric ? 'No recruiter decision controls are available until screening completes successfully.' : 'Publish an evidence rubric to let AURA screen this application. Hiring decisions remain with the recruiter.'}</p>
          {rubric ? <Button className="mt-4" variant="secondary" onClick={() => retryFailed([item.application.id])}><RotateCcw size={16} aria-hidden="true" />Retry screening</Button> : <Link className="mt-4 inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15" to={`/jobs/${item.job.id}/screening-rubric`}>Configure screening rubric</Link>}
        </Card>
      ) : item.decision ? (
        <Card className="border-marine/25 p-5 md:p-6">
          <div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-full bg-glacier/20 text-marine"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Recruiter decision recorded</p><h3 className="mb-0 mt-1.5 text-lg font-semibold text-depth">{item.decision.reviewAction === 'CONFIRM' ? 'Recommendation confirmed' : 'Recommendation overridden'}</h3></div></div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-aura-sm bg-frost/65 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">AURA recommendation</dt><dd className="mb-0 mt-2"><Badge>{getScreeningRecommendationLabel(item.decision.aiRecommendation)}</Badge></dd></div>
            <div className="rounded-aura-sm bg-frost/65 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Recruiter recommendation</dt><dd className="mb-0 mt-2"><Badge tone="accent">{getScreeningRecommendationLabel(item.decision.humanRecommendation)}</Badge></dd></div>
            <div><dt className="text-xs text-aura-text-muted">Decision type</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{item.decision.reviewAction === 'CONFIRM' ? 'Confirmed' : 'Overridden'}</dd></div>
            <div><dt className="text-xs text-aura-text-muted">Decision date</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDateTime(item.decision.createdAt)}</dd></div>
          </dl>
          {item.decision.overrideReason ? <div className="mt-4 border-l-2 border-glacier pl-4"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Override reason</p><p className="mb-0 mt-1.5 text-sm leading-6 text-aura-text-secondary">{item.decision.overrideReason}</p></div> : null}
          <p className="mb-0 mt-5 flex items-center gap-2 text-xs font-medium text-harbor"><CheckCircle2 size={15} aria-hidden="true" />This audit record is append-only and cannot be edited.</p>
          {schedulingInvitation?.status === 'PENDING' ? <p className="mb-0 mt-4 text-sm font-semibold text-aura-success">Scheduling invitation prepared</p> : schedulingInvitation?.status === 'EXCEPTION_REQUIRED' ? <Link className="mt-4 inline-flex font-semibold text-harbor" to="/interviews/exceptions">Scheduling exception · Resolve scheduling</Link> : !schedulingPolicy ? <Link className="mt-4 inline-flex font-semibold text-harbor" to={`/interviews/policies/${item.job.id}`}>Interview scheduling policy required</Link> : <p className="mb-0 mt-4 text-sm text-aura-text-secondary">Preparing interview availability automatically.</p>}
        </Card>
      ) : evaluation ? (
        <Card className="border-marine/25 p-5 md:p-6">
          <div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-full bg-glacier/20 text-marine"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Human decision required</p><h3 className="mb-0 mt-1.5 text-lg font-semibold text-depth">Record the recruiter recommendation</h3><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Confirm AURA’s recommendation or record a reasoned override.</p></div></div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => setConfirmOpen(true)}>Confirm recommendation</Button><Button variant="secondary" onClick={() => setOverrideOpen(true)}>Override recommendation</Button></div>
        </Card>
      ) : null}

      <ConfirmRecommendationDialog item={item} open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => { recordDecision('CONFIRM', evaluation?.recommendation ?? 'REVIEW'); setConfirmOpen(false) }} />
      <OverrideRecommendationDialog item={item} open={overrideOpen} onClose={() => setOverrideOpen(false)} onSave={(recommendation, reason) => { recordDecision('OVERRIDE', recommendation, reason); setOverrideOpen(false) }} />
    </div>
  )
}
