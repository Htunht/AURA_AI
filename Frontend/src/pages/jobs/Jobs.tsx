import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectApplicationCountByJobId, selectHiringWorkflowSetupProgress } from '../../store/demoSelectors'
import { getHiringWorkflowPrimaryAction } from '../../utils/hiringWorkflowSetup'
import type { EmploymentType, JobStatus } from '../../types/job'

type StatusFilter = JobStatus | 'CURRENT' | 'ALL'
type EmploymentFilter = EmploymentType | 'ALL'
const selectClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const createClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-3.5 text-sm font-semibold text-[#1E2022] no-underline transition-all shadow-[0_0_10px_rgba(199,255,56,0.45)] hover:bg-[#a6db2c] hover:border-[#a6db2c] hover:shadow-[0_0_16px_rgba(199,255,56,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FF38]'
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

  return <PageContainer title="Jobs" hideHeader>
    <div className="mx-auto max-w-[1240px]">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-depth md:text-[32px]">Jobs</h1>
        <Link className={createClass} to="/jobs/new"><Plus size={15} aria-hidden="true" />New job</Link>
      </header>

      <div className="mb-5 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_190px_190px]"><label className="relative block"><span className="sr-only">Search jobs</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} aria-hidden="true" /><Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs" /></label><label><span className="sr-only">Status</span><select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="CURRENT">Current jobs</option><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="ARCHIVED">Archived</option></select></label><label><span className="sr-only">Department</span><select className={selectClass} value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="sr-only">Employment type</span><select className={selectClass} value={employmentType} onChange={(event) => setEmploymentType(event.target.value as EmploymentFilter)}><option value="ALL">All employment types</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>

      {jobs.length ? <div className="grid gap-3">{jobs.map((job) => {
      const count = selectApplicationCountByJobId(state, job.id)
      const workflowProgress = selectHiringWorkflowSetupProgress(state, job.id)
      const workflowAction = getHiringWorkflowPrimaryAction(workflowProgress)
      const stepNumber = ['REQUIREMENTS', 'APPLICATION_FORM', 'SCREENING_RULES', 'REVIEW'].indexOf(workflowProgress.currentStep) + 1
      const setupLabel = workflowProgress.status === 'PUBLISHED' ? 'Ready' : `Step ${stepNumber} of 4`
      const actionLabel = workflowProgress.status === 'PUBLISHED' ? 'Candidates' : 'Continue setup'
      return <Card className="rounded-aura-md p-5 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-aura-sm hover:border-[#C7FF38] active:scale-[0.995] animate-fade-in" key={job.id}><article><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="m-0 text-base font-semibold text-depth"><Link className="text-inherit no-underline hover:text-marine" to={`/jobs/${job.id}`}>{job.title}</Link></h2><p className="mb-0 mt-1 text-xs text-aura-text-muted">{job.department} · {typeLabels[job.employmentType]}</p></div><Badge tone={statusTone(job.status)}>{job.status}</Badge></div><dl className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm"><InlineJobFact label="Positions" value={`${job.positionsCount} position${job.positionsCount === 1 ? '' : 's'}`} /><InlineJobFact label="Applicants" value={`${count} applicant${count === 1 ? '' : 's'}`} /><InlineJobFact label="Deadline" value={`Deadline ${formatDate(job.applicationDeadline)}`} /><InlineJobFact label="Setup" value={`Setup ${setupLabel.toLocaleLowerCase()}`} emphasized={workflowProgress.status === 'PUBLISHED'} /></dl><footer className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link className="text-xs font-semibold text-aura-text-muted no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/jobs/${job.id}`}>View details</Link><Link className="inline-flex h-8 items-center justify-center rounded-aura-sm px-2.5 text-sm font-semibold text-harbor no-underline hover:bg-glacier/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={workflowProgress.status === 'PUBLISHED' ? `/jobs/${job.id}/candidates` : `/jobs/${job.id}/setup?step=${workflowAction.step}`}>{actionLabel}</Link></footer></article></Card>
      })}</div> : <p className="m-0 border-b border-harbor/10 py-5 text-sm text-aura-text-muted">No jobs match these filters.</p>}
    </div>
  </PageContainer>
}

function InlineJobFact({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div><dt className="sr-only">{label}</dt><dd className={`m-0 font-medium ${emphasized ? 'text-aura-success' : 'text-aura-text-secondary'}`}>{value}</dd></div>
}
