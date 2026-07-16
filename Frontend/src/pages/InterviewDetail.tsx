import { CalendarClock, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectInterviewById, selectInterviewQuestionPreparationStatus, selectLatestInterviewQuestionSet, selectInterviewSessionOperationalStatus } from '../store/demoSelectors'
import { formatDuration, formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../utils/helpers'

const linkClass = 'inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewDetail() {
  const { interviewId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { state, dispatch } = useDemoStore()
  const [cancelOpen, setCancelOpen] = useState(false)
  const interview = selectInterviewById(state, interviewId)
  const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
  const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  const schedulingInvitation = interview
    ? state.interviewSchedulingInvitations.find((item) => item.scheduledInterviewId === interview.id)
    : undefined
  const historicalPolicy = schedulingInvitation ? state.interviewSchedulingPolicies.find((item) => item.id === schedulingInvitation.policyId) : undefined
  const historicalPolicyLabel = schedulingInvitation?.policySource === 'JOB_OVERRIDE'
    ? 'Custom policy for this job'
    : schedulingInvitation?.policySource === 'DEPARTMENT_TEMPLATE'
      ? `${historicalPolicy?.department ?? job?.department ?? 'Department'} default`
      : schedulingInvitation?.policySource === 'ORGANIZATION_DEFAULT'
        ? 'Organization default'
        : historicalPolicy?.displayName
  const questionSet = interview ? selectLatestInterviewQuestionSet(state, interview.id) : undefined
  const preparationStatus = interview ? selectInterviewQuestionPreparationStatus(state, interview.id) : 'NOT_PREPARED'
  const sessionStatus = interview ? selectInterviewSessionOperationalStatus(state, interview.id) : 'UNAVAILABLE'

  if (!interview || !application || !candidate || !job) return <PageContainer eyebrow="Interview operations" title="Interview not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested interview record could not be resolved.</Card></PageContainer>

  const duration = Math.round((new Date(interview.scheduledEnd).getTime() - new Date(interview.scheduledStart).getTime()) / 60_000)
  function cancelInterview() {
    const updatedAt = new Date().toISOString()
    dispatch({ type: 'UPDATE_INTERVIEW_STATUS', payload: { interviewId: interview!.id, status: 'CANCELLED', updatedAt } })
    const invitation = state.interviewSchedulingInvitations.find((item) => item.scheduledInterviewId === interview!.id)
    if (invitation) dispatch({ type: 'CANCEL_SCHEDULING_INVITATION', payload: { invitationId: invitation.id, updatedAt } })
    dispatch({ type: 'UPDATE_APPLICATION_STAGE', payload: { applicationId: application!.id, stage: 'SHORTLIST_REVIEW' } })
    setCancelOpen(false)
  }

  return <PageContainer eyebrow="Interview operations" title={`${candidate.fullName} interview`} description={`${job.title} · ${formatInterviewStatus(interview.status)}`} actions={<div className="flex flex-wrap gap-2"><Link className={linkClass} to="/interviews">Back to interviews</Link>{preparationStatus === 'APPROVED' && interview.status !== 'CANCELLED' ? <Link className={linkClass} to={`/interviews/${interview.id}/session`}>{sessionStatus === 'READY' ? 'Open session workspace' : sessionStatus === 'IN_PROGRESS' ? 'Return to session' : sessionStatus === 'PAUSED' ? 'Resume session' : 'View session summary'}</Link> : null}</div>}>
    {searchParams.get('rescheduled') === '1' ? <Card className="mb-4 border-aura-success/25 bg-aura-success-soft p-4 text-sm font-semibold text-aura-success">Interview rescheduled.</Card> : null}
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        <Card className="p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">{schedulingInvitation ? 'Scheduled by candidate' : 'Interview overview'}</p><h2 className="mb-0 mt-2 text-xl font-semibold text-depth">{candidate.fullName}</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{candidate.currentPosition} · {job.title}</p>{schedulingInvitation ? <><p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">AURA prepared the interview team and available times. The candidate selected this schedule.</p>{historicalPolicyLabel ? <p className="mb-0 mt-2 text-xs font-semibold text-harbor">Scheduling policy · {historicalPolicyLabel}</p> : null}</> : null}</div><Badge tone={interview.status === 'COMPLETED' ? 'success' : interview.status === 'CANCELLED' ? 'neutral' : 'accent'}>{interview.status === 'SCHEDULED' && schedulingInvitation ? 'Interview confirmed' : formatInterviewStatus(interview.status)}</Badge></div></Card>
        <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Schedule details</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="flex items-center gap-2 text-xs text-aura-text-muted"><CalendarClock size={14} />Date and time</dt><dd className="mb-0 mt-1 font-semibold text-depth">{formatInterviewDate(interview.scheduledStart)}</dd><dd className="m-0 text-sm text-aura-text-secondary">{formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)} · {formatDuration(duration)}</dd></div><div><dt className="text-xs text-aura-text-muted">Timezone</dt><dd className="mb-0 mt-1 font-semibold text-depth">{interview.timezone}</dd></div><div><dt className="text-xs text-aura-text-muted">Format</dt><dd className="mb-0 mt-1 font-semibold text-depth">{formatInterviewMode(interview.mode ?? 'VIDEO')}</dd></div><div><dt className="flex items-center gap-2 text-xs text-aura-text-muted"><Users size={14} />Interviewers</dt><dd className="mb-0 mt-1 font-semibold leading-6 text-depth">{interview.interviewers.map((person) => `${person.name} — ${person.role}`).join(', ')}</dd></div>{interview.location ? <div className="sm:col-span-2"><dt className="flex items-center gap-2 text-xs text-aura-text-muted"><MapPin size={14} />Location</dt><dd className="mb-0 mt-1 font-semibold text-depth">{interview.location}</dd></div> : null}{interview.meetingLink ? <div className="sm:col-span-2"><dt className="text-xs text-aura-text-muted">Meeting link</dt><dd className="mb-0 mt-1"><a className="break-all font-semibold text-harbor" href={interview.meetingLink} target="_blank" rel="noreferrer">{interview.meetingLink}</a></dd></div> : null}{interview.notes ? <div className="sm:col-span-2"><dt className="text-xs text-aura-text-muted">Internal notes</dt><dd className="mb-0 mt-1 whitespace-pre-wrap text-sm leading-6 text-depth">{interview.notes}</dd></div> : null}</dl></Card>
      </div>
      <div className="grid content-start gap-4"><Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Candidate context</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Email</dt><dd className="mb-0 mt-1 font-medium text-depth">{candidate.email}</dd></div><div><dt className="text-xs text-aura-text-muted">Experience</dt><dd className="mb-0 mt-1 font-medium text-depth">{candidate.yearsExperience} years</dd></div></dl><Link className="mt-4 inline-flex font-semibold text-harbor" to={`/candidates/${candidate.id}`}>Open candidate profile</Link></Card><Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview preparation</h2><Badge tone={preparationStatus === 'APPROVED' ? 'success' : preparationStatus === 'FAILED' ? 'warning' : 'accent'}>{preparationStatus === 'APPROVED' ? 'Plan approved' : preparationStatus === 'DRAFT_READY' ? 'Draft ready' : preparationStatus === 'FAILED' ? 'Preparation failed' : 'Preparing'}</Badge><p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">{preparationStatus === 'APPROVED' ? `Interview plan approved · ${questionSet?.questions.length ?? 0} approved questions.` : preparationStatus === 'DRAFT_READY' ? `Interview questions are ready for review · ${questionSet?.questions.length ?? 0} questions.` : preparationStatus === 'FAILED' ? 'Question preparation requires attention.' : 'AURA is preparing candidate-specific interview questions.'}</p><Link className={`${linkClass} mt-4`} to={`/interviews/${interview.id}/questions`}>{preparationStatus === 'APPROVED' ? 'View question plan' : preparationStatus === 'FAILED' ? 'Review preparation issue' : 'Review questions'}</Link></Card>{interview.status === 'SCHEDULED' ? <Card className="p-5"><p className="m-0 text-sm leading-6 text-aura-text-secondary">The candidate can reschedule from their scheduling link within the policy limit.</p><Button className="mt-4" variant="ghost" onClick={() => setCancelOpen(true)}>Cancel interview</Button></Card> : interview.status === 'CANCELLED' ? <Card className="p-5"><p className="m-0 text-sm text-aura-text-secondary">The record remains available for audit. The application has returned to shortlist review.</p></Card> : null}</div>
    </div>
    <Dialog open={cancelOpen} title="Cancel interview" onClose={() => setCancelOpen(false)}><p className="mt-0 text-sm leading-6 text-aura-text-secondary">Cancel the scheduled interview for {candidate.fullName}?</p><p className="mb-0 mt-3 text-xs leading-5 text-aura-text-muted">No candidate communication will be sent automatically. The application will return to shortlist review.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep interview</Button><Button onClick={cancelInterview}>Cancel interview</Button></div></Dialog>
  </PageContainer>
}
