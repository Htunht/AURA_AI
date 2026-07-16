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
import { Progress } from '../components/ui/Progress'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  selectActiveJobs,
  selectApplicationCountByJobId,
  selectDashboardMetrics,
  selectDraftApplicationFormByJobId,
  selectHiringFunnel,
  selectPublishedApplicationFormByJobId,
  selectRecentApplications,
  selectUpcomingInterviews,
} from '../store/demoSelectors'
import { formatApplicationStage, formatDate, formatTime } from '../utils/helpers'
import { getScreeningRecommendationLabel } from '../utils/recommendation'

const DASHBOARD_NOW = new Date('2026-07-16T10:30:00Z')

const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-frost no-underline transition-colors hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier focus-visible:ring-offset-2'
const textLinkClass =
  'inline-flex items-center gap-1 text-sm font-semibold text-harbor no-underline transition-colors hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export default function Dashboard() {
  const { state } = useDemoStore()
  const metrics = selectDashboardMetrics(state, DASHBOARD_NOW)
  const funnel = selectHiringFunnel(state)
  const activeJobs = selectActiveJobs(state).slice(0, 3)
  const recentApplications = selectRecentApplications(state)
  const upcomingInterviews = selectUpcomingInterviews(state, DASHBOARD_NOW)
  const totalApplications = funnel.applications
  const funnelRows = [
    ['Applications', funnel.applications],
    ['AI screened', funnel.aiScreened],
    ['Shortlisted', funnel.shortlisted],
    ['Interviewed', funnel.interviewed],
    ['Selected', funnel.selected],
  ] as const
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
            <div className="mb-5 flex items-start justify-between gap-3">
              <p className="m-0 text-xs font-semibold text-aura-text-secondary">{label}</p>
              <span className="inline-grid size-9 place-items-center rounded-aura-sm bg-glacier/15 text-marine"><Icon size={18} aria-hidden="true" /></span>
            </div>
            <p className="m-0 text-3xl font-bold tracking-[-0.04em] text-depth">{value}</p>
            <p className="mb-0 mt-2 text-xs leading-5 text-aura-text-muted">{description}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <ScreeningAutomationStatus pendingRecruiterReviews={metrics.pendingRecruiterReviews} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="p-5 md:p-6">
          <div className="mb-5">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Pipeline signal</p>
            <h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Hiring funnel</h2>
          </div>
          <div className="grid gap-4">
            {funnelRows.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-aura-text-secondary">{label}</span>
                  <span className="font-bold text-depth">{value}</span>
                </div>
                <Progress value={totalApplications === 0 ? 0 : (value / totalApplications) * 100} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Open requisitions</p>
              <h2 className="mb-0 mt-2 text-lg font-semibold text-depth">Active job openings</h2>
            </div>
            <span className="text-xs font-semibold text-aura-text-muted">{activeJobs.length} active</span>
          </div>
          <div className="divide-y divide-harbor/10">
            {activeJobs.map((job) => {
              const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
              const draftForm = selectDraftApplicationFormByJobId(state, job.id)
              return (
                <article className="grid gap-3 py-4 first:pt-1 sm:grid-cols-[1fr_auto] sm:items-center" key={job.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-sm font-semibold text-depth">{job.title}</h3>
                      <Badge tone="success">Open</Badge>
                    </div>
                    <p className="mb-0 mt-1 text-xs text-aura-text-muted">{job.department} · {job.positionsCount} position{job.positionsCount === 1 ? '' : 's'} · {selectApplicationCountByJobId(state, job.id)} applications</p>
                    <p className="mb-0 mt-2 text-xs font-medium text-harbor">{publishedForm ? 'Form published' : draftForm ? 'Form in draft' : 'Form not configured'}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Link className={textLinkClass} to={`/jobs/${job.id}`}>View role</Link>
                    <Link className={textLinkClass} to={`/jobs/${job.id}/candidates`}>View candidates</Link>
                  </div>
                </article>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-harbor/10 px-5 py-4 md:px-6">
            <h2 className="m-0 text-lg font-semibold text-depth">Recent applications</h2>
            <p className="mb-0 mt-1 text-xs text-aura-text-muted">Newest submissions across all roles</p>
          </div>
          <div className="divide-y divide-harbor/10">
            {recentApplications.map(({ candidate, application, job, screeningEvaluation, decision }) => (
              <article className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center md:px-6" key={application.id}>
                <div className="min-w-0">
                  <Link className="font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                  <p className="mb-0 mt-1 truncate text-xs text-aura-text-muted">{candidate.currentPosition}</p>
                </div>
                <div className="min-w-0">
                  <Link className="text-sm font-medium text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}`}>{job.title}</Link>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">{formatDate(application.submittedAt)} · {formatApplicationStage(application.currentStage)}</p>
                </div>
                <div><Badge tone={recommendationTone(decision?.humanRecommendation ?? screeningEvaluation?.recommendation)}>{decision ? getScreeningRecommendationLabel(decision.humanRecommendation) : screeningEvaluation ? getScreeningRecommendationLabel(screeningEvaluation.recommendation) : 'Not screened'}</Badge>{decision ? <span className="mt-1 block text-[10px] text-aura-text-muted">Recruiter {decision.reviewAction === 'CONFIRM' ? 'confirmed' : 'overrode'}</span> : null}</div>
              </article>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="mb-5">
            <h2 className="m-0 text-lg font-semibold text-depth">Upcoming interviews</h2>
            <p className="mb-0 mt-1 text-xs text-aura-text-muted">Next scheduled candidate conversations</p>
          </div>
          {upcomingInterviews.length === 0 ? (
            <div className="rounded-aura-sm border border-dashed border-harbor/20 bg-frost/50 p-5 text-center text-sm text-aura-text-secondary">No upcoming interviews are currently scheduled.</div>
          ) : (
            <div className="grid gap-5">
              {upcomingInterviews.map(({ interview, candidate, job }) => (
                <article className="border-l-2 border-glacier pl-4" key={interview.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link className="font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                      <p className="mb-0 mt-1 text-xs text-aura-text-secondary">{job.title}</p>
                    </div>
                    <Badge tone="accent">{interview.status}</Badge>
                  </div>
                  <p className="mb-0 mt-3 text-sm font-semibold text-harbor">{formatDate(interview.scheduledStart)} · {formatTime(interview.scheduledStart)}</p>
                  <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">With {interview.interviewers.map((person) => person.name).join(', ')}</p>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
