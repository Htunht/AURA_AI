import interviewersData from '../data/interviewers.json'
import { prepareSchedulingInvitation } from '../services/interviewSchedulingAutomation'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import { DEMO_STORAGE_KEY, hydratePersistedDemoStateValue, resolveSynchronizedDemoState, shouldAcceptSynchronizedDemoState } from '../store/demoPersistence'
import { deriveSchedulingAutomationCardState, selectInterviewAutomationSummary, selectInterviewListItems, selectSchedulingAutomationViewModels } from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import type { Interview } from '../types/interview'
import type { Interviewer } from '../types/interviewer'

export type InterviewSchedulingSynchronizationValidationResult = { valid: boolean; errors: string[] }
const interviewers = interviewersData as Interviewer[]
const preparedAt = new Date('2026-07-20T08:00:00.000Z')
function check(errors: string[], condition: boolean, message: string) { if (!condition) errors.push(message) }

function createEligibleState(): { state: DemoState; application: Application } {
  const sourceCandidate = initialDemoState.candidates[0]!
  const sourceApplication = initialDemoState.applications[0]!
  const sourceEvaluation = initialDemoState.evaluations[0]!
  const candidate: Candidate = { ...sourceCandidate, id: 'candidate-sync-validation', email: 'sync.validation@example.com' }
  const application: Application = {
    ...sourceApplication,
    id: 'application-sync-validation',
    candidateId: candidate.id,
    jobId: 'job-003',
    currentStage: 'SHORTLIST_REVIEW',
    answers: sourceApplication.answers.map((answer) => ({ ...answer, id: `${answer.id}-sync` })),
    documents: sourceApplication.documents.map((document) => ({ ...document, id: `${document.id}-sync` })),
  }
  const decision: Decision = { id: 'decision-sync-validation', applicationId: application.id, evaluationId: sourceEvaluation.id, reviewAction: 'CONFIRM', aiRecommendation: 'YES', humanRecommendation: 'YES', humanDecision: 'NEXT_STAGE', createdAt: '2026-07-20T07:30:00.000Z' }
  return {
    state: {
      ...initialDemoState,
      candidates: [...initialDemoState.candidates, candidate],
      applications: [...initialDemoState.applications, application],
      decisions: [...initialDemoState.decisions, decision],
      interviewSchedulingInvitations: [],
    },
    application,
  }
}

