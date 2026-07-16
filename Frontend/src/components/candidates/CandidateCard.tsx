import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import {
  formatApplicationStage,
  formatDate,
} from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type CandidateCardProps = {
  item: CandidateListItem
  onRetryFailed: () => void
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function CandidateCard({ item, onRetryFailed }: CandidateCardProps) {
  const { candidate, application, job, screeningEvaluation, decision, screeningStatus } = item
  const recommendation = decision?.humanRecommendation ?? screeningEvaluation?.recommendation

  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <Link
            className="font-semibold text-depth no-underline hover:text-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
            to={`/candidates/${candidate.id}`}
          >
            {candidate.fullName}
          </Link>
          <p className="mt-1 truncate text-xs text-aura-text-muted">
            {candidate.email}
          </p>
          <p className="mt-1 text-sm text-aura-text-secondary">
            {candidate.currentPosition}
          </p>
        </div>
        <div className="ml-auto flex flex-none flex-col items-end gap-1">
          {screeningStatus === 'COMPLETED' && recommendation ? <Badge tone={recommendationTone(recommendation)}>{getScreeningRecommendationLabel(recommendation)}</Badge> : null}
          {screeningStatus === 'NOT_SCREENED' ? <Badge>Not screened</Badge> : null}
          {screeningStatus === 'QUEUED' ? <><Badge tone="accent">Queued for screening</Badge><span className="text-[10px] text-aura-text-muted">Waiting for AURA analysis</span></> : null}
          {screeningStatus === 'PROCESSING' ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-marine"><LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Screening in progress</span> : null}
          {screeningStatus === 'FAILED' ? <><Badge tone="danger">Screening failed</Badge><button type="button" onClick={onRetryFailed} className="text-xs font-semibold text-harbor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" aria-label={`Retry screening for ${candidate.fullName}`}>Retry screening</button></> : null}
        </div>
      </div>
      {decision ? <p className="-mt-2 mb-0 text-xs text-aura-text-muted">{decision.reviewAction === 'CONFIRM' ? 'Recruiter confirmed' : `Overrode AURA: ${getScreeningRecommendationLabel(decision.aiRecommendation)}`}</p> : null}
      {!decision && screeningStatus === 'COMPLETED' ? <p className="-mt-2 mb-0 text-xs font-medium text-marine">Recruiter review pending</p> : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-harbor/10 py-3">
        <div className="col-span-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Applied role</dt>
          <dd className="mt-1 text-sm font-semibold text-depth">{job.title}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Experience</dt>
          <dd className="mt-1 text-sm text-depth">{candidate.yearsExperience} years</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Score</dt>
          <dd className="mt-1 text-sm text-depth">{screeningEvaluation ? Math.round(screeningEvaluation.overallScore) : '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Confidence</dt>
          <dd className="mt-1 text-sm text-depth">{screeningEvaluation ? `${screeningEvaluation.confidence}%` : '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Stage</dt>
          <dd className="mt-1 text-sm text-depth">{formatApplicationStage(application.currentStage)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Submitted</dt>
          <dd className="mt-1 text-sm text-depth">{formatDate(application.submittedAt)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3"><Link className="text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`}>View candidate</Link>{screeningStatus === 'COMPLETED' ? <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/reviews?applicationId=${application.id}`} aria-label={`Review ${candidate.fullName}`}>Open review <ArrowRight size={15} aria-hidden="true" /></Link> : null}</div>
    </Card>
  )
}
