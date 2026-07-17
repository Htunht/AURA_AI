import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { InterviewCard } from '../../components/interviews/InterviewCard'
import { InterviewTable } from '../../components/interviews/InterviewTable'
import { SchedulingAutomationSummary } from '../../components/interviews/SchedulingAutomationSummary'
import { SchedulingInvitationCard } from '../../components/interviews/SchedulingInvitationCard'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { useSchedulingEmailAutomation } from '../../hooks/useSchedulingEmailAutomation'
import { 
  getSchedulingExceptionLabel, 
  selectInterviewListItems, 
  selectJobsWithoutResolvedSchedulingPolicy, 
  selectSchedulingAutomationViewModels, 
  type SchedulingAutomationViewModel 
} from '../../store/demoSelectors'

type OperationsTab = 'attention' | 'progress' | 'awaiting' | 'scheduled' | 'history'

const utilityLinkClass = 'inline-flex items-center gap-2 text-sm font-semibold text-[#171717] no-underline transition-colors hover:text-[#85ab22] hover:underline focus-visible:outline-none'

export default function Interviews() {
  const { state } = useDemoStore()
  const { retryAllFailed } = useSchedulingEmailAutomation()
  const items = selectInterviewListItems(state)
  const automation = selectSchedulingAutomationViewModels(state)
  
  const attention = automation.filter((item) => item.state === 'EXCEPTION' || item.state === 'EXPIRED')
  const inProgress = automation.filter((item) => item.state === 'IN_PROGRESS')
  const awaiting = automation.filter((item) => item.state === 'AWAITING_CANDIDATE')
  const current = items.filter((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS')
  const history = items.filter((item) => item.interview.status === 'COMPLETED' || item.interview.status === 'CANCELLED')
  
  const [activeTab, setActiveTab] = useState<OperationsTab>(attention.length ? 'attention' : current.length ? 'scheduled' : 'awaiting')
  
  const tabs: Array<{ id: OperationsTab; label: string; count: number }> = [
    { id: 'attention', label: 'Action needed', count: attention.length },
    { id: 'progress', label: 'In progress', count: inProgress.length },
    { id: 'awaiting', label: 'Awaiting response', count: awaiting.length },
    { id: 'scheduled', label: 'Scheduled', count: current.length },
    { id: 'history', label: 'History', count: history.length },
  ]
  const failedCount = attention.filter((item) => item.deliveryStatus === 'FAILED').length
  const unresolvedJobs = selectJobsWithoutResolvedSchedulingPolicy(state)

  useEffect(() => {
    if (attention.length > 0) setActiveTab('attention')
  }, [attention.length])

  useEffect(() => {
    if (activeTab === 'progress' && inProgress.length === 0 && current.length > 0) setActiveTab('scheduled')
    if (activeTab === 'awaiting' && awaiting.length === 0 && current.length > 0) setActiveTab('scheduled')
  }, [activeTab, awaiting.length, current.length, inProgress.length])

  return (
    <PageContainer 
      eyebrow="Interview operations" 
      title="Interview scheduling" 
      description="AURA applies organization and department scheduling defaults automatically. Recruiters only manage exceptions and special overrides." 
      actions={<Link className={utilityLinkClass} to="/interviews/settings"><Settings2 size={15} />Scheduling settings</Link>}
    >
      {unresolvedJobs.length ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-base font-semibold text-[#171717]">Scheduling defaults required</h2>
              <p className="mb-0 mt-1 text-sm text-slate-500">
                {unresolvedJobs.length} job{unresolvedJobs.length === 1 ? '' : 's'} cannot prepare interview availability because no organization or department scheduling setup is available.
              </p>
            </div>
            <Link className={utilityLinkClass} to="/interviews/settings/organization">Set up organization default</Link>
          </div>
        </Card>
      ) : null}
      
      <SchedulingAutomationSummary sendingCount={inProgress.length} awaitingCount={awaiting.length} scheduledCount={current.length} exceptionCount={attention.length} />

      <div className="mb-4 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Interview operation states">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button 
                className={`relative flex h-11 items-center gap-2 px-3 text-sm font-semibold transition-colors cursor-pointer focus:outline-none ${
                  isActive 
                    ? 'text-[#171717] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[#85ab22]' 
                    : 'text-slate-400 hover:text-[#85ab22]'
                }`} 
                key={tab.id} 
                role="tab" 
                aria-selected={isActive} 
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                  isActive ? 'bg-[#85ab22]/20 text-[#85ab22]' : 'bg-slate-100 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section role="tabpanel" aria-live="polite">
        {activeTab === 'attention' ? (
          <OperationPanel 
            title="Action needed" 
            description="Only items requiring recruiter intervention." 
            action={failedCount > 1 ? <button className={utilityLinkClass} onClick={retryAllFailed}>Retry all failed emails</button> : undefined}
          >
            {attention.length ? (
              <div className="grid gap-2">
                {attention.map((model) => model.invitation.status === 'PENDING' ? <SchedulingInvitationCard compact model={model} key={model.invitation.id} /> : <ExceptionRow model={model} key={model.invitation.id} />)}
              </div>
            ) : (
              <EmptyState message="Nothing needs your attention." />
            )}
          </OperationPanel>
        ) : null}
        
        {activeTab === 'progress' ? (
          <OperationPanel title="In progress" description="AURA is preparing or delivering these invitations.">
            {inProgress.length ? <div className="grid gap-2">{inProgress.map((model) => <SchedulingInvitationCard compact model={model} key={model.invitation.id} />)}</div> : <EmptyState message="No scheduling work is currently in progress." />}
          </OperationPanel>
        ) : null}
        
        {activeTab === 'awaiting' ? (
          <OperationPanel title="Awaiting response" description="Invitation delivered; candidate action is next.">
            {awaiting.length ? <div className="grid gap-2">{awaiting.map((model) => <SchedulingInvitationCard compact model={model} key={model.invitation.id} />)}</div> : <EmptyState message="No candidates are currently awaiting a response." />}
          </OperationPanel>
        ) : null}
        
        {activeTab === 'scheduled' ? (
          <OperationPanel title="Scheduled" description="Confirmed upcoming interviews.">
            {current.length ? (
              <>
                <div className="hidden xl:block">
                  <InterviewTable items={current} confirmedLabel />
                </div>
                <div className="grid gap-2 xl:hidden">
                  {current.map((item) => <InterviewCard item={item} confirmedLabel key={item.interview.id} />)}
                </div>
              </>
            ) : (
              <EmptyState message="No upcoming interviews are confirmed." />
            )}
          </OperationPanel>
        ) : null}
        
        {activeTab === 'history' ? (
          <OperationPanel title="History" description="Completed and cancelled interviews.">
            {history.length ? (
              <>
                <div className="hidden xl:block">
                  <InterviewTable items={history} />
                </div>
                <div className="grid gap-2 xl:hidden">
                  {history.map((item) => <InterviewCard item={item} key={item.interview.id} />)}
                </div>
              </>
            ) : (
              <EmptyState message="No past interview records." />
            )}
          </OperationPanel>
        ) : null}
      </section>
    </PageContainer>
  )
}

function OperationPanel({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-depth">{title}</h2><p className="mb-0 mt-1 text-xs text-slate-400">{description}</p></div>{action}</div>{children}</div>
}

function ExceptionRow({ model }: { model: SchedulingAutomationViewModel }) {
  const completed = model.progressSteps.filter((step) => step.status === 'COMPLETE').map((step) => step.label)
  return (
    <Card className="overflow-hidden">
      <details className="group">
        <summary className="grid cursor-pointer list-none gap-3 p-4 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 text-sm font-semibold text-depth">{model.candidate.fullName}</h3>
              <span className="text-xs text-slate-400">{model.job.title}</span>
            </div>
            <p className="mb-0 mt-1 text-xs font-medium text-amber-600">{getSchedulingExceptionLabel(model.invitation.exceptionReason)}</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Badge tone="warning">Recruiter attention</Badge>
            <span className="text-xs font-semibold text-[#171717] group-open:hidden hover:text-[#85ab22] transition-colors">View details</span>
            <span className="hidden text-xs font-semibold text-[#171717] group-open:inline hover:text-[#85ab22] transition-colors">Hide details</span>
          </div>
        </summary>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#F2EFE9]/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-xs leading-5 text-slate-500">{completed.length ? `Completed: ${completed.join(', ')}.` : 'Scheduling preparation could not start.'}</p>
            <p className="mb-0 mt-1 text-xs text-slate-400">{model.invitation.lastError}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {model.invitation.exceptionReason === 'POLICY_MISSING' ? <Link className={utilityLinkClass} to="/interviews/settings">Set up scheduling defaults</Link> : null}
            <Link className={utilityLinkClass} to={`/candidates/${model.candidate.id}`}>Candidate profile</Link>
          </div>
        </div>
      </details>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) { 
  return <div className="rounded-aura-sm border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">{message}</div> 
}
