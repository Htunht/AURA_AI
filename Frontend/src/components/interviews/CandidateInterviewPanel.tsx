import { AlertTriangle, CalendarClock, Clipboard } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import interviewersData from '../../data/interviewers.json'
import { useInterviewSchedulingAutomation } from '../../hooks/useInterviewSchedulingAutomation'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectActiveInterviewSchedulingPolicy, selectInterviewByApplicationId, selectSchedulingInvitationByApplicationId } from '../../store/demoSelectors'
import type { Interviewer } from '../../types/interviewer'
import { formatDateTime, formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const interviewers = interviewersData as Interviewer[]
const linkClass = 'inline-flex h-10 items-center justify-center rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export function CandidateInterviewPanel({ applicationId }: { applicationId: string }) {
  const { state } = useDemoStore()
  const { regenerateInvitation } = useInterviewSchedulingAutomation()
  const [copyMessage, setCopyMessage] = useState('')
  const application = state.applications.find((item) => item.id === applicationId)
  const interview = selectInterviewByApplicationId(state, applicationId)
  const invitation = selectSchedulingInvitationByApplicationId(state, applicationId)
  const policy = application ? selectActiveInterviewSchedulingPolicy(state, application.jobId) : undefined
  const decision = state.decisions.filter((item) => item.applicationId === applicationId).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0]
  const positive = decision?.humanRecommendation === 'STRONG_YES' || decision?.humanRecommendation === 'YES' || decision?.humanRecommendation === 'REVIEW'
  const assigned = invitation?.interviewerIds.map((id) => interviewers.find((person) => person.id === id)).filter((person): person is Interviewer => Boolean(person)) ?? []

  async function copyLink() {
    if (!invitation) return
    const path = `/schedule/${invitation.token}`
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopyMessage('Scheduling link copied.')
    } catch { setCopyMessage(`Copy this path: ${path}`) }
  }

  if (interview && interview.status !== 'CANCELLED') return <Card className="p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Candidate selected a time</p><h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Interview scheduled</h2></div><Badge tone="accent">{formatInterviewStatus(interview.status)}</Badge></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="Date" value={formatInterviewDate(interview.scheduledStart)} /><Detail label="Time" value={`${formatInterviewTime(interview.scheduledStart)}–${formatInterviewTime(interview.scheduledEnd)}`} /><Detail label="Timezone" value={interview.timezone} /><Detail label="Format" value={formatInterviewMode(interview.mode ?? 'VIDEO')} /><div className="sm:col-span-2"><Detail label="Interviewers" value={interview.interviewers.map((person) => person.name).join(', ')} /></div></dl><Link className={`${linkClass} mt-5`} to={`/interviews/${interview.id}`}>View interview</Link></Card>
  if (invitation?.status === 'PENDING') return <Card className="p-5 md:p-6"><div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-aura-sm bg-glacier/15 text-marine"><CalendarClock size={19} /></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Invitation ready</p><h2 className="mb-0 mt-1.5 text-xl font-semibold text-depth">Awaiting candidate scheduling</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{invitation.availableSlots.length} available times · expires {formatDateTime(invitation.expiresAt)}</p><p className="mb-0 mt-2 text-xs text-aura-text-muted">Assigned team: {assigned.map((person) => `${person.fullName} · ${person.roleTitle}`).join(', ')}</p></div></div><code className="mt-5 block overflow-x-auto rounded-aura-sm bg-frost p-3 text-xs text-aura-text-secondary">/schedule/{invitation.token}</code><Button className="mt-3" variant="secondary" onClick={copyLink}><Clipboard size={15} />Copy scheduling link</Button>{copyMessage ? <p className="mb-0 mt-2 text-xs text-aura-text-muted" role="status">{copyMessage}</p> : null}</Card>
  if (invitation?.status === 'EXCEPTION_REQUIRED') return <Card className="border-aura-warning/25 p-6"><div className="flex items-start gap-3"><AlertTriangle className="text-aura-warning" size={20} /><div><h2 className="m-0 text-lg font-semibold text-depth">Scheduling requires attention</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{invitation.lastError}</p><Link className="mt-4 inline-flex font-semibold text-harbor" to="/interviews/exceptions">Resolve scheduling</Link></div></div></Card>
  if (invitation?.status === 'EXPIRED') return <Card className="border-aura-warning/25 p-6"><h2 className="m-0 text-lg font-semibold text-depth">Scheduling invitation expired</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Generate a fresh set of candidate-ready times using the active policy.</p><Button className="mt-4" variant="secondary" onClick={() => regenerateInvitation(invitation.id)}>Regenerate slots</Button></Card>
  if (positive && application?.currentStage === 'SHORTLIST_REVIEW') return <Card className="p-6"><h2 className="m-0 text-lg font-semibold text-depth">{policy ? 'Preparing interview availability' : 'Interview scheduling policy required'}</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{policy ? 'AURA is assigning the interview team and generating candidate-selectable times.' : 'This role needs an active policy before scheduling can continue.'}</p></Card>
  return <Card className="p-8 text-center"><h2 className="m-0 text-lg font-semibold text-depth">Interview scheduling not started</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">A positive recruiter decision is required before interview availability is prepared.</p></Card>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1 font-semibold text-depth">{value}</dd></div> }
