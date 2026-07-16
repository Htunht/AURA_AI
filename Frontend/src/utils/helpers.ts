import type {
  ApplicationStage,
  ApplicationStatus,
} from '../types/application'
import type { InterviewMode, InterviewStatus } from '../types/interview'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

// Scheduling stores the recruiter's workspace wall time in an ISO-compatible
// value and preserves the selected timezone separately. Rendering in UTC keeps
// that wall time stable without pretending we can calculate timezone offsets
// without a timezone library.
const interviewDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const interviewTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

export function formatInterviewDate(value: string): string {
  return interviewDateFormatter.format(new Date(value))
}

export function formatInterviewTime(value: string): string {
  return interviewTimeFormatter.format(new Date(value))
}

const stageLabels: Record<ApplicationStage, string> = {
  APPLICATION: 'Application',
  AI_SCREENING: 'AI screening',
  SHORTLIST_REVIEW: 'Shortlist review',
  INTERVIEW: 'Interview',
  FINAL_REVIEW: 'Final review',
  DECISION: 'Decision',
  COMMUNICATION: 'Communication',
}

const statusLabels: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  ON_HOLD: 'On hold',
}

export function formatApplicationStage(stage: ApplicationStage): string {
  return stageLabels[stage]
}

export function formatApplicationStatus(status: ApplicationStatus): string {
  return statusLabels[status]
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

const interviewModeLabels: Record<InterviewMode, string> = {
  VIDEO: 'Video interview',
  PHONE: 'Phone interview',
  ONSITE: 'On-site interview',
}

const interviewStatusLabels: Record<InterviewStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function formatInterviewMode(mode: InterviewMode): string {
  return interviewModeLabels[mode]
}

export function formatInterviewStatus(status: InterviewStatus): string {
  return interviewStatusLabels[status]
}
