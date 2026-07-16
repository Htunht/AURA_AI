import type { DemoState } from '../store/demoStateTypes'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import { isSameSchedulingPolicyTarget, normalizePolicyDepartment } from './interviewSchedulingPolicyResolution'

export type InterviewSchedulingPolicyValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

export function validateInterviewSchedulingPolicy(
  policy: InterviewSchedulingPolicy,
  state: DemoState,
): InterviewSchedulingPolicyValidationResult {
  const errors: Record<string, string> = {}
  if (!policy.displayName.trim()) errors.displayName = 'Enter a name for this scheduling setup.'
  if (policy.scope === 'ORGANIZATION' && (policy.department || policy.jobId)) errors.scope = 'Organization defaults cannot target a department or job.'
  if (policy.scope === 'DEPARTMENT') {
    if (!normalizePolicyDepartment(policy.department ?? '')) errors.department = 'Choose a department.'
    if (policy.jobId) errors.jobId = 'Department templates cannot target a job.'
  }
  if (policy.scope === 'JOB') {
    if (!policy.jobId || !state.jobs.some((job) => job.id === policy.jobId)) errors.jobId = 'The job opening could not be resolved.'
    if (policy.department) errors.department = 'Job overrides cannot target a department.'
  }
  if (![30, 45, 60, 90].includes(policy.durationMinutes)) errors.durationMinutes = 'Choose a supported duration.'
  if (![0, 10, 15, 30].includes(policy.bufferMinutes)) errors.bufferMinutes = 'Choose a supported buffer.'
  if (policy.schedulingWindowStartDays < 0) errors.schedulingWindowStartDays = 'Window start cannot be negative.'
  if (policy.schedulingWindowEndDays < policy.schedulingWindowStartDays) errors.schedulingWindowEndDays = 'Window end must be on or after its start.'
  if (policy.minimumNoticeHours < 0) errors.minimumNoticeHours = 'Minimum notice cannot be negative.'
  if (policy.workingDays.length === 0) errors.workingDays = 'Choose at least one working day.'
  if (!policy.dailyStartTime || !policy.dailyEndTime || policy.dailyEndTime <= policy.dailyStartTime) errors.dailyEndTime = 'Daily end time must be after the start time.'
  if (policy.interviewerCount < 1) errors.interviewerCount = 'At least one interviewer is required.'
  if (policy.candidateSlotCount < 1 || policy.candidateSlotCount > 10) errors.candidateSlotCount = 'Candidate slot count must be between 1 and 10.'
  if (![15, 30, 60].includes(policy.slotIntervalMinutes)) errors.slotIntervalMinutes = 'Choose a supported slot interval.'
  if (policy.invitationExpiryHours <= 0) errors.invitationExpiryHours = 'Invitation expiry must be positive.'
  if (policy.candidateRescheduleLimit < 0) errors.candidateRescheduleLimit = 'Reschedule limit cannot be negative.'
  if (policy.interviewMode === 'VIDEO' && !policy.meetingLinkTemplate?.trim()) errors.meetingLinkTemplate = 'Video interviews require a meeting link template.'
  if (policy.interviewMode === 'ONSITE' && !policy.meetingLocationTemplate?.trim()) errors.meetingLocationTemplate = 'On-site interviews require a location template.'
  if (policy.interviewerSelectionStrategy === 'FIXED_INTERVIEWERS' && policy.fixedInterviewerIds.length < policy.interviewerCount) errors.fixedInterviewerIds = 'Select enough fixed interviewers.'
  if (policy.interviewerSelectionStrategy === 'REQUIRED_ROLES' && policy.requiredInterviewerRoles.length < policy.interviewerCount) errors.requiredInterviewerRoles = 'Add enough required interviewer roles.'
  const otherActive = state.interviewSchedulingPolicies.some(
    (item) => isSameSchedulingPolicyTarget(item, policy) && item.status === 'ACTIVE' && item.id !== policy.id,
  )
  if (policy.status === 'ACTIVE' && otherActive) errors.status = 'Only one active version is allowed for this scheduling target.'
  return { valid: Object.keys(errors).length === 0, errors }
}
