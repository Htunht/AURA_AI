import { Archive, CheckCircle2, Circle, ExternalLink, FilePenLine, Pencil, Scale, Share2, Trash2, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteJobDialog } from '../../components/jobs/DeleteJobDialog'
import { JobStatusDialog } from '../../components/jobs/JobStatusDialog'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectApplicationFormsByJobId, selectHiringWorkflowSetupProgress, selectJobById, selectJobReadiness, selectJobRelatedRecordCounts, selectPublishedApplicationFormByJobId, selectPublishedRubricByJobId, selectResolvedInterviewSchedulingPolicy } from '../../store/demoSelectors'
import { getHiringWorkflowPrimaryAction } from '../../utils/hiringWorkflowSetup'
import type { JobStatus } from '../../types/job'
import { canDeleteJob, canOpenJob } from '../../utils/jobValidation'
import { SchedulingPolicySource } from '../../components/interviews/SchedulingPolicySource'
import { ShareJobDialog } from '../../components/jobs/ShareJobDialog'
import { buildPublicApplicationUrl } from '../../utils/jobSharing'

type DialogAction = 'OPEN' | 'CLOSE' | 'REOPEN' | 'ARCHIVE' | 'RESTORE'

const actionLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

const linkClass = actionLinkClass

const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

const statusTone = (status: JobStatus) => status === 'OPEN' ? 'success' : status === 'DRAFT' ? 'warning' : status === 'CLOSED' ? 'danger' : 'neutral'

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'No deadline'

const formatEnum = (value: string) => value.replaceAll('_', ' ').toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())

