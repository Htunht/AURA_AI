import { createDisabledSchedulingEmailService } from '../services/email/disabledSchedulingEmailService'
import { buildSchedulingEmailInput } from '../services/email/buildSchedulingEmailInput'
import type { SchedulingEmailService } from '../services/email/emailService'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import { normalizePersistedDemoState } from '../store/demoPersistence'
import { selectSchedulingAutomationViewModelByApplicationId, selectSchedulingEmailDeliverySummary } from '../store/demoSelectors'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import { validateSchedulingEmailInput } from './emailValidation'
import { SCHEDULING_EMAIL_MINIMUM_INTERVAL_MS } from '../providers/SchedulingEmailAutomationProvider'
import { canRecoverSchedulingEmail, isEmailJsConfigurationReady } from './schedulingEmailRecovery'

export type AutomaticSchedulingEmailValidationResult = { valid: boolean; errors: string[] }
function check(errors: string[], condition: boolean, message: string) { if (!condition) errors.push(message) }

function fixture(status: InterviewSchedulingInvitation['delivery']['status'] = 'QUEUED'): InterviewSchedulingInvitation {
  const application = initialDemoState.applications[0]!
  const policy = initialDemoState.interviewSchedulingPolicies.find((item) => item.jobId === application.jobId)!
  return { id: 'email-validation-invitation', token: 'email-validation-token', applicationId: application.id, jobId: application.jobId, policyId: policy.id, interviewerIds: ['interviewer-001'], availableSlots: [{ id: 'email-slot', start: '2026-07-21T09:00:00.000Z', end: '2026-07-21T10:00:00.000Z', timezone: 'Asia/Yangon', interviewerIds: ['interviewer-001'] }], status: 'PENDING', createdAt: '2026-07-16T09:00:00.000Z', updatedAt: '2026-07-16T09:00:00.000Z', expiresAt: '2026-07-20T09:00:00.000Z', rescheduleCount: 0, delivery: { provider: 'EMAILJS', status, attemptCount: 0, queuedAt: '2026-07-16T09:00:00.000Z', ...(status === 'SENDING' ? { sendingStartedAt: '2026-07-16T09:00:01.000Z' } : {}) } }
}

