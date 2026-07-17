import { AlertTriangle, CalendarCheck, CalendarClock, CalendarX, CheckCircle2, FileCheck2, MailCheck, ScanSearch, UserCheck } from 'lucide-react'
import type { CandidateTimelineEvent } from '../../store/demoSelectors'
import { formatDateTime } from '../../utils/helpers'

type CandidateTimelineProps = {
  events: CandidateTimelineEvent[]
}

const iconByType = {
  APPLICATION_SUBMITTED: FileCheck2,
  SCREENING_COMPLETED: ScanSearch,
  SCHEDULING_INVITATION_PREPARED: CalendarClock,
  SCHEDULING_INVITATION_EXPIRED: CalendarX,
  SCHEDULING_EXCEPTION: AlertTriangle,
  INTERVIEW_SCHEDULED: CalendarCheck,
  INTERVIEW_RESCHEDULED: CalendarClock,
  INTERVIEW_CANCELLED: CalendarX,
  INTERVIEW_COMPLETED: CheckCircle2,
  INTERVIEW_QUESTIONS_PREPARED: FileCheck2,
  INTERVIEW_PLAN_APPROVED: CheckCircle2,
  INTERVIEW_STARTED: CalendarClock,
  INTERVIEW_PAUSED: CalendarClock,
  INTERVIEW_TRANSCRIPT_ADDED: FileCheck2,
  INTERVIEW_TRANSCRIPT_APPROVED: CheckCircle2,
  INTERVIEW_ANALYSIS_PREPARED: ScanSearch,
  INTERVIEW_ANALYSIS_APPROVED: CheckCircle2,
  SYSTEM_FINAL_EVALUATION_PREPARED: ScanSearch,
  EVALUATION_CHALLENGE_OPENED: AlertTriangle,
  SYSTEM_EVALUATION_RECALCULATED: ScanSearch,
  FINAL_DECISION_RECORDED: UserCheck,
  FINAL_EVALUATION_COMPLETED: CheckCircle2,
  DECISION_RECORDED: UserCheck,
  COMMUNICATION_SENT: MailCheck,
} satisfies Record<CandidateTimelineEvent['type'], typeof FileCheck2>

export function CandidateTimeline({ events }: CandidateTimelineProps) {
  if (events.length === 0) {
    return <p className="m-0 text-sm text-aura-text-secondary">No activity has been recorded for this application.</p>
  }

  return (
    <ol className="m-0 list-none p-0" aria-label="Candidate activity">
      {events.map((event, index) => {
        const Icon = iconByType[event.type]
        return (
          <li className="relative grid grid-cols-[36px_1fr] gap-3 pb-6 last:pb-0" key={event.id}>
            {index < events.length - 1 ? <span className="absolute bottom-0 left-[17px] top-9 w-px bg-harbor/15" aria-hidden="true" /> : null}
            <span className="relative z-10 inline-grid size-9 place-items-center rounded-full border border-marine/20 bg-frost text-marine">
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="pt-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <h3 className="m-0 text-sm font-semibold text-depth">{event.title}</h3>
                <time className="whitespace-nowrap text-xs font-medium text-aura-text-muted" dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
              </div>
              {event.description ? <p className="mt-1.5 text-sm leading-6 text-aura-text-secondary">{event.description}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
