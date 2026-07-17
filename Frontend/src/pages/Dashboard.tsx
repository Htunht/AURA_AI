import {
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  ScanSearch,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { ScreeningAutomationStatus } from '../components/screening/ScreeningAutomationStatus'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  selectActiveJobs,
  selectApplicationCountByJobId,
  selectDashboardMetrics,
  selectDraftApplicationFormByJobId,
  selectPublishedApplicationFormByJobId,
  selectRecentApplications,
  selectUpcomingInterviews,
} from '../store/demoSelectors'
import { formatApplicationStage, formatDate, formatTime } from '../utils/helpers'
import { getScreeningRecommendationLabel } from '../utils/recommendation'

const DASHBOARD_NOW = new Date('2026-07-16T10:30:00Z')

const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-4 text-sm font-semibold text-[#1E2022] no-underline transition-all shadow-[0_0_10px_rgba(199,255,56,0.45)] hover:bg-[#a5db2c] hover:border-[#a5db2c] hover:shadow-[0_0_16px_rgba(199,255,56,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FF38] focus-visible:ring-offset-2'
const buttonLinkClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-3 text-xs font-semibold text-[#1E2022] no-underline transition-all shadow-[0_0_10px_rgba(199,255,56,0.45)] hover:bg-[#a5db2c] hover:shadow-[0_0_16px_rgba(199,255,56,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FF38] focus-visible:ring-offset-2'

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export default function Dashboard() {
  const { state } = useDemoStore()
  const metrics = selectDashboardMetrics(state, DASHBOARD_NOW)
  const activeJobs = selectActiveJobs(state).slice(0, 3)
  const recentApplications = selectRecentApplications(state)
  const upcomingInterviews = selectUpcomingInterviews(state, DASHBOARD_NOW)
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, description, icon: Icon }) => (
          <Card className="relative overflow-hidden p-5" key={label}>
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <p className="m-0 text-sm font-semibold text-aura-text-secondary">{label}</p>
              <span className="inline-grid size-9 place-items-center rounded-aura-sm bg-glacier/15 text-marine"><Icon size={18} aria-hidden="true" /></span>
            </div>
            <p className="m-0 text-4xl font-bold tracking-[-0.04em] text-depth">{value}</p>
            <p className="mb-0 mt-2.5 text-xs leading-5 text-aura-text-muted">{description}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <ScreeningAutomationStatus pendingRecruiterReviews={metrics.pendingRecruiterReviews} />
      </div>

      <div className="mt-4 overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm">
        {/* Card dark header */}
        <div className="bg-depth px-5 py-4 md:px-6">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Open requisitions</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="m-0 text-lg font-semibold text-white">Active job openings</h2>
            {(() => {
              const totalPositions = activeJobs.reduce((sum, job) => sum + job.positionsCount, 0)
              return (
                // <span className="inline-flex items-center rounded-full bg-aura-success-soft px-2.5 py-0.5 text-[11px] font-bold text-aura-success">
                //   {totalPositions} position{totalPositions === 1 ? '' : 's'} open
                // </span>

                <Badge tone="success"> {totalPositions} position{totalPositions === 1 ? '' : 's'} open</Badge>
              )
            })()}
          </div>
        </div>
        {/* Job list rows */}
        <div className="divide-y divide-harbor/10 bg-white px-5 md:px-6">
          {activeJobs.map((job) => {
            const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
            const draftForm = selectDraftApplicationFormByJobId(state, job.id)
            return (
              <article className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center" key={job.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-sm font-semibold text-depth">{job.title}</h3>
                    <Badge tone="success">Open</Badge>
                  </div>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">{job.department} · {job.positionsCount} position{job.positionsCount === 1 ? '' : 's'} · {selectApplicationCountByJobId(state, job.id)} applications</p>
                  <p className="mb-0 mt-2 text-xs font-medium text-harbor">{publishedForm ? 'Form published' : draftForm ? 'Form in draft' : 'Form not configured'}</p>
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

      <div className="mt-4 grid gap-4">
        {/* Recent applications — vertical card */}
        <div className="overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm">
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
              const label = decision ? getScreeningRecommendationLabel(decision.humanRecommendation) : screeningEvaluation ? getScreeningRecommendationLabel(screeningEvaluation.recommendation) : 'Not screened'
              const subtitle = decision ? `Recruiter ${decision.reviewAction === 'CONFIRM' ? 'confirmed' : 'overrode'}` : formatApplicationStage(application.currentStage)
              return (
                <article className="grid items-center gap-2 px-5 py-4 md:grid-cols-3 md:px-6" key={application.id}>
                  {/* Col 1 — Candidate */}
                  <div className="min-w-0">
                    <Link className="text-sm font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                    <p className="mb-0 mt-0.5 truncate text-xs text-aura-text-muted">{candidate.currentPosition}</p>
                  </div>
                  {/* Col 2 — Role & date */}
                  <div className="min-w-0 md:text-center">
                    <Link className="text-sm font-medium text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}`}>{job.title}</Link>
                    <p className="mb-0 mt-0.5 text-xs text-aura-text-muted">{formatDate(application.submittedAt)} · {subtitle}</p>
                  </div>
                  {/* Col 3 — Review status (focus) */}
                  <div className="md:text-right">
                    <Badge tone={recommendationTone(recommendation)}>{label}</Badge>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* Upcoming interviews — vertical card */}
        <div className="overflow-hidden rounded-aura-md border border-harbor/15 shadow-aura-sm">
          <div className="bg-depth px-5 py-4 md:px-6">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Schedule</p>
            <h2 className="mb-0 mt-2 text-lg font-semibold text-white">Upcoming interviews</h2>
          </div>
          <div className="bg-white">
            {upcomingInterviews.length === 0 ? (
              <div className="p-5 md:p-6">
                <div className="rounded-aura-sm border border-dashed border-harbor/20 bg-frost/50 p-5 text-center text-sm text-aura-text-secondary">No upcoming interviews are currently scheduled.</div>
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
                    <article className="grid items-center gap-2 px-5 py-4 md:grid-cols-3 md:px-6" key={interview.id}>
                      {/* Col 1 — Candidate */}
                      <div className="min-w-0">
                        <Link className="text-sm font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                        <p className="mb-0 mt-0.5 truncate text-xs text-aura-text-muted">{job.title}</p>
                      </div>
                      {/* Col 2 — Schedule */}
                      <div className="min-w-0 md:text-center">
                        <p className="m-0 text-sm font-semibold text-harbor">{formatDate(interview.scheduledStart)} · {formatTime(interview.scheduledStart)}</p>
                        <p className="mb-0 mt-0.5 text-xs text-aura-text-muted">With {interview.interviewers.map((person) => person.name).join(', ')}</p>
                      </div>
                      {/* Col 3 — Status */}
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
      </div>
    </PageContainer>
  )
}
