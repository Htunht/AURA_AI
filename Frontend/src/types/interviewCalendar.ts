export type CalendarInterviewStatus =
  | 'DRAFT'
  | 'PENDING_CONFIRMATION'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'NEEDS_RESCHEDULING'

export type CalendarInterviewType =
  | 'SCREENING'
  | 'TECHNICAL'
  | 'BEHAVIORAL'
  | 'PANEL'
  | 'FINAL'
  | 'OTHER'

export type CalendarInterviewer = {
  id: string
  name: string
}

export type CalendarInterview = {
  id: string
  applicationId: string
  candidateId: string
  candidateName: string
  jobId: string
  jobTitle: string
  interviewers: CalendarInterviewer[]
  interviewType: CalendarInterviewType
  status: CalendarInterviewStatus
  scheduledStart: string
  scheduledEnd: string
  timezone: string
  location?: string
  meetingUrl?: string
}

export type BackendInterviewCalendarItem = {
  id: string
  application_id: string
  candidate_id: string
  candidate_name: string
  job_id: string
  job_title: string
  interviewer_id: string | null
  interviewer_name: string | null
  interview_type: CalendarInterviewType
  status: CalendarInterviewStatus
  scheduled_start: string
  scheduled_end: string
  timezone: string
  location: string | null
  meeting_url: string | null
}

export type BackendInterviewCalendarResponse = {
  range: { start: string; end: string; timezone: string }
  days: Array<{
    date: string
    total_interviews: number
    interviews: BackendInterviewCalendarItem[]
  }>
  summary: {
    total_interviews: number
    today_interviews: number
    pending_confirmation: number
    busiest_date: string | null
    busiest_date_total: number
  }
}

export type InterviewCalendarFilters = {
  jobId: string
  status: string
  interviewerId: string
  interviewType: string
}
