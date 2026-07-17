import type { Recommendation } from '../../types/evaluation'
import type { HumanReviewCategory, HumanReviewQueueItem } from '../../types/reviewQueue'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const categoryLabels: Record<HumanReviewCategory, string> = {
  RECOMMENDED: 'Recommended',
  NEEDS_REVIEW: 'Needs review',
  NOT_RECOMMENDED: 'Not recommended',
  FAILED: 'Screening failed',
  REVIEWED: 'Reviewed',
}

function categoryTone(category: HumanReviewCategory) {
  if (category === 'RECOMMENDED' || category === 'REVIEWED') return 'success'
  if (category === 'NEEDS_REVIEW') return 'warning'
  if (category === 'FAILED' || category === 'NOT_RECOMMENDED') return 'danger'
  return 'neutral'
}

function recommendationTone(recommendation?: Recommendation) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function HumanReviewTable({
  items,
  onReview,
  showCategory = true,
}: {
  items: HumanReviewQueueItem[]
  onReview: (applicationId: string) => void
  showCategory?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Applied role</th>
            <th className="px-4 py-3">Recommendation</th>
            <th className="px-4 py-3">Result</th>
            <th className="px-4 py-3">Reason</th>
            {showCategory ? <th className="px-4 py-3">Status</th> : null}
            <th className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-harbor/10">
          {items.map((item) => (
            <tr className="transition-colors hover:bg-glacier/[0.07]" key={item.application.id}>
              <td className="px-4 py-4 align-top"><strong className="font-semibold text-depth">{item.candidate.fullName}</strong><span className="mt-1 block text-xs text-aura-text-muted">{item.candidate.email}</span></td>
              <td className="max-w-44 px-4 py-4 align-top font-medium text-depth">{item.job.title}</td>
              <td className="px-4 py-4 align-top">{item.evaluation ? <Badge tone={recommendationTone(item.evaluation.recommendation)}>{getScreeningRecommendationLabel(item.evaluation.recommendation)}</Badge> : <span className="text-aura-text-muted">Unavailable</span>}</td>
              <td className="whitespace-nowrap px-4 py-4 align-top font-semibold text-depth">{item.evaluation ? <>{Math.round(item.evaluation.overallScore)} <span className="font-normal text-aura-text-muted">· {item.evaluation.confidence}%</span></> : '—'}</td>
              <td className="max-w-52 px-4 py-4 align-top text-xs leading-5 text-aura-text-secondary">{item.reviewReasons[0] ?? 'Recruiter review required'}</td>
              {showCategory ? <td className="px-4 py-4 align-top"><Badge tone={categoryTone(item.category)}>{categoryLabels[item.category]}</Badge></td> : null}
              <td className="px-4 py-3 align-top"><Button className="h-8 whitespace-nowrap px-2 shadow-none" variant="ghost" onClick={() => onReview(item.application.id)} aria-label={`Review ${item.candidate.fullName}`}>Review</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
