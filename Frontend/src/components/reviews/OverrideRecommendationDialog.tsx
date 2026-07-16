import { useEffect, useState } from 'react'
import type { Recommendation } from '../../types/evaluation'
import type { HumanReviewQueueItem } from '../../types/reviewQueue'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { getPostScreeningStage } from '../../utils/screeningWorkflow'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

const recommendations: Recommendation[] = [
  'STRONG_YES',
  'YES',
  'REVIEW',
  'NO',
  'STRONG_NO',
]

export function OverrideRecommendationDialog({
  item,
  open,
  onClose,
  onSave,
}: {
  item: HumanReviewQueueItem
  open: boolean
  onClose: () => void
  onSave: (recommendation: Recommendation, reason: string) => void
}) {
  const [recommendation, setRecommendation] = useState<Recommendation | ''>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const aiRecommendation = item.evaluation?.recommendation

  useEffect(() => {
    if (open) {
      setRecommendation('')
      setReason('')
      setError('')
    }
  }, [open])

  if (!aiRecommendation) return null

  function handleSubmit() {
    if (!recommendation) {
      setError('Choose a recruiter recommendation.')
      return
    }
    if (recommendation === aiRecommendation) {
      setError('Choose a recommendation different from AURA’s recommendation.')
      return
    }
    if (reason.trim().length < 15) {
      setError('Enter an override reason of at least 15 characters.')
      return
    }
    onSave(recommendation, reason.trim())
  }

  const destination = recommendation
    ? getPostScreeningStage(recommendation)
    : undefined

  return (
    <Dialog open={open} title="Override AURA recommendation" onClose={onClose}>
      <p className="mt-0 text-sm leading-6 text-aura-text-secondary">
        AURA recommended <strong className="text-depth">{getScreeningRecommendationLabel(aiRecommendation)}</strong>. Record a different recruiter recommendation and the evidence behind it.
      </p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-depth">
          Recruiter recommendation
          <select
            className="h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm font-normal text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35"
            value={recommendation}
            onChange={(event) => {
              setRecommendation(event.target.value as Recommendation)
              setError('')
            }}
          >
            <option value="">Choose recommendation</option>
            {recommendations.map((value) => (
              <option key={value} value={value}>{getScreeningRecommendationLabel(value)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-depth">
          Reason for override
          <textarea
            className="min-h-28 resize-y rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm font-normal leading-6 text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError('')
            }}
            placeholder="Describe the evidence or recruiter judgment supporting this change."
          />
        </label>
        <p className="m-0 text-xs text-aura-text-muted">Minimum 15 characters. The reason becomes part of the decision audit record.</p>
        {destination ? (
          <p className="m-0 rounded-aura-sm border border-harbor/10 bg-frost/65 px-3 py-2 text-xs font-medium text-depth">
            Workflow impact: the application will move to {destination === 'DECISION' ? 'decision review' : 'shortlist review'}.
          </p>
        ) : null}
        {error ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft px-3 py-2 text-sm font-medium text-aura-danger" role="alert">{error}</p> : null}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Save recruiter decision</Button>
      </div>
    </Dialog>
  )
}
