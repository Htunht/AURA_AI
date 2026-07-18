import { CheckCircle2, Circle, ExternalLink, Pencil, Share2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { JobStatusDialog } from '../../components/jobs/JobStatusDialog'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectHiringWorkflowSetupProgress, selectJobById, selectJobReadiness, selectPublishedApplicationFormByJobId, selectPublishedRubricByJobId, selectResolvedInterviewSchedulingPolicy } from '../../store/demoSelectors'
import { getHiringWorkflowPrimaryAction } from '../../utils/hiringWorkflowSetup'
import type { JobStatus } from '../../types/job'
import { canOpenJob } from '../../utils/jobValidation'
import { SchedulingPolicySource } from '../../components/interviews/SchedulingPolicySource'
import { ShareJobDialog } from '../../components/jobs/ShareJobDialog'
import { buildPublicApplicationUrl } from '../../utils/jobSharing'

type DialogAction = 'OPEN' | 'CLOSE' | 'REOPEN' | 'RESTORE'

const actionLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

const linkClass = actionLinkClass

const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

const editLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-glacier/55 bg-transparent px-4 text-sm font-semibold text-[#8AC600] no-underline transition-all shadow-[0_0_8px_rgba(184,255,31,0.18)] hover:bg-glacier/10 hover:text-[#72A800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

const statusTone = (status: JobStatus) => status === 'OPEN' ? 'success' : status === 'DRAFT' ? 'warning' : status === 'CLOSED' ? 'danger' : 'neutral'

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'No deadline'

const formatEnum = (value: string) => value.replaceAll('_', ' ').toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())

export default function JobDetail() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const [dialogAction, setDialogAction] = useState<DialogAction>()
  const [shareOpen, setShareOpen] = useState(false)
  const job = selectJobById(state, jobId)
  if (!job) return <PageContainer title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening does not exist.</Card></PageContainer>

  const readiness = selectJobReadiness(state, job.id)
  const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
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

  return <PageContainer title={job.title} description={`${job.department} · ${job.positionsCount} position${job.positionsCount === 1 ? '' : 's'} · ${formatEnum(job.employmentType)}`} actions={<>{workflowProgress.status !== 'PUBLISHED' ? <Link className={primaryLinkClass} to={`/jobs/${job.id}/setup?step=${workflowAction.step}`}>{workflowAction.label}</Link> : null}{job.status === 'OPEN' && workflowProgress.status === 'PUBLISHED' ? <><button className={linkClass} type="button" onClick={() => setShareOpen(true)}><Share2 size={16} />Share job</button><Link className={linkClass} to={`/apply/${job.id}`}><ExternalLink size={16} />Public application</Link></> : null}</>}>
    <section className="mb-4" aria-labelledby="interview-scheduling-heading">
      <Card className="p-5 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-depth" id="interview-scheduling-heading">Interview scheduling</h2>
          <SchedulingPolicySource resolved={scheduling} />
          {scheduling ? <p className="mb-0 mt-3 text-sm text-aura-text-secondary">{scheduling.policy.durationMinutes}-minute {formatEnum(scheduling.policy.interviewMode)} interview · {scheduling.policy.interviewerCount} interviewers · {scheduling.policy.candidateSlotCount} candidate time slots</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className={linkClass} to={`/interviews/policies/${job.id}`}>Customize schedule</Link>
          </div>
      </Card>
    </section>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5 md:p-6"><div className="flex items-center justify-between gap-4"><h2 className="m-0 text-lg font-semibold text-depth">Job description</h2><Badge tone={statusTone(job.status)}>{job.status}</Badge></div><p className="mt-5 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-6 text-aura-text-secondary">{job.description}</p><dl className="mt-5 grid gap-3 border-t border-harbor/10 pt-4 sm:grid-cols-2"><div><dt className="text-xs text-aura-text-muted">Work arrangement</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatEnum(job.workArrangement)}{job.location ? ` · ${job.location}` : ''}</dd></div><div><dt className="text-xs text-aura-text-muted">Minimum experience</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{job.minimumExperienceYears} years</dd></div><div><dt className="text-xs text-aura-text-muted">Application deadline</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatDate(job.applicationDeadline)}</dd></div><div><dt className="text-xs text-aura-text-muted">Last updated</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(job.updatedAt))}</dd></div></dl></Card>
      {workflowProgress.status !== 'PUBLISHED' ? <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Continue the evidence workflow</h2><p className="mb-2 mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-aura-text-muted">{`Current step: ${workflowProgress.currentStep.replaceAll('_', ' ').toLocaleLowerCase()}`}</p><div className="grid gap-0 divide-y divide-harbor/10">{[
        ['Job requirements', readiness.status !== 'JOB_DETAILS_INCOMPLETE', `/jobs/${job.id}/setup?step=requirements`, 'Complete requirements'],
        ['Application form', Boolean(publishedForm), `/jobs/${job.id}/setup?step=form`, 'Continue application form'],
        ['Screening rules', Boolean(rubric), `/jobs/${job.id}/setup?step=screening`, 'Review screening rules'],
      ].map(([label, complete, to, action]) => <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={String(label)}>{complete ? <CheckCircle2 className="text-aura-success" size={18} /> : <Circle className="text-aura-warning" size={18} />}<span className="text-sm font-semibold text-depth">{label}</span>{!complete ? <Link className="ml-auto text-xs font-semibold text-harbor no-underline hover:text-depth" to={String(to)}>{action}</Link> : <span className="ml-auto text-xs font-semibold text-aura-success">Complete</span>}</div>)}</div>{openingReadiness.issues.length ? <div className="mt-3 rounded-aura-sm border border-aura-warning/25 bg-aura-warning-soft px-4 py-3"><ul className="m-0 grid gap-1 pl-4 text-xs text-aura-warning">{openingReadiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}</Card> : null}
      <Card className="grid gap-4 p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Role requirements</h2><div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Required skills</p><ul className="m-0 flex flex-wrap gap-2 p-0">{required.map((skill) => <li key={skill.name}><Badge tone="accent">{skill.name}</Badge></li>)}</ul></div><div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Preferred skills</p>{preferred.length ? <ul className="m-0 flex flex-wrap gap-2 p-0">{preferred.map((skill) => <li key={skill.name}><Badge>{skill.name}</Badge></li>)}</ul> : <p className="m-0 text-sm text-aura-text-muted">No preferred skills specified.</p>}</div></Card>
    </div>
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <Button disabled={openingBlocked} onClick={() => setDialogAction(lifecycleAction)}>{job.status === 'OPEN' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}{lifecycleLabel}</Button>
      <Link className={editLinkClass} to={`/jobs/${job.id}/edit`}><Pencil size={16} />Edit job</Link>
    </div>
    {dialogAction ? <JobStatusDialog action={dialogAction} open onClose={() => setDialogAction(undefined)} onConfirm={changeStatus} /> : null}<ShareJobDialog open={shareOpen} job={job} applicationUrl={applicationUrl} onClose={() => setShareOpen(false)} />
  </PageContainer>
}
