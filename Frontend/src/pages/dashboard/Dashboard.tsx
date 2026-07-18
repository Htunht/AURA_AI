import {
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  ChevronDown,
  ListFilter,
  ScanSearch,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectDashboardMetrics,
  selectRecentApplications,
  selectUpcomingInterviews,
} from '../../store/demoSelectors'
import { formatApplicationStage, formatDate, formatTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'

const DASHBOARD_NOW = new Date('2026-07-16T10:30:00Z')

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

export function DashboardCalendar({
  upcomingInterviews,
  selectedDay,
  onSelectDay,
}: {
  upcomingInterviews: Array<{ interview: any; candidate: any; job: any }>
  selectedDay: number
  onSelectDay: (day: number) => void
}) {
  const daysInMonth = 31
  const startDayOffset = 3 // Wednesday for July 2026
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: startDayOffset }, () => null)
  const calendarCells = [...blanks, ...days]

  const getInterviewsForDay = (day: number) => {
    return upcomingInterviews.filter(({ interview }) => {
      const date = new Date(interview.scheduledStart)
      return date.getFullYear() === 2026 && date.getMonth() === 6 && date.getDate() === day
    })
  }

  return (
    <div className="overflow-hidden rounded-aura-md border border-[#1E2022]/15 bg-white p-5 shadow-aura-sm">
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
                onClick={() => onSelectDay(day)}
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
    </div>
  )
}

