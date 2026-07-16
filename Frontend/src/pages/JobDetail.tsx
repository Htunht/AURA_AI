import { Archive, CheckCircle2, Circle, ExternalLink, FilePenLine, Pencil, Scale, Trash2, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteJobDialog } from '../components/jobs/DeleteJobDialog'
import { JobStatusDialog } from '../components/jobs/JobStatusDialog'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectApplicationFormsByJobId, selectJobById, selectJobReadiness, selectJobRelatedRecordCounts, selectPublishedApplicationFormByJobId, selectPublishedRubricByJobId } from '../store/demoSelectors'
import type { JobStatus } from '../types/job'
import { canDeleteJob, canOpenJob } from '../utils/jobValidation'

type DialogAction = 'OPEN' | 'CLOSE' | 'REOPEN' | 'ARCHIVE' | 'RESTORE'
const linkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/35 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:ring-2 focus-visible:ring-glacier'
const primaryLinkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-frost no-underline hover:bg-depth focus-visible:ring-2 focus-visible:ring-glacier'
const statusTone = (status: JobStatus) => status === 'OPEN' ? 'success' : status === 'DRAFT' ? 'warning' : status === 'CLOSED' ? 'danger' : 'neutral'
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'No deadline'
const formatEnum = (value: string) => value.replaceAll('_', ' ').toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())

