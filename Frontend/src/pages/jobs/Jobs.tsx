import { BriefcaseBusiness, ChevronDown, CircleCheckBig, CircleX, Eye, Flame, Pencil, Plus, Search, Settings2, Users } from 'lucide-react'
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
import type { HiringWorkflowSetupProgress, HiringWorkflowSetupStep } from '../../types/hiringWorkflowSetup'

type StatusFilter = Exclude<JobStatus, 'ARCHIVED'> | 'ALL'
type EmploymentFilter = EmploymentType | 'ALL'
const selectClass = 'h-10 w-full appearance-none rounded-aura-sm border border-harbor/20 bg-white px-3 pr-10 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const createClass = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-aura-sm border border-glacier bg-glacier px-4 text-sm font-bold text-depth no-underline transition-colors hover:border-[#B5EC28] hover:bg-[#B5EC28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier/50'
const iconActionClass = 'inline-grid size-8 place-items-center rounded-aura-sm border border-harbor/15 bg-white text-harbor no-underline transition-colors hover:border-marine/30 hover:bg-glacier/15 hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'
const typeLabels: Record<EmploymentType, string> = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }
const setupStages: HiringWorkflowSetupStep[] = ['REQUIREMENTS', 'APPLICATION_FORM', 'SCREENING_RULES', 'REVIEW']

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
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [department, setDepartment] = useState('ALL')
  const [employmentType, setEmploymentType] = useState<EmploymentFilter>('ALL')
  const departments = useMemo(() => Array.from(new Set(state.jobs.map((job) => job.department))).sort(), [state.jobs])
  const activeJobs = useMemo(() => state.jobs.filter((job) => job.status !== 'ARCHIVED'), [state.jobs])
  const jobSummary = useMemo(() => {
    const popular = activeJobs.reduce<{ title: string; applicants: number } | undefined>((leader, job) => {
      const applicants = selectApplicationCountByJobId(state, job.id)
      return !leader || applicants > leader.applicants ? { title: job.title, applicants } : leader
    }, undefined)

    return {
      popular,
      open: activeJobs.filter((job) => job.status === 'OPEN').length,
      closed: activeJobs.filter((job) => job.status === 'CLOSED').length,
      total: activeJobs.length,
    }
  }, [activeJobs, state])
  const jobs = state.jobs.filter((job) => {
    const source = `${job.title} ${job.department} ${job.description} ${job.requiredSkills.map((skill) => skill.name).join(' ')}`.toLocaleLowerCase()
    return source.includes(search.trim().toLocaleLowerCase()) &&
      job.status !== 'ARCHIVED' &&
      (status === 'ALL' || job.status === status) &&
      (department === 'ALL' || job.department === department) &&
      (employmentType === 'ALL' || job.employmentType === employmentType)
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  return <PageContainer title="Jobs" hideHeader>
    <div className="mx-auto max-w-[1240px]">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.025em] text-depth sm:text-[26px] md:text-[30px]">Job Posting Management</h1>
        <Link aria-label="Create new posting" className={createClass} to="/jobs/new">
          <Plus size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Create new posting</span>
        </Link>
      </header>

      <section aria-label="Job posting summary" className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <JobKpiCard
          detail={jobSummary.popular?.title ?? 'No job postings yet'}
          icon={<Flame size={18} aria-hidden="true" />}
          label="Popular job"
          value={String(jobSummary.popular?.applicants ?? 0)}
        />
        <JobKpiCard
          detail="Accepting applications"
          icon={<CircleCheckBig size={18} aria-hidden="true" />}
          label="Open"
          value={String(jobSummary.open)}
        />
        <JobKpiCard
          detail="No longer accepting"
          icon={<CircleX size={18} aria-hidden="true" />}
          label="Closed"
          value={String(jobSummary.closed)}
        />
        <JobKpiCard
          detail="Active workspace records"
          icon={<BriefcaseBusiness size={18} aria-hidden="true" />}
          label="All postings"
          value={String(jobSummary.total)}
        />
      </section>

      <div className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_150px_150px_180px]">
        <label className="relative block">
          <span className="sr-only">Search jobs</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} aria-hidden="true" />
          <Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for roles" />
        </label>
        <label className="relative block">
          <span className="sr-only">Employment type</span>
          <select className={selectClass} value={employmentType} onChange={(event) => setEmploymentType(event.target.value as EmploymentFilter)}>
            <option value="ALL">By type</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={16} aria-hidden="true" />
        </label>
        <label className="relative block">
          <span className="sr-only">Status</span>
          <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="ALL">By status</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={16} aria-hidden="true" />
        </label>
        <label className="relative block">
          <span className="sr-only">Department</span>
          <select className={selectClass} value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="ALL">By department</option>
            {departments.map((value) => <option key={value}>{value}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={16} aria-hidden="true" />
        </label>
      </div>

      {jobs.length ? (
        <div className="overflow-hidden rounded-aura-sm border border-glacier/35 bg-white shadow-aura-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
              <thead className="border-b border-glacier/40 bg-glacier/15">
                <tr className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#52633A]">
                  <th className="w-[4%] px-3 py-3.5 text-center" scope="col">No.</th>
                  <th className="w-[29%] px-3 py-3.5" scope="col">Role</th>
                  <th className="w-[9%] px-3 py-3.5" scope="col">Type</th>
                  <th className="w-[7%] px-3 py-3.5 text-center" scope="col">Positions</th>
                  <th className="w-[8%] px-3 py-3.5 text-center" scope="col">Applicants</th>
                  <th className="w-[11%] px-3 py-3.5" scope="col">Deadline</th>
                  <th className="w-[9%] px-3 py-3.5 text-center" scope="col">Status</th>
                  <th className="w-[12%] px-3 py-3.5 text-center" scope="col">Stages</th>
                  <th className="w-[11%] px-3 py-3.5 pr-4 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harbor/10">
                {jobs.map((job, index) => {
                  const count = selectApplicationCountByJobId(state, job.id)
                  const workflowProgress = selectHiringWorkflowSetupProgress(state, job.id)
                  const workflowAction = getHiringWorkflowPrimaryAction(workflowProgress)

                  return (
                    <tr className="transition-colors hover:bg-frost/45" key={job.id}>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold tabular-nums text-aura-text-muted">{String(index + 1).padStart(2, '0')}</td>
                      <td className="px-3 py-2.5">
                        <Link className="block truncate text-sm font-semibold text-depth no-underline hover:text-marine" title={job.title} to={`/jobs/${job.id}`}>{job.title}</Link>
                      </td>
                      <td className="px-3 py-2.5"><span className="inline-flex rounded-aura-sm bg-harbor/[0.07] px-2 py-1 text-[11px] font-semibold text-harbor">{typeLabels[job.employmentType]}</span></td>
                      <td className="px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-depth">{job.positionsCount}</td>
                      <td className="px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-depth">{count}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-aura-text-secondary">{formatDate(job.applicationDeadline)}</td>
                      <td className="px-3 py-2.5 text-center"><Badge tone={statusTone(job.status)}>{job.status}</Badge></td>
                      <td className="px-3 py-2.5 text-center"><SetupStageStatus progress={workflowProgress} /></td>
                      <td className="px-3 py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link aria-label={`View ${job.title}`} className={iconActionClass} title="View posting" to={`/jobs/${job.id}`}><Eye size={15} aria-hidden="true" /></Link>
                          <Link aria-label={`Edit ${job.title}`} className={iconActionClass} title="Edit posting" to={`/jobs/${job.id}/edit`}><Pencil size={15} aria-hidden="true" /></Link>
                          <Link
                            aria-label={workflowProgress.status === 'PUBLISHED' ? `View applicants for ${job.title}` : `Continue setup for ${job.title}`}
                            className={iconActionClass}
                            title={workflowProgress.status === 'PUBLISHED' ? 'View applicants' : 'Continue setup'}
                            to={workflowProgress.status === 'PUBLISHED' ? `/jobs/${job.id}/candidates` : `/jobs/${job.id}/setup?step=${workflowAction.step}`}
                          >
                            {workflowProgress.status === 'PUBLISHED' ? <Users size={15} aria-hidden="true" /> : <Settings2 size={15} aria-hidden="true" />}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="m-0 border-b border-harbor/10 py-5 text-sm text-aura-text-muted">No jobs match these filters.</p>
      )}
    </div>
  </PageContainer>
}

function JobKpiCard({ detail, icon, label, value }: { detail: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="group h-full cursor-default overflow-hidden p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
      <article>
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <p className="m-0 text-sm font-semibold text-aura-text-secondary">{label}</p>
          <span className="inline-grid size-9 shrink-0 place-items-center rounded-aura-sm bg-glacier/15 text-marine transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        </div>
        <p className="m-0 text-4xl font-bold tracking-[-0.04em] text-depth">{value}</p>
        <p className="mb-0 mt-2.5 truncate text-xs leading-5 text-aura-text-muted" title={detail}>{detail}</p>
      </article>
    </Card>
  )
}

function SetupStageStatus({ progress }: { progress: HiringWorkflowSetupProgress }) {
  const currentStage = progress.status === 'PUBLISHED'
    ? setupStages.length
    : Math.max(1, setupStages.indexOf(progress.currentStep) + 1)

  return (
    <span
      aria-label={`Hiring setup stage ${currentStage} of ${setupStages.length}`}
      className="inline-flex min-w-16 items-center justify-center rounded-full border border-glacier/40 bg-glacier/15 px-2.5 py-1 text-xs font-extrabold tabular-nums text-[#52633A]"
    >
      {currentStage}<span className="mx-1 font-semibold text-[#718052]">of</span>{setupStages.length}
    </span>
  )
}
