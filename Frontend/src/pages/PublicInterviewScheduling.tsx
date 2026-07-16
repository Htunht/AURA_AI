import { CalendarCheck, Clock3, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CandidateSlotPicker } from '../components/interviews/CandidateSlotPicker'
import { Button } from '../components/ui/Button'
import interviewersData from '../data/interviewers.json'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectSchedulingInvitationByToken } from '../store/demoSelectors'
import type { Interview } from '../types/interview'
import type { Interviewer } from '../types/interviewer'
import { formatDuration, formatInterviewDate, formatInterviewMode, formatInterviewTime } from '../utils/helpers'
import { createNextInterviewId, findInterviewConflicts } from '../utils/interviewScheduling'

const interviewers = interviewersData as Interviewer[]

export default function PublicInterviewScheduling() {
  const { token = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const invitation = selectSchedulingInvitationByToken(state, token)
  const application = invitation ? state.applications.find((item) => item.id === invitation.applicationId) : undefined
  const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  const policy = invitation ? state.interviewSchedulingPolicies.find((item) => item.id === invitation.policyId) : undefined
  const interview = invitation?.scheduledInterviewId ? state.interviews.find((item) => item.id === invitation.scheduledInterviewId) : undefined
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [error, setError] = useState('')
  const now = new Date()

  useEffect(() => {
    if (invitation?.status === 'PENDING' && new Date() >= new Date(invitation.expiresAt)) {
      dispatch({ type: 'EXPIRE_SCHEDULING_INVITATION', payload: { invitationId: invitation.id, updatedAt: new Date().toISOString() } })
    }
  }, [dispatch, invitation])

  if (!invitation || !application || !candidate || !job) {
    return <PublicFrame><StatePanel title="Scheduling invitation unavailable" description="This scheduling link could not be resolved. Please contact the hiring team." /></PublicFrame>
  }
  if (invitation.status === 'EXPIRED') {
    return <PublicFrame><StatePanel title="This scheduling invitation has expired." description="The hiring team will need to issue a new scheduling invitation." /></PublicFrame>
  }
  if (invitation.status === 'CANCELLED' || invitation.status === 'EXCEPTION_REQUIRED' || !policy) {
    return <PublicFrame><StatePanel title="Scheduling requires assistance" description="The hiring team is reviewing the interview arrangements. No action is required from you right now." /></PublicFrame>
  }
  const resolvedApplication = application
  const resolvedJob = job
  const resolvedPolicy = policy

  const visibleSlots = invitation.availableSlots.filter((slot) => {
    if (new Date(slot.start) <= now || slot.id === invitation.selectedSlotId) return false
    return findInterviewConflicts({
      interviews: state.interviews,
      interviewerIds: slot.interviewerIds,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      excludeInterviewId: rescheduling ? interview?.id : undefined,
    }).length === 0
  })
  const canReschedule = invitation.rescheduleCount < policy.candidateRescheduleLimit
  const assigned = invitation.interviewerIds
    .map((id) => interviewers.find((person) => person.id === id))
    .filter((person): person is Interviewer => Boolean(person))

  function buildInterview(slotId: string, existing?: Interview): Interview | undefined {
    const latestInvitation = selectSchedulingInvitationByToken(state, token)
    const slot = latestInvitation?.availableSlots.find((item) => item.id === slotId)
    if (!latestInvitation || !slot) return undefined
    const id = existing?.id ?? createNextInterviewId(state.interviews, resolvedApplication.id)
    const timestamp = new Date().toISOString()
    return {
      id,
      applicationId: resolvedApplication.id,
      jobId: resolvedJob.id,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      timezone: slot.timezone,
      status: 'SCHEDULED',
      mode: resolvedPolicy.interviewMode,
      interviewers: assigned.map((person) => ({ id: person.id, name: person.fullName, role: person.roleTitle })),
      meetingLink: resolvedPolicy.interviewMode === 'VIDEO' ? resolvedPolicy.meetingLinkTemplate?.replace('{interviewId}', id) : undefined,
      location: resolvedPolicy.interviewMode === 'ONSITE' ? resolvedPolicy.meetingLocationTemplate : undefined,
      questions: existing?.questions ?? [],
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
  }

  function confirmSlot() {
    setError('')
    const latest = selectSchedulingInvitationByToken(state, token)
    const slot = latest?.availableSlots.find((item) => item.id === selectedSlotId)
    if (!latest || !slot || (latest.status !== 'PENDING' && !rescheduling)) return
    if (latest.status === 'PENDING' && new Date() >= new Date(latest.expiresAt)) {
      dispatch({ type: 'EXPIRE_SCHEDULING_INVITATION', payload: { invitationId: latest.id, updatedAt: new Date().toISOString() } })
      return
    }
    const conflict = findInterviewConflicts({ interviews: state.interviews, interviewerIds: slot.interviewerIds, scheduledStart: slot.start, scheduledEnd: slot.end, excludeInterviewId: rescheduling ? interview?.id : undefined }).length > 0
    if (conflict) {
      setSelectedSlotId('')
      setError('This time is no longer available. Please choose another available time.')
      return
    }
    const nextInterview = buildInterview(slot.id, rescheduling ? interview : undefined)
    if (!nextInterview) return
    if (rescheduling && interview) {
      dispatch({ type: 'RESCHEDULE_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: latest.id, slotId: slot.id, interview: nextInterview, rescheduledAt: new Date().toISOString() } })
      setRescheduling(false)
    } else {
      dispatch({ type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: latest.id, slotId: slot.id, interview: nextInterview } })
    }
    setSelectedSlotId('')
  }

  if (invitation.status === 'SCHEDULED' && interview && !rescheduling) {
    const duration = Math.round((new Date(interview.scheduledEnd).getTime() - new Date(interview.scheduledStart).getTime()) / 60_000)
    return <PublicFrame><section className="rounded-aura-md border border-aura-success/20 bg-white p-6 shadow-aura-md md:p-9" aria-live="polite"><span className="inline-grid size-12 place-items-center rounded-full bg-aura-success-soft text-aura-success"><CalendarCheck size={24} /></span><p className="mb-0 mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-marine">Interview scheduled</p><h1 className="mb-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-depth">Your interview for {job.title} has been scheduled.</h1><dl className="mt-7 grid gap-4 rounded-aura-sm bg-frost p-5 sm:grid-cols-2"><Detail label="Date" value={formatInterviewDate(interview.scheduledStart)} /><Detail label="Time" value={`${formatInterviewTime(interview.scheduledStart)}–${formatInterviewTime(interview.scheduledEnd)}`} /><Detail label="Timezone" value={interview.timezone} /><Detail label="Format" value={`${formatInterviewMode(interview.mode ?? 'VIDEO')} · ${formatDuration(duration)}`} />{interview.meetingLink ? <Detail label="Meeting link" value={interview.meetingLink} /> : null}{interview.location ? <Detail label="Location" value={interview.location} /> : null}</dl>{canReschedule ? <Button className="mt-6" onClick={() => setRescheduling(true)}>Reschedule interview</Button> : <p className="mb-0 mt-6 text-sm font-medium text-aura-text-secondary">Please contact the hiring team to request another change.</p>}</section></PublicFrame>
  }

  return <PublicFrame><section className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-md"><div className="border-b border-harbor/10 bg-depth p-6 text-white md:p-8"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.16em] text-glacier">Interview scheduling</p><h1 className="mb-0 mt-2 text-3xl font-semibold tracking-[-0.03em]">{rescheduling ? 'Choose a new interview time' : 'Choose your interview time'}</h1><p className="mb-0 mt-3 text-sm text-frost/65">{candidate.fullName} · {job.title}</p></div><div className="grid gap-7 p-6 md:p-8"><div className="grid gap-3 sm:grid-cols-3"><Detail label="Format" value={formatInterviewMode(policy.interviewMode)} /><Detail label="Duration" value={formatDuration(policy.durationMinutes)} /><Detail label="Interview team" value={assigned.map((person) => person.roleTitle).join(', ')} /></div><div className="flex items-center gap-2 rounded-aura-sm border border-glacier/30 bg-glacier/10 px-4 py-3 text-xs text-aura-text-secondary"><Clock3 size={16} className="text-marine" />Invitation available until {new Date(invitation.expiresAt).toLocaleString()}</div>{error ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm font-semibold text-aura-danger" role="alert">{error}</p> : null}{visibleSlots.length ? <CandidateSlotPicker slots={visibleSlots} selectedSlotId={selectedSlotId} onChange={setSelectedSlotId} /> : <StatePanel title="No alternative times are currently available." description="Please contact the hiring team to request another arrangement." />}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{rescheduling ? <Button variant="ghost" onClick={() => { setRescheduling(false); setSelectedSlotId('') }}>Keep current time</Button> : null}<Button disabled={!selectedSlotId} onClick={confirmSlot}>Confirm interview time</Button></div><p className="m-0 flex items-start gap-2 border-t border-harbor/10 pt-5 text-xs leading-5 text-aura-text-muted"><ShieldCheck size={15} className="mt-0.5 flex-none text-marine" />Your selection is checked against the interview team’s latest availability before it is confirmed.</p></div></section></PublicFrame>
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-frost px-4 py-8 sm:px-6 md:py-12"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center gap-3"><span className="inline-grid size-9 place-items-center rounded-aura-sm bg-harbor font-bold text-white">A</span><div><p className="m-0 font-bold text-depth">AURA Technology</p><p className="m-0 text-xs text-aura-text-muted">Candidate scheduling</p></div></div>{children}</div></main>
}

function StatePanel({ title, description }: { title: string; description: string }) {
  return <section className="rounded-aura-md border border-harbor/15 bg-white p-8 text-center shadow-aura-md"><h1 className="m-0 text-2xl font-semibold text-depth">{title}</h1><p className="mx-auto mb-0 mt-3 max-w-xl text-sm leading-6 text-aura-text-secondary">{description}</p></section>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1.5 break-all text-sm font-semibold text-depth">{value}</dd></div>
}
