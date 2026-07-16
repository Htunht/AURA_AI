import type { InterviewMode } from './interview'

export type InterviewSchedulingPolicyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type InterviewSchedulingWorkingDay =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type InterviewerSelectionStrategy =
  | 'REQUIRED_ROLES' | 'FIXED_INTERVIEWERS' | 'LEAST_BOOKED'

export type InterviewSchedulingPolicy = {
  id: string
  jobId: string
  version: number
  status: InterviewSchedulingPolicyStatus
  interviewMode: InterviewMode
  durationMinutes: 30 | 45 | 60 | 90
  bufferMinutes: 0 | 10 | 15 | 30
  candidateTimezoneStrategy: 'CANDIDATE_TIMEZONE' | 'WORKSPACE_TIMEZONE'
  workspaceTimezone: string
  schedulingWindowStartDays: number
  schedulingWindowEndDays: number
  minimumNoticeHours: number
  workingDays: InterviewSchedulingWorkingDay[]
  dailyStartTime: string
  dailyEndTime: string
  interviewerSelectionStrategy: InterviewerSelectionStrategy
  requiredInterviewerRoles: string[]
  fixedInterviewerIds: string[]
  interviewerCount: number
  candidateSlotCount: number
  slotIntervalMinutes: 15 | 30 | 60
  meetingLocationTemplate?: string
  meetingLinkTemplate?: string
  candidateRescheduleLimit: number
  invitationExpiryHours: number
  createdAt: string
  updatedAt: string
}
