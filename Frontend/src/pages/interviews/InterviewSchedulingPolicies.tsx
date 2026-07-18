import { ArrowRight, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { formatDuration, formatInterviewMode } from '../../utils/helpers'
import { selectResolvedInterviewSchedulingPolicy } from '../../store/demoSelectors'
import { SchedulingPolicySource } from '../../components/interviews/SchedulingPolicySource'

const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewSchedulingPolicies() {
  const { state } = useDemoStore()
  return <PageContainer eyebrow="Advanced scheduling" title="Job-specific overrides" description="Create a custom setup only for roles that cannot use organization or department defaults." actions={<Link className={linkClass} to="/interviews/settings">Back to settings</Link>}>
    <div className="grid gap-4">
      {state.jobs.map((job) => {
        const policies = state.interviewSchedulingPolicies.filter((item) => item.scope === 'JOB' && item.jobId === job.id).sort((a, b) => b.version - a.version)
        const active = policies.find((item) => item.status === 'ACTIVE')
        const draft = policies.find((item) => item.status === 'DRAFT')
        const resolved = selectResolvedInterviewSchedulingPolicy(state, job.id)
        return <Card className="p-5 md:p-6" key={job.id}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">{job.title}</h2>{active ? <Badge tone="success">Override active · v{active.version}</Badge> : null}{draft ? <Badge tone="accent">Draft · v{draft.version}</Badge> : null}</div><p className="mb-0 mt-1 text-xs text-aura-text-muted">{job.department}</p><div className="mt-3"><SchedulingPolicySource resolved={resolved} compact /></div>{active ? <p className="mb-0 mt-2 text-sm text-aura-text-secondary">{formatInterviewMode(active.interviewMode)} · {formatDuration(active.durationMinutes)} · {active.candidateSlotCount} candidate choices</p> : null}</div><Link className={linkClass} to={`/interviews/policies/${job.id}`}><Settings2 size={16} />Customize schedule<ArrowRight size={15} /></Link></div></Card>
      })}
    </div>
  </PageContainer>
}
