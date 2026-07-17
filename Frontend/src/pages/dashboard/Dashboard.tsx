import {
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  ScanSearch,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { ScreeningAutomationStatus } from '../../components/screening/ScreeningAutomationStatus'
import { Badge } from '../../components/ui/Badge'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectActiveJobs,
  selectApplicationCountByJobId,
  selectDashboardMetrics,
  selectDraftApplicationFormByJobId,
  selectPublishedApplicationFormByJobId,
  selectRecentApplications,
} from '../../store/demoSelectors'
import { formatTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'

const DASHBOARD_NOW = new Date('2026-07-16T10:30:00Z')

// Custom theme primary link styled according to guidelines
const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm bg-[#171717] hover:bg-[#85ab22] hover:shadow-[0_0_12px_rgba(133,171,34,0.6)] hover:text-white px-4 text-sm font-bold text-white no-underline transition-all duration-200 ease-in-out shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#85ab22]'

// Helper to compute initials for avatars
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Relative time helper to generate timestamps relative to DASHBOARD_NOW
function getRelativeTime(dateString: string, baseDate: Date = DASHBOARD_NOW) {
  const diffMs = baseDate.getTime() - new Date(dateString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) {
    return 'Just now'
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHr < 24) {
    return `${diffHr}h ago`
  } else if (diffDay === 1) {
    return 'Yesterday'
  } else {
    return `${diffDay}d ago`
  }
}

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

function recommendationTone(recommendation?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'accent' {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

// Format selectedDate for header display
const formatSelectedDateHeader = (dateStr: string) => {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const day = parseInt(parts[2])
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(year, month, day))
}

const monthsList = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Dashboard() {
  const { state } = useDemoStore()
  const metrics = selectDashboardMetrics(state, DASHBOARD_NOW)
  const activeJobs = selectActiveJobs(state).slice(0, 3)
  const recentApplications = selectRecentApplications(state)

  // Calendar State
  const [selectedDate, setSelectedDate] = useState('2026-07-16')
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(6) // July (0-indexed)
  const [localInterviews, setLocalInterviews] = useState<any[]>([])

  // Scheduling Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [formCandidate, setFormCandidate] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formTime, setFormTime] = useState('10:00')
  const [formPanel, setFormPanel] = useState('')

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Calculate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const blanks = Array(firstDay).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const calendarCells = [...blanks, ...days]

  const hasInterviewOnDate = (dateStr: string) => {
    const storeHas = state.interviews.some(
      (interview) => interview.scheduledStart.substring(0, 10) === dateStr
    )
    const localHas = localInterviews.some(
      (item) => item.scheduledStart.substring(0, 10) === dateStr
    )
    return storeHas || localHas
  }

  const getInterviewsForDate = (dateStr: string) => {
    // 1. Database interviews matching select date
    const dbInterviewsEnriched = state.interviews
      .filter((interview) => interview.scheduledStart.substring(0, 10) === dateStr)
      .map((interview) => {
        const application = state.applications.find((app) => app.id === interview.applicationId)
        const candidate = application
          ? state.candidates.find((cand) => cand.id === application.candidateId)
          : undefined
        const job = application
          ? state.jobs.find((j) => j.id === application.jobId)
          : undefined

        return {
          id: interview.id,
          candidateName: candidate?.fullName || 'Unknown Candidate',
          jobTitle: job?.title || 'Unknown Role',
          time: formatTime(interview.scheduledStart),
          panel: interview.interviewers.map((p) => p.name).join(', '),
          status: interview.status
        }
      })

    // 2. Local scheduled interviews matching select date
    const customInterviews = localInterviews
      .filter((item) => item.scheduledStart.substring(0, 10) === dateStr)
      .map((item) => ({
        id: item.id,
        candidateName: item.candidateName,
        jobTitle: item.jobTitle,
        time: item.timeFormatted,
        panel: item.panel,
        status: item.status
      }))

    return [...dbInterviewsEnriched, ...customInterviews]
  }

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCandidate || !formRole) return

    const [hours, minutes] = formTime.split(':')
    const timeFormatted = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(2026, 6, 16, parseInt(hours), parseInt(minutes)))

    const newMock = {
      id: `mock-int-${Date.now()}`,
      scheduledStart: `${selectedDate}T${formTime}:00Z`,
      candidateName: formCandidate,
      jobTitle: formRole,
      timeFormatted,
      panel: formPanel || 'Alice Morgan, Robert Chen',
      status: 'SCHEDULED'
    }

    setLocalInterviews([...localInterviews, newMock])
    setFormCandidate('')
    setFormRole('')
    setFormTime('10:00')
    setFormPanel('')
    setShowAddForm(false)
  }

  const selectedDateInterviews = getInterviewsForDate(selectedDate)
  
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
      {/* 1. KPI Header (Top) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map(({ label, value, description, icon: Icon }, i) => (
          <div
            className="opacity-0 animate-fade-in-up"
            key={label}
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="group relative overflow-hidden rounded-aura-md border border-slate-100 bg-white p-6 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#C7FF38]/60 hover:-translate-y-1 transition-all duration-300 ease-out cursor-default h-full flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                  </span>
                  <span className="inline-grid size-10 place-items-center rounded-aura-sm bg-[#171717] text-[#C7FF38] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#C7FF38] group-hover:text-[#171717]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className="m-0 text-3xl font-extrabold tracking-tight text-[#171717]">
                  <AnimatedNumber value={value} />
                </p>
              </div>
              <p className="mb-0 mt-3 text-xs leading-relaxed text-slate-400 font-medium">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Screening automation panel — full-width between top & bottom */}
      <div 
        className="mt-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <ScreeningAutomationStatus pendingRecruiterReviews={metrics.pendingRecruiterReviews} />
      </div>

      {/* 2. The Asymmetrical Core (Bottom Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* LEFT COLUMN - Active Job Openings & Activity Feed (lg:col-span-2) */}
        <div 
          className="lg:col-span-2 space-y-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          {/* Active Job Openings Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#171717]">Active Job Openings</h2>
              <Link 
                to="/jobs" 
                className="text-xs font-semibold text-[#171717] hover:text-white hover:bg-[#85ab22] hover:shadow-[0_0_10px_rgba(133,171,34,0.5)] px-2 py-1 rounded transition-all duration-200 flex items-center gap-0.5"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeJobs.map((job) => {
                const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
                const draftForm = selectDraftApplicationFormByJobId(state, job.id)
                const appCount = selectApplicationCountByJobId(state, job.id)
                const statusTone = publishedForm ? 'success' : draftForm ? 'warning' : 'neutral'
                const statusLabel = publishedForm ? 'Active' : draftForm ? 'Draft' : 'Not configured'
                
                return (
                  <div
                    key={job.id}
                    className="group bg-white p-5 rounded-aura-md border border-slate-100 shadow-sm hover:shadow-md hover:border-[#C7FF38]/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[200px]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {job.department}
                        </span>
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                      </div>
                      <h3 className="text-base font-bold text-[#171717] group-hover:text-[#85ab22] transition-colors duration-200 line-clamp-1 w-fit">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mb-5">
                        Created in {job.department}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Tiny info icons */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
                        <span className="flex items-center gap-1.5">
                          <BriefcaseBusiness size={13} className="text-[#C7FF38] bg-[#171717] p-0.5 rounded transition-transform duration-300 group-hover:scale-110" />
                          {job.positionsCount} {job.positionsCount === 1 ? 'position' : 'positions'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-[#C7FF38] bg-[#171717] p-0.5 rounded transition-transform duration-300 group-hover:scale-110" />
                          {appCount} {appCount === 1 ? 'applicant' : 'applicants'}
                        </span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          className="flex h-8 items-center justify-center rounded-aura-sm bg-white hover:bg-[#85ab22] border border-slate-200 text-xs font-bold text-[#171717] hover:text-white hover:border-[#85ab22] hover:shadow-[0_0_12px_rgba(133,171,34,0.6)] no-underline transition-all duration-200 active:scale-95 text-center"
                          to={`/jobs/${job.id}`}
                        >
                          Details
                        </Link>
                        <Link
                          className="flex h-8 items-center justify-center rounded-aura-sm bg-[#C7FF38] hover:bg-[#85ab22] border border-transparent text-xs font-bold text-[#171717] hover:text-white hover:shadow-[0_0_12px_rgba(133,171,34,0.6)] no-underline transition-all duration-200 active:scale-95 text-center shadow-sm"
                          to={`/jobs/${job.id}/candidates`}
                        >
                          Candidates
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Dashed "Add New Role" card */}
              <Link
                to="/jobs/new"
                className="group flex flex-col items-center justify-center p-6 bg-white rounded-aura-md border-2 border-dashed border-slate-200 hover:border-[#C7FF38] hover:bg-[#C7FF38]/5 hover:-translate-y-1 transition-all duration-300 text-center min-h-[200px]"
              >
                <div className="size-10 rounded-full bg-[#171717] text-[#C7FF38] mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#85ab22] group-hover:text-white group-hover:shadow-[0_0_12px_rgba(133,171,34,0.6)]">
                  <Plus size={18} />
                </div>
                <span className="text-sm font-bold text-[#171717] group-hover:text-[#85ab22] transition-colors duration-200">
                  Add New Role
                </span>
                <p className="text-xs text-slate-400 mt-1 max-w-[160px] font-medium leading-relaxed">
                  Configure evidence questions & screening rules
                </p>
              </Link>
            </div>
          </div>

          {/* Activity Feed Section */}
          <div className="bg-white rounded-aura-md border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#171717]">Activity Feed</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C7FF38] bg-[#171717] px-2.5 py-1 rounded-full shrink-0">
                Live Submissions
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {recentApplications.map(({ candidate, application, job, screeningEvaluation, decision }) => {
                const timestamp = getRelativeTime(application.submittedAt)
                const recommendation = decision?.humanRecommendation ?? screeningEvaluation?.recommendation
                const label = decision
                  ? getScreeningRecommendationLabel(decision.humanRecommendation)
                  : screeningEvaluation
                    ? getScreeningRecommendationLabel(screeningEvaluation.recommendation)
                    : 'Not screened'
                const recTone = recommendationTone(recommendation)

                return (
                  <Link
                    key={application.id}
                    to={`/candidates/${candidate.id}`}
                    className="block p-4 hover:bg-slate-50/80 transition-colors duration-200 cursor-pointer group no-underline"
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="size-9 rounded-full bg-slate-100 text-[#171717] font-semibold text-xs flex items-center justify-center transition-all duration-300 group-hover:bg-[#C7FF38] group-hover:text-[#171717] shrink-0">
                        {getInitials(candidate.fullName)}
                      </div>

                      {/* Info Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-bold text-[#171717] group-hover:text-[#85ab22] transition-colors duration-200 truncate">
                            {candidate.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2.5 truncate font-medium">
                          Applied for <span className="font-semibold text-slate-700">{job.title}</span>
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-slate-400 truncate">
                            {candidate.currentPosition || 'No current role'}
                          </span>
                          <div className="scale-90 origin-right shrink-0">
                            <Badge tone={recTone}>{label}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Mini-Calendar & Upcoming Interviews (lg:col-span-1) */}
        <div 
          className="lg:col-span-1 space-y-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '500ms' }}
        >
          {/* Mini-Calendar Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-300 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Calendar size={16} className="text-[#171717]" />
                <h3 className="text-sm font-bold text-[#171717]">
                  {monthsList[currentMonth]} {currentYear}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border-0 cursor-pointer"
                  type="button"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border-0 cursor-pointer"
                  type="button"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Week abbreviation row */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-slate-600">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`blank-${idx}`} className="h-9" />
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === '2026-07-16'
                const hasInterview = hasInterviewOnDate(dateStr)

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDate(dateStr)}
                    className="bg-transparent border-0 p-0 focus:outline-none w-full"
                    type="button"
                  >
                    <div 
                      className={`relative flex flex-col items-center justify-center h-9 w-9 mx-auto rounded-full cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#C7FF38] text-[#171717] font-extrabold shadow-sm' 
                          : isToday 
                            ? 'border-2 border-[#171717] hover:bg-slate-100 font-bold' 
                            : 'hover:bg-[#C7FF38]/20 text-[#171717]'
                      }`}
                    >
                      <span className="text-xs">{day}</span>
                      {hasInterview && (
                        <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full animate-pulse ${
                          isSelected ? 'bg-[#171717]' : 'bg-[#C7FF38]'
                        }`} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upcoming Interviews Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-[#171717]" />
                <h2 className="text-base font-bold text-[#171717]">Interviews</h2>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs font-bold text-[#C7FF38] hover:text-white bg-[#171717] hover:bg-[#85ab22] hover:shadow-[0_0_10px_rgba(133,171,34,0.5)] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-0.5"
                type="button"
              >
                Schedule +
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Interviews on {formatSelectedDateHeader(selectedDate)}
              </p>

              {/* Inline Schedule Mock Event Form */}
              {showAddForm && (
                <form 
                  onSubmit={handleScheduleSubmit}
                  className="mb-4 p-4 border border-slate-200/80 bg-slate-50/50 rounded-xl space-y-3"
                >
                  <p className="text-xs font-bold text-[#171717] m-0">Schedule Mock Session</p>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Candidate</label>
                    <input 
                      type="text" 
                      required
                      value={formCandidate}
                      onChange={(e) => setFormCandidate(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-[#171717] focus:outline-none focus:border-[#C7FF38]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Role</label>
                      <input 
                        type="text" 
                        required
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        placeholder="Software Engineer"
                        className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-[#171717] focus:outline-none focus:border-[#C7FF38]"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Time</label>
                      <input 
                        type="time" 
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-[#171717] focus:outline-none focus:border-[#C7FF38]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Panel</label>
                    <input 
                      type="text" 
                      value={formPanel}
                      onChange={(e) => setFormPanel(e.target.value)}
                      placeholder="Alice Morgan, Robert Chen"
                      className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-[#171717] focus:outline-none focus:border-[#C7FF38]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer px-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold text-[#171717] bg-[#C7FF38] hover:bg-[#85ab22] border border-transparent hover:text-white hover:shadow-[0_0_12px_rgba(133,171,34,0.6)] px-3 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      Save Event
                    </button>
                  </div>
                </form>
              )}

              {/* Reactive interviews display */}
              {selectedDateInterviews.length === 0 ? (
                <div className="text-center py-6">
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-xs text-slate-400 font-medium">
                    No sessions scheduled for this date.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateInterviews.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 border border-slate-100 rounded-xl bg-white hover:border-[#C7FF38] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col justify-between gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#171717]">{item.candidateName}</span>
                        <span className="text-[10px] font-bold text-[#C7FF38] bg-[#171717] border border-[#C7FF38]/20 px-2.5 py-0.5 rounded-full">{item.time}</span>
                      </div>
                      <p className="m-0 text-[11px] text-slate-500 font-semibold">{item.jobTitle}</p>
                      <p className="m-0 text-[10px] text-slate-400">Panel: {item.panel}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Premier Subscription Ad Card */}
          <div className="bg-gradient-to-br from-[#171717] to-[#262626] rounded-2xl border border-slate-100 p-5 text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            {/* Ambient decorative circle glows */}
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-[#C7FF38]/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute -left-4 -top-4 size-16 rounded-full bg-[#C7FF38]/10 blur-lg" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-grid size-8 place-items-center rounded-lg bg-[#C7FF38]/10 text-[#C7FF38]">
                  <Sparkles size={16} className="animate-pulse" />
                </span>
                <h3 className="text-sm font-bold tracking-wide">Go to Premier</h3>
              </div>
              <p className="text-xs text-slate-200/90 leading-relaxed mb-4 font-medium">
                Unlock unlimited AI candidate screening, custom scheduling workflows, and advanced intelligence reports.
              </p>
              <button
                type="button"
                className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-[#C7FF38] hover:bg-[#85ab22] hover:shadow-[0_0_12px_rgba(133,171,34,0.6)] text-xs font-bold text-[#171717] hover:text-white transition-all duration-200 border-0 cursor-pointer shadow-sm active:scale-95"
              >
                <span>Upgrade to Premier</span>
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </PageContainer>
  )
}