export default function JobDetail() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const [dialogAction, setDialogAction] = useState<DialogAction>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const job = selectJobById(state, jobId)
  if (!job) return <PageContainer title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening does not exist.</Card></PageContainer>

  const readiness = selectJobReadiness(state, job.id)
  const counts = selectJobRelatedRecordCounts(state, job.id)
  const deletion = canDeleteJob(state, job.id)
  const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
  const forms = selectApplicationFormsByJobId(state, job.id)
  const rubric = selectPublishedRubricByJobId(state, job.id)
  const required = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED')
  const preferred = job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED')
  const lifecycleLabel = job.status === 'DRAFT' ? 'Open job' : job.status === 'OPEN' ? 'Close job' : job.status === 'CLOSED' ? 'Reopen job' : 'Restore to draft'
  const lifecycleAction: DialogAction = job.status === 'DRAFT' ? 'OPEN' : job.status === 'OPEN' ? 'CLOSE' : job.status === 'CLOSED' ? 'REOPEN' : 'RESTORE'
  const openingReadiness = canOpenJob(state, job.id, new Date().toISOString())
  const openingBlocked = (job.status === 'DRAFT' || job.status === 'CLOSED') && !openingReadiness.ready

  function changeStatus(status: JobStatus) {
    dispatch({ type: 'CHANGE_JOB_STATUS', payload: { jobId: job!.id, status, changedAt: new Date().toISOString() } })
    setDialogAction(undefined)
  }
  function removeJob() {
    dispatch({ type: 'DELETE_JOB', payload: { jobId: job!.id } })
    navigate('/jobs')
  }

  return <PageContainer title={job.title} description={`${job.department} · ${job.positionsCount} position${job.positionsCount === 1 ? '' : 's'} · ${formatEnum(job.employmentType)}`} actions={<><Link className={linkClass} to={`/jobs/${job.id}/edit`}><Pencil size={16} />Edit job</Link>{job.status === 'OPEN' ? <Link className={primaryLinkClass} to={`/apply/${job.id}`}><ExternalLink size={16} />Public application</Link> : null}<Link className={linkClass} to={`/jobs/${job.id}/candidates`}><Users size={16} />{counts.applications ? 'View candidates' : 'Candidates'}</Link></>}>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Job overview</p><h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Role details</h2></div><Badge tone={statusTone(job.status)}>{job.status}</Badge></div><p className="mb-0 mt-5 whitespace-pre-line text-sm leading-6 text-aura-text-secondary">{job.description}</p><dl className="mt-5 grid gap-3 border-t border-harbor/10 pt-4 sm:grid-cols-2"><div><dt className="text-xs text-aura-text-muted">Work arrangement</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatEnum(job.workArrangement)}{job.location ? ` · ${job.location}` : ''}</dd></div><div><dt className="text-xs text-aura-text-muted">Minimum experience</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{job.minimumExperienceYears} years</dd></div><div><dt className="text-xs text-aura-text-muted">Application deadline</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDate(job.applicationDeadline)}</dd></div><div><dt className="text-xs text-aura-text-muted">Last updated</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(job.updatedAt))}</dd></div></dl></Card>
      <Card className="overflow-hidden"><div className="bg-depth p-5 text-frost"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-glacier">Opening readiness</p><h2 className="mb-0 mt-2 text-xl font-semibold text-white">{readiness.ready ? job.status === 'OPEN' ? 'Open for applications' : 'Ready to open' : 'Setup needs attention'}</h2></div><div className="grid gap-0 divide-y divide-harbor/10 p-5">{[
        ['Job details', readiness.status !== 'JOB_DETAILS_INCOMPLETE', `/jobs/${job.id}/edit`, 'Complete job details'],
        ['Application form', Boolean(publishedForm), `/jobs/${job.id}/application-form`, 'Publish application form'],
        ['Screening rubric', Boolean(rubric), `/jobs/${job.id}/screening-rubric`, 'Publish screening rubric'],
      ].map(([label, complete, to, action]) => <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={String(label)}>{complete ? <CheckCircle2 className="text-aura-success" size={18} /> : <Circle className="text-aura-warning" size={18} />}<span className="text-sm font-semibold text-depth">{label}</span>{!complete ? <Link className="ml-auto text-xs font-semibold text-harbor no-underline hover:text-depth" to={String(to)}>{action}</Link> : <span className="ml-auto text-xs font-semibold text-aura-success">Complete</span>}</div>)}</div>{openingReadiness.issues.length ? <div className="border-t border-harbor/10 bg-aura-warning-soft px-5 py-3"><ul className="m-0 grid gap-1 pl-4 text-xs text-aura-warning">{openingReadiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}</Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Role requirements</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Required skills</p><ul className="mt-3 flex flex-wrap gap-2 p-0">{required.map((skill) => <li key={skill.name}><Badge tone="accent">{skill.name}</Badge></li>)}</ul></div><div><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Preferred skills</p>{preferred.length ? <ul className="mt-3 flex flex-wrap gap-2 p-0">{preferred.map((skill) => <li key={skill.name}><Badge>{skill.name}</Badge></li>)}</ul> : <p className="mb-0 mt-3 text-sm text-aura-text-muted">No preferred skills specified.</p>}</div></div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Hiring activity</h2><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2"><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Applications</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.applications}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Evaluations</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.evaluations}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Interviews</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.interviews}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Decisions</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.decisions}</dd></div></dl></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Application workflow</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{publishedForm ? `${publishedForm.name} · Version ${publishedForm.version} · ${publishedForm.fields.length} fields` : forms.length ? 'A draft form exists but is not published.' : 'No application form has been configured.'}</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}/application-form`}><FilePenLine size={16} />Manage application form</Link></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Screening setup</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{rubric ? `${rubric.name} · Published version ${rubric.version}` : 'No screening rubric is published for this role.'}</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}/screening-rubric`}><Scale size={16} />Configure screening rubric</Link></Card>
      <Card className="p-5 md:p-6 xl:col-span-2"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="m-0 text-lg font-semibold text-depth">Job lifecycle</h2><p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-aura-text-secondary">Lifecycle changes never remove candidates, interviews, or hiring history. Archive completed work when it should leave active recruitment views.</p>{openingBlocked ? <p className="mb-0 mt-3 text-xs font-semibold text-aura-warning">Complete the readiness items above before {job.status === 'CLOSED' ? 'reopening' : 'opening'} this job.</p> : null}{!deletion.allowed && job.status !== 'OPEN' ? <p className="mb-0 mt-3 text-xs text-aura-text-muted">This job cannot be deleted because it has related records. Archive it instead to preserve hiring history.</p> : null}</div><div className="flex flex-wrap gap-2"><Button disabled={openingBlocked} onClick={() => setDialogAction(lifecycleAction)}>{job.status === 'OPEN' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}{lifecycleLabel}</Button>{job.status === 'DRAFT' || job.status === 'CLOSED' ? <Button variant="secondary" onClick={() => setDialogAction('ARCHIVE')}><Archive size={16} />Archive</Button> : null}{deletion.allowed ? <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />Delete</Button> : null}</div></div></Card>
    </div>
    {dialogAction ? <JobStatusDialog action={dialogAction} open onClose={() => setDialogAction(undefined)} onConfirm={changeStatus} /> : null}<DeleteJobDialog open={deleteOpen} jobTitle={job.title} onClose={() => setDeleteOpen(false)} onConfirm={removeJob} />
  </PageContainer>
}
