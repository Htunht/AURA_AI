import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'

type CandidateRecommendationProps = {
  item: CandidateListItem
  onRetryFailed: () => void
  align?: 'start' | 'end'
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  return 'neutral'
}

export function CandidateRecommendation({
  item,
  onRetryFailed,
  align = 'start',
}: CandidateRecommendationProps) {
  const {
    candidate,
    decision,
    job,
    screeningEvaluation,
    screeningStatus,
  } = item
  const recommendation =
    decision?.humanRecommendation ?? screeningEvaluation?.recommendation
  const alignment = align === 'end' ? 'items-end text-right' : 'items-start'

  if (screeningStatus === 'COMPLETED' && recommendation && screeningEvaluation) {
    return (
      <div className={`flex flex-col gap-1.5 ${alignment}`}>
        <Badge tone={recommendationTone(recommendation)}>
          {recommendation === 'REVIEW'
            ? 'Review'
            : getScreeningRecommendationLabel(recommendation)}
        </Badge>
        <span className="text-xs font-semibold tabular-nums text-depth">
          {Math.round(screeningEvaluation.overallScore)} / 100
        </span>
      </div>
    )
  }

  if (screeningStatus === 'QUEUED') return <Badge tone="accent">Queued</Badge>

  if (screeningStatus === 'PROCESSING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-marine">
        <LoaderCircle
          size={14}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        Processing
      </span>
    )
  }

  if (screeningStatus === 'FAILED') {
    return (
      <div className={`flex flex-col gap-1.5 ${alignment}`}>
        <Badge tone="danger">Failed</Badge>
        <button
          type="button"
          className="min-h-8 text-xs font-semibold text-harbor hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
          onClick={onRetryFailed}
          aria-label={`Retry screening for ${candidate.fullName}`}
        >
          Retry screening
        </button>
      </div>
    )
  }

  if (screeningStatus === 'SETUP_REQUIRED') {
    return (
      <div className={`flex flex-col gap-1.5 ${alignment}`}>
        <Badge tone="warning">Setup required</Badge>
        <Link
          className="min-h-8 text-xs font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
          to={`/jobs/${job.id}/setup`}
        >
          Continue setup
        </Link>
      </div>
    )
  }

  return <Badge>Not screened</Badge>
}
