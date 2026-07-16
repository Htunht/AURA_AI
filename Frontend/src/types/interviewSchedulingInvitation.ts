export type SchedulingInvitationStatus =
  | 'PENDING' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED' | 'EXCEPTION_REQUIRED'

export type SchedulingExceptionReason =
  | 'POLICY_MISSING'
  | 'INTERVIEWERS_UNAVAILABLE'
  | 'NO_AVAILABLE_SLOTS'
  | 'INVITATION_EXPIRED'
  | 'SLOT_CONFLICT'
  | 'RESCHEDULE_LIMIT_REACHED'

export type InterviewSlot = {
  id: string
  start: string
  end: string
  timezone: string
  interviewerIds: string[]
}

export type InterviewSchedulingInvitation = {
  id: string
  token: string
  applicationId: string
  jobId: string
  policyId: string
  interviewerIds: string[]
  availableSlots: InterviewSlot[]
  status: SchedulingInvitationStatus
  createdAt: string
  updatedAt: string
  expiresAt: string
  selectedSlotId?: string
  scheduledInterviewId?: string
  rescheduleCount: number
  lastRescheduledAt?: string
  exceptionReason?: SchedulingExceptionReason
  lastError?: string
}
