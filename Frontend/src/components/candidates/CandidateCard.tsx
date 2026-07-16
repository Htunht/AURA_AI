import { ArrowRight } from 'lucide-react'
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
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function CandidateCard({ item }: CandidateCardProps) {
  const { candidate, application, job, screeningEvaluation } = item
  const recommendation = screeningEvaluation?.recommendation

  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
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
        <Badge tone={recommendationTone(recommendation)}>
          {recommendation
            ? getScreeningRecommendationLabel(recommendation)
            : 'Not screened'}
        </Badge>
      </div>
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
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Stage</dt>
          <dd className="mt-1 text-sm text-depth">{formatApplicationStage(application.currentStage)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Submitted</dt>
          <dd className="mt-1 text-sm text-depth">{formatDate(application.submittedAt)}</dd>
        </div>
      </dl>
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
        to={`/candidates/${candidate.id}`}
        aria-label={`View ${candidate.fullName}`}
      >
        View candidate <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </Card>
  )
}
