import type { DemoState } from '../store/demoStateTypes'
import type {
  BackendInterviewCalendarResponse,
  CalendarInterview,
  CalendarInterviewType,
  InterviewCalendarFilters,
} from '../types/interviewCalendar'

export const CANCELLED_INTERVIEW_STATUSES = new Set(['CANCELLED'])
export const PENDING_INTERVIEW_STATUSES = new Set(['DRAFT', 'PENDING_CONFIRMATION', 'NEEDS_RESCHEDULING'])

export function mapBackendInterviewCalendar(response: BackendInterviewCalendarResponse): CalendarInterview[] {
  return response.days.flatMap((day) => day.interviews.map((item) => ({
    id: item.id,
    applicationId: item.application_id,
    candidateId: item.candidate_id,
    candidateName: item.candidate_name,
    jobId: item.job_id,
    jobTitle: item.job_title,
    interviewers: item.interviewer_id && item.interviewer_name ? [{ id: item.interviewer_id, name: item.interviewer_name }] : [],
    interviewType: item.interview_type,
    status: item.status,
    scheduledStart: item.scheduled_start,
    scheduledEnd: item.scheduled_end,
    timezone: item.timezone,
    location: item.location ?? undefined,
    meetingUrl: item.meeting_url ?? undefined,
  })))
}

export function mapDemoInterviewCalendar(state: DemoState): CalendarInterview[] {
  return state.interviews.flatMap((interview) => {
    const application = state.applications.find((item) => item.id === interview.applicationId)
    const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
    const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
    if (!application || !candidate || !job) return []
    return [{
      id: interview.id,
      applicationId: application.id,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      jobId: job.id,
      jobTitle: job.title,
      interviewers: interview.interviewers.map((person) => ({ id: person.id, name: person.name })),
      interviewType: inferDemoInterviewType(interview.questions.map((question) => question.type)),
      status: interview.status,
      scheduledStart: interview.scheduledStart,
      scheduledEnd: interview.scheduledEnd,
      timezone: interview.timezone,
      location: interview.location,
      meetingUrl: interview.meetingLink,
    } satisfies CalendarInterview]
  })
}

function inferDemoInterviewType(questionTypes: string[]): CalendarInterviewType {
  if (questionTypes.includes('TECHNICAL')) return 'TECHNICAL'
  if (questionTypes.includes('BEHAVIORAL')) return 'BEHAVIORAL'
  return 'SCREENING'
}

export function filterCalendarInterviews(items: CalendarInterview[], filters: InterviewCalendarFilters) {
  return items.filter((item) =>
    (!filters.jobId || item.jobId === filters.jobId) &&
    (!filters.status || item.status === filters.status) &&
    (!filters.interviewerId || item.interviewers.some((person) => person.id === filters.interviewerId)) &&
    (!filters.interviewType || item.interviewType === filters.interviewType),
  )
}

export function groupCalendarInterviews(items: CalendarInterview[], displayTimezone: string) {
  const grouped = new Map<string, CalendarInterview[]>()
  for (const item of items) {
    const key = getZonedDateKey(item.scheduledStart, displayTimezone)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  for (const interviews of grouped.values()) {
    interviews.sort((left, right) => Date.parse(left.scheduledStart) - Date.parse(right.scheduledStart))
  }
  return grouped
}

export function summarizeCalendar(items: CalendarInterview[], displayTimezone: string, today = new Date()) {
  const active = items.filter((item) => !CANCELLED_INTERVIEW_STATUSES.has(item.status))
  const grouped = groupCalendarInterviews(active, displayTimezone)
  const busiest = [...grouped.entries()].sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))[0]
  return {
    totalInterviews: active.length,
    todayInterviews: grouped.get(getZonedDateKey(today.toISOString(), displayTimezone))?.length ?? 0,
    pendingConfirmation: active.filter((item) => PENDING_INTERVIEW_STATUSES.has(item.status)).length,
    busiestDate: busiest?.[0],
    busiestDateTotal: busiest?.[1].length ?? 0,
  }
}

export function getZonedDateKey(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: safeTimezone(timeZone),
  }).formatToParts(new Date(value))
  const valueFor = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`
}

export function formatCalendarTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: safeTimezone(timeZone),
  }).format(new Date(value))
}

export function formatCalendarDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateKey}T12:00:00Z`))
}

export function safeTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return timeZone
  } catch {
    return 'UTC'
  }
}

export function isValidMeetingUrl(value?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
