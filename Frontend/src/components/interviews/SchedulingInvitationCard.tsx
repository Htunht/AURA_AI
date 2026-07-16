import { Clipboard, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SchedulingAutomationViewModel } from '../../store/demoSelectors'
import { formatDateTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SchedulingProgress } from './SchedulingProgress'
import { EmailDeliveryStatus } from './EmailDeliveryStatus'
import { useSchedulingEmailAutomation } from '../../hooks/useSchedulingEmailAutomation'

const previewClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline transition-colors hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier focus-visible:ring-offset-2'

export function SchedulingInvitationCard({ model, compact = false }: { model: SchedulingAutomationViewModel; compact?: boolean }) {
  const { invitation, candidate, job } = model
  const { emailConfigured, retryEmail } = useSchedulingEmailAutomation()
  const [copyResult, setCopyResult] = useState<'SUCCESS' | 'FAILED'>()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const path = `/schedule/${invitation.token}`
  const fullLink = typeof window === 'undefined' ? path : `${window.location.origin}${path}`

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
  }, [])

  async function copyInvitationLink() {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(fullLink)
      setCopyResult('SUCCESS')
      clearTimer.current = setTimeout(() => setCopyResult(undefined), 2600)
    } catch {
      setCopyResult('FAILED')
    }
  }

  const statusTitle = model.deliveryStatus === 'QUEUED' ? 'Email queued' : model.deliveryStatus === 'SENDING' ? 'Sending invitation' : model.deliveryStatus === 'SENT' ? 'Awaiting candidate response' : model.deliveryStatus === 'FAILED' ? 'Email delivery failed' : 'Automatic email is not configured'
  const statusTone = model.deliveryStatus === 'FAILED' || model.deliveryStatus === 'NOT_SENT' ? 'warning' : model.deliveryStatus === 'SENT' ? 'success' : 'accent'
  const canRetry = model.deliveryStatus === 'FAILED' || (model.deliveryStatus === 'NOT_SENT' && emailConfigured)

  if (compact) return <Card className="overflow-hidden"><details className="group"><summary className="grid cursor-pointer list-none gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-glacier sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-sm font-semibold text-depth">{candidate.fullName}</h3><span className="text-xs text-aura-text-muted">{job.title}</span></div><p className="mb-0 mt-1 text-xs font-medium text-aura-text-secondary">{statusTitle}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><Badge tone={statusTone}>{model.deliveryStatus === 'SENT' ? 'Candidate action' : model.deliveryStatus === 'FAILED' || model.deliveryStatus === 'NOT_SENT' ? 'Recruiter attention' : 'AURA in progress'}</Badge><span className="text-xs font-semibold text-harbor group-open:hidden">View details</span><span className="hidden text-xs font-semibold text-harbor group-open:inline">Hide details</span></div></summary><div className="grid gap-4 border-t border-harbor/10 bg-frost/35 p-4 lg:grid-cols-2"><EmailDeliveryStatus status={model.deliveryStatus} candidateName={candidate.fullName} candidateEmail={candidate.email} sentAt={model.sentAt} attemptCount={model.deliveryAttemptCount} error={model.deliveryError} onRetry={canRetry ? () => retryEmail(invitation.id) : undefined} /><div className="grid grid-cols-2 gap-3 rounded-aura-sm border border-harbor/10 bg-white p-4 text-xs"><Detail label="Interview team" value={model.interviewerNames.join(' · ') || 'Being assigned'} /><Detail label="Approved times" value={`${model.availableSlotCount} available`} /><div className="col-span-2"><Detail label="Invitation expires" value={formatDateTime(invitation.expiresAt)} /></div></div><div><SchedulingProgress steps={model.progressSteps} /></div><div className="flex flex-wrap content-start gap-2"><a className={previewClass} href={path} target="_blank" rel="noreferrer" aria-label={`Preview scheduling invitation for ${candidate.fullName}`}><ExternalLink size={15} />Preview</a><Button variant="secondary" onClick={copyInvitationLink} aria-label={`Copy invitation link for ${candidate.fullName}`}><Clipboard size={15} />Copy link</Button></div>{copyResult ? <div className="lg:col-span-2" aria-live="polite">{copyResult === 'SUCCESS' ? <p className="m-0 text-xs font-semibold text-aura-success">Invitation link copied</p> : <input className="h-10 w-full rounded-aura-sm border border-aura-warning/30 px-3 font-mono text-xs" aria-label={`Invitation link for ${candidate.fullName}`} value={fullLink} readOnly onFocus={(event) => event.currentTarget.select()} />}</div> : null}</div></details></Card>

  return (
    <Card className="overflow-hidden">
      <div className="border-l-4 border-l-marine p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-depth">{candidate.fullName}</h3>
            <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{job.title}{model.policySourceLabel ? ` · ${model.policySourceLabel}` : ''}</p>
          </div>
          <Badge tone={model.deliveryStatus === 'FAILED' || model.deliveryStatus === 'NOT_SENT' ? 'warning' : model.deliveryStatus === 'SENT' ? 'success' : 'accent'}>{model.deliveryStatus === 'SENT' ? 'Candidate action' : model.deliveryStatus === 'FAILED' || model.deliveryStatus === 'NOT_SENT' ? 'Recruiter attention' : 'AURA in progress'}</Badge>
        </div>

        <div className="mt-4"><EmailDeliveryStatus status={model.deliveryStatus} candidateName={candidate.fullName} candidateEmail={candidate.email} sentAt={model.sentAt} attemptCount={model.deliveryAttemptCount} error={model.deliveryError} onRetry={canRetry ? () => retryEmail(invitation.id) : undefined} /></div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.92fr]">
          <div>
            <p className="m-0 text-sm font-semibold text-depth">AURA prepared this interview</p>
            <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">
              {model.deliveryStatus === 'SENT' ? 'The invitation was delivered. The candidate chooses the final interview time.' : 'The scheduling link remains available as a delivery fallback.'}
            </p>
            <div className="mt-4">
              <SchedulingProgress steps={model.progressSteps} />
            </div>
          </div>
          <dl className="grid content-start gap-4 rounded-aura-sm bg-frost/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Interview team</dt>
              <dd className="mb-0 mt-1 font-semibold leading-5 text-depth">{model.interviewerNames.join(' · ') || 'Being assigned'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Approved times</dt>
              <dd className="mb-0 mt-1 font-semibold text-depth">{model.availableSlotCount} available</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Invitation expires</dt>
              <dd className="mb-0 mt-1 font-semibold text-depth">{formatDateTime(invitation.expiresAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-harbor/10 pt-4">
          <a
            className={previewClass}
            href={path}
            target="_blank"
            rel="noreferrer"
            aria-label={`Preview scheduling invitation for ${candidate.fullName}`}
          >
            <ExternalLink size={15} aria-hidden="true" />Preview invitation
          </a>
          <Button
            variant="secondary"
            onClick={copyInvitationLink}
            aria-label={`Copy invitation link for ${candidate.fullName}`}
          >
            <Clipboard size={15} aria-hidden="true" />Copy invitation link
          </Button>
        </div>

        <div className="mt-2 min-h-5 text-xs" aria-live="polite">
          {copyResult === 'SUCCESS' ? (
            <p className="m-0 font-semibold text-aura-success">Invitation link copied</p>
          ) : copyResult === 'FAILED' ? (
            <div className="grid gap-2">
              <p className="m-0 font-medium text-aura-warning">Copy was unavailable. Select and copy this invitation link:</p>
              <label className="sr-only" htmlFor={`invitation-link-${invitation.id}`}>Invitation link for {candidate.fullName}</label>
              <input
                id={`invitation-link-${invitation.id}`}
                className="h-10 w-full rounded-aura-sm border border-aura-warning/30 bg-white px-3 font-mono text-xs text-depth focus:outline-none focus:ring-2 focus:ring-glacier"
                value={fullLink}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1 font-semibold leading-5 text-depth">{value}</dd></div> }
