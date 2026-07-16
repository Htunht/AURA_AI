import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useInterviewSchedulingAutomation } from '../hooks/useInterviewSchedulingAutomation'
import { useDemoStore } from '../hooks/useDemoStore'
import { getSchedulingExceptionLabel, selectJobsWithoutResolvedSchedulingPolicy, selectSchedulingAutomationViewModels } from '../store/demoSelectors'
import { formatDateTime } from '../utils/helpers'
import { SchedulingInvitationCard } from '../components/interviews/SchedulingInvitationCard'
import { SchedulingPolicySource } from '../components/interviews/SchedulingPolicySource'

const linkClass = 'font-semibold text-harbor no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewSchedulingExceptions() {
  const { state } = useDemoStore()
  const { retryAutomation, regenerateInvitation } = useInterviewSchedulingAutomation()
  const attention = selectSchedulingAutomationViewModels(state).filter(
    (item) => item.state === 'EXCEPTION' || item.state === 'EXPIRED' || (item.invitation.status === 'PENDING' && (item.deliveryStatus === 'FAILED' || item.deliveryStatus === 'NOT_SENT')),
  )
  const unresolvedJobs = selectJobsWithoutResolvedSchedulingPolicy(state)

  return (
    <PageContainer eyebrow="Interview operations" title="Needs recruiter attention" description="Resolve only the candidates who could not continue through automatic scheduling." actions={<Link className={linkClass} to="/interviews">Back to interview scheduling</Link>}>
      {unresolvedJobs.length ? <Card className="mb-4 border-aura-warning/25 bg-aura-warning-soft/35 p-5"><h2 className="m-0 text-base font-semibold text-depth">Scheduling defaults required</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{unresolvedJobs.length} job{unresolvedJobs.length === 1 ? '' : 's'} need one shared scheduling setup. Existing policy-missing exceptions recover automatically after activation.</p><Link className={`${linkClass} mt-4 inline-flex`} to="/interviews/settings/organization">Set up organization default</Link></Card> : null}
      {attention.length ? (
        <div className="grid gap-3">
          {attention.map((model) => {
            if (model.invitation.status === 'PENDING') return <SchedulingInvitationCard model={model} key={model.invitation.id} />
            const completed = model.progressSteps.filter((step) => step.status === 'COMPLETE').map((step) => step.label)
            return (
              <Card className="p-5" key={model.invitation.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-grid size-10 flex-none place-items-center rounded-aura-sm bg-aura-warning-soft text-aura-warning"><AlertTriangle size={19} /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-semibold text-depth">{model.candidate.fullName}</h2><Badge tone="warning">Recruiter attention</Badge></div>
                      <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{model.job.title}</p>
                      <div className="mt-2"><SchedulingPolicySource sourceLabel={model.policySourceLabel} compact /></div>
                      <p className="mb-0 mt-3 text-sm font-semibold text-depth">{getSchedulingExceptionLabel(model.invitation.exceptionReason)}</p>
                      <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">{completed.length ? `AURA completed: ${completed.join(', ')}.` : 'AURA could not begin interview availability preparation.'}</p>
                      <p className="mb-0 mt-1 text-xs text-aura-text-muted">Recorded {formatDateTime(model.invitation.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link className={linkClass} to={model.invitation.exceptionReason === 'POLICY_MISSING' ? '/interviews/settings' : `/interviews/policies/${model.job.id}`}>{model.invitation.exceptionReason === 'POLICY_MISSING' ? 'Set up scheduling defaults' : 'Review scheduling setup'}</Link>
                    <Link className={linkClass} to={`/candidates/${model.candidate.id}`}>Open candidate</Link>
                    {model.invitation.exceptionReason !== 'POLICY_MISSING' ? <Button variant="secondary" onClick={() => model.state === 'EXPIRED' ? regenerateInvitation(model.invitation.id) : retryAutomation(model.invitation.applicationId)}><RotateCcw size={15} />{model.state === 'EXPIRED' ? 'Prepare new invitation' : 'Retry automation'}</Button> : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-10 text-center"><h2 className="m-0 text-lg font-semibold text-depth">No scheduling exceptions</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">No scheduling exceptions require recruiter attention.</p></Card>
      )}
    </PageContainer>
  )
}
