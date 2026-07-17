import { useEffect, useState } from 'react'
import type { HoldFollowUp } from '../../types/postDecision'
import { validateHoldFollowUp } from '../../utils/postDecisionWorkflow'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'

type HoldFollowUpValues = Pick<HoldFollowUp, 'reason' | 'requiredReview' | 'assignedReviewer' | 'followUpAt'>

export function HoldFollowUpDialog({ open, initial, onClose, onSave }: { open: boolean; initial?: HoldFollowUp; onClose: () => void; onSave: (values: HoldFollowUpValues) => void }) {
  const [reason, setReason] = useState('')
  const [requiredReview, setRequiredReview] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setReason(initial?.reason ?? '')
    setRequiredReview(initial?.requiredReview ?? '')
    setReviewer(initial?.assignedReviewer ?? '')
    setDate(initial?.followUpAt.slice(0, 10) ?? '')
    setErrors([])
  }, [initial, open])

  function save() {
    const now = new Date().toISOString()
    const values = { reason, requiredReview, assignedReviewer: reviewer, followUpAt: date ? `${date}T09:00:00.000Z` : '' }
    const validation = validateHoldFollowUp(values, now)
    if (!validation.valid) return setErrors(validation.errors)
    onSave(values)
    onClose()
  }

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  return <Dialog open={open} title={initial ? 'Edit hold follow-up' : 'Set hold follow-up'} onClose={onClose}><div className="grid gap-4"><label className="grid gap-1.5 text-sm font-semibold text-depth">Follow-up reason<span className="text-xs font-normal text-aura-text-muted">20–1000 characters</span><textarea className="min-h-24 rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth focus:outline-none focus:ring-2 focus:ring-glacier/35" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-semibold text-depth">What must be reviewed?<span className="text-xs font-normal text-aura-text-muted">Describe the job-related evidence or comparison needed.</span><textarea className="min-h-24 rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth focus:outline-none focus:ring-2 focus:ring-glacier/35" maxLength={1000} value={requiredReview} onChange={(event) => setRequiredReview(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-semibold text-depth">Assigned reviewer<Input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-semibold text-depth">Follow-up date<Input type="date" min={tomorrow} value={date} onChange={(event) => setDate(event.target.value)} /></label>{errors.length ? <div className="rounded-aura-sm border border-aura-danger/25 bg-aura-danger-soft p-3 text-sm text-aura-danger" role="alert">{errors.map((error) => <p className="m-0" key={error}>{error}</p>)}</div> : null}</div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save follow-up</Button></div></Dialog>
}
