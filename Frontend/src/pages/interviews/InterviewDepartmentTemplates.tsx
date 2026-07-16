import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectResolvedInterviewSchedulingPolicy } from '../../store/demoSelectors'
import { formatDuration, formatInterviewMode } from '../../utils/helpers'
import { normalizePolicyDepartment } from '../../utils/interviewSchedulingPolicyResolution'

const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewDepartmentTemplates() {
  const { state } = useDemoStore()
  const departments = [...new Map([...state.jobs.map((job) => job.department), ...state.interviewSchedulingPolicies.flatMap((policy) => policy.department ? [policy.department] : [])].map((department) => [normalizePolicyDepartment(department), department.trim()])).values()].sort()
  return <PageContainer eyebrow="Scheduling settings" title="Department templates" description="Add a complete team-level template only where the organization default is not enough." actions={<Link className={linkClass} to="/interviews/settings">Back to settings</Link>}>
    <div className="grid gap-3">
      {departments.map((department) => {
        const active = state.interviewSchedulingPolicies.filter((policy) => policy.scope === 'DEPARTMENT' && policy.status === 'ACTIVE' && normalizePolicyDepartment(policy.department ?? '') === normalizePolicyDepartment(department)).sort((a, b) => b.version - a.version)[0]
        const jobs = state.jobs.filter((job) => normalizePolicyDepartment(job.department) === normalizePolicyDepartment(department))
        const usingTemplate = jobs.filter((job) => selectResolvedInterviewSchedulingPolicy(state, job.id)?.source === 'DEPARTMENT_TEMPLATE').length
        return <Card className="p-5" key={department}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-semibold text-depth">{department}</h2>{active ? <Badge tone="success">Active · v{active.version}</Badge> : <Badge>Using organization default</Badge>}</div><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{active ? `${formatDuration(active.durationMinutes)} · ${formatInterviewMode(active.interviewMode)} · ${active.interviewerSelectionStrategy.replaceAll('_', ' ').toLocaleLowerCase()}` : 'No team-specific setup is needed.'}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">{usingTemplate} of {jobs.length} jobs use this template</p></div><Link className={linkClass} to={`/interviews/settings/departments/${encodeURIComponent(department)}`}>{active ? 'View template' : 'Create template'}<ArrowRight size={15} /></Link></div></Card>
      })}
    </div>
  </PageContainer>
}
