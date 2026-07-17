import type { DemoState } from '../store/demoReducer'
import type { Interview, InterviewMode } from '../types/interview'
import type { InterviewScheduleDraft, InterviewScheduleValidationResult } from '../types/interviewScheduling'
import type { Interviewer } from '../types/interviewer'
import { normalizeApplicationStage } from './applicationStage'

export type InterviewConflict = {
  interviewId: string
  interviewerId: string
  interviewerName?: string
  conflictingStart: string
  conflictingEnd: string
  candidateName?: string
}

const activeStatuses = new Set(['SCHEDULED', 'IN_PROGRESS', 'PAUSED'])
const supportedDurations = new Set([30, 45, 60, 90])
const interviewModes = new Set<InterviewMode>(['VIDEO', 'PHONE', 'ONSITE'])

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && end > otherStart
}

export function findInterviewConflicts(input: {
  interviews: Interview[]
  interviewerIds: string[]
  scheduledStart: string
  scheduledEnd: string
  excludeInterviewId?: string
}): InterviewConflict[] {
  const requestedIds = new Set(input.interviewerIds)
  return input.interviews
    .filter(
      (interview) =>
        interview.id !== input.excludeInterviewId &&
        activeStatuses.has(interview.status) &&
        overlaps(
          input.scheduledStart,
          input.scheduledEnd,
          interview.scheduledStart,
          interview.scheduledEnd,
        ),
    )
    .flatMap((interview) =>
      interview.interviewers
        .filter((interviewer) => requestedIds.has(interviewer.id))
        .map((interviewer) => ({
          interviewId: interview.id,
          interviewerId: interviewer.id,
          interviewerName: interviewer.name,
          conflictingStart: interview.scheduledStart,
          conflictingEnd: interview.scheduledEnd,
        })),
    )
    .sort((left, right) =>
      left.conflictingStart.localeCompare(right.conflictingStart) ||
      left.interviewerId.localeCompare(right.interviewerId) ||
      left.interviewId.localeCompare(right.interviewId),
    )
}

export function hasCandidateInterviewConflict(
  interviews: Interview[],
  applicationId: string,
  scheduledStart: string,
  scheduledEnd: string,
): boolean {
  return interviews.some(
    (interview) =>
      interview.applicationId === applicationId &&
      activeStatuses.has(interview.status) &&
      overlaps(
        scheduledStart,
        scheduledEnd,
        interview.scheduledStart,
        interview.scheduledEnd,
      ),
  )
}

export function buildInterviewDateRange(input: {
  date: string
  startTime: string
  durationMinutes: number
  timezone: string
}): { scheduledStart: string; scheduledEnd: string } {
  const [year = 0, month = 0, day = 0] = input.date.split('-').map(Number)
  const [hour = 0, minute = 0] = input.startTime.split(':').map(Number)
  const startMilliseconds = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const endMilliseconds = startMilliseconds + input.durationMinutes * 60_000
  return {
    scheduledStart: new Date(startMilliseconds).toISOString(),
    scheduledEnd: new Date(endMilliseconds).toISOString(),
  }
}