export async function validateAutomaticSchedulingEmailDomain(): Promise<AutomaticSchedulingEmailValidationResult> {
  const errors: string[] = []
  const snapshot = JSON.stringify(initialDemoState)
  const invitation = fixture()
  let state: DemoState = { ...initialDemoState, interviewSchedulingInvitations: [invitation] }
  check(errors, invitation.delivery.status === 'QUEUED', 'Enabled invitation did not start QUEUED')
  check(errors, fixture('NOT_SENT').delivery.status === 'NOT_SENT', 'Disabled invitation did not remain NOT_SENT')

  const recoveryQueuedAt = '2026-07-16T09:00:05.000Z'
  const disabledInvitation: InterviewSchedulingInvitation = {
    ...fixture('NOT_SENT'),
    delivery: { provider: 'DISABLED', status: 'NOT_SENT', attemptCount: 3 },
  }
  const disabledState: DemoState = { ...initialDemoState, interviewSchedulingInvitations: [disabledInvitation] }
  check(errors, !isEmailJsConfigurationReady({ provider: 'disabled', appPublicUrl: 'http://localhost:5173' }), 'Missing EmailJS configuration was treated as ready')
  check(errors, demoReducer(disabledState, { type: 'QUEUE_SCHEDULING_EMAIL', payload: { invitationId: disabledInvitation.id, queuedAt: recoveryQueuedAt } }) === disabledState, 'Disabled invitation did not remain NOT_SENT without configuration')

  const configured = { provider: 'emailjs', appPublicUrl: 'http://localhost:5173', emailJs: { publicKey: 'key', serviceId: 'service', schedulingTemplateId: 'template' } } as const
  check(errors, isEmailJsConfigurationReady(configured), 'Valid EmailJS configuration was not recognized')
  const recoveredDisabled = demoReducer(disabledState, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: recoveryQueuedAt } })
  const recoveredDisabledDelivery = recoveredDisabled.interviewSchedulingInvitations[0]?.delivery
  check(errors, recoveredDisabledDelivery?.provider === 'EMAILJS' && recoveredDisabledDelivery.status === 'QUEUED' && recoveredDisabledDelivery.queuedAt === recoveryQueuedAt && recoveredDisabledDelivery.attemptCount === 3, 'Valid configuration did not migrate NOT_SENT to QUEUED while preserving attempts')

  const configurationFailure: InterviewSchedulingInvitation = {
    ...fixture('FAILED'),
    delivery: { provider: 'DISABLED', status: 'FAILED', attemptCount: 2, failedAt: '2026-07-16T08:00:00.000Z', lastErrorCode: 'EMAIL_NOT_CONFIGURED', lastErrorMessage: 'Email is not configured.' },
  }
  const recoveredFailure = demoReducer({ ...initialDemoState, interviewSchedulingInvitations: [configurationFailure] }, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: recoveryQueuedAt } })
  const recoveredFailureDelivery = recoveredFailure.interviewSchedulingInvitations[0]?.delivery
  check(errors, recoveredFailureDelivery?.status === 'QUEUED' && recoveredFailureDelivery.provider === 'EMAILJS' && recoveredFailureDelivery.attemptCount === 2 && !recoveredFailureDelivery.lastErrorCode && !recoveredFailureDelivery.lastErrorMessage && !recoveredFailureDelivery.failedAt, 'EMAIL_NOT_CONFIGURED failure did not recover cleanly')

  const alreadySent: InterviewSchedulingInvitation = { ...fixture('SENT'), delivery: { provider: 'EMAILJS', status: 'SENT', attemptCount: 1, sentAt: '2026-07-16T08:30:00.000Z' } }
  const sentState: DemoState = { ...initialDemoState, interviewSchedulingInvitations: [alreadySent] }
  check(errors, demoReducer(sentState, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: recoveryQueuedAt } }) === sentState, 'SENT invitation was recovered and queued again')

  const scheduledDisabled: InterviewSchedulingInvitation = { ...disabledInvitation, status: 'SCHEDULED' }
  const scheduledState: DemoState = { ...initialDemoState, interviewSchedulingInvitations: [scheduledDisabled] }
  check(errors, !canRecoverSchedulingEmail(scheduledDisabled) && demoReducer(scheduledState, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: recoveryQueuedAt } }) === scheduledState, 'Scheduled invitation was recovered and queued again')
  for (const status of ['CANCELLED', 'EXPIRED'] as const) {
    const inactiveInvitation: InterviewSchedulingInvitation = { ...disabledInvitation, status }
    const inactiveState: DemoState = { ...initialDemoState, interviewSchedulingInvitations: [inactiveInvitation] }
    check(errors, !canRecoverSchedulingEmail(inactiveInvitation) && demoReducer(inactiveState, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: recoveryQueuedAt } }) === inactiveState, `${status} invitation was recovered and queued again`)
  }
  check(errors, demoReducer(recoveredDisabled, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: '2026-07-16T09:00:06.000Z' } }) === recoveredDisabled, 'Repeated recovery queued an invitation more than once')
  state = demoReducer(state, { type: 'START_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, startedAt: '2026-07-16T09:00:01.000Z' } })
  check(errors, state.interviewSchedulingInvitations[0]?.delivery.status === 'SENDING' && state.interviewSchedulingInvitations[0]?.delivery.attemptCount === 1, 'QUEUED did not transition to SENDING exactly once')
  check(errors, demoReducer(state, { type: 'START_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, startedAt: '2026-07-16T09:00:02.000Z' } }) === state, 'Repeated observation duplicated a send attempt')
  const sent = demoReducer(state, { type: 'COMPLETE_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, sentAt: '2026-07-16T09:00:03.000Z' } })
  check(errors, sent.interviewSchedulingInvitations[0]?.delivery.status === 'SENT' && Boolean(sent.interviewSchedulingInvitations[0]?.delivery.sentAt), 'SENDING did not transition to SENT')
  check(errors, demoReducer(sent, { type: 'QUEUE_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, queuedAt: '2026-07-16T09:00:04.000Z' } }) === sent, 'SENT invitation was requeued')
  const failed = demoReducer(state, { type: 'FAIL_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, failedAt: '2026-07-16T09:00:03.000Z', errorCode: 'PROVIDER_REJECTED', errorMessage: 'The email provider rejected the request.' } })
  check(errors, failed.interviewSchedulingInvitations[0]?.delivery.status === 'FAILED' && failed.interviewSchedulingInvitations[0]?.status === 'PENDING', 'Failed delivery invalidated the invitation')
  const retried = demoReducer(failed, { type: 'RETRY_SCHEDULING_EMAIL', payload: { invitationId: invitation.id, queuedAt: '2026-07-16T09:00:04.000Z' } })
  check(errors, retried.interviewSchedulingInvitations[0]?.delivery.status === 'QUEUED' && retried.interviewSchedulingInvitations[0]?.delivery.attemptCount === 1, 'Retry did not preserve attempt count')
  const recovered = normalizePersistedDemoState({ ...initialDemoState, interviewSchedulingInvitations: [fixture('SENDING')] })
  check(errors, recovered.interviewSchedulingInvitations[0]?.delivery.status === 'QUEUED' && !recovered.interviewSchedulingInvitations[0]?.delivery.sendingStartedAt, 'Interrupted SENDING did not recover to QUEUED')
  const legacy = { ...fixture() } as Partial<InterviewSchedulingInvitation>; delete legacy.delivery
  const migrated = normalizePersistedDemoState({ ...initialDemoState, interviewSchedulingInvitations: [legacy as InterviewSchedulingInvitation] })
  check(errors, migrated.interviewSchedulingInvitations[0]?.delivery.status === 'NOT_SENT', 'Legacy invitation did not hydrate safely')
  const application = initialDemoState.applications[0]!, candidate = initialDemoState.candidates.find((item) => item.id === application.candidateId)!, job = initialDemoState.jobs.find((item) => item.id === application.jobId)!
  const input = buildSchedulingEmailInput({ invitation, candidate, job, appPublicUrl: 'http://localhost:5173/' })
  check(errors, input.candidateEmail === candidate.email && input.jobTitle === job.title && input.schedulingUrl.endsWith(`/schedule/${invitation.token}`) && input.expiresAt === invitation.expiresAt, 'Email input was built from incorrect recruitment data')
  check(errors, !JSON.stringify(input).toLowerCase().includes('recommendation') && !JSON.stringify(input).toLowerCase().includes('score'), 'Screening data leaked into email input')
  check(errors, !validateSchedulingEmailInput({ ...input, candidateEmail: 'invalid' }).valid, 'Invalid email was accepted')
  check(errors, !(await createDisabledSchedulingEmailService().sendSchedulingInvitation(input)).success, 'Missing configuration did not fail safely')
  const fake: SchedulingEmailService = { async sendSchedulingInvitation() { return { success: true, provider: 'EMAILJS' } } }
  check(errors, (await fake.sendSchedulingInvitation(input)).success, 'Injected fake email service failed')
  let recoveredSendCount = 0
  let providerState = recoveredDisabled
  const providerStart = demoReducer(providerState, { type: 'START_SCHEDULING_EMAIL', payload: { invitationId: disabledInvitation.id, startedAt: '2026-07-16T09:00:06.000Z' } })
  if (providerStart !== providerState) { recoveredSendCount += 1; providerState = providerStart }
  const duplicateStart = demoReducer(providerState, { type: 'START_SCHEDULING_EMAIL', payload: { invitationId: disabledInvitation.id, startedAt: '2026-07-16T09:00:07.000Z' } })
  if (duplicateStart !== providerState) recoveredSendCount += 1
  check(errors, recoveredSendCount === 1, 'Provider processed a recovered queue more than once')
  const recoveredSent = demoReducer(providerState, { type: 'COMPLETE_SCHEDULING_EMAIL', payload: { invitationId: disabledInvitation.id, sentAt: '2026-07-16T09:00:08.000Z' } })
  const refreshedSent = normalizePersistedDemoState(JSON.parse(JSON.stringify(recoveredSent)))
  check(errors, refreshedSent.interviewSchedulingInvitations[0]?.delivery.status === 'SENT' && demoReducer(refreshedSent, { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { queuedAt: '2026-07-16T09:00:09.000Z' } }) === refreshedSent, 'Refresh created a duplicate send for a recovered invitation')
  const summary = selectSchedulingEmailDeliverySummary({ ...initialDemoState, interviewSchedulingInvitations: [sent.interviewSchedulingInvitations[0]!, failed.interviewSchedulingInvitations[0]!] })
  check(errors, summary.sent === 1 && summary.failed === 1, 'Dashboard delivery counts do not match state')
  check(errors, selectSchedulingAutomationViewModelByApplicationId(failed, invitation.applicationId)?.deliveryStatus === 'FAILED', 'Candidate Detail did not resolve failed delivery')
  check(errors, SCHEDULING_EMAIL_MINIMUM_INTERVAL_MS === 1000, 'Sequential rate limit is not one request per second')
  check(errors, typeof JSON.stringify(retried) === 'string' && JSON.stringify(initialDemoState) === snapshot, 'Email delivery state is not serializable or mutated initial state')
  return { valid: errors.length === 0, errors }
}
