import { AlertTriangle, CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useInterviewSchedulingAutomation } from '../../hooks/useInterviewSchedulingAutomation'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  getSchedulingExceptionLabel,
  selectActiveInterviewSchedulingPolicy,
  selectInterviewByApplicationId,
  selectSchedulingAutomationViewModelByApplicationId,
} from '../../store/demoSelectors'
import { formatInterviewDate, formatInterviewMode, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SchedulingInvitationCard } from './SchedulingInvitationCard'

const linkClass = 'inline-flex h-10 items-center justify-center rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export function CandidateInterviewPanel({ applicationId }: { applicationId: string }) {
  const { state } = useDemoStore()
  const { regenerateInvitation } = useInterviewSchedulingAutomation()
  const application = state.applications.find((item) => item.id === applicationId)
  const interview = selectInterviewByApplicationId(state, applicationId)
  const model = selectSchedulingAutomationViewModelByApplicationId(state, applicationId)
  const policy = application ? selectActiveInterviewSchedulingPolicy(state, application.jobId) : undefined
  const decision = state.decisions.filter((item) => item.applicationId === applicationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const positive = decision?.humanRecommendation === 'STRONG_YES' || decision?.humanRecommendation === 'YES' || decision?.humanRecommendation === 'REVIEW'

  if (interview && interview.status !== 'CANCELLED') {
    return (
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Scheduled by candidate</p>
            <h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Interview confirmed</h2>
            <p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">AURA prepared the interview team and available times. The candidate selected this schedule.</p>
          </div>
          <Badge tone="success">Interview confirmed</Badge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail label="Date" value={formatInterviewDate(interview.scheduledStart)} />
          <Detail label="Time" value={`${formatInterviewTime(interview.scheduledStart)}–${formatInterviewTime(interview.scheduledEnd)}`} />
          <Detail label="Timezone" value={interview.timezone} />
          <Detail label="Format" value={formatInterviewMode(interview.mode ?? 'VIDEO')} />
          <div className="sm:col-span-2"><Detail label="Interviewers" value={interview.interviewers.map((person) => person.name).join(', ')} /></div>
        </dl>
        <Link className={`${linkClass} mt-5`} to={`/interviews/${interview.id}`}>View interview</Link>
      </Card>
    )
  }

  if (model?.state === 'READY_TO_SHARE' || model?.state === 'AWAITING_CANDIDATE') {
    return <SchedulingInvitationCard model={model} />
  }

  if (model?.state === 'EXCEPTION') {
    return <Card className="border-aura-warning/25 p-6"><div className="flex items-start gap-3"><AlertTriangle className="text-aura-warning" size={20} /><div><Badge tone="warning">Recruiter attention</Badge><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Scheduling requires recruiter attention</h2><p className="mb-0 mt-2 text-sm font-medium text-depth">{getSchedulingExceptionLabel(model.invitation.exceptionReason)}</p><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{model.invitation.lastError ?? 'Automatic scheduling could not continue.'}</p><Link className="mt-4 inline-flex font-semibold text-harbor" to="/interviews/exceptions">Review scheduling setup</Link></div></div></Card>
  }

  if (model?.state === 'EXPIRED') {
    return <Card className="border-aura-warning/25 p-6"><Badge tone="warning">Recruiter attention</Badge><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Scheduling invitation expired</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Prepare a fresh set of approved times and share the new invitation with the candidate.</p><Button className="mt-4" variant="secondary" onClick={() => regenerateInvitation(model.invitation.id)}>Prepare new invitation</Button></Card>
  }

  if (model?.state === 'PREPARING') {
    return <Card className="p-6"><div className="flex items-start gap-3"><span className="inline-grid size-10 place-items-center rounded-aura-sm bg-glacier/15 text-marine"><CalendarClock size={19} /></span><div><Badge tone="accent">AURA in progress</Badge><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Preparing interview availability</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">AURA is applying the scheduling policy, assigning the interview team, and generating candidate-ready times.</p></div></div></Card>
  }

  if (positive && application?.currentStage === 'SHORTLIST_REVIEW') {
    return <Card className="p-6"><h2 className="m-0 text-lg font-semibold text-depth">{policy ? 'Preparing interview availability' : 'Interview scheduling policy required'}</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{policy ? 'AURA is assigning the interview team and generating candidate-selectable times.' : 'This role needs an active policy before scheduling can continue.'}</p></Card>
  }

  return <Card className="p-8 text-center"><h2 className="m-0 text-lg font-semibold text-depth">Interview scheduling not started</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">A positive recruiter decision is required before interview availability is prepared.</p></Card>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1 font-semibold text-depth">{value}</dd></div>
}
