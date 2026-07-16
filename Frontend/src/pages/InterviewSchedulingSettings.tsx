import { ArrowRight, Building2, Settings2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import interviewersData from '../data/interviewers.json'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectSchedulingPolicyResolutionSummary } from '../store/demoSelectors'
import type { Interviewer } from '../types/interviewer'
import { formatDuration, formatInterviewMode } from '../utils/helpers'

const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'
const primaryLinkClass = `${linkClass} border-harbor bg-harbor text-white hover:bg-depth`

export default function InterviewSchedulingSettings() {
  const { state } = useDemoStore()
  const organization = state.interviewSchedulingPolicies.filter((item) => item.scope === 'ORGANIZATION' && item.status === 'ACTIVE').sort((a, b) => b.version - a.version || b.updatedAt.localeCompare(a.updatedAt))[0]
  const departmentCount = state.interviewSchedulingPolicies.filter((item) => item.scope === 'DEPARTMENT' && item.status === 'ACTIVE').length
  const overrideCount = state.interviewSchedulingPolicies.filter((item) => item.scope === 'JOB' && item.status === 'ACTIVE').length
  const summary = selectSchedulingPolicyResolutionSummary(state)
  const activeInterviewers = (interviewersData as Interviewer[]).filter((item) => item.isActive)

  return <PageContainer eyebrow="Scheduling settings" title="Interview scheduling defaults" description="Set organization-wide scheduling once, then customize only where teams need different interview rules." actions={<Link className={linkClass} to="/interviews">Back to interviews</Link>}>
    <Card className="mb-4 overflow-hidden"><div className="grid gap-px bg-harbor/10 md:grid-cols-3"><HierarchyStep label="Organization default" detail="Used across every job" active={Boolean(organization)} /><HierarchyStep label="Department template" detail={`${departmentCount} optional template${departmentCount === 1 ? '' : 's'}`} /><HierarchyStep label="Job override" detail={`${overrideCount} exceptional role${overrideCount === 1 ? '' : 's'}`} /></div></Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 md:p-6"><div className="flex items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Organization default</p><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">{organization?.displayName ?? 'Scheduling defaults are not configured'}</h2></div>{organization ? <Badge tone="success">Active · v{organization.version}</Badge> : <Badge tone="warning">Setup required</Badge>}</div>{organization ? <><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Used when a job has no department template or custom override.</p><p className="mb-0 mt-4 text-sm font-semibold text-depth">{formatDuration(organization.durationMinutes)} · {formatInterviewMode(organization.interviewMode)} · {organization.interviewerCount} interviewers · {organization.candidateSlotCount} candidate slots</p></> : <p className="mb-0 mt-2 text-sm text-aura-text-secondary">Set up one organization policy to automate interviews for all job openings.</p>}<Link className={`${organization ? linkClass : primaryLinkClass} mt-5`} to="/interviews/settings/organization">{organization ? 'View default' : 'Set up organization default'}<ArrowRight size={15} /></Link></Card>

      <Card className="p-5 md:p-6"><div className="flex items-start gap-3"><span className="inline-grid size-10 place-items-center rounded-aura-sm bg-glacier/15 text-marine"><Building2 size={18} /></span><div><h2 className="m-0 text-lg font-semibold text-depth">Department templates</h2><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Replace the organization default only for teams with different interview rules. Departments without a template inherit automatically.</p></div></div><Link className={`${linkClass} mt-5`} to="/interviews/settings/departments">Review department templates<ArrowRight size={15} /></Link></Card>

      <Card className="p-5 md:p-6"><div className="flex items-start gap-3"><span className="inline-grid size-10 place-items-center rounded-aura-sm bg-glacier/15 text-marine"><Users size={18} /></span><div><h2 className="m-0 text-lg font-semibold text-depth">Interviewer directory</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{activeInterviewers.length} active interviewers across {new Set(activeInterviewers.map((item) => item.department)).size} departments.</p></div></div></Card>

      <Card className="p-5 md:p-6"><div className="flex items-start gap-3"><span className="inline-grid size-10 place-items-center rounded-aura-sm bg-frost text-harbor"><Settings2 size={18} /></span><div><h2 className="m-0 text-lg font-semibold text-depth">Advanced job overrides</h2><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Use a custom setup only when a specific role cannot use its inherited scheduling defaults.</p><p className="mb-0 mt-3 text-xs font-semibold text-aura-text-muted">{summary.jobOverrides} jobs currently use an override.</p></div></div><Link className={`${linkClass} mt-5`} to="/interviews/policies">Review job overrides</Link></Card>
    </div>

    <Card className="mt-4 p-4"><p className="m-0 text-sm font-semibold text-depth">Automatic scheduling coverage</p><p className="mb-0 mt-1 text-xs text-aura-text-secondary">{state.jobs.length - summary.unresolvedJobs} of {state.jobs.length} jobs are covered. {summary.unresolvedJobs ? `${summary.unresolvedJobs} need scheduling defaults.` : 'All jobs inherit a valid scheduling setup.'}</p></Card>
  </PageContainer>
}

function HierarchyStep({ label, detail, active = true }: { label: string; detail: string; active?: boolean }) { return <div className="relative bg-white p-4 md:after:absolute md:after:-right-2 md:after:top-1/2 md:after:z-10 md:after:text-harbor/35 md:after:content-['→'] last:md:after:hidden"><p className="m-0 text-sm font-semibold text-depth">{label}</p><p className={`mb-0 mt-1 text-xs ${active ? 'text-aura-text-muted' : 'text-aura-warning'}`}>{detail}</p></div> }
