import { ArrowRight, BriefcaseBusiness, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectApplicationCountByJobId, selectHiringWorkflowSetupProgress, selectPublishedApplicationFormByJobId, selectPublishedRubricByJobId } from '../../store/demoSelectors'
import { getHiringWorkflowPrimaryAction } from '../../utils/hiringWorkflowSetup'
import type { EmploymentType, JobStatus } from '../../types/job'

type StatusFilter = JobStatus | 'CURRENT' | 'ALL'
type EmploymentFilter = EmploymentType | 'ALL'
const selectClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const createClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-frost no-underline hover:bg-depth focus-visible:ring-2 focus-visible:ring-glacier'
const typeLabels: Record<EmploymentType, string> = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }

function statusTone(status: JobStatus) {
  if (status === 'OPEN') return 'success'
  if (status === 'DRAFT') return 'warning'
  if (status === 'CLOSED') return 'danger'
  return 'neutral'
}
function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'No deadline'
}

export default function Jobs() {
  const { state } = useDemoStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('CURRENT')
  const [department, setDepartment] = useState('ALL')
  const [employmentType, setEmploymentType] = useState<EmploymentFilter>('ALL')
  const departments = useMemo(() => Array.from(new Set(state.jobs.map((job) => job.department))).sort(), [state.jobs])
  const jobs = state.jobs.filter((job) => {
    const source = `${job.title} ${job.department} ${job.description} ${job.requiredSkills.map((skill) => skill.name).join(' ')}`.toLocaleLowerCase()
    return source.includes(search.trim().toLocaleLowerCase()) &&
      (status === 'ALL' || (status === 'CURRENT' ? job.status !== 'ARCHIVED' : job.status === status)) &&
      (department === 'ALL' || job.department === department) &&
      (employmentType === 'ALL' || job.employmentType === employmentType)
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  return <PageContainer title="Job openings" description="Create roles, track setup readiness, and manage each hiring lifecycle." actions={<Link className={createClass} to="/jobs/new"><Plus size={16} />Create hiring workflow</Link>}>
    <Card className="mb-4 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px_180px]"><label className="relative block"><span className="sr-only">Search jobs</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} /><Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, department, or skill" /></label><label><span className="sr-only">Status</span><select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="CURRENT">Current jobs</option><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="ARCHIVED">Archived</option></select></label><label><span className="sr-only">Department</span><select className={selectClass} value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="sr-only">Employment type</span><select className={selectClass} value={employmentType} onChange={(event) => setEmploymentType(event.target.value as EmploymentFilter)}><option value="ALL">All employment types</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><p className="mb-0 mt-3 text-xs font-medium text-aura-text-muted">Showing {jobs.length} of {state.jobs.length} jobs</p></Card>
    {jobs.length ? <div className="grid gap-4 grid-cols-1">{jobs.map((job) => {
      const form = selectPublishedApplicationFormByJobId(state, job.id)
      const rubric = selectPublishedRubricByJobId(state, job.id)
      const count = selectApplicationCountByJobId(state, job.id)
      const workflowProgress = selectHiringWorkflowSetupProgress(state, job.id)
      const workflowAction = getHiringWorkflowPrimaryAction(workflowProgress)
      const stepNumber = ['REQUIREMENTS', 'APPLICATION_FORM', 'SCREENING_RULES', 'REVIEW'].indexOf(workflowProgress.currentStep) + 1
      return <Card className="group flex flex-col gap-4 p-5 transition-colors hover:border-marine/35 md:p-6" key={job.id}><div className="flex items-start justify-between gap-4"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">{job.department} · {typeLabels[job.employmentType]}</p><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">{job.title}</h2></div><Badge tone={statusTone(job.status)}>{job.status}</Badge></div><p className="m-0 line-clamp-2 text-sm leading-6 text-aura-text-secondary">{job.description}</p><div className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-3"><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Hiring workflow</p><p className={`mb-0 mt-1 text-sm font-semibold ${workflowProgress.status === 'PUBLISHED' ? 'text-aura-success' : 'text-harbor'}`}>{workflowProgress.status === 'PUBLISHED' ? 'Published · Automatic screening ready' : `Step ${stepNumber} of 4 · ${workflowProgress.currentStep.replaceAll('_', ' ').toLocaleLowerCase()}`}</p></div><dl className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Positions</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{job.positionsCount}</dd></div><div><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Deadline</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDate(job.applicationDeadline)}</dd></div><div><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Applications</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{count}</dd></div><div><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Evidence setup</dt><dd className="mb-0 mt-1 text-xs font-semibold text-depth">Form {form ? 'published' : 'in progress'}<br />Rules {rubric ? 'published' : 'in progress'}</dd></div></dl><div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-harbor/10 pt-4"><Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-aura-text-muted no-underline hover:text-depth" to={`/jobs/${job.id}`}><ArrowRight size={15} />View details</Link><Link className="inline-flex h-10 items-center justify-center rounded-aura-sm bg-harbor px-4 text-sm font-semibold text-frost no-underline" to={workflowProgress.status === 'PUBLISHED' ? `/jobs/${job.id}/candidates` : `/jobs/${job.id}/setup?step=${workflowAction.step}`}>{workflowAction.label}</Link></div></Card>
    })}</div> : <Card className="p-10 text-center"><BriefcaseBusiness className="mx-auto text-aura-text-muted" size={32} /><h2 className="mb-0 mt-4 text-lg font-semibold text-depth">No jobs match these filters</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Adjust the filters or create a new draft job.</p></Card>}
  </PageContainer>
}