export default function JobDetail() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const [dialogAction, setDialogAction] = useState<DialogAction>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const job = selectJobById(state, jobId)
  if (!job) return <PageContainer title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening does not exist.</Card></PageContainer>

  const readiness = selectJobReadiness(state, job.id)
  const counts = selectJobRelatedRecordCounts(state, job.id)
  const deletion = canDeleteJob(state, job.id)
  const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
  const forms = selectApplicationFormsByJobId(state, job.id)
  const rubric = selectPublishedRubricByJobId(state, job.id)
  const workflowProgress = selectHiringWorkflowSetupProgress(state, job.id)
  const workflowAction = getHiringWorkflowPrimaryAction(workflowProgress)
  const scheduling = selectResolvedInterviewSchedulingPolicy(state, job.id)
  const required = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED')
  const preferred = job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED')
  const lifecycleLabel = job.status === 'DRAFT' ? 'Open job' : job.status === 'OPEN' ? 'Close job' : job.status === 'CLOSED' ? 'Reopen job' : 'Restore to draft'
  const lifecycleAction: DialogAction = job.status === 'DRAFT' ? 'OPEN' : job.status === 'OPEN' ? 'CLOSE' : job.status === 'CLOSED' ? 'REOPEN' : 'RESTORE'
  const openingReadiness = canOpenJob(state, job.id, new Date().toISOString())
  const openingBlocked = (job.status === 'DRAFT' || job.status === 'CLOSED') && !openingReadiness.ready
  const applicationUrl = buildPublicApplicationUrl(job.id, window.location.origin)

  function changeStatus(status: JobStatus) {
    dispatch({ type: 'CHANGE_JOB_STATUS', payload: { jobId: job!.id, status, changedAt: new Date().toISOString() } })
    setDialogAction(undefined)
  }
  function removeJob() {
    dispatch({ type: 'DELETE_JOB', payload: { jobId: job!.id } })
    navigate('/jobs')
  }

  return <PageContainer title={job.title} description={`${job.department} · ${job.positionsCount} position${job.positionsCount === 1 ? '' : 's'} · ${formatEnum(job.employmentType)}`} actions={<>{workflowProgress.status !== 'PUBLISHED' ? <Link className={primaryLinkClass} to={`/jobs/${job.id}/setup?step=${workflowAction.step}`}>{workflowAction.label}</Link> : null}<Link className={linkClass} to={`/jobs/${job.id}/edit`}><Pencil size={16} />Edit job</Link>{job.status === 'OPEN' && workflowProgress.status === 'PUBLISHED' ? <><button className={linkClass} type="button" onClick={() => setShareOpen(true)}><Share2 size={16} />Share job</button><Link className={linkClass} to={`/apply/${job.id}`}><ExternalLink size={16} />Public application</Link></> : null}<Link className={workflowProgress.status === 'PUBLISHED' ? primaryLinkClass : linkClass} to={`/jobs/${job.id}/candidates`}><Users size={16} />{counts.applications ? 'View candidates' : 'Candidates'}</Link></>}>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Job overview</p><h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Role details</h2></div><Badge tone={statusTone(job.status)}>{job.status}</Badge></div><p className="mb-0 mt-5 whitespace-pre-line text-sm leading-6 text-aura-text-secondary">{job.description}</p><dl className="mt-5 grid gap-3 border-t border-harbor/10 pt-4 sm:grid-cols-2"><div><dt className="text-xs text-aura-text-muted">Work arrangement</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatEnum(job.workArrangement)}{job.location ? ` · ${job.location}` : ''}</dd></div><div><dt className="text-xs text-aura-text-muted">Minimum experience</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{job.minimumExperienceYears} years</dd></div><div><dt className="text-xs text-aura-text-muted">Application deadline</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDate(job.applicationDeadline)}</dd></div><div><dt className="text-xs text-aura-text-muted">Last updated</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(job.updatedAt))}</dd></div></dl></Card>
      <Card className="overflow-hidden"><div className="bg-depth p-5 text-frost"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-glacier">Hiring workflow setup</p><h2 className="mb-0 mt-2 text-xl font-semibold text-white">{workflowProgress.status === 'PUBLISHED' ? 'Hiring workflow published' : 'Continue the evidence workflow'}</h2><p className="mb-0 mt-2 text-xs text-frost/65">{workflowProgress.status === 'PUBLISHED' ? 'Automatic screening ready' : `Current step: ${workflowProgress.currentStep.replaceAll('_', ' ').toLocaleLowerCase()}`}</p></div><div className="grid gap-0 divide-y divide-harbor/10 p-5">{[
        ['Job requirements', readiness.status !== 'JOB_DETAILS_INCOMPLETE', `/jobs/${job.id}/setup?step=requirements`, 'Complete requirements'],
        ['Application form', Boolean(publishedForm), `/jobs/${job.id}/setup?step=form`, 'Continue application form'],
        ['Screening rules', Boolean(rubric), `/jobs/${job.id}/setup?step=screening`, 'Review screening rules'],
      ].map(([label, complete, to, action]) => <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={String(label)}>{complete ? <CheckCircle2 className="text-aura-success" size={18} /> : <Circle className="text-aura-warning" size={18} />}<span className="text-sm font-semibold text-depth">{label}</span>{!complete ? <Link className="ml-auto text-xs font-semibold text-harbor no-underline hover:text-depth" to={String(to)}>{action}</Link> : <span className="ml-auto text-xs font-semibold text-aura-success">Complete</span>}</div>)}</div>{openingReadiness.issues.length ? <div className="border-t border-harbor/10 bg-aura-warning-soft px-5 py-3"><ul className="m-0 grid gap-1 pl-4 text-xs text-aura-warning">{openingReadiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}</Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Role requirements</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Required skills</p><ul className="mt-3 flex flex-wrap gap-2 p-0">{required.map((skill) => <li key={skill.name}><Badge tone="accent">{skill.name}</Badge></li>)}</ul></div><div><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Preferred skills</p>{preferred.length ? <ul className="mt-3 flex flex-wrap gap-2 p-0">{preferred.map((skill) => <li key={skill.name}><Badge>{skill.name}</Badge></li>)}</ul> : <p className="mb-0 mt-3 text-sm text-aura-text-muted">No preferred skills specified.</p>}</div></div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Hiring activity</h2><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2"><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Applications</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.applications}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Evaluations</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.evaluations}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Interviews</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.interviews}</dd></div><div className="rounded-aura-sm bg-frost p-3"><dt className="text-[10px] uppercase tracking-wide text-aura-text-muted">Decisions</dt><dd className="mb-0 mt-1 text-xl font-bold text-depth">{counts.decisions}</dd></div></dl></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Application form</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{publishedForm ? `${publishedForm.name} · Version ${publishedForm.version} · ${publishedForm.fields.length} questions` : forms.length ? 'A draft application form is in progress.' : 'Candidate evidence questions have not been prepared.'}</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}/setup?step=form`}><FilePenLine size={16} />{publishedForm ? 'Review application form' : 'Continue application form'}</Link></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Screening rules</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{rubric ? `${rubric.name} · Published version ${rubric.version}` : 'Screening rules need to be reviewed against the application evidence.'}</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}/setup?step=screening`}><Scale size={16} />Review screening rules</Link></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview scheduling</h2><div className="mt-3"><SchedulingPolicySource resolved={scheduling} /></div>{scheduling ? <p className="mb-0 mt-3 text-sm text-aura-text-secondary">{scheduling.policy.durationMinutes}-minute {formatEnum(scheduling.policy.interviewMode)} interview · {scheduling.policy.interviewerCount} interviewers · {scheduling.policy.candidateSlotCount} candidate time slots</p> : null}<div className="mt-4 flex flex-wrap gap-3"><Link className="text-sm font-semibold text-harbor no-underline" to={scheduling?.source === 'JOB_OVERRIDE' ? `/interviews/policies/${job.id}` : scheduling?.source === 'DEPARTMENT_TEMPLATE' ? `/interviews/settings/departments/${encodeURIComponent(job.department)}` : '/interviews/settings/organization'}>{scheduling ? 'View inherited settings' : 'Set up organization default'}</Link>{scheduling?.source !== 'JOB_OVERRIDE' ? <Link className="text-sm font-semibold text-marine no-underline" to={`/interviews/policies/${job.id}`}>Customize for this job</Link> : null}</div></Card>
      <Card className="p-5 md:p-6 xl:col-span-2"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="m-0 text-lg font-semibold text-depth">Job lifecycle</h2><p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-aura-text-secondary">Lifecycle changes never remove candidates, interviews, or hiring history. Archive completed work when it should leave active recruitment views.</p>{openingBlocked ? <p className="mb-0 mt-3 text-xs font-semibold text-aura-warning">Complete the readiness items above before {job.status === 'CLOSED' ? 'reopening' : 'opening'} this job.</p> : null}{!deletion.allowed && job.status !== 'OPEN' ? <p className="mb-0 mt-3 text-xs text-aura-text-muted">This job cannot be deleted because it has related records. Archive it instead to preserve hiring history.</p> : null}</div><div className="flex flex-wrap gap-2"><Button disabled={openingBlocked} onClick={() => setDialogAction(lifecycleAction)}>{job.status === 'OPEN' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}{lifecycleLabel}</Button>{job.status === 'DRAFT' || job.status === 'CLOSED' ? <Button variant="secondary" onClick={() => setDialogAction('ARCHIVE')}><Archive size={16} />Archive</Button> : null}{deletion.allowed ? <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />Delete</Button> : null}</div></div></Card>
    </div>
    {dialogAction ? <JobStatusDialog action={dialogAction} open onClose={() => setDialogAction(undefined)} onConfirm={changeStatus} /> : null}<DeleteJobDialog open={deleteOpen} jobTitle={job.title} onClose={() => setDeleteOpen(false)} onConfirm={removeJob} /><ShareJobDialog open={shareOpen} job={job} applicationUrl={applicationUrl} onClose={() => setShareOpen(false)} />
  </PageContainer>
}
