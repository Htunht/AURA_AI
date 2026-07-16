import interviewersData from '../data/interviewers.json'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import {
  selectCandidateTimeline,
  selectInterviewByApplicationId,
  selectInterviewListItems,
  selectInterviewSchedulingCandidates,
  selectUpcomingInterviews,
} from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import type { Interview } from '../types/interview'
import type { InterviewScheduleDraft } from '../types/interviewScheduling'
import type { Interviewer } from '../types/interviewer'
import {
  buildInterviewDateRange,
  createNextInterviewId,
  findInterviewConflicts,
  hasCandidateInterviewConflict,
  validateInterviewScheduleDraft,
} from './interviewScheduling'

export type InterviewSchedulingDomainValidationResult = {
  valid: boolean
  errors: string[]
}

const interviewers = interviewersData as Interviewer[]
const now = new Date('2026-07-20T08:00:00.000Z')

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

function createReviewedFixture(
  suffix: string,
  recommendation: Decision['humanRecommendation'] | undefined,
): { candidate: Candidate; application: Application; decision?: Decision } {
  const sourceCandidate = initialDemoState.candidates[0]
  const sourceApplication = initialDemoState.applications[0]
  const sourceEvaluation = initialDemoState.evaluations[0]
  if (!sourceCandidate || !sourceApplication || !sourceEvaluation) {
    throw new Error('Interview scheduling validation requires seed fixtures.')
  }
  const candidate: Candidate = {
    ...sourceCandidate,
    id: `candidate-scheduling-${suffix}`,
    fullName: `Scheduling Candidate ${suffix}`,
    email: `scheduling.${suffix}@example.com`,
  }
  const application: Application = {
    ...sourceApplication,
    id: `application-scheduling-${suffix}`,
    candidateId: candidate.id,
    jobId: initialDemoState.jobs[0]!.id,
    currentStage: 'SHORTLIST_REVIEW',
    submittedAt: `2026-07-${suffix.padStart(2, '0')}T08:00:00.000Z`,
  }
  const decision: Decision | undefined = recommendation
    ? {
        id: `decision-scheduling-${suffix}`,
        applicationId: application.id,
        evaluationId: sourceEvaluation.id,
        reviewAction: 'CONFIRM',
        aiRecommendation: recommendation,
        humanRecommendation: recommendation,
        humanDecision: 'NEXT_STAGE',
        createdAt: `2026-07-${suffix.padStart(2, '0')}T09:00:00.000Z`,
      }
    : undefined
  return { candidate, application, decision }
}

function createFixtureState(): DemoState {
  const fixtures = [
    createReviewedFixture('01', 'STRONG_YES'),
    createReviewedFixture('02', 'YES'),
    createReviewedFixture('03', 'REVIEW'),
    createReviewedFixture('04', 'NO'),
    createReviewedFixture('05', undefined),
    createReviewedFixture('06', 'YES'),
  ]
  const activeApplication = fixtures[5]!.application
  const activeInterview: Interview = {
    id: 'interview-active-validation',
    applicationId: activeApplication.id,
    jobId: activeApplication.jobId,
    scheduledStart: '2026-07-22T09:00:00.000Z',
    scheduledEnd: '2026-07-22T10:00:00.000Z',
    timezone: 'Asia/Yangon',
    status: 'SCHEDULED',
    mode: 'PHONE',
    interviewers: [{ id: interviewers[0]!.id, name: interviewers[0]!.fullName, role: interviewers[0]!.roleTitle }],
    questions: [],
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
  }
  return {
    ...initialDemoState,
    candidates: fixtures.map((item) => item.candidate),
    applications: fixtures.map((item) => item.application),
    decisions: fixtures.flatMap((item) => (item.decision ? [item.decision] : [])),
    interviews: [activeInterview],
    transcripts: [],
    communications: [],
    screeningQueue: [],
  }
}

function validDraft(applicationId: string): InterviewScheduleDraft {
  return {
    applicationId,
    mode: 'PHONE',
    date: '2026-07-23',
    startTime: '09:00',
    durationMinutes: 60,
    timezone: 'Asia/Yangon',
    interviewerIds: [interviewers[1]!.id],
    notes: '',
  }
}

