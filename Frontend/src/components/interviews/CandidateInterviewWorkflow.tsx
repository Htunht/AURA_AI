import { ArrowRight, Check, Circle, CircleAlert, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  InterviewAnalysisPreparationStatus,
  InterviewQuestionPreparationStatus,
  InterviewSessionOperationalStatus,
} from '../../store/demoSelectors'
import type { FinalEvaluation } from '../../types/finalEvaluation'
import type { Interview } from '../../types/interview'
import type { InterviewAnalysis } from '../../types/interviewAnalysis'
import type { InterviewSession } from '../../types/interviewSession'
import type { InterviewTranscript } from '../../types/interviewTranscript'
import {
  formatDateTime,
  formatInterviewDate,
  formatInterviewMode,
  formatInterviewStatus,
  formatInterviewTime,
} from '../../utils/helpers'
import { getInterviewDetailPath } from '../../utils/interviewRoutes'
import { Badge } from '../ui/Badge'

type CandidateInterviewWorkflowProps = {
  candidateId: string
  interview: Interview
  questionPlanStatus: InterviewQuestionPreparationStatus
  sessionStatus: InterviewSessionOperationalStatus
  session?: InterviewSession
  transcript?: InterviewTranscript
  analysis?: InterviewAnalysis
  reviewStatus: InterviewAnalysisPreparationStatus
  finalEvaluation?: FinalEvaluation
}

const secondaryLinkClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-3 text-sm font-semibold text-harbor no-underline hover:bg-glacier/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1 text-sm font-semibold leading-5 text-depth">{value}</dd></div>
}

function statusTone(status: Interview['status']) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  return 'accent'
}