export function validateInterviewSchedulingSynchronizationDomain(): InterviewSchedulingSynchronizationValidationResult {
  const errors: string[] = []
  const sourceSnapshot = JSON.stringify(initialDemoState)
  const { state, application } = createEligibleState()
  const prepared = prepareSchedulingInvitation({ state, applicationId: application.id, interviewers, now: preparedAt, emailProvider: 'EMAILJS' })
  const invitation = prepared.invitation!
  check(errors, invitation?.delivery.status === 'QUEUED', 'Validation invitation was not queued before candidate confirmation')
  const invitedState = demoReducer(state, { type: 'ADD_SCHEDULING_INVITATION', payload: { invitation } })
  const slot = invitation.availableSlots[0]!
  const interview: Interview = {
    id: 'interview-sync-validation-001',
    applicationId: application.id,
    jobId: application.jobId,
    scheduledStart: slot.start,
    scheduledEnd: slot.end,
    timezone: slot.timezone,
    status: 'SCHEDULED',
    mode: 'VIDEO',
    interviewers: slot.interviewerIds.map((id) => {
      const person = interviewers.find((item) => item.id === id)!
      return { id, name: person.fullName, role: person.roleTitle }
    }),
    questions: [],
    createdAt: '2026-07-20T09:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z',
  }
  const deliverySnapshot = JSON.stringify(invitation.delivery)
  const scheduledState = demoReducer(invitedState, { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: slot.id, interview } })
  const scheduledInvitation = scheduledState.interviewSchedulingInvitations.find((item) => item.id === invitation.id)!
  check(errors, scheduledState.interviews.length === invitedState.interviews.length + 1 && scheduledState.interviews.filter((item) => item.id === interview.id).length === 1, 'Successful slot confirmation did not create exactly one interview')
  check(errors, scheduledInvitation.status === 'SCHEDULED' && scheduledInvitation.selectedSlotId === slot.id && scheduledInvitation.scheduledInterviewId === interview.id, 'Successful slot confirmation did not atomically link the invitation and interview')
  check(errors, scheduledState.applications.find((item) => item.id === application.id)?.currentStage === 'INTERVIEW', 'Successful slot confirmation did not move the application to INTERVIEW')
  check(errors, JSON.stringify(scheduledInvitation.delivery) === deliverySnapshot, 'Slot confirmation changed email delivery audit data')
  check(errors, deriveSchedulingAutomationCardState(scheduledState, scheduledInvitation) === 'SCHEDULED', 'QUEUED email delivery overrode the SCHEDULED card state')

  const failedScheduledInvitation = { ...scheduledInvitation, delivery: { ...scheduledInvitation.delivery, status: 'FAILED' as const, failedAt: '2026-07-20T09:01:00.000Z', lastErrorCode: 'PROVIDER_REQUEST_FAILED' as const, lastErrorMessage: 'Delivery failed.' } }
  const failedScheduledState = { ...scheduledState, interviewSchedulingInvitations: scheduledState.interviewSchedulingInvitations.map((item) => item.id === failedScheduledInvitation.id ? failedScheduledInvitation : item) }
  check(errors, deriveSchedulingAutomationCardState(failedScheduledState, failedScheduledInvitation) === 'SCHEDULED', 'FAILED email delivery overrode the SCHEDULED card state')

  const models = selectSchedulingAutomationViewModels(failedScheduledState)
  check(errors, !models.some((item) => item.invitation.id === invitation.id && item.state === 'IN_PROGRESS'), 'Scheduled invitation remained in the In Progress collection')
  check(errors, !models.some((item) => item.invitation.id === invitation.id && item.state === 'AWAITING_CANDIDATE'), 'Scheduled invitation remained in Awaiting Response')
  const scheduledItems = selectInterviewListItems(failedScheduledState).filter((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS')
  check(errors, scheduledItems.some((item) => item.interview.id === interview.id && item.interview.mode === 'VIDEO' && item.interview.interviewers.length === slot.interviewerIds.length), 'Scheduled collection did not include confirmed interview details')
  check(errors, selectInterviewAutomationSummary(failedScheduledState, preparedAt).scheduledInterviews >= 1, 'Interview Operations header did not count the scheduled interview')

  const duplicateState = demoReducer(scheduledState, { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: slot.id, interview } })
  check(errors, duplicateState === scheduledState && duplicateState.interviews.filter((item) => item.id === interview.id).length === 1, 'Duplicate interview confirmation was not prevented')

  const serialized = JSON.stringify(scheduledState)
  const hydrated = hydratePersistedDemoStateValue(serialized)
  check(errors, hydrated?.interviewSchedulingInvitations.find((item) => item.id === invitation.id)?.status === 'SCHEDULED' && hydrated.interviews.some((item) => item.id === interview.id), 'Persisted state from another tab did not hydrate correctly')
  check(errors, resolveSynchronizedDemoState(invitedState, DEMO_STORAGE_KEY, serialized)?.interviews.some((item) => item.id === interview.id) === true, 'Newer cross-tab state was not accepted')
  check(errors, !resolveSynchronizedDemoState(invitedState, DEMO_STORAGE_KEY, '{malformed'), 'Malformed storage event was not ignored')
  check(errors, !resolveSynchronizedDemoState(invitedState, 'unrelated-storage-key', serialized), 'Unrelated storage key was synchronized')
  check(errors, !shouldAcceptSynchronizedDemoState(scheduledState, scheduledState), 'Synchronized state would be written back in a persistence loop')
  check(errors, JSON.stringify(initialDemoState) === sourceSnapshot, 'Synchronization validation mutated initial state')
  return { valid: errors.length === 0, errors }
}
