import type { InterviewMode } from './interview'

export type InterviewScheduleDraft = {
  applicationId: string
  mode: InterviewMode
  date: string
  startTime: string
  durationMinutes: number
  timezone: string
  interviewerIds: string[]
  location?: string
  meetingLink?: string
  notes?: string
}

export type InterviewScheduleValidationResult = {
  valid: boolean
  errors: Record<string, string>
}
