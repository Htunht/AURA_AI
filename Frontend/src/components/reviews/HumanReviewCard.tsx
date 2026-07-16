import type { HumanReviewQueueItem } from '../../types/reviewQueue'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const categoryLabel = {
  RECOMMENDED: 'Recommended',
  NEEDS_REVIEW: 'Needs review',
  NOT_RECOMMENDED: 'Not recommended',
  FAILED: 'Screening failed',
  REVIEWED: 'Reviewed',
} as const

export function HumanReviewCard({
  item,
  onReview,
}: {
  item: HumanReviewQueueItem
  onReview: () => void
}) {
  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="m-0 text-base font-semibold text-depth">{item.candidate.fullName}</h3><p className="mb-0 mt-1 truncate text-xs text-aura-text-muted">{item.candidate.email}</p><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{item.candidate.currentPosition}</p></div>
        <Badge tone={item.category === 'NEEDS_REVIEW' ? 'warning' : item.category === 'RECOMMENDED' || item.category === 'REVIEWED' ? 'success' : 'danger'}>{categoryLabel[item.category]}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-y border-harbor/10 py-3">
        <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Applied role</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{item.job.title}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">AURA recommendation</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{item.evaluation ? getScreeningRecommendationLabel(item.evaluation.recommendation) : 'Unavailable'}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Score</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{item.evaluation ? Math.round(item.evaluation.overallScore) : '—'}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Confidence</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{item.evaluation ? `${item.evaluation.confidence}%` : '—'}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Primary reason</dt><dd className="mb-0 mt-1 text-sm text-depth">{item.reviewReasons[0] ?? 'Recruiter review required'}</dd></div>
      </dl>
      <Button variant={item.category === 'NEEDS_REVIEW' ? 'primary' : 'secondary'} onClick={onReview} aria-label={`Review ${item.candidate.fullName}`}>Review candidate</Button>
    </Card>
  )
}
