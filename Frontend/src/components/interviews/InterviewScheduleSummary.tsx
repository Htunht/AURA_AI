import type { Candidate } from '../../types/candidate'
import type { Job } from '../../types/job'
import type { InterviewScheduleDraft } from '../../types/interviewScheduling'
import type { Interviewer } from '../../types/interviewer'
import { formatDuration, formatInterviewDate, formatInterviewMode, formatInterviewTime } from '../../utils/helpers'
import { buildInterviewDateRange } from '../../utils/interviewScheduling'
import { Card } from '../ui/Card'

export function InterviewScheduleSummary({
  draft,
  candidate,
  interviewers,
}: {
  draft: InterviewScheduleDraft
  candidate?: { candidate: Candidate; job: Job }
  interviewers: Interviewer[]
}) {
  const hasRange = Boolean(draft.date && draft.startTime)
  const range = hasRange ? buildInterviewDateRange(draft) : undefined
  const selectedInterviewers = interviewers.filter((person) =>
    draft.interviewerIds.includes(person.id),
  )

  return (
    <Card className="sticky top-5 p-5 md:p-6">
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Schedule summary</p>
      <h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Interview plan</h2>
      <dl className="mt-5 grid gap-3 text-sm">
        <div><dt className="text-xs text-aura-text-muted">Candidate</dt><dd className="mb-0 mt-1 font-semibold text-depth">{candidate?.candidate.fullName ?? 'Choose a candidate'}</dd></div>
        <div><dt className="text-xs text-aura-text-muted">Role</dt><dd className="mb-0 mt-1 font-semibold text-depth">{candidate?.job.title ?? '—'}</dd></div>
        <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-aura-text-muted">Date</dt><dd className="mb-0 mt-1 font-medium text-depth">{range ? formatInterviewDate(range.scheduledStart) : '—'}</dd></div><div><dt className="text-xs text-aura-text-muted">Time</dt><dd className="mb-0 mt-1 font-medium text-depth">{range ? `${formatInterviewTime(range.scheduledStart)}–${formatInterviewTime(range.scheduledEnd)}` : '—'}</dd></div></div>
        <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-aura-text-muted">Duration</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatDuration(draft.durationMinutes)}</dd></div><div><dt className="text-xs text-aura-text-muted">Timezone</dt><dd className="mb-0 mt-1 font-medium text-depth">{draft.timezone || '—'}</dd></div></div>
        <div><dt className="text-xs text-aura-text-muted">Format</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatInterviewMode(draft.mode)}</dd></div>
        <div><dt className="text-xs text-aura-text-muted">Interviewers</dt><dd className="mb-0 mt-1 font-medium leading-6 text-depth">{selectedInterviewers.length ? selectedInterviewers.map((person) => person.fullName).join(', ') : 'None selected'}</dd></div>
        {draft.mode === 'VIDEO' ? <div><dt className="text-xs text-aura-text-muted">Meeting link</dt><dd className="mb-0 mt-1 break-all text-depth">{draft.meetingLink || '—'}</dd></div> : null}
        {draft.mode === 'ONSITE' ? <div><dt className="text-xs text-aura-text-muted">Location</dt><dd className="mb-0 mt-1 text-depth">{draft.location || '—'}</dd></div> : null}
      </dl>
      <p className="mb-0 mt-5 border-l-2 border-glacier pl-3 text-xs leading-5 text-aura-text-muted">After scheduling, the application will move to the Interview stage. Interview questions remain unprepared until the next phase.</p>
    </Card>
  )
}
