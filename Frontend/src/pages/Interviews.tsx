import { AlertTriangle, CheckCircle2, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InterviewCard } from '../components/interviews/InterviewCard'
import { InterviewTable } from '../components/interviews/InterviewTable'
import { SchedulingAutomationSummary } from '../components/interviews/SchedulingAutomationSummary'
import { SchedulingInvitationCard } from '../components/interviews/SchedulingInvitationCard'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  getSchedulingExceptionLabel,
  selectInterviewListItems,
  selectSchedulingAutomationViewModels,
  type SchedulingAutomationViewModel,
} from '../store/demoSelectors'

const utilityLinkClass = 'inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline transition-colors hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'
const exceptionLinkClass = 'inline-flex h-9 items-center justify-center rounded-aura-sm border border-aura-warning/30 bg-white px-3 text-sm font-semibold text-harbor no-underline transition-colors hover:bg-aura-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

function recommendedAction(model: SchedulingAutomationViewModel) {
  switch (model.invitation.exceptionReason) {
    case 'POLICY_MISSING': return 'Review scheduling setup'
    case 'INTERVIEWERS_UNAVAILABLE': return 'Review interviewer coverage'
    case 'NO_AVAILABLE_SLOTS': return 'Review interview availability'
    case 'INVITATION_EXPIRED': return 'Prepare a new invitation'
    case 'SLOT_CONFLICT': return 'Retry scheduling'
    case 'RESCHEDULE_LIMIT_REACHED': return 'Contact the candidate'
    default: return model.state === 'EXPIRED' ? 'Prepare a new invitation' : 'Review scheduling setup'
  }
}

export default function Interviews() {
  const { state } = useDemoStore()
  const items = selectInterviewListItems(state)
  const automation = selectSchedulingAutomationViewModels(state)
  const invitations = automation.filter((item) => item.state === 'READY_TO_SHARE' || item.state === 'AWAITING_CANDIDATE')
  const attention = automation.filter((item) => item.state === 'EXCEPTION' || item.state === 'EXPIRED')
  const preparing = automation.filter((item) => item.state === 'PREPARING')
  const current = items.filter((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS')
  const history = items.filter((item) => item.interview.status === 'COMPLETED' || item.interview.status === 'CANCELLED')

  return (
    <PageContainer
      eyebrow="Interview operations"
      title="Interview scheduling"
      description="AURA prepares interviewer availability and approved time slots. Candidates choose a suitable time, while recruiters handle exceptions."
      actions={<Link className={utilityLinkClass} to="/interviews/policies"><Settings2 size={15} aria-hidden="true" />Scheduling policies</Link>}
    >
      <p className="mb-5 mt-[-0.5rem] text-xs font-medium text-aura-text-muted">
        Most scheduling is handled automatically after a positive recruiter decision.
      </p>

      <SchedulingAutomationSummary
        readyToShareCount={invitations.length}
        scheduledCount={current.length}
        exceptionCount={attention.length}
        preparingCount={preparing.length}
      />

      <section className="mb-8" aria-labelledby="attention-heading">
        <SectionHeader id="attention-heading" eyebrow="Recruiter attention" title="Needs recruiter attention" description="These candidates could not continue through automatic scheduling." count={attention.length} tone="warning" />
        {attention.length ? (
          <div className="grid gap-3">
            {attention.map((model) => {
              const completed = model.progressSteps.filter((step) => step.status === 'COMPLETE').map((step) => step.label)
              return (
                <Card className="border-aura-warning/25 p-5" key={model.invitation.id}>
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex items-start gap-3">
                      <span className="inline-grid size-10 flex-none place-items-center rounded-aura-sm bg-aura-warning-soft text-aura-warning"><AlertTriangle size={18} aria-hidden="true" /></span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-base font-semibold text-depth">{model.candidate.fullName}</h3><Badge tone="warning">Recruiter attention</Badge></div>
                        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{model.job.title}</p>
                        <p className="mb-0 mt-3 text-sm font-semibold text-depth">{getSchedulingExceptionLabel(model.invitation.exceptionReason)}</p>
                        <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">{completed.length ? `AURA completed: ${completed.join(', ')}.` : 'AURA could not begin interview availability preparation.'}</p>
                        <p className="mb-0 mt-1 text-xs font-semibold text-aura-warning">Recommended: {recommendedAction(model)}</p>
                      </div>
                    </div>
                    <Link className={exceptionLinkClass} to={`/candidates/${model.candidate.id}`}>Review exception</Link>
                  </div>
                </Card>
              )
            })}
            <div className="flex justify-end"><Link className={utilityLinkClass} to="/interviews/exceptions">View all exceptions</Link></div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-aura-sm border border-aura-success/20 bg-aura-success-soft px-4 py-3 text-sm text-aura-success"><CheckCircle2 size={17} aria-hidden="true" /><span className="font-semibold">No scheduling exceptions require recruiter attention.</span></div>
        )}
      </section>

      <section className="mb-8" aria-labelledby="invitations-heading">
        <SectionHeader id="invitations-heading" eyebrow="Candidate action" title="Candidate scheduling invitations" description="AURA prepared interview availability. Share each invitation link so candidates can choose a time." count={invitations.length} tone="accent" />
        {invitations.length ? <div className="grid gap-4 xl:grid-cols-2">{invitations.map((model) => <SchedulingInvitationCard model={model} key={model.invitation.id} />)}</div> : <Card className="p-6 text-center text-sm text-aura-text-secondary">No scheduling invitations are waiting to be shared.</Card>}
      </section>

      <section className="mb-8" aria-labelledby="upcoming-heading">
        <SectionHeader id="upcoming-heading" eyebrow="Interview confirmed" title="Upcoming interviews" description="Candidates who selected a time and have a confirmed interview." count={current.length} />
        {current.length ? <><div className="hidden xl:block"><InterviewTable items={current} confirmedLabel /></div><div className="grid gap-3 xl:hidden">{current.map((item) => <InterviewCard item={item} confirmedLabel key={item.interview.id} />)}</div></> : <Card className="p-6 text-center text-sm text-aura-text-secondary">Confirmed candidate interview times will appear here.</Card>}
      </section>

      <section aria-labelledby="past-heading">
        <SectionHeader id="past-heading" title="Past interviews" description="Completed and cancelled interview records." count={history.length} tone="neutral" />
        {history.length ? <><div className="hidden xl:block"><InterviewTable items={history} /></div><div className="grid gap-3 xl:hidden">{history.map((item) => <InterviewCard item={item} key={item.interview.id} />)}</div></> : <Card className="p-6 text-center text-sm text-aura-text-secondary">No completed or cancelled interviews.</Card>}
      </section>
    </PageContainer>
  )
}

function SectionHeader({ id, title, description, count, eyebrow, tone = 'neutral' }: { id: string; title: string; description: string; count: number; eyebrow?: string; tone?: 'neutral' | 'warning' | 'accent' }) {
  return <div className="mb-3 flex items-end justify-between gap-4"><div>{eyebrow ? <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">{eyebrow}</p> : null}<h2 className="mb-0 mt-1 text-lg font-semibold text-depth" id={id}>{title}</h2><p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">{description}</p></div><Badge tone={tone}>{count}</Badge></div>
}
