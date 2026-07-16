import { ArrowRight, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatDuration, formatInterviewMode } from '../utils/helpers'

const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewSchedulingPolicies() {
  const { state } = useDemoStore()
  return <PageContainer eyebrow="Scheduling automation" title="Interview scheduling policies" description="Define how AURA assigns interview teams and offers candidate-ready availability." actions={<Link className={linkClass} to="/interviews">Back to interviews</Link>}>
    <div className="grid gap-4">
      {state.jobs.map((job) => {
        const policies = state.interviewSchedulingPolicies.filter((item) => item.jobId === job.id).sort((a, b) => b.version - a.version)
        const active = policies.find((item) => item.status === 'ACTIVE')
        const draft = policies.find((item) => item.status === 'DRAFT')
        return <Card className="p-5 md:p-6" key={job.id}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">{job.title}</h2>{active ? <Badge tone="success">Active · v{active.version}</Badge> : <Badge tone="warning">Policy required</Badge>}{draft ? <Badge tone="accent">Draft · v{draft.version}</Badge> : null}</div><p className="mb-0 mt-1 text-xs text-aura-text-muted">{job.department}</p>{active ? <p className="mb-0 mt-3 text-sm text-aura-text-secondary">{formatInterviewMode(active.interviewMode)} · {formatDuration(active.durationMinutes)} · {active.candidateSlotCount} candidate choices · {active.schedulingWindowStartDays}–{active.schedulingWindowEndDays} day window</p> : <p className="mb-0 mt-3 text-sm text-aura-text-secondary">Candidates cannot receive automated scheduling availability until a policy is active.</p>}</div><Link className={linkClass} to={`/interviews/policies/${job.id}`}><Settings2 size={16} />{active || draft ? 'Manage policy' : 'Create policy'}<ArrowRight size={15} /></Link></div></Card>
      })}
    </div>
  </PageContainer>
}
