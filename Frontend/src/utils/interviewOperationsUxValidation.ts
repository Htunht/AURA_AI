import { initialDemoState, type DemoState } from '../store/demoReducer'
import {
  getSchedulingExceptionLabel,
  selectInterviewAutomationSummary,
  selectInterviewListItems,
  selectSchedulingAutomationViewModelByApplicationId,
  selectSchedulingAutomationViewModels,
} from '../store/demoSelectors'
import type { Interview } from '../types/interview'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'

export type InterviewOperationsUxValidationResult = {
  valid: boolean
  errors: string[]
}

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function createFixtureState(): DemoState {
  const application = initialDemoState.applications.find((item) => item.jobId === 'job-001')!
  const policy = initialDemoState.interviewSchedulingPolicies.find((item) => item.jobId === application.jobId && item.status === 'ACTIVE')!
  const slot = {
    id: 'slot-operations-001',
    start: '2026-07-21T09:00:00.000Z',
    end: '2026-07-21T10:00:00.000Z',
    timezone: 'Asia/Yangon',
    interviewerIds: ['interviewer-001', 'interviewer-002'],
  }
  const pending: InterviewSchedulingInvitation = {
    id: 'invitation-operations-pending',
    token: 'operations-pending',
    applicationId: application.id,
    jobId: application.jobId,
    policyId: policy.id,
    interviewerIds: [...slot.interviewerIds],
    availableSlots: [slot],
    status: 'PENDING',
    createdAt: '2026-07-16T09:00:00.000Z',
    updatedAt: '2026-07-16T09:00:00.000Z',
    expiresAt: '2026-07-19T09:00:00.000Z',
    rescheduleCount: 0,
    delivery: { provider: 'EMAILJS', status: 'QUEUED', attemptCount: 0, queuedAt: '2026-07-16T09:00:00.000Z' },
  }
  const secondApplication = initialDemoState.applications.find((item) => item.id !== application.id && item.jobId === application.jobId)!
  const scheduledInterview: Interview = {
    id: 'interview-operations-scheduled',
    applicationId: secondApplication.id,
    jobId: secondApplication.jobId,
    scheduledStart: slot.start,
    scheduledEnd: slot.end,
    timezone: slot.timezone,
    status: 'SCHEDULED',
    mode: 'VIDEO',
    interviewers: [
      { id: 'interviewer-001', name: 'Alice Morgan', role: 'Senior Frontend Engineer' },
      { id: 'interviewer-002', name: 'Robert Chen', role: 'Engineering Manager' },
    ],
    questions: [],
  }
  const scheduled: InterviewSchedulingInvitation = {
    ...pending,
    id: 'invitation-operations-scheduled',
    token: 'operations-scheduled',
    applicationId: secondApplication.id,
    status: 'SCHEDULED',
    selectedSlotId: slot.id,
    scheduledInterviewId: scheduledInterview.id,
    updatedAt: '2026-07-16T10:00:00.000Z',
  }
  const thirdApplication = initialDemoState.applications.find((item) => item.id !== application.id && item.id !== secondApplication.id && item.jobId === application.jobId)!
  const exception: InterviewSchedulingInvitation = {
    ...pending,
    id: 'invitation-operations-exception',
    token: 'operations-exception',
    applicationId: thirdApplication.id,
    policyId: '',
    interviewerIds: [],
    availableSlots: [],
    status: 'EXCEPTION_REQUIRED',
    exceptionReason: 'POLICY_MISSING',
    lastError: 'No active scheduling policy exists for this role.',
    updatedAt: '2026-07-16T11:00:00.000Z',
  }
  const fourthApplication = initialDemoState.applications.find((item) => ![application.id, secondApplication.id, thirdApplication.id].includes(item.id) && item.jobId === application.jobId)!
  const expired: InterviewSchedulingInvitation = {
    ...pending,
    id: 'invitation-operations-expired',
    token: 'operations-expired',
    applicationId: fourthApplication.id,
    status: 'EXPIRED',
    exceptionReason: 'INVITATION_EXPIRED',
    updatedAt: '2026-07-16T12:00:00.000Z',
  }
  return {
    ...initialDemoState,
    interviews: [scheduledInterview],
    interviewSchedulingInvitations: [pending, scheduled, exception, expired],
  }
}

