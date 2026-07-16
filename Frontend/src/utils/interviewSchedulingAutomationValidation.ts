import interviewersData from '../data/interviewers.json'
import { prepareSchedulingInvitation } from '../services/interviewSchedulingAutomation'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import { normalizePersistedDemoState } from '../store/demoPersistence'
import {
  selectActiveInterviewSchedulingPolicy,
  selectCandidateTimeline,
  selectInterviewAutomationSummary,
  selectSelfSchedulingCandidates,
} from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import type { Interview } from '../types/interview'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import type { Interviewer } from '../types/interviewer'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import { assignInterviewers } from './interviewerAssignment'
import { generateInterviewSlots } from './interviewSlotGeneration'

export type InterviewSchedulingAutomationValidationResult = { valid: boolean; errors: string[] }
const interviewers = interviewersData as Interviewer[]
const now = new Date('2026-07-20T08:00:00.000Z')

function check(errors: string[], condition: boolean, message: string) { if (!condition) errors.push(message) }

function fixture(recommendation: Decision['humanRecommendation'] | undefined, suffix: string) {
  const sourceCandidate = initialDemoState.candidates[0]!
  const sourceApplication = initialDemoState.applications[0]!
  const sourceEvaluation = initialDemoState.evaluations[0]!
  const candidate: Candidate = { ...sourceCandidate, id: `candidate-auto-${suffix}`, email: `auto.${suffix}@example.com` }
  const application: Application = { ...sourceApplication, id: `application-auto-${suffix}`, candidateId: candidate.id, jobId: 'job-001', currentStage: 'SHORTLIST_REVIEW' }
  const decision: Decision | undefined = recommendation ? { id: `decision-auto-${suffix}`, applicationId: application.id, evaluationId: sourceEvaluation.id, reviewAction: 'CONFIRM', aiRecommendation: recommendation, humanRecommendation: recommendation, humanDecision: 'NEXT_STAGE', createdAt: `2026-07-19T${suffix.padStart(2, '0')}:00:00.000Z` } : undefined
  return { candidate, application, decision }
}

function createState(): DemoState {
  const positive = fixture('YES', '01')
  const negative = fixture('NO', '02')
  const undecided = fixture(undefined, '03')
  return { ...initialDemoState, candidates: [positive.candidate, negative.candidate, undecided.candidate], applications: [positive.application, negative.application, undecided.application], decisions: [positive.decision!, negative.decision!], interviews: [], interviewSchedulingInvitations: [], transcripts: [], communications: [], screeningQueue: [] }
}

function interviewFor(invitation: InterviewSchedulingInvitation, slotIndex = 0, id = `interview-${invitation.applicationId}-001`): Interview {
  const slot = invitation.availableSlots[slotIndex]!
  return { id, applicationId: invitation.applicationId, jobId: invitation.jobId, scheduledStart: slot.start, scheduledEnd: slot.end, timezone: slot.timezone, status: 'SCHEDULED', mode: 'VIDEO', interviewers: slot.interviewerIds.map((interviewerId) => { const person = interviewers.find((item) => item.id === interviewerId)!; return { id: person.id, name: person.fullName, role: person.roleTitle } }), questions: [], createdAt: now.toISOString(), updatedAt: now.toISOString() }
}

