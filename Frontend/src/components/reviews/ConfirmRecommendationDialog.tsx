import type { HumanReviewQueueItem } from '../../types/reviewQueue'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { getPostScreeningStage } from '../../utils/screeningWorkflow'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ConfirmRecommendationDialog({
  item,
  open,
  onClose,
  onConfirm,
}: {
  item: HumanReviewQueueItem
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const recommendation = item.evaluation?.recommendation
  if (!recommendation) return null

  const movesToDecision = getPostScreeningStage(recommendation) === 'FINAL_REVIEW'

  return (
    <Dialog open={open} title="Confirm AURA recommendation" onClose={onClose}>
      <p className="mt-0 text-sm leading-6 text-aura-text-secondary">
        Confirm “<strong className="text-depth">{getScreeningRecommendationLabel(recommendation)}</strong>” as the recruiter decision for {item.candidate.fullName}?
      </p>
      <div className="mt-4 rounded-aura-sm border border-harbor/10 bg-frost/65 p-4">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Workflow impact</p>
        <p className="mb-0 mt-2 text-sm font-medium leading-6 text-depth">
          {movesToDecision
            ? 'The application will move to decision review. No rejection communication will be sent automatically.'
            : 'The application will move to shortlist review.'}
        </p>
      </div>
      <p className="mb-0 mt-4 text-xs leading-5 text-aura-text-muted">
        This records a human decision while preserving AURA’s original recommendation for audit.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm decision</Button>
      </div>
    </Dialog>
  )
}
