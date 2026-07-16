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
  policySource?: import('./resolvedInterviewSchedulingPolicy').InterviewSchedulingPolicySource
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
  delivery: SchedulingInvitationDelivery
}
import type { EmailDeliveryErrorCode, EmailDeliveryProvider, EmailDeliveryStatus } from './emailDelivery'

export type SchedulingInvitationDelivery = {
  provider: EmailDeliveryProvider
  status: EmailDeliveryStatus
  attemptCount: number
  queuedAt?: string
  sendingStartedAt?: string
  sentAt?: string
  failedAt?: string
  lastErrorCode?: EmailDeliveryErrorCode
  lastErrorMessage?: string
  providerMessageId?: string
}