function createScheduledInterview(application: Application): Interview {
  return {
    id: 'interview-created-validation',
    applicationId: application.id,
    jobId: application.jobId,
    scheduledStart: '2026-07-23T09:00:00.000Z',
    scheduledEnd: '2026-07-23T10:00:00.000Z',
    timezone: 'Asia/Yangon',
    status: 'SCHEDULED',
    mode: 'PHONE',
    interviewers: [{ id: interviewers[1]!.id, name: interviewers[1]!.fullName, role: interviewers[1]!.roleTitle }],
    notes: 'Recruiter scheduling note',
    questions: [],
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
  }
}

export function validateInterviewSchedulingDomain(): InterviewSchedulingDomainValidationResult {
  const errors: string[] = []
  const sourceSnapshot = JSON.stringify(initialDemoState)
  const state = createFixtureState()
  const eligible = selectInterviewSchedulingCandidates(state)
  const eligibleIds = new Set(eligible.map((item) => item.application.id))

  check(errors, ['01', '02', '03'].every((suffix) => eligibleIds.has(`application-scheduling-${suffix}`)), 'Positive human-reviewed applications were not all eligible')
  check(errors, !eligibleIds.has('application-scheduling-04'), 'Negative human decision was eligible')
  check(errors, !eligibleIds.has('application-scheduling-05'), 'Application without a human decision was eligible')
  check(errors, !eligibleIds.has('application-scheduling-06'), 'Application with an active interview was eligible')
  check(errors, eligible.every((item) => item.application.candidateId === item.candidate.id && item.application.jobId === item.job.id), 'Eligible scheduling records did not resolve candidate and job references')
  check(errors, selectInterviewListItems(state).length === 1, 'Interview list did not resolve a valid interview record')

  const firstApplication = state.applications[0]!
  const draft = validDraft(firstApplication.id)
  const range = buildInterviewDateRange(draft)
  check(errors, range.scheduledEnd === '2026-07-23T10:00:00.000Z', 'Interview end time was not calculated from duration')
  const ids = [createNextInterviewId(state.interviews, firstApplication.id)]
  const stateWithFirstId = { ...state, interviews: [...state.interviews, { ...createScheduledInterview(firstApplication), id: ids[0]! }] }
  ids.push(createNextInterviewId(stateWithFirstId.interviews, firstApplication.id))
  check(errors, ids[0] !== ids[1] && ids.every((id) => id.startsWith(`interview-${firstApplication.id}-`)), 'Deterministic interview IDs collided')

  const validate = (changes: Partial<InterviewScheduleDraft> = {}, validationState = state) =>
    validateInterviewScheduleDraft({ draft: { ...draft, ...changes }, state: validationState, interviewers, now })
  check(errors, Boolean(validate({ date: '' }).errors.date), 'Required date validation did not run')
  check(errors, Boolean(validate({ startTime: '' }).errors.startTime), 'Required time validation did not run')
  check(errors, Boolean(validate({ durationMinutes: 15 }).errors.durationMinutes), 'Unsupported duration was accepted')
  check(errors, Boolean(validate({ interviewerIds: [] }).errors.interviewerIds), 'Missing interviewer was accepted')
  check(errors, Boolean(validate({ interviewerIds: ['missing-interviewer'] }).errors.interviewerIds), 'Invalid interviewer ID was accepted')
  check(errors, Boolean(validate({ date: '2026-07-19' }).errors.startTime), 'Past interview time was accepted')
  check(errors, Boolean(validate({ mode: 'VIDEO', meetingLink: '' }).errors.meetingLink), 'Video interview without meeting link was accepted')
  check(errors, Boolean(validate({ mode: 'ONSITE', location: '' }).errors.location), 'On-site interview without location was accepted')
  check(errors, validate().valid, 'Valid phone interview did not pass validation')

  const conflictBase = createScheduledInterview(firstApplication)
  const backToBack = findInterviewConflicts({ interviews: [conflictBase], interviewerIds: [interviewers[1]!.id], scheduledStart: conflictBase.scheduledEnd, scheduledEnd: '2026-07-23T11:00:00.000Z' })
  const overlapping = findInterviewConflicts({ interviews: [conflictBase], interviewerIds: [interviewers[1]!.id], scheduledStart: '2026-07-23T09:30:00.000Z', scheduledEnd: '2026-07-23T10:30:00.000Z' })
  const ignoredStatuses = findInterviewConflicts({ interviews: [{ ...conflictBase, status: 'CANCELLED' }, { ...conflictBase, id: 'completed-validation', status: 'COMPLETED' }], interviewerIds: [interviewers[1]!.id], scheduledStart: '2026-07-23T09:30:00.000Z', scheduledEnd: '2026-07-23T10:30:00.000Z' })
  check(errors, backToBack.length === 0, 'Back-to-back interviews were treated as conflicts')
  check(errors, overlapping.length === 1, 'Overlapping interviewer schedule was not detected')
  check(errors, ignoredStatuses.length === 0, 'Cancelled or completed interview created a conflict')
  check(errors, hasCandidateInterviewConflict([conflictBase], firstApplication.id, '2026-07-23T09:30:00.000Z', '2026-07-23T10:30:00.000Z'), 'Same-application overlap was not detected')

  const interview = createScheduledInterview(firstApplication)
  const addedState = demoReducer(state, { type: 'ADD_INTERVIEW', payload: { interview } })
  check(errors, addedState.interviews.length === state.interviews.length + 1, 'Adding an interview did not create one record')
  const duplicateState = demoReducer(addedState, { type: 'ADD_INTERVIEW', payload: { interview: { ...interview, id: 'interview-duplicate-validation' } } })
  check(errors, duplicateState === addedState, 'Duplicate active interview was not prevented')
  const interviewStageState = demoReducer(addedState, { type: 'UPDATE_APPLICATION_STAGE', payload: { applicationId: firstApplication.id, stage: 'INTERVIEW' } })
  check(errors, interviewStageState.applications.find((item) => item.id === firstApplication.id)?.currentStage === 'INTERVIEW', 'Scheduling did not move the application to INTERVIEW')

  const rescheduledState = demoReducer(interviewStageState, { type: 'UPDATE_INTERVIEW', payload: { interviewId: interview.id, changes: { scheduledStart: '2026-07-24T09:00:00.000Z', scheduledEnd: '2026-07-24T10:00:00.000Z', updatedAt: '2026-07-21T09:00:00.000Z' } } })
  check(errors, rescheduledState.interviews.some((item) => item.id === interview.id && item.scheduledStart === '2026-07-24T09:00:00.000Z'), 'Rescheduling did not preserve the interview ID')
  const rescheduleDraft = { ...draft, date: '2026-07-24' }
  check(errors, validateInterviewScheduleDraft({ draft: rescheduleDraft, state: rescheduledState, interviewers, now, excludeInterviewId: interview.id }).valid, 'Rescheduling did not exclude the current interview from conflicts')

  const cancelledState = demoReducer(rescheduledState, { type: 'UPDATE_INTERVIEW_STATUS', payload: { interviewId: interview.id, status: 'CANCELLED', updatedAt: '2026-07-21T10:00:00.000Z' } })
  const shortlistState = demoReducer(cancelledState, { type: 'UPDATE_APPLICATION_STAGE', payload: { applicationId: firstApplication.id, stage: 'SHORTLIST_REVIEW' } })
  check(errors, cancelledState.interviews.some((item) => item.id === interview.id && item.status === 'CANCELLED'), 'Cancelling did not preserve the interview record')
  check(errors, shortlistState.applications.find((item) => item.id === firstApplication.id)?.currentStage === 'SHORTLIST_REVIEW', 'Cancellation did not return the application to SHORTLIST_REVIEW')
  check(errors, selectUpcomingInterviews(interviewStageState, now).some((item) => item.interview.id === interview.id), 'Dashboard upcoming interviews did not include the scheduled interview')
  check(errors, selectCandidateTimeline(interviewStageState, firstApplication.id).some((event) => event.type === 'INTERVIEW_SCHEDULED'), 'Candidate timeline did not include the scheduled interview')
  check(errors, selectInterviewByApplicationId(interviewStageState, firstApplication.id)?.id === interview.id, 'Candidate detail did not resolve the scheduled interview')
  check(errors, typeof JSON.stringify(shortlistState) === 'string', 'Scheduling state was not JSON serializable')
  check(errors, JSON.stringify(initialDemoState) === sourceSnapshot, 'Interview scheduling validation mutated source state')

  return { valid: errors.length === 0, errors }
}
