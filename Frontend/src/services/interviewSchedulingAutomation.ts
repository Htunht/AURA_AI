import type { DemoState } from '../store/demoStateTypes'
import type { InterviewSchedulingInvitation, SchedulingExceptionReason } from '../types/interviewSchedulingInvitation'
import type { Interviewer } from '../types/interviewer'
import { assignInterviewers } from '../utils/interviewerAssignment'
import { generateInterviewSlots } from '../utils/interviewSlotGeneration'
import { resolveInterviewSchedulingPolicy } from '../utils/interviewSchedulingPolicyResolution'
import type { InterviewSchedulingPolicySource } from '../types/resolvedInterviewSchedulingPolicy'

export type PrepareSchedulingInvitationResult = {
  invitation?: InterviewSchedulingInvitation
  errors: string[]
}

function invitationIdentity(applicationId: string, version: number) {
  return {
    id: `scheduling-invitation-${applicationId}-v${version}`,
    token: `schedule-${applicationId}-${version}`,
  }
}

function exceptionInvitation(input: {
  applicationId: string
  jobId: string
  policyId?: string
  policyVersion?: number
  policySource?: InterviewSchedulingPolicySource
  now: Date
  reason: SchedulingExceptionReason
  error: string
}): InterviewSchedulingInvitation {
  const identity = invitationIdentity(input.applicationId, input.policyVersion ?? 0)
  const timestamp = input.now.toISOString()
  return {
    ...identity,
    applicationId: input.applicationId,
    jobId: input.jobId,
    policyId: input.policyId ?? '',
    policySource: input.policySource,
    interviewerIds: [],
    availableSlots: [],
    status: 'EXCEPTION_REQUIRED',
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: timestamp,
    rescheduleCount: 0,
    exceptionReason: input.reason,
    lastError: input.error,
    delivery: { provider: 'DISABLED', status: 'NOT_SENT', attemptCount: 0 },
  }
}

export function prepareSchedulingInvitation(input: {
  state: DemoState
  applicationId: string
  interviewers: Interviewer[]
  now: Date
  emailProvider?: 'EMAILJS' | 'DISABLED'
}): PrepareSchedulingInvitationResult {
  const application = input.state.applications.find((item) => item.id === input.applicationId)
  const candidate = application
    ? input.state.candidates.find((item) => item.id === application.candidateId)
    : undefined
  const job = application
    ? input.state.jobs.find((item) => item.id === application.jobId)
    : undefined
  if (!application || !candidate || !job) return { errors: ['Candidate application or job could not be resolved.'] }
  const decision = input.state.decisions
    .filter((item) => item.applicationId === application.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  const positive = decision?.humanRecommendation === 'STRONG_YES' || decision?.humanRecommendation === 'YES' || decision?.humanRecommendation === 'REVIEW'
  if (!positive || application.currentStage !== 'SHORTLIST_REVIEW') return { errors: ['A positive human-reviewed shortlist decision is required.'] }
  const resolvedPolicy = resolveInterviewSchedulingPolicy({ policies: input.state.interviewSchedulingPolicies, job })
  if (!resolvedPolicy) {
    const error = 'No organization, department, or custom scheduling setup is available for this job.'
    return {
      invitation: exceptionInvitation({ applicationId: application.id, jobId: job.id, now: input.now, reason: 'POLICY_MISSING', error }),
      errors: [error],
    }
  }
  const policy = resolvedPolicy.policy
  const windowStart = new Date(input.now.getTime() + policy.schedulingWindowStartDays * 86_400_000).toISOString()
  const windowEnd = new Date(input.now.getTime() + (policy.schedulingWindowEndDays + 1) * 86_400_000).toISOString()
  const assignment = assignInterviewers({ policy, interviewers: input.interviewers, interviews: input.state.interviews, windowStart, windowEnd })
  if (assignment.errors.length) {
    return {
      invitation: exceptionInvitation({ applicationId: application.id, jobId: job.id, policyId: policy.id, policyVersion: policy.version, policySource: resolvedPolicy.source, now: input.now, reason: 'INTERVIEWERS_UNAVAILABLE', error: assignment.errors[0]! }),
      errors: assignment.errors,
    }
  }
  const generated = generateInterviewSlots({ policy, interviewerIds: assignment.interviewerIds, interviewers: input.interviewers, existingInterviews: input.state.interviews, now: input.now })
  if (generated.errors.length) {
    return {
      invitation: exceptionInvitation({ applicationId: application.id, jobId: job.id, policyId: policy.id, policyVersion: policy.version, policySource: resolvedPolicy.source, now: input.now, reason: 'NO_AVAILABLE_SLOTS', error: generated.errors[0]! }),
      errors: generated.errors,
    }
  }
  const timestamp = input.now.toISOString()
  return {
    invitation: {
      ...invitationIdentity(application.id, policy.version),
      applicationId: application.id,
      jobId: job.id,
      policyId: policy.id,
      policySource: resolvedPolicy.source,
      interviewerIds: assignment.interviewerIds,
      availableSlots: generated.slots.map((slot) => ({ ...slot, id: `slot-${application.id}-${slot.id.slice(5)}` })),
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(input.now.getTime() + policy.invitationExpiryHours * 3_600_000).toISOString(),
      rescheduleCount: 0,
      delivery: input.emailProvider === 'DISABLED'
        ? { provider: 'DISABLED', status: 'NOT_SENT', attemptCount: 0 }
        : { provider: 'EMAILJS', status: 'QUEUED', attemptCount: 0, queuedAt: timestamp },
    },
    errors: [],
  }
}