export function validateInterviewOperationsUxDomain(): InterviewOperationsUxValidationResult {
  const errors: string[] = []
  const sourceSnapshot = JSON.stringify(initialDemoState)
  const state = createFixtureState()
  const models = selectSchedulingAutomationViewModels(state)
  const pending = models.find((item) => item.invitation.id === 'invitation-operations-pending')
  const scheduled = models.find((item) => item.invitation.id === 'invitation-operations-scheduled')
  const exception = models.find((item) => item.invitation.id === 'invitation-operations-exception')
  const expired = models.find((item) => item.invitation.id === 'invitation-operations-expired')

  check(errors, Boolean(pending?.candidate && pending.job), 'Scheduling invitation view model did not resolve candidate and job')
  check(errors, pending?.interviewerNames.join(', ') === 'Alice Morgan, Robert Chen', 'Interviewer names did not resolve')
  check(errors, pending?.availableSlotCount === 1, 'Available slot count did not resolve')
  check(errors, pending?.state === 'READY_TO_SHARE', 'Pending invitation did not derive READY_TO_SHARE')
  check(errors, scheduled?.state === 'SCHEDULED', 'Scheduled invitation did not derive SCHEDULED')
  check(errors, exception?.state === 'EXCEPTION', 'Exception invitation did not derive EXCEPTION')
  check(errors, expired?.state === 'EXPIRED', 'Expired invitation did not derive EXPIRED')
  check(errors, pending?.responsibility === 'CANDIDATE' && exception?.responsibility === 'RECRUITER' && scheduled?.responsibility === 'NONE', 'Scheduling responsibility did not resolve correctly')

  const expectedOrder = ['policy', 'interviewers', 'slots', 'invitation', 'selection', 'confirmation']
  check(errors, pending?.progressSteps.map((step) => step.id).join(',') === expectedOrder.join(','), 'Progress steps are not ordered')
  check(errors, pending?.progressSteps.find((step) => step.id === 'policy')?.status === 'COMPLETE', 'Active policy did not complete the policy step')
  check(errors, pending?.progressSteps.find((step) => step.id === 'interviewers')?.status === 'COMPLETE', 'Interviewer IDs did not complete assignment step')
  check(errors, pending?.progressSteps.find((step) => step.id === 'slots')?.status === 'COMPLETE', 'Available slots did not complete generation step')
  check(errors, pending?.progressSteps.find((step) => step.id === 'selection')?.status === 'PENDING', 'Candidate selection completed before scheduling')
  check(errors, scheduled?.progressSteps.find((step) => step.id === 'confirmation')?.status === 'COMPLETE', 'Interview confirmation did not complete after interview creation')
  check(errors, pending ? !('path' in pending) : false, 'Raw scheduling path is required by the view model')
  check(errors, getSchedulingExceptionLabel('INTERVIEWERS_UNAVAILABLE') === 'No eligible interviewers are available', 'Exception reason was not mapped to readable text')

  const interviewItems = selectInterviewListItems(state)
  const upcoming = interviewItems.filter((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS')
  check(errors, upcoming.length === 1 && upcoming.every((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS'), 'Upcoming interview list contains unconfirmed interviews')
  check(errors, models.filter((item) => item.state === 'READY_TO_SHARE').every((item) => item.state !== 'SCHEDULED'), 'Pending invitation list includes scheduled invitations')

  const summary = selectInterviewAutomationSummary(state, new Date('2026-07-16T10:30:00.000Z'))
  check(errors, summary.invitationsReadyToShare === models.filter((item) => item.state === 'READY_TO_SHARE').length, 'Dashboard and Interviews invitation counts do not match')
  check(errors, summary.schedulingExceptions === models.filter((item) => item.state === 'EXCEPTION' || item.state === 'EXPIRED').length, 'Dashboard and Interviews exception counts do not match')
  check(errors, pending ? selectSchedulingAutomationViewModelByApplicationId(state, pending.invitation.applicationId)?.state === pending.state : false, 'Candidate Detail did not resolve the shared invitation state')
  check(errors, JSON.stringify(initialDemoState) === sourceSnapshot, 'Interview operations selectors mutated state')

  return { valid: errors.length === 0, errors }
}
