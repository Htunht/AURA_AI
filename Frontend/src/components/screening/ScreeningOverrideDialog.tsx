import { useEffect, useState } from 'react'
import type { Recommendation } from '../../types/evaluation'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

type ScreeningOverrideDialogProps = {
  open: boolean
  aiRecommendation: Recommendation
  onClose: () => void
  onSave: (recommendation: Recommendation, reason: string) => void
}

const recommendations: Recommendation[] = ['STRONG_YES', 'YES', 'REVIEW', 'NO', 'STRONG_NO']

export function ScreeningOverrideDialog({ open, aiRecommendation, onClose, onSave }: ScreeningOverrideDialogProps) {
  const [recommendation, setRecommendation] = useState<Recommendation | ''>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setRecommendation('')
      setReason('')
      setError('')
    }
  }, [open])

  function handleSubmit() {
    if (!recommendation) {
      setError('Choose a new recommendation.')
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

  return (
    <Dialog open={open} title="Override screening recommendation" onClose={onClose}>
      <p className="mt-0 text-sm leading-6 text-aura-text-secondary">AURA recommended <strong className="text-depth">{getScreeningRecommendationLabel(aiRecommendation)}</strong>. Record a different recommendation and explain the recruiter evidence behind the change.</p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-depth">New recommendation<select className="h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm font-normal text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35" value={recommendation} onChange={(event) => { setRecommendation(event.target.value as Recommendation); setError('') }}><option value="">Choose recommendation</option>{recommendations.map((value) => <option key={value} value={value}>{getScreeningRecommendationLabel(value)}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-depth">Override reason<textarea className="min-h-28 resize-y rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm font-normal leading-6 text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35" value={reason} onChange={(event) => { setReason(event.target.value); setError('') }} placeholder="Describe the additional evidence or recruiter judgment supporting this change." /></label>
        <p className="m-0 text-xs text-aura-text-muted">Minimum 15 characters. This reason becomes part of the decision audit record.</p>
        {error ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft px-3 py-2 text-sm font-medium text-aura-danger" role="alert">{error}</p> : null}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit}>Save override</Button></div>
    </Dialog>
  )
}