export function createNextInterviewId(
  interviews: Interview[],
  applicationId: string,
): string {
  const existingIds = new Set(interviews.map((interview) => interview.id))
  let sequence = interviews.filter(
    (interview) => interview.applicationId === applicationId,
  ).length + 1
  let id = `interview-${applicationId}-${String(sequence).padStart(3, '0')}`
  while (existingIds.has(id)) {
    sequence += 1
    id = `interview-${applicationId}-${String(sequence).padStart(3, '0')}`
  }
  return id
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function validateInterviewScheduleDraft(input: {
  draft: InterviewScheduleDraft
  state: DemoState
  interviewers: Interviewer[]
  now: Date
  excludeInterviewId?: string
}): InterviewScheduleValidationResult {
  const { draft, state } = input
  const errors: Record<string, string> = {}
  const application = state.applications.find((item) => item.id === draft.applicationId)
  const candidate = application
    ? state.candidates.find((item) => item.id === application.candidateId)
    : undefined
  const job = application
    ? state.jobs.find((item) => item.id === application.jobId)
    : undefined
  const decision = application
    ? state.decisions
        .filter((item) => item.applicationId === application.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
    : undefined
  const positiveDecision =
    decision?.humanRecommendation === 'STRONG_YES' ||
    decision?.humanRecommendation === 'YES' ||
    decision?.humanRecommendation === 'REVIEW'
  const editedInterview = input.excludeInterviewId
    ? state.interviews.find(
        (interview) =>
          interview.id === input.excludeInterviewId &&
          interview.applicationId === draft.applicationId,
      )
    : undefined

  if (editedInterview && editedInterview.status !== 'SCHEDULED') {
    errors.applicationId = 'Only scheduled interviews can be rescheduled.'
  }

  if (!application) errors.applicationId = 'Choose an eligible candidate.'
  else {
    if (!candidate) errors.applicationId = 'The candidate record could not be resolved.'
    if (!job) errors.applicationId = 'The job opening could not be resolved.'
    if (!editedInterview) {
      if (!decision) errors.applicationId = 'A recruiter decision is required before scheduling.'
      else if (!positiveDecision) errors.applicationId = 'Only positive recruiter decisions are eligible for scheduling.'
      if (normalizeApplicationStage(application.currentStage) !== 'SHORTLISTED') {
        errors.applicationId = 'The application must be in shortlist review before scheduling.'
      }
      const hasActiveInterview = state.interviews.some(
        (interview) =>
          interview.applicationId === application.id &&
          activeStatuses.has(interview.status),
      )
      if (hasActiveInterview) errors.applicationId = 'An active interview already exists for this application.'
    }
  }

  if (!interviewModes.has(draft.mode)) errors.mode = 'Choose an interview format.'
  if (!draft.date) errors.date = 'Interview date is required.'
  if (!draft.startTime) errors.startTime = 'Start time is required.'
  if (!supportedDurations.has(draft.durationMinutes)) errors.durationMinutes = 'Choose a supported duration.'
  if (!draft.timezone.trim()) errors.timezone = 'Timezone is required.'
  if (draft.interviewerIds.length === 0) errors.interviewerIds = 'Select at least one interviewer.'
  else if (draft.interviewerIds.some((id) => !input.interviewers.some((person) => person.id === id))) {
    errors.interviewerIds = 'One or more selected interviewers are unavailable.'
  }
  if (draft.mode === 'VIDEO' && !isValidUrl(draft.meetingLink?.trim() ?? '')) {
    errors.meetingLink = 'Enter a valid meeting link for the video interview.'
  }
  if (draft.mode === 'ONSITE' && !draft.location?.trim()) {
    errors.location = 'Enter the on-site interview location.'
  }

  if (draft.date && draft.startTime && supportedDurations.has(draft.durationMinutes)) {
    const range = buildInterviewDateRange(draft)
    const start = new Date(range.scheduledStart)
    const end = new Date(range.scheduledEnd)
    if (!Number.isFinite(start.getTime()) || start <= input.now) {
      errors.startTime = 'Choose a future interview time.'
    }
    if (!Number.isFinite(end.getTime()) || end <= start) {
      errors.durationMinutes = 'Interview end time must be after its start time.'
    }
    if (
      findInterviewConflicts({
        interviews: state.interviews,
        interviewerIds: draft.interviewerIds,
        ...range,
        excludeInterviewId: input.excludeInterviewId,
      }).length > 0
    ) {
      errors.conflicts = 'One or more interviewers already have an overlapping interview.'
    }
    const candidateInterviews = state.interviews.filter(
      (interview) => interview.id !== input.excludeInterviewId,
    )
    if (
      application &&
      hasCandidateInterviewConflict(
        candidateInterviews,
        application.id,
        range.scheduledStart,
        range.scheduledEnd,
      )
    ) {
      errors.conflicts = 'The candidate already has an overlapping interview.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
