import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useInterviewSchedulingAutomation } from '../hooks/useInterviewSchedulingAutomation'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectSchedulingExceptions } from '../store/demoSelectors'
import { formatDateTime } from '../utils/helpers'

const linkClass = 'font-semibold text-harbor no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewSchedulingExceptions() {
  const { state } = useDemoStore()
  const { retryAutomation } = useInterviewSchedulingAutomation()
  const exceptions = selectSchedulingExceptions(state)
  return <PageContainer eyebrow="Scheduling automation" title="Scheduling exceptions" description="Resolve only the candidates whose automated interview setup needs attention." actions={<Link className={linkClass} to="/interviews">Back to interviews</Link>}>
    {exceptions.length ? <div className="grid gap-3">{exceptions.map((invitation) => {
      const application = state.applications.find((item) => item.id === invitation.applicationId)
      const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
      const job = state.jobs.find((item) => item.id === invitation.jobId)
      const policy = state.interviewSchedulingPolicies.find((item) => item.id === invitation.policyId)
      if (!application || !candidate || !job) return null
      return <Card className="p-5" key={invitation.id}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><span className="inline-grid size-10 flex-none place-items-center rounded-aura-sm bg-aura-warning-soft text-aura-warning"><AlertTriangle size={19} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-semibold text-depth">{candidate.fullName}</h2><Badge tone="warning">Requires attention</Badge></div><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{job.title} · {policy ? `Policy v${policy.version}` : 'Policy unavailable'}</p><p className="mb-0 mt-2 text-sm font-medium text-depth">{invitation.lastError ?? 'Interview scheduling could not be prepared.'}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">Recorded {formatDateTime(invitation.updatedAt)}</p></div></div><div className="flex flex-wrap gap-3"><Link className={linkClass} to={`/interviews/policies/${job.id}`}>Open policy</Link><Link className={linkClass} to={`/candidates/${candidate.id}`}>Open candidate</Link><Button variant="secondary" onClick={() => retryAutomation(application.id)}><RotateCcw size={15} />Retry automation</Button></div></div></Card>
    })}</div> : <Card className="p-10 text-center"><h2 className="m-0 text-lg font-semibold text-depth">No scheduling exceptions</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Automated interviewer assignment and availability generation are operating normally.</p></Card>}
  </PageContainer>
}