export function validateInterviewSchedulingAutomationDomain(): InterviewSchedulingAutomationValidationResult {
  const errors: string[] = []
  const sourceSnapshot = JSON.stringify(initialDemoState)
  const state = createState()
  const policy = selectActiveInterviewSchedulingPolicy(state, 'job-001')!
  check(errors, Boolean(policy), 'Active policy did not resolve for eligible job')
  check(errors, state.interviewSchedulingPolicies.filter((item) => item.jobId === 'job-001' && item.status === 'ACTIVE').length === 1, 'More than one active policy exists for a job')

  const draft: InterviewSchedulingPolicy = { ...policy, id: 'interview-policy-job-001-v2', version: 2, status: 'DRAFT', workingDays: [...policy.workingDays], requiredInterviewerRoles: [...policy.requiredInterviewerRoles], fixedInterviewerIds: [...policy.fixedInterviewerIds] }
  const draftState = demoReducer(state, { type: 'ADD_INTERVIEW_SCHEDULING_POLICY', payload: { policy: draft } })
  const editedDraftState = demoReducer(draftState, { type: 'UPDATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: draft.id, changes: { candidateSlotCount: 6 } } })
  check(errors, editedDraftState.interviewSchedulingPolicies.find((item) => item.id === draft.id)?.candidateSlotCount === 6, 'Policy draft could not be edited')
  const activeEditState = demoReducer(state, { type: 'UPDATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: policy.id, changes: { candidateSlotCount: 9 } } })
  check(errors, activeEditState === state, 'Active policy was editable')
  const activatedState = demoReducer(editedDraftState, { type: 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: draft.id, updatedAt: now.toISOString() } })
  check(errors, activatedState.interviewSchedulingPolicies.find((item) => item.id === draft.id)?.status === 'ACTIVE' && activatedState.interviewSchedulingPolicies.find((item) => item.id === policy.id)?.status === 'ARCHIVED', 'Activating a new version did not archive the previous policy')

  const eligible = selectSelfSchedulingCandidates(state)
  check(errors, eligible.some((item) => item.application.id === 'application-auto-01'), 'Positive human-reviewed application was not eligible')
  check(errors, !eligible.some((item) => item.application.id === 'application-auto-02'), 'Negative decision was eligible')
  check(errors, !eligible.some((item) => item.application.id === 'application-auto-03'), 'Application without decision was eligible')
  const activeInterview: Interview = { id: 'active-validation', applicationId: 'application-auto-01', jobId: 'job-001', scheduledStart: '2026-07-22T09:00:00.000Z', scheduledEnd: '2026-07-22T10:00:00.000Z', timezone: 'Asia/Yangon', status: 'SCHEDULED', mode: 'VIDEO', interviewers: [{ id: 'interviewer-001', name: 'Alice Morgan', role: 'Senior Frontend Engineer' }], questions: [] }
  check(errors, selectSelfSchedulingCandidates({ ...state, interviews: [activeInterview] }).length === 0, 'Active interview did not make application ineligible')

  const windowStart = '2026-07-21T00:00:00.000Z'
  const windowEnd = '2026-08-03T23:59:59.000Z'
  const fixedPolicy: InterviewSchedulingPolicy = { ...policy, interviewerSelectionStrategy: 'FIXED_INTERVIEWERS', fixedInterviewerIds: ['interviewer-002', 'interviewer-001'], interviewerCount: 2 }
  const fixed = assignInterviewers({ policy: fixedPolicy, interviewers, interviews: [], windowStart, windowEnd })
  const required = assignInterviewers({ policy, interviewers, interviews: [], windowStart, windowEnd })
  const leastPolicy: InterviewSchedulingPolicy = { ...policy, interviewerSelectionStrategy: 'LEAST_BOOKED', interviewerCount: 1 }
  const least = assignInterviewers({ policy: leastPolicy, interviewers, interviews: [activeInterview], windowStart, windowEnd })
  check(errors, fixed.interviewerIds.join(',') === 'interviewer-002,interviewer-001', 'Fixed interviewer strategy was not respected')
  check(errors, required.interviewerIds.includes('interviewer-001') && required.interviewerIds.includes('interviewer-002'), 'Required-role interviewer assignment failed')
  check(errors, least.interviewerIds[0] !== 'interviewer-001', 'Least-booked assignment ignored booking counts')
  check(errors, !assignInterviewers({ policy: leastPolicy, interviewers: interviewers.map((person) => ({ ...person, isActive: false })), interviews: [], windowStart, windowEnd }).interviewerIds.length, 'Inactive interviewers were assigned')
  check(errors, assignInterviewers({ policy, interviewers: interviewers.filter((person) => person.id !== 'interviewer-002'), interviews: [], windowStart, windowEnd }).errors.length > 0, 'Insufficient role coverage did not return an error')

  const generated = generateInterviewSlots({ policy, interviewerIds: required.interviewerIds, interviewers, existingInterviews: [], now })
  const repeated = generateInterviewSlots({ policy, interviewerIds: required.interviewerIds, interviewers, existingInterviews: [], now })
  check(errors, generated.slots.length === policy.candidateSlotCount, 'Slot count limit was not respected')
  check(errors, JSON.stringify(generated) === JSON.stringify(repeated), 'Slot output was not deterministic')
  check(errors, generated.slots.every((slot) => new Date(slot.start).getTime() >= now.getTime() + policy.minimumNoticeHours * 3_600_000), 'Slots violated minimum notice')
  const windowStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + policy.schedulingWindowStartDays)).getTime()
  const windowEndDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + policy.schedulingWindowEndDays + 1)).getTime()
  check(errors, generated.slots.every((slot) => new Date(slot.start).getTime() >= windowStartDate && new Date(slot.start).getTime() < windowEndDate), 'Slots violated the scheduling window')
  check(errors, generated.slots.every((slot) => ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].includes(['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date(slot.start).getUTCDay()]!)), 'Slots violated allowed working days')
  check(errors, generated.slots.every((slot) => slot.start.slice(11,16) >= policy.dailyStartTime && slot.end.slice(11,16) <= policy.dailyEndTime), 'Slots violated policy hours')
  const restrictedInterviewers = interviewers.map((person) => required.interviewerIds.includes(person.id) ? { ...person, workingHours: { monday: [{ startTime: '13:00', endTime: '17:00' }], tuesday: [{ startTime: '13:00', endTime: '17:00' }], wednesday: [{ startTime: '13:00', endTime: '17:00' }], thursday: [{ startTime: '13:00', endTime: '17:00' }], friday: [{ startTime: '13:00', endTime: '17:00' }] } } : person)
  const restrictedSlots = generateInterviewSlots({ policy, interviewerIds: required.interviewerIds, interviewers: restrictedInterviewers, existingInterviews: [], now })
  check(errors, restrictedSlots.slots.length > 0 && restrictedSlots.slots.every((slot) => slot.start.slice(11,16) >= '13:00'), 'Slots violated interviewer working hours')
  const firstSlot = generated.slots[0]!
  const conflictInterview: Interview = { ...activeInterview, id: 'buffer-conflict', scheduledStart: firstSlot.end, scheduledEnd: new Date(new Date(firstSlot.end).getTime() + 3_600_000).toISOString(), interviewers: required.interviewerIds.map((id) => ({ id, name: id, role: id })) }
  const buffered = generateInterviewSlots({ policy, interviewerIds: required.interviewerIds, interviewers, existingInterviews: [conflictInterview], now })
  check(errors, !buffered.slots.some((slot) => slot.id === firstSlot.id), 'Buffer or conflict exclusion was not respected')

  const prepared = prepareSchedulingInvitation({ state, applicationId: 'application-auto-01', interviewers, now })
  const preparedAgain = prepareSchedulingInvitation({ state, applicationId: 'application-auto-01', interviewers, now })
  check(errors, Boolean(prepared.invitation?.availableSlots.length), 'Invitation did not contain valid slots')
  check(errors, prepared.invitation?.id === preparedAgain.invitation?.id && prepared.invitation?.token === preparedAgain.invitation?.token, 'Invitation ID or token was not deterministic')
  const invitation = prepared.invitation!
  const invitedState = demoReducer(state, { type: 'ADD_SCHEDULING_INVITATION', payload: { invitation } })
  const duplicateState = demoReducer(invitedState, { type: 'ADD_SCHEDULING_INVITATION', payload: { invitation } })
  check(errors, invitedState.interviewSchedulingInvitations.length === 1 && duplicateState === invitedState, 'Duplicate pending invitation was not prevented')
  const interview = interviewFor(invitation)
  const scheduledState = demoReducer(invitedState, { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: invitation.availableSlots[0]!.id, interview } })
  check(errors, scheduledState.interviews.length === 1, 'Valid slot selection did not create one interview')
  check(errors, scheduledState.applications[0]?.currentStage === 'INTERVIEW', 'Slot selection did not move application to INTERVIEW')
  check(errors, scheduledState.interviewSchedulingInvitations[0]?.status === 'SCHEDULED', 'Invitation did not become SCHEDULED')
  const conflictedState = { ...invitedState, interviews: [{ ...interview, id: 'other-conflict', applicationId: 'application-auto-02' }] }
  check(errors, demoReducer(conflictedState, { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: invitation.availableSlots[0]!.id, interview } }) === conflictedState, 'Conflicting slot was accepted during revalidation')
  const expiredInvitation = { ...invitation, expiresAt: '2026-07-20T07:00:00.000Z' }
  const expiredState = { ...state, interviewSchedulingInvitations: [expiredInvitation] }
  check(errors, demoReducer(expiredState, { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: expiredInvitation.id, slotId: expiredInvitation.availableSlots[0]!.id, interview } }) === expiredState, 'Expired invitation scheduled an interview')

  const secondInterview = interviewFor(invitation, 1, interview.id)
  const rescheduledState = demoReducer(scheduledState, { type: 'RESCHEDULE_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: invitation.availableSlots[1]!.id, interview: secondInterview, rescheduledAt: '2026-07-20T09:00:00.000Z' } })
  check(errors, rescheduledState.interviews[0]?.id === interview.id && rescheduledState.interviews[0]?.scheduledStart === secondInterview.scheduledStart, 'Rescheduling did not preserve interview ID')
  check(errors, rescheduledState.interviewSchedulingInvitations[0]?.rescheduleCount === 1, 'Reschedule count did not increment')
  const limitState = { ...scheduledState, interviewSchedulingInvitations: scheduledState.interviewSchedulingInvitations.map((item) => ({ ...item, rescheduleCount: policy.candidateRescheduleLimit })) }
  check(errors, demoReducer(limitState, { type: 'RESCHEDULE_SELF_SCHEDULED_INTERVIEW', payload: { invitationId: invitation.id, slotId: invitation.availableSlots[1]!.id, interview: secondInterview, rescheduledAt: '2026-07-20T09:00:00.000Z' } }) === limitState, 'Reschedule limit was not enforced')

  const missingPolicy = prepareSchedulingInvitation({ state: { ...state, interviewSchedulingPolicies: [] }, applicationId: 'application-auto-01', interviewers, now })
  const missingPeople = prepareSchedulingInvitation({ state, applicationId: 'application-auto-01', interviewers: [], now })
  const impossiblePolicy = { ...policy, dailyStartTime: '09:00', dailyEndTime: '09:30', durationMinutes: 60 as const }
  const noSlots = prepareSchedulingInvitation({ state: { ...state, interviewSchedulingPolicies: state.interviewSchedulingPolicies.map((item) => item.id === policy.id ? impossiblePolicy : item) }, applicationId: 'application-auto-01', interviewers, now })
  check(errors, missingPolicy.invitation?.exceptionReason === 'POLICY_MISSING', 'Missing policy did not create an exception')
  check(errors, missingPeople.invitation?.exceptionReason === 'INTERVIEWERS_UNAVAILABLE', 'Missing interviewers did not create an exception')
  check(errors, noSlots.invitation?.exceptionReason === 'NO_AVAILABLE_SLOTS', 'No available slots did not create an exception')
  const exceptionState = { ...state, interviewSchedulingInvitations: [missingPolicy.invitation!] }
  const { id: _id, applicationId: _applicationId, jobId: _jobId, createdAt: _createdAt, ...regeneratedChanges } = invitation
  const regeneratedState = demoReducer(exceptionState, { type: 'UPDATE_SCHEDULING_INVITATION', payload: { invitationId: missingPolicy.invitation!.id, changes: regeneratedChanges } })
  check(errors, regeneratedState.interviewSchedulingInvitations[0]?.status === 'PENDING' && !regeneratedState.interviewSchedulingInvitations[0]?.lastError, 'Regeneration did not clear a resolvable exception')
  const summary = selectInterviewAutomationSummary(scheduledState, now)
  check(errors, summary.scheduledInterviews === 1 && summary.awaitingCandidateScheduling === 0, 'Dashboard automation summary did not match state')
  const timeline = selectCandidateTimeline(scheduledState, invitation.applicationId)
  check(errors, timeline.some((event) => event.type === 'SCHEDULING_INVITATION_PREPARED') && timeline.some((event) => event.type === 'INTERVIEW_SCHEDULED'), 'Timeline did not include invitation and interview events')

  const legacy = { ...initialDemoState }
  delete (legacy as Partial<DemoState>).interviewSchedulingPolicies
  delete (legacy as Partial<DemoState>).interviewSchedulingInvitations
  const hydrated = normalizePersistedDemoState(legacy)
  check(errors, hydrated.interviewSchedulingPolicies.length > 0 && hydrated.interviewSchedulingInvitations.length === 0, 'Older persisted state did not hydrate new scheduling collections')
  check(errors, typeof JSON.stringify(rescheduledState) === 'string', 'Scheduling automation state was not JSON serializable')
  check(errors, JSON.stringify(initialDemoState) === sourceSnapshot, 'Scheduling validation mutated initial state')
  return { valid: errors.length === 0, errors }
}
