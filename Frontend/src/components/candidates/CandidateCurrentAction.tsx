import { ArrowRight, CalendarClock, CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type {
  InterviewAnalysisPreparationStatus,
  InterviewSessionOperationalStatus,
} from '../../store/demoSelectors'
import type { Application } from '../../types/application'
import type { Interview } from '../../types/interview'
import type { FinalEvaluation } from '../../types/finalEvaluation'
import { getCandidateNextActionKind } from '../../utils/candidateDetailPresentation'
import { formatInterviewDate, formatInterviewTime } from '../../utils/helpers'
import { getInterviewDetailPath } from '../../utils/interviewRoutes'
import { Button } from '../ui/Button'

type CandidateCurrentActionProps = {
  application: Application
  candidateId: string
  interview?: Interview
  sessionStatus: InterviewSessionOperationalStatus
  reviewStatus?: InterviewAnalysisPreparationStatus
  finalEvaluation?: FinalEvaluation
  onSelectTab: (tabId: string) => void
}

const primaryLinkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export function CandidateCurrentAction({
  application,
  candidateId,
  interview,
  sessionStatus,
  reviewStatus,
  finalEvaluation,
  onSelectTab,
}: CandidateCurrentActionProps) {
  const kind = getCandidateNextActionKind({
    stage: application.currentStage,
    interviewStatus: interview?.status,
  })
  let title = 'Review application'
  let description = 'Review the submitted application before screening begins.'
  let action: ReactNode = <Button onClick={() => onSelectTab('application')}>Open application <ArrowRight size={15} aria-hidden="true" /></Button>
  let icon = <CircleAlert size={18} aria-hidden="true" />
  let urgent = false

  if (kind === 'SCREENING_REVIEW') {
    title = 'Review screening evidence'
    description = 'Review AURA’s recommendation and the submitted evidence.'
    action = <Button onClick={() => onSelectTab('screening')}>Open screening review <ArrowRight size={15} aria-hidden="true" /></Button>
  } else if (kind === 'SCHEDULE_INTERVIEW') {
    title = 'Schedule interview'
    description = 'This candidate is ready for interview scheduling.'
    action = <Button onClick={() => onSelectTab('interview')}>Prepare interview scheduling <ArrowRight size={15} aria-hidden="true" /></Button>
    icon = <CalendarClock size={18} aria-hidden="true" />
  } else if (kind === 'INTERVIEW_SCHEDULED' && interview) {
    title = 'Interview scheduled'
    description = `${formatInterviewDate(interview.scheduledStart)} · ${formatInterviewTime(interview.scheduledStart)}`
    action = <Link className={primaryLinkClass} to={getInterviewDetailPath(interview.id)}>Open interview workspace <ArrowRight size={15} aria-hidden="true" /></Link>
    icon = <CalendarClock size={18} aria-hidden="true" />
  } else if (kind === 'INTERVIEW_LIVE' && interview) {
    title = sessionStatus === 'PAUSED' ? 'Interview paused' : 'Interview in progress'
    description = sessionStatus === 'PAUSED' ? 'Resume the session when the interview team is ready.' : 'The live interview session is underway.'
    action = <Link className={primaryLinkClass} to={`/interviews/${interview.id}/session`}>{sessionStatus === 'PAUSED' ? 'Resume interview' : 'Open live session'} <ArrowRight size={15} aria-hidden="true" /></Link>
  } else if (kind === 'INTERVIEW_CANCELLED') {
    title = 'Interview cancelled'
    description = 'The scheduled interview was cancelled. Choose the next action.'
    action = <Link className={primaryLinkClass} to="/interviews">Reschedule interview <ArrowRight size={15} aria-hidden="true" /></Link>
    urgent = true
  } else if (kind === 'FINAL_REVIEW') {
    title = 'Review interview evidence'
    description = finalEvaluation ? 'The final evaluation is ready for recruiter review.' : 'Complete the next evidence-review step before recording a decision.'
    const path = finalEvaluation
      ? `/candidates/${candidateId}/final-evaluation`
      : interview && (reviewStatus === 'TRANSCRIPT_REQUIRED' || reviewStatus === 'TRANSCRIPT_DRAFT')
        ? `/interviews/${interview.id}/transcript`
        : interview
          ? `/interviews/${interview.id}/analysis`
          : `/candidates/${candidateId}`
    action = <Link className={primaryLinkClass} to={path}>Open final review <ArrowRight size={15} aria-hidden="true" /></Link>
  } else if (kind === 'HOLD_FOLLOW_UP') {
    title = 'Follow-up required'
    description = 'Review the assigned follow-up plan before the hold decision is revisited.'
    action = <Link className={primaryLinkClass} to={`/candidates/${candidateId}/outcome`}>View hold follow-up <ArrowRight size={15} aria-hidden="true" /></Link>
    urgent = true
  } else if (kind === 'OUTCOME_RECORDED') {
    title = 'Final decision recorded'
    description = 'Review the recorded decision and prepare the appropriate next step.'
    action = <Link className={primaryLinkClass} to={`/candidates/${candidateId}/outcome`}>View decision next step <ArrowRight size={15} aria-hidden="true" /></Link>
  }

  return (
    <section className={`mb-3 rounded-aura-md border bg-white px-4 py-3 shadow-aura-xs md:px-5 ${urgent ? 'border-aura-warning/30' : 'border-harbor/10'}`} aria-labelledby="candidate-current-action-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-grid size-7 flex-none place-items-center rounded-full ${urgent ? 'bg-aura-warning-soft text-aura-warning' : 'bg-glacier/15 text-marine'}`}>{icon}</span>
          <div>
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.13em] text-aura-text-muted">Next action</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h2 id="candidate-current-action-title" className="m-0 text-base font-semibold text-depth">{title}</h2>
              <p className="m-0 text-xs text-aura-text-secondary">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-none flex-col sm:items-end">{action}</div>
      </div>
    </section>
  )
}
