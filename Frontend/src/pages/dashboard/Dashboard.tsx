import {
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  ChevronRight,
  ScanSearch,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { ScreeningAutomationStatus } from '../../components/screening/ScreeningAutomationStatus'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectActiveJobs,
  selectApplicationCountByJobId,
  selectDashboardMetrics,
  selectDraftApplicationFormByJobId,
  selectPublishedApplicationFormByJobId,
  selectPostInterviewReviewSummary,
  selectFinalDecisionDashboardSummary,
  selectPostDecisionDashboard,
  selectRecentApplications,
  selectUpcomingInterviews,
} from '../../store/demoSelectors'
import { formatApplicationStage, formatDate, formatTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'

const DASHBOARD_NOW = new Date('2026-07-16T10:30:00Z')

// Tactile primary action button — brightness + press-down + focus ring
const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-4 text-sm font-semibold text-[#1E2022] no-underline transition-all duration-200 ease-in-out shadow-[0_0_10px_rgba(199,255,56,0.35)] hover:brightness-110 hover:shadow-[0_0_18px_rgba(199,255,56,0.55)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C7FF38]'

// Tactile secondary button (job rows)
const buttonLinkClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-3 text-xs font-semibold text-[#1E2022] no-underline transition-all duration-200 ease-in-out shadow-[0_0_8px_rgba(199,255,56,0.3)] hover:brightness-110 hover:shadow-[0_0_14px_rgba(199,255,56,0.5)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C7FF38]'

// Premium animated number counter component
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setDisplayValue(end)
      return
    }

    const duration = 1000 // duration of counter animation in ms
    const range = end - start
    // Ensure we don't divide by zero and have a reasonable interval time
    const minStepTime = 25
    const stepTime = Math.max(Math.floor(duration / Math.abs(range)), minStepTime)
    const startTime = Date.now()

    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime
      const progress = Math.min(timePassed / duration, 1)
      
      // Smooth easeOutQuad function for count-up deceleration
      const easeProgress = progress * (2 - progress)
      const current = Math.round(start + easeProgress * range)
      
      setDisplayValue(current)

      if (progress === 1) {
        clearInterval(timer)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  return <>{displayValue}</>
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function DashboardCalendar({ upcomingInterviews }: { upcomingInterviews: Array<{ interview: any; candidate: any; job: any }> }) {
  const daysInMonth = 31
  const startDayOffset = 3 // Wednesday for July 2026
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: startDayOffset }, () => null)
  const calendarCells = [...blanks, ...days]

  const [selectedDay, setSelectedDay] = useState<number>(16) // DASHBOARD_NOW is July 16, 2026

  const getInterviewsForDay = (day: number) => {
    return upcomingInterviews.filter(({ interview }) => {
      const date = new Date(interview.scheduledStart)
      return date.getFullYear() === 2026 && date.getMonth() === 6 && date.getDate() === day
    })
  }

  const selectedInterviews = getInterviewsForDay(selectedDay)

  return (
    <div className="overflow-hidden rounded-aura-md border border-[#1E2022]/15 bg-white shadow-aura-sm p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#1E2022]/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-grid size-8 place-items-center rounded-aura-sm bg-[#C7FF38]/20 text-[#1E2022]">
              <Calendar size={16} />
            </span>
            <h2 className="m-0 text-base font-semibold text-[#1E2022]">Interview calendar</h2>
          </div>
          <span className="text-xs font-bold text-[#1E2022]/60 uppercase tracking-wide">July 2026</span>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#1E2022]/40 uppercase tracking-wider mb-2">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} />
            
            const dayInterviews = getInterviewsForDay(day)
            const hasInterviews = dayInterviews.length > 0
            const isSelected = day === selectedDay
            const isToday = day === 16

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative h-8 w-full rounded-aura-sm text-xs font-semibold transition-all flex flex-col items-center justify-center ${
                  isSelected 
                    ? 'bg-[#1E2022] text-[#C7FF38] scale-105 shadow-aura-sm' 
                    : isToday
                      ? 'bg-[#C7FF38] text-[#1E2022]'
                      : 'hover:bg-[#1E2022]/5 text-[#1E2022]'
                }`}
              >
                <span>{day}</span>
                {hasInterviews && !isSelected && (
                  <span className={`absolute bottom-1.5 size-1 rounded-full ${isToday ? 'bg-[#1E2022]' : 'bg-[#C7FF38]'}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day interviews summary */}
      <div className="mt-5 border-t border-[#1E2022]/10 pt-4">
        <h3 className="m-0 text-xs font-bold text-[#1E2022]/60 uppercase tracking-wider mb-3">
          Interviews on July {selectedDay}
        </h3>
        {selectedInterviews.length === 0 ? (
          <p className="m-0 text-xs text-slate-400 italic">No interviews scheduled for this day.</p>
        ) : (
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {selectedInterviews.map(({ interview, candidate, job }) => (
              <div key={interview.id} className="rounded-aura-sm border border-[#1E2022]/10 p-2 bg-[#F4F1EA]/30 hover:bg-[#F4F1EA]/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/candidates/${candidate.id}`} className="text-xs font-bold text-[#1E2022] no-underline hover:text-[#C7FF38] transition-colors truncate">
                    {candidate.fullName}
                  </Link>
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">
                    {formatTime(interview.scheduledStart)}
                  </span>
                </div>
                <p className="m-0 mt-0.5 text-[10px] text-slate-500 truncate">{job.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { state } = useDemoStore()
  const metrics = selectDashboardMetrics(state, DASHBOARD_NOW)
  const activeJobs = selectActiveJobs(state).slice(0, 3)
  const recentApplications = selectRecentApplications(state)
  const upcomingInterviews = selectUpcomingInterviews(state, DASHBOARD_NOW)
  const postInterview = selectPostInterviewReviewSummary(state)
  const finalDecisions = selectFinalDecisionDashboardSummary(state)
  const postDecision = selectPostDecisionDashboard(state, DASHBOARD_NOW)
  const metricCards = [
    { label: 'Active job openings', value: metrics.activeJobs, description: 'Roles currently accepting applications', icon: BriefcaseBusiness },
    { label: 'Total candidates', value: metrics.totalCandidates, description: 'Candidate profiles in the workspace', icon: Users },
    { label: 'Pending recruiter reviews', value: metrics.pendingRecruiterReviews, description: 'Review recommendations requiring attention', icon: ScanSearch },
    { label: 'Interviews today', value: metrics.interviewsToday, description: 'Sessions scheduled for Jul 16', icon: CalendarClock },
  ]

  return (
    <PageContainer
      eyebrow="Hiring workspace"
      title="Recruitment overview"
      description="Track active roles, candidate progress, AI review activity, and upcoming interviews."
      actions={<Link className={primaryLinkClass} to="/jobs">View job openings <ChevronRight size={16} aria-hidden="true" /></Link>}
    >
      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, description, icon: Icon }, i) => (
          <div
            className="opacity-0 [animation:fade-in-up_0.5s_ease-out_forwards]"
            key={label}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Card className="group relative overflow-hidden p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 cursor-default h-full">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <p className="m-0 text-sm font-semibold text-aura-text-secondary">{label}</p>
                {/* Icon scales up on card hover */}
                <span className="inline-grid size-9 place-items-center rounded-aura-sm bg-glacier/15 text-marine transition-transform duration-300 group-hover:scale-110">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p className="m-0 text-4xl font-bold tracking-[-0.04em] text-depth">
                <AnimatedNumber value={value} />
              </p>
              <p className="mb-0 mt-2.5 text-xs leading-5 text-aura-text-muted">{description}</p>
            </Card>
          </div>
        ))}
      </div>

      {/* Screening automation panel — delayed entry */}
      <div className="mt-4 opacity-0 [animation:fade-in-up_0.5s_ease-out_300ms_forwards]">
        <ScreeningAutomationStatus pendingRecruiterReviews={metrics.pendingRecruiterReviews} />
      </div>

      {/* Submissions + Schedule — delayed entry */}
      <div className="mt-4 space-y-4 opacity-0 [animation:fade-in-up_0.5s_ease-out_350ms_forwards]">
        {/* Recent applications (Row 1 - full width) */}
        <div className="overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm bg-white">
          <div className="bg-depth px-5 py-4 md:px-6">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Submissions</p>
            <h2 className="mb-0 mt-2 text-lg font-semibold text-white">Recent applications</h2>
          </div>
          {/* Column headers */}
          <div className="hidden border-b border-harbor/10 bg-frost/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted md:grid md:grid-cols-3 md:px-6">
            <span>Candidate</span>
            <span className="text-center">Applied role</span>
            <span className="text-right">Review status</span>
          </div>
          <div className="divide-y divide-harbor/10 bg-white">
            {recentApplications.map(({ candidate, application, job, screeningEvaluation, decision }) => {
              const recommendation = decision?.humanRecommendation ?? screeningEvaluation?.recommendation
              const label = decision
                ? getScreeningRecommendationLabel(decision.humanRecommendation)
                : screeningEvaluation
                  ? getScreeningRecommendationLabel(screeningEvaluation.recommendation)
                  : 'Not screened'
              const subtitle = decision
                ? `Recruiter ${decision.reviewAction === 'CONFIRM' ? 'confirmed' : 'overrode'}`
                : formatApplicationStage(application.currentStage)
              return (
                <article
                  className="grid items-center gap-2 px-5 py-4 transition-colors duration-200 hover:bg-[#f8fafa] md:grid-cols-3 md:px-6"
                  key={application.id}
                >
                  <div className="min-w-0">
                    <Link className="text-sm font-semibold text-depth no-underline hover:text-marine transition-colors duration-150" to={`/candidates/${candidate.id}`}>
                      {candidate.fullName}
                    </Link>
                    <p className="mb-0 mt-0.5 truncate text-xs text-aura-text-muted">{candidate.currentPosition}</p>
                  </div>
                  <div className="min-w-0 md:text-center">
                    <Link className="text-sm font-medium text-harbor no-underline hover:text-depth transition-colors duration-150" to={`/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                    <p className="mb-0 mt-0.5 text-xs text-aura-text-muted">{formatDate(application.submittedAt)} · {subtitle}</p>
                  </div>
                  <div className="md:text-right">
                    <Badge tone={recommendationTone(recommendation)}>{label}</Badge>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* Row 2: Upcoming interviews and Calendar side-by-side */}
        <div className="grid gap-4 lg:grid-cols-5 items-start">
          {/* Upcoming interviews */}
          <div className="lg:col-span-3 overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm bg-white">
            <div className="bg-depth px-5 py-4 md:px-6">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Schedule</p>
              <h2 className="mb-0 mt-2 text-lg font-semibold text-white">Upcoming interviews</h2>
            </div>
            <div className="bg-white">
              {upcomingInterviews.length === 0 ? (
                <div className="p-5 md:p-6">
                  <div className="rounded-aura-sm border border-dashed border-harbor/20 bg-frost/50 p-5 text-center text-sm text-aura-text-secondary">
                    No upcoming interviews are currently scheduled.
                  </div>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="hidden border-b border-harbor/10 bg-frost/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted md:grid md:grid-cols-3 md:px-6">
                    <span>Candidate</span>
                    <span className="text-center">Date &amp; time</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-harbor/10">
                    {upcomingInterviews.map(({ interview, candidate, job }) => (
                      <article
                        className="grid items-center gap-2 px-5 py-4 transition-colors duration-200 hover:bg-[#f8fafa] md:grid-cols-3 md:px-6"
                        key={interview.id}
                      >
                        <div className="min-w-0">
                          <Link className="text-sm font-semibold text-depth no-underline hover:text-marine transition-colors duration-150" to={`/candidates/${candidate.id}`}>
                            {candidate.fullName}
                          </Link>
                          <p className="mb-0 mt-0.5 truncate text-xs text-aura-text-muted">{job.title}</p>
                        </div>
                        <div className="min-w-0 md:text-center">
                          <p className="m-0 text-sm font-semibold text-harbor">
                            {formatDate(interview.scheduledStart)} · {formatTime(interview.scheduledStart)}
                          </p>
                          <p className="mb-0 mt-0.5 text-xs text-slate-500">
                            With {interview.interviewers.map((person) => person.name).join(', ')}
                          </p>
                        </div>
                        <div className="md:text-right">
                          <Badge tone="accent">{interview.status}</Badge>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="lg:col-span-2 h-full">
            <DashboardCalendar upcomingInterviews={upcomingInterviews} />
          </div>
        </div>
      </div>

      {/* Active job openings — delayed entry, interactive rows */}
      <div className="mt-4 overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm opacity-0 [animation:fade-in-up_0.5s_ease-out_400ms_forwards]">
        {/* Dark header */}
        <div className="bg-depth px-5 py-4 md:px-6">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Open requisitions</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="m-0 text-lg font-semibold text-white">Active job openings</h2>
            {(() => {
              const totalPositions = activeJobs.reduce((sum, job) => sum + job.positionsCount, 0)
              return <Badge tone="success">{totalPositions} position{totalPositions === 1 ? '' : 's'} open</Badge>
            })()}
          </div>
        </div>
        {/* Job list rows — interactive hover */}
        <div className="divide-y divide-harbor/10 bg-white px-5 md:px-6">
          {activeJobs.map((job) => {
            const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
            const draftForm = selectDraftApplicationFormByJobId(state, job.id)
            return (
              <article
                className="group grid gap-3 py-4 transition-colors duration-200 hover:bg-[#f8fafa] cursor-pointer sm:grid-cols-[1fr_auto] sm:items-center"
                key={job.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-sm font-semibold text-depth group-hover:text-marine transition-colors duration-200">{job.title}</h3>
                    <Badge tone="success">Open</Badge>
                  </div>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">
                    {job.department} · {job.positionsCount} position{job.positionsCount === 1 ? '' : 's'} · {selectApplicationCountByJobId(state, job.id)} applications
                  </p>
                  <p className="mb-0 mt-2 text-xs font-medium text-harbor">
                    {publishedForm ? 'Form published' : draftForm ? 'Form in draft' : 'Form not configured'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link className={buttonLinkClass} to={`/jobs/${job.id}`}>View role</Link>
                  <Link className={buttonLinkClass} to={`/jobs/${job.id}/candidates`}>View candidates</Link>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <Card className="mt-4 p-5 md:p-6 opacity-0 [animation:fade-in-up_0.5s_ease-out_450ms_forwards]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Post-interview review</p><h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Transcript and analysis preparation</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">Preparation records support human evaluation and never make a final hiring decision.</p></div>
          <Link className={buttonLinkClass} to="/interviews">Open interview history</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Transcripts", postInterview.transcriptsNeedReview], ["Preparing", postInterview.preparing], ["Analysis review", postInterview.analysesNeedApproval], ["Approved", postInterview.approved]].map(([label, value]) => <div className="rounded-aura-sm bg-frost/70 p-3" key={label}><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{label}</p><p className="mb-0 mt-1 text-xl font-bold text-depth">{value}</p></div>)}
        </div>
        {postInterview.attention[0] ? <Link className="mt-4 inline-flex text-sm font-semibold text-harbor" to={postInterview.attention[0].status === 'TRANSCRIPT_REQUIRED' || postInterview.attention[0].status === 'TRANSCRIPT_DRAFT' ? `/interviews/${postInterview.attention[0].interview.id}/transcript` : `/interviews/${postInterview.attention[0].interview.id}/analysis`}>Review next completed interview</Link> : null}
        <div className="mt-5 border-t border-harbor/10 pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-marine">Final decisions</p><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{finalDecisions.readyForDecision} ready · {finalDecisions.needsDataReview} data review · {finalDecisions.onHold} on hold · {finalDecisions.decisionsRecorded} recorded</p></div>{finalDecisions.attention[0] ? <Link className="text-sm font-semibold text-harbor" to={`/candidates/${finalDecisions.attention[0].candidateId}/final-evaluation`}>Review final evaluation</Link> : null}</div></div>
      </Card>

      <Card className="mt-4 overflow-hidden p-0 opacity-0 [animation:fade-in-up_0.5s_ease-out_500ms_forwards]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-harbor/10 bg-frost/60 px-5 py-4">
          <div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Post-decision work</p><h2 className="mb-0 mt-1 text-base font-semibold text-depth">Outcome preparation and hold reviews</h2></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-aura-text-secondary">
            <span><strong className="text-depth">{postDecision.selectionMessagesToPrepare}</strong> selection</span>
            <span><strong className="text-depth">{postDecision.rejectionMessagesToPrepare}</strong> rejection</span>
            <span><strong className="text-depth">{postDecision.holdFollowUpsDue}</strong> hold due</span>
            <span className={postDecision.overdueHoldReviews ? 'font-semibold text-aura-danger' : ''}><strong>{postDecision.overdueHoldReviews}</strong> overdue</span>
          </div>
        </div>
        {postDecision.items.length ? (
          <div className="divide-y divide-harbor/10">
            {postDecision.items.slice(0, 5).map((item) => (
              <article className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={item.evaluation.id}>
                <div>
                  <Link className="text-sm font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${item.candidate.id}`}>{item.candidate.fullName}</Link>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">{item.job.title} · {item.evaluation.humanDecision === 'HOLD' && item.holdFollowUp ? item.holdFollowUp.status === 'READY_FOR_REVIEW' ? 'Hold review ready' : `Follow-up ${formatDate(item.holdFollowUp.followUpAt)}` : item.actionLabel}</p>
                </div>
                <Link className={buttonLinkClass} to={item.evaluation.humanDecision === 'HOLD' ? `/candidates/${item.candidate.id}/final-evaluation` : `/candidates/${item.candidate.id}/outcome`}>{item.actionLabel}</Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="m-0 px-5 py-4 text-sm text-aura-text-secondary">No post-decision work requires attention.</p>
        )}
      </Card>
    </PageContainer>
  )
}
