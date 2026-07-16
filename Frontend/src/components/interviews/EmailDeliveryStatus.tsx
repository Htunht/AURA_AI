import { MailCheck, MailWarning, Send } from 'lucide-react'
import type { EmailDeliveryStatus as DeliveryStatus } from '../../types/emailDelivery'
import { formatDateTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export type EmailDeliveryStatusProps = { status: DeliveryStatus; candidateName: string; candidateEmail: string; sentAt?: string; attemptCount: number; error?: string; onRetry?: () => void }

export function EmailDeliveryStatus({ status, candidateName, candidateEmail, sentAt, attemptCount, error, onRetry }: EmailDeliveryStatusProps) {
  const failed = status === 'FAILED' || status === 'NOT_SENT'
  const title = status === 'QUEUED' ? 'Email queued' : status === 'SENDING' ? 'Sending invitation' : status === 'SENT' ? 'Awaiting candidate response' : status === 'FAILED' ? 'Email delivery failed' : 'Automatic email is not configured'
  const description = status === 'QUEUED' ? 'AURA will send the scheduling invitation automatically.' : status === 'SENDING' ? `The scheduling email is being delivered to ${maskEmail(candidateEmail)}.` : status === 'SENT' ? `Invitation sent${sentAt ? ` on ${formatDateTime(sentAt)}` : ''}. The candidate can now choose an interview time.` : status === 'FAILED' ? `${error ?? 'The scheduling invitation email could not be sent.'} The invitation is still valid.` : 'Scheduling links can still be copied and shared manually.'
  return <div className={`rounded-aura-sm border p-4 ${failed ? 'border-aura-warning/25 bg-aura-warning-soft/45' : status === 'SENT' ? 'border-aura-success/20 bg-aura-success-soft/45' : 'border-marine/15 bg-glacier/10'}`}><div className="flex items-start gap-3"><span className={`inline-grid size-8 flex-none place-items-center rounded-full bg-white ${failed ? 'text-aura-warning' : status === 'SENT' ? 'text-aura-success' : 'text-marine'}`}>{failed ? <MailWarning size={16} /> : status === 'SENT' ? <MailCheck size={16} /> : <Send size={15} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="m-0 text-sm font-semibold text-depth">{title}</p><Badge tone={failed ? 'warning' : status === 'SENT' ? 'success' : 'accent'}>{status === 'SENT' ? 'Candidate action' : failed ? 'Recruiter attention' : 'AURA in progress'}</Badge></div><p className="mb-0 mt-1 text-xs leading-5 text-aura-text-secondary">{description}</p>{attemptCount > 1 ? <p className="mb-0 mt-1 text-[10px] text-aura-text-muted">Delivery attempts: {attemptCount}</p> : null}{(status === 'FAILED' || status === 'NOT_SENT') && onRetry ? <Button className="mt-3 h-9" variant="secondary" onClick={onRetry} aria-label={`Retry scheduling invitation email for ${candidateName}`}>Retry email</Button> : null}</div></div></div>
}

function maskEmail(value: string) { const [name, domain] = value.split('@'); return name && domain ? `${name.slice(0, 2)}•••@${domain}` : 'the candidate email address' }