export function CandidateInterviewWorkflow({
  candidateId,
  interview,
  questionPlanStatus,
  sessionStatus,
  session,
  transcript,
  analysis,
  reviewStatus,
  finalEvaluation,
}: CandidateInterviewWorkflowProps) {
  if (interview.status === 'CANCELLED') {
    return (
      <section className="rounded-aura-md bg-white p-5 shadow-aura-xs md:p-6" aria-labelledby="cancelled-interview-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-aura-danger">Interview record</p>
            <h2 id="cancelled-interview-title" className="mb-0 mt-2 text-xl font-semibold text-depth">Cancelled interview</h2>
            <p className="mb-0 mt-1 text-sm text-aura-text-secondary" role="status">This interview is no longer active.</p>
          </div>
          <Badge tone="danger">Cancelled</Badge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Original schedule" value={`${formatInterviewDate(interview.scheduledStart)} · ${formatInterviewTime(interview.scheduledStart)}–${formatInterviewTime(interview.scheduledEnd)}`} />
          <div className="sm:col-span-2"><Detail label="Interview team" value={interview.interviewers.map((person) => person.name).join(', ') || 'Not assigned'} /></div>
          <Detail label="Cancelled" value={interview.updatedAt ? formatDateTime(interview.updatedAt) : 'Timestamp unavailable'} />
          {interview.notes ? <div className="sm:col-span-2 lg:col-span-4"><Detail label="Cancellation note" value={interview.notes} /></div> : null}
        </dl>
        <div className="mt-5 flex flex-col gap-2 border-t border-harbor/10 pt-4 sm:flex-row">
          <Link className={secondaryLinkClass} to="/interviews">Reschedule interview <ArrowRight size={15} aria-hidden="true" /></Link>
          <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={getInterviewDetailPath(interview.id)}>View interview record</Link>
        </div>
      </section>
    )
  }

  const completed = interview.status === 'COMPLETED'
  const live = interview.status === 'IN_PROGRESS' || interview.status === 'PAUSED'
  const coveredQuestions = session?.questionProgress.filter((item) => item.status === 'ASKED' || item.status === 'SKIPPED').length ?? 0
  const totalQuestions = session?.questionProgress.length ?? 0
  const workflow = [
    {
      label: 'Question plan',
      status: questionPlanStatus === 'APPROVED' ? 'Approved' : questionPlanStatus === 'DRAFT_READY' ? 'Review required' : questionPlanStatus === 'FAILED' ? 'Needs attention' : 'Preparing',
      detail: questionPlanStatus === 'APPROVED' ? 'Approved questions are ready for the interview team.' : questionPlanStatus === 'DRAFT_READY' ? 'Candidate-specific questions are ready to review.' : questionPlanStatus === 'FAILED' ? 'Question preparation requires attention.' : 'Candidate-specific questions are being prepared.',
      state: questionPlanStatus === 'APPROVED' ? 'complete' : questionPlanStatus === 'FAILED' ? 'attention' : 'current',
      path: questionPlanStatus === 'DRAFT_READY' || questionPlanStatus === 'FAILED' ? `/interviews/${interview.id}/questions` : undefined,
      action: questionPlanStatus === 'DRAFT_READY' ? 'Review questions' : 'Review issue',
    },
    {
      label: 'Session',
      status: sessionStatus === 'COMPLETED' ? 'Completed' : sessionStatus === 'IN_PROGRESS' ? 'In progress' : sessionStatus === 'PAUSED' ? 'Paused' : sessionStatus === 'READY' ? 'Ready' : 'Available after question plan approval',
      detail: sessionStatus === 'COMPLETED' ? session?.completionSummary ?? 'The interview session is complete.' : sessionStatus === 'READY' ? 'The approved plan is ready for the live session.' : sessionStatus === 'IN_PROGRESS' || sessionStatus === 'PAUSED' ? 'The interview team can continue the live workspace.' : 'Approve the question plan before starting the session.',
      state: sessionStatus === 'COMPLETED' ? 'complete' : sessionStatus === 'READY' || sessionStatus === 'IN_PROGRESS' || sessionStatus === 'PAUSED' ? 'current' : 'upcoming',
      path: ['READY', 'IN_PROGRESS', 'PAUSED'].includes(sessionStatus) ? `/interviews/${interview.id}/session` : undefined,
      action: sessionStatus === 'READY' ? 'Open session' : sessionStatus === 'PAUSED' ? 'Resume session' : 'Open live session',
    },
    {
      label: 'Transcript',
      status: transcript?.status === 'APPROVED' ? 'Approved' : transcript?.status === 'DRAFT' ? 'Review required' : completed ? 'Transcript required' : 'Available after interview completion',
      detail: transcript?.status === 'APPROVED' ? 'The approved transcript is ready for evidence extraction.' : transcript?.status === 'DRAFT' ? 'Review and approve the interview transcript.' : completed ? 'Add or generate a transcript to continue.' : 'The transcript becomes available when the session is complete.',
      state: transcript?.status === 'APPROVED' ? 'complete' : completed ? 'current' : 'upcoming',
      path: completed && transcript?.status !== 'APPROVED' ? `/interviews/${interview.id}/transcript` : undefined,
      action: transcript?.status === 'DRAFT' ? 'Review transcript' : 'Add transcript',
    },
    {
      label: 'Analysis',
      status: analysis?.status === 'APPROVED' ? 'Approved' : reviewStatus === 'DRAFT_READY' ? 'Review required' : reviewStatus === 'FAILED' ? 'Needs attention' : transcript?.status === 'APPROVED' ? 'Preparing' : 'Available after transcript approval',
      detail: analysis?.status === 'APPROVED' ? 'Interview evidence has been reviewed and approved.' : reviewStatus === 'DRAFT_READY' ? 'Review the evidence-backed interview analysis.' : reviewStatus === 'FAILED' ? 'Analysis preparation requires attention.' : transcript?.status === 'APPROVED' ? 'Evidence extraction is in progress.' : 'Approve the transcript before analysis can begin.',
      state: analysis?.status === 'APPROVED' ? 'complete' : transcript?.status === 'APPROVED' ? 'current' : 'upcoming',
      path: reviewStatus === 'DRAFT_READY' || reviewStatus === 'FAILED' ? `/interviews/${interview.id}/analysis` : undefined,
      action: reviewStatus === 'DRAFT_READY' ? 'Review analysis' : 'Review issue',
    },
    {
      label: 'Final evaluation',
      status: finalEvaluation?.status === 'DECIDED' ? 'Decision recorded' : finalEvaluation ? 'Ready for review' : analysis?.status === 'APPROVED' ? 'Preparing' : 'Available after analysis approval',
      detail: finalEvaluation?.status === 'DECIDED' ? 'The authorized final decision is recorded.' : finalEvaluation ? 'Review the system evidence score and recommendation.' : analysis?.status === 'APPROVED' ? 'The evaluation workspace is being prepared.' : 'Approve the interview analysis before final evaluation.',
      state: finalEvaluation?.status === 'DECIDED' ? 'complete' : finalEvaluation || analysis?.status === 'APPROVED' ? 'current' : 'upcoming',
      path: finalEvaluation ? `/candidates/${candidateId}/final-evaluation` : undefined,
      action: finalEvaluation?.status === 'DECIDED' ? 'View decision' : 'Open final evaluation',
    },
  ] as const

  return (
    <section className="rounded-aura-md bg-white shadow-aura-xs" aria-labelledby="interview-record-title">
      <div className="flex flex-col gap-4 p-5 md:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Interview record</p>
          <h2 id="interview-record-title" className="mb-0 mt-2 text-xl font-semibold text-depth">{live ? 'Live interview' : completed ? 'Completed interview' : 'Scheduled interview'}</h2>
          <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{formatInterviewDate(interview.scheduledStart)} · {formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)}</p>
        </div>
        <Badge tone={statusTone(interview.status)}>{formatInterviewStatus(interview.status)}</Badge>
      </div>
      <dl className="grid gap-4 bg-frost/45 px-5 py-4 sm:grid-cols-3 md:px-6">
        <Detail label="Format" value={formatInterviewMode(interview.mode ?? 'VIDEO')} />
        <div className="sm:col-span-2"><Detail label="Interview team" value={interview.interviewers.map((person) => person.name).join(', ') || 'Not assigned'} /></div>
        {live ? <Detail label="Session progress" value={totalQuestions ? `${coveredQuestions} of ${totalQuestions} questions covered` : 'Session underway'} /> : null}
        {completed ? <Detail label="Completed" value={session?.completedAt ? formatDateTime(session.completedAt) : interview.updatedAt ? formatDateTime(interview.updatedAt) : 'Completed'} /> : null}
      </dl>
      <div className="p-5 md:p-6">
        <h3 className="m-0 text-sm font-semibold text-depth">Interview workflow</h3>
        <ol className="mt-4 grid gap-0" aria-label="Interview workflow">
          {workflow.map((step, index) => (
            <li className={`relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-5 last:pb-0 ${step.state === 'upcoming' ? 'opacity-65' : ''}`} key={step.label}>
              {index < workflow.length - 1 ? <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-harbor/15" aria-hidden="true" /> : null}
              <span className={`z-10 inline-grid size-7 place-items-center rounded-full border bg-white ${step.state === 'complete' ? 'border-aura-success text-aura-success' : step.state === 'attention' ? 'border-aura-warning text-aura-warning' : step.state === 'current' ? 'border-marine text-marine' : 'border-aura-border-strong text-aura-text-muted'}`}>
                {step.state === 'complete' ? <Check size={14} aria-hidden="true" /> : step.state === 'attention' ? <CircleAlert size={14} aria-hidden="true" /> : step.state === 'current' ? <Clock3 size={14} aria-hidden="true" /> : <Circle size={8} aria-hidden="true" />}
              </span>
              <div className={`min-w-0 rounded-aura-sm px-3 py-2 ${step.state === 'current' || step.state === 'attention' ? 'bg-frost/60' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-sm font-semibold text-depth">{step.label}</p>
                  <span className={`text-xs font-semibold ${step.state === 'attention' ? 'text-aura-warning' : step.state === 'complete' ? 'text-aura-success' : 'text-aura-text-secondary'}`}>{step.status}</span>
                </div>
                <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-secondary">{step.detail}</p>
                {step.path ? <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={step.path}>{step.action} <ArrowRight size={13} aria-hidden="true" /></Link> : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 border-t border-harbor/10 pt-4">
          <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={getInterviewDetailPath(interview.id)}>View complete interview record <ArrowRight className="ml-1" size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  )
}