function DashboardWeeklyCalendar({ interviews }: { interviews: Array<{ interview: any; candidate: any; job: any }> }) {
  const startHour = 8
  const endHour = 18
  const hourHeight = 44
  const calendarHeight = (endHour - startHour) * hourHeight
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date('2026-07-12T00:00:00Z')
    date.setUTCDate(date.getUTCDate() + index)
    return date
  })

  const eventTones = [
    { backgroundColor: '#E8F2FF', borderColor: '#67A8E4' },
    { backgroundColor: '#E8F8F0', borderColor: '#4FB98A' },
    { backgroundColor: '#F1EAFE', borderColor: '#9B6DDB' },
    { backgroundColor: '#FFF4D9', borderColor: '#E3B348' },
  ]

  const formatCalendarTime = (value: string) => new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })

  const interviewsForDay = (date: Date) => interviews.filter(({ interview }) => {
    const interviewDate = new Date(interview.scheduledStart)
    return interviewDate.getUTCFullYear() === date.getUTCFullYear()
      && interviewDate.getUTCMonth() === date.getUTCMonth()
      && interviewDate.getUTCDate() === date.getUTCDate()
  })

  return (
    <section className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-harbor/10 px-5 py-4 md:px-6">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Interview schedule</p>
          <h2 className="mb-0 mt-1 text-lg font-semibold text-depth">Today task</h2>
        </div>
        <Badge tone="accent">July 12–18</Badge>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(112px,1fr))] border-b border-harbor/10 bg-white">
            <div className="grid place-items-center border-r border-harbor/10 px-2 text-[10px] font-bold text-aura-text-muted">GMT+0</div>
            {weekDays.map((date) => {
              const isToday = date.getUTCDate() === 16
              return (
                <div className="border-r border-harbor/10 px-2 py-3 text-center last:border-r-0" key={date.toISOString()}>
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted">
                    {date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                  </p>
                  <span className={`mt-1 inline-grid size-10 place-items-center rounded-full text-xs font-bold ${isToday ? 'bg-depth text-[#C7FF38] shadow-aura-sm' : 'text-depth'}`}>
                    {String(date.getUTCDate()).padStart(2, '0')}/07
                  </span>
                </div>
              )
            })}
          </div>

          <div className="relative grid grid-cols-[72px_repeat(7,minmax(112px,1fr))]" style={{ height: calendarHeight }}>
            <div className="relative border-r border-harbor/10 bg-white">
              {hours.map((hour, index) => (
                <span
                  className="absolute right-3 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-aura-text-muted"
                  key={hour}
                  style={{ top: Math.min(index * hourHeight, calendarHeight - 1) }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>

            {weekDays.map((date, dayIndex) => {
              const dayInterviews = interviewsForDay(date)
              const isToday = date.getUTCDate() === 16

              return (
                <div className={`relative border-r border-harbor/10 last:border-r-0 ${isToday ? 'bg-[#C7FF38]/[0.035]' : 'bg-white'}`} key={date.toISOString()}>
                  {Array.from({ length: endHour - startHour }, (_, hourIndex) => (
                    <div className="border-b border-harbor/[0.08]" key={hourIndex} style={{ height: hourHeight }} />
                  ))}

                  {dayInterviews.map(({ interview, candidate, job }, eventIndex) => {
                    const eventStart = new Date(interview.scheduledStart)
                    const eventEnd = new Date(interview.scheduledEnd)
                    const minutesFromStart = (eventStart.getUTCHours() - startHour) * 60 + eventStart.getUTCMinutes()
                    const durationMinutes = Math.max(30, (eventEnd.getTime() - eventStart.getTime()) / 60_000)
                    const top = Math.max(2, (minutesFromStart / 60) * hourHeight + 3)
                    const height = Math.max(38, (durationMinutes / 60) * hourHeight - 4)
                    const tone = eventTones[(dayIndex + eventIndex) % eventTones.length]

                    if (minutesFromStart < 0 || top >= calendarHeight) return null

                    return (
                      <Link
                        className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-aura-sm border-l-[3px] px-2 py-1.5 no-underline shadow-sm transition-transform hover:z-20 hover:-translate-y-0.5 hover:shadow-aura-sm focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marine"
                        key={interview.id}
                        style={{ top, height: Math.min(height, calendarHeight - top), ...tone }}
                        to={`/candidates/${candidate.id}`}
                      >
                        <p className="m-0 truncate text-[9px] font-bold tabular-nums text-harbor">
                          {formatCalendarTime(interview.scheduledStart)} – {formatCalendarTime(interview.scheduledEnd)}
                        </p>
                        <p className="mb-0 mt-0.5 truncate text-[11px] font-bold text-depth">{candidate.fullName}</p>
                        <p className="mb-0 mt-0.5 truncate text-[9px] text-aura-text-muted">{job.title}</p>
                      </Link>
                    )
                  })}
                </div>
              )
            })}

            <div
              aria-label="Current time: 10:30 UTC"
              className="pointer-events-none absolute left-[72px] right-0 z-20 border-t border-red-400/80"
              role="img"
              style={{ top: ((((DASHBOARD_NOW.getUTCHours() - startHour) * 60) + DASHBOARD_NOW.getUTCMinutes()) / 60) * hourHeight }}
              title="Current time: 10:30 UTC"
            >
              <span className="absolute -left-1.5 -top-1.5 size-3 rounded-full border-2 border-white bg-red-500 shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { state } = useDemoStore()
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(16)
  const [dashboardPeriod, setDashboardPeriod] = useState('Week')
  const metrics = selectDashboardMetrics(state, DASHBOARD_NOW)
  const recentApplications = selectRecentApplications(state)
  const upcomingInterviews = selectUpcomingInterviews(state, DASHBOARD_NOW)
  const selectedDateInterviews = upcomingInterviews.filter(({ interview }) => {
    const date = new Date(interview.scheduledStart)
    return date.getFullYear() === 2026 && date.getMonth() === 6 && date.getDate() === selectedCalendarDay
  })
  const weeklyInterviews = state.interviews.flatMap((interview) => {
    const application = state.applications.find((item) => item.id === interview.applicationId)
    const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
    const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
    return candidate && job ? [{ interview, candidate, job }] : []
  })
  const metricCards = [
    { label: 'Active job openings', value: metrics.activeJobs, description: 'Roles currently accepting applications', icon: BriefcaseBusiness },
    { label: 'Total candidates', value: metrics.totalCandidates, description: 'Candidate profiles in the workspace', icon: Users },
    { label: 'Pending recruiter reviews', value: metrics.pendingRecruiterReviews, description: 'Review recommendations requiring attention', icon: ScanSearch },
    { label: 'Interviews today', value: metrics.interviewsToday, description: 'Sessions scheduled for Jul 16', icon: CalendarClock },
  ]

  return (
    <PageContainer
      eyebrow=""
      title="Recruitment overview"
      actions={(
        <label className="relative inline-flex h-10 min-w-32 items-center rounded-aura-sm border border-harbor/20 bg-white shadow-sm transition-colors hover:border-marine/40 hover:bg-frost/45 focus-within:border-marine focus-within:ring-2 focus-within:ring-marine/15">
          <ListFilter className="pointer-events-none absolute left-3 text-marine" size={16} aria-hidden="true" />
          <span className="sr-only">Dashboard time period</span>
          <select
            className="h-full w-full cursor-pointer appearance-none rounded-aura-sm bg-transparent py-0 pl-9 pr-9 text-sm font-semibold text-depth outline-none"
            onChange={(event) => setDashboardPeriod(event.target.value)}
            value={dashboardPeriod}
          >
            <option>Day</option>
            <option>Week</option>
            <option>Month</option>
            <option>Year</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 text-aura-text-muted" size={15} aria-hidden="true" />
        </label>
      )}
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

      <div className="mt-4 grid gap-4">
        <div className="grid items-start gap-3 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <DashboardWeeklyCalendar interviews={weeklyInterviews} />
          </div>

          <div className="grid gap-4 xl:col-span-1">
            <DashboardCalendar
              onSelectDay={setSelectedCalendarDay}
              selectedDay={selectedCalendarDay}
              upcomingInterviews={upcomingInterviews}
            />

            <section className="flex h-[248px] flex-col overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-sm">
              <header className="flex shrink-0 items-center justify-between border-b border-harbor/10 px-4 py-3">
                <div>
                  <h2 className="m-0 text-base font-semibold text-depth">Upcoming events</h2>
                  <p className="mb-0 mt-0.5 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">July {selectedCalendarDay}</p>
                </div>
                <Badge tone="accent">{selectedDateInterviews.length}</Badge>
              </header>
              {selectedDateInterviews.length === 0 ? (
                <p className="m-0 grid flex-1 place-items-center px-4 py-5 text-center text-sm text-aura-text-muted">No upcoming interviews on this date.</p>
              ) : (
                <div className="min-h-0 flex-1 divide-y divide-harbor/10 overflow-y-auto">
                  {selectedDateInterviews.map(({ interview, candidate, job }) => (
                    <article className="min-h-[91px] px-4 py-3 transition-colors hover:bg-frost/45" key={interview.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link className="text-sm font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                          <p className="mb-0 mt-0.5 truncate text-xs text-aura-text-muted">{job.title}</p>
                        </div>
                        <Badge tone="accent">{interview.status}</Badge>
                      </div>
                      <p className="mb-0 mt-2 text-xs font-semibold text-harbor">
                        {formatDate(interview.scheduledStart)} · {formatTime(interview.scheduledStart)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-sm">
          <header className="flex items-center justify-between border-b border-harbor/10 px-6 py-4 md:px-7">
            <h2 className="m-0 text-lg font-semibold text-depth">Recent applications</h2>
            <Badge>{recentApplications.length}</Badge>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
              <thead className="border-b border-depth bg-depth">
                <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/75">
                  <th className="w-[19%] px-4 py-2.5 pl-5 md:pl-6" scope="col">Candidate</th>
                  <th className="w-[23%] px-4 py-2.5" scope="col">Current position</th>
                  <th className="w-[24%] px-4 py-2.5" scope="col">Applied role</th>
                  <th className="w-[16%] px-4 py-2.5" scope="col">Stage</th>
                  <th className="w-[18%] px-4 py-2.5 pr-5 md:pr-6" scope="col">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harbor/10">
                {recentApplications.map(({ candidate, application, job, screeningEvaluation, decision }) => {
                  const recommendation = decision?.humanRecommendation ?? screeningEvaluation?.recommendation
                  const label = decision
                    ? getScreeningRecommendationLabel(decision.humanRecommendation)
                    : screeningEvaluation
                      ? getScreeningRecommendationLabel(screeningEvaluation.recommendation)
                      : 'Not screened'
                  const stage = decision
                    ? `Recruiter ${decision.reviewAction === 'CONFIRM' ? 'confirmed' : 'overrode'}`
                    : formatApplicationStage(application.currentStage)
                  return (
                    <tr className="transition-colors hover:bg-frost/45" key={application.id}>
                      <td className="px-4 py-2.5 pl-5 md:pl-6">
                        <Link className="whitespace-nowrap text-sm font-semibold text-depth no-underline hover:text-marine" to={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
                      </td>
                      <td className="max-w-0 truncate px-4 py-2.5 text-xs text-aura-text-secondary">{candidate.currentPosition}</td>
                      <td className="max-w-0 truncate px-4 py-2.5">
                        <Link className="text-sm font-medium text-harbor no-underline hover:text-depth" to={`/jobs/${job.id}`}>{job.title}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-aura-text-secondary">{stage}</td>
                      <td className="px-4 py-2.5 pr-5 md:pr-6">
                        <Badge tone={recommendationTone(recommendation)}>{label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </PageContainer>
  )
}
