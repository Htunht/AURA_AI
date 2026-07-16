import type { Application } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { Communication } from '../types/communication'
import type { Decision } from '../types/decision'
import type { Evaluation } from '../types/evaluation'
import type { Interview } from '../types/interview'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewSession } from '../types/interviewSession'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import type { SchedulingExceptionReason } from '../types/interviewSchedulingInvitation'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import type { Interviewer } from '../types/interviewer'
import type { Job } from '../types/job'
import type { EvaluationRubric } from '../types/rubric'
import type {
  HumanReviewCategory,
  HumanReviewQueueItem,
} from '../types/reviewQueue'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import type { Transcript } from '../types/transcript'
import { getScreeningRecommendationLabel } from '../utils/recommendation'
import { evaluateJobReadiness, selectJobRelatedRecordCounts as deriveJobRelatedRecordCounts, type JobReadinessResult, type JobRelatedRecordCounts } from '../utils/jobValidation'
import { evaluateHiringWorkflowReadiness, selectHiringWorkflowSetupProgress as deriveHiringWorkflowSetupProgress } from '../utils/hiringWorkflowSetup'
import type { HiringWorkflowReadiness, HiringWorkflowSetupProgress } from '../types/hiringWorkflowSetup'
import type { DemoState } from './demoReducer'
import interviewersData from '../data/interviewers.json'
import type { EmailDeliveryStatus } from '../types/emailDelivery'
import type { ResolvedInterviewSchedulingPolicy } from '../types/resolvedInterviewSchedulingPolicy'
import { resolveInterviewSchedulingPolicy } from '../utils/interviewSchedulingPolicyResolution'
import { evaluateInterviewQuestionSetReadiness } from '../utils/interviewQuestionSetReadiness'
import { deriveJobRequirements } from '../utils/jobRequirements'

const schedulingInterviewers = interviewersData as Interviewer[]

export function selectInterviewQuestionSetsByInterviewId(state: DemoState, interviewId: string): InterviewQuestionSet[] {
  return state.interviewQuestionSets.filter((set) => set.interviewId === interviewId).sort((left, right) => right.version - left.version)
}

export function selectInterviewSessionByInterviewId(state: DemoState, interviewId: string): InterviewSession | undefined { return state.interviewSessions.find((session) => session.interviewId === interviewId) }
export function selectInterviewSessionById(state: DemoState, sessionId: string): InterviewSession | undefined { return state.interviewSessions.find((session) => session.id === sessionId) }
export type InterviewSessionViewModel = { session: InterviewSession; interview: Interview; questionSet: InterviewQuestionSet; candidate: Candidate; application: Application; job: Job }
export function selectInterviewSessionViewModel(state: DemoState, interviewId: string): InterviewSessionViewModel | undefined {
  const session = selectInterviewSessionByInterviewId(state, interviewId); const interview = state.interviews.find((item) => item.id === interviewId); const questionSet = session ? state.interviewQuestionSets.find((item) => item.id === session.questionSetId) : undefined; const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined; const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined; const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  return session && interview && questionSet && application && candidate && job ? { session, interview, questionSet, application, candidate, job } : undefined
}
export type InterviewSessionProgressSummary = { total: number; asked: number; skipped: number; notAsked: number; current: number; notReached: number; completionPercent: number }
export function selectInterviewSessionProgressSummary(session: InterviewSession): InterviewSessionProgressSummary {
  const count = (status: string) => session.questionProgress.filter((item) => item.status === status).length
  const total = session.questionProgress.length; const asked = count('ASKED'); const skipped = count('SKIPPED'); const notAsked = count('NOT_ASKED'); const current = count('CURRENT'); const notReached = count('NOT_REACHED')
  return { total, asked, skipped, notAsked, current, notReached, completionPercent: total ? Math.round(((asked + skipped) / total) * 100) : 0 }
}
export type InterviewSessionOperationalStatus = 'PLAN_REQUIRED' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'UNAVAILABLE'
export function selectInterviewSessionOperationalStatus(state: DemoState, interviewId: string): InterviewSessionOperationalStatus {
  const interview = state.interviews.find((item) => item.id === interviewId); const session = selectInterviewSessionByInterviewId(state, interviewId)
  if (!interview || interview.status === 'CANCELLED') return 'UNAVAILABLE'
  if (session?.status === 'COMPLETED' || interview.status === 'COMPLETED') return 'COMPLETED'
  if (session?.status === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (session?.status === 'PAUSED') return 'PAUSED'
  return selectApprovedInterviewQuestionSet(state, interviewId) ? 'READY' : 'PLAN_REQUIRED'
}
export function selectInterviewSessionOperationsSummary(state: DemoState, now: Date) {
  const statuses = state.interviews.map((interview) => ({ interview, status: selectInterviewSessionOperationalStatus(state, interview.id) }))
  const day = now.toISOString().slice(0, 10)
  return { ready: statuses.filter((item) => item.status === 'READY').length, inProgress: statuses.filter((item) => item.status === 'IN_PROGRESS').length, paused: statuses.filter((item) => item.status === 'PAUSED').length, completedToday: state.interviewSessions.filter((session) => session.status === 'COMPLETED' && session.completedAt?.slice(0, 10) === day).length, attention: statuses.filter((item) => item.status === 'PAUSED' || (item.status === 'PLAN_REQUIRED' && item.interview.scheduledStart <= new Date(now.getTime() + 60 * 60_000).toISOString())) }
}

export function selectLatestInterviewQuestionSet(state: DemoState, interviewId: string): InterviewQuestionSet | undefined {
  return selectInterviewQuestionSetsByInterviewId(state, interviewId)[0]
}

export function selectApprovedInterviewQuestionSet(state: DemoState, interviewId: string): InterviewQuestionSet | undefined {
  return selectInterviewQuestionSetsByInterviewId(state, interviewId).find((set) => set.status === 'APPROVED')
}

export type InterviewQuestionPreparationStatus = 'NOT_PREPARED' | 'PREPARING' | 'DRAFT_READY' | 'APPROVED' | 'FAILED'

export function selectInterviewQuestionPreparationStatus(state: DemoState, interviewId: string): InterviewQuestionPreparationStatus {
  const set = selectLatestInterviewQuestionSet(state, interviewId)
  if (!set) return 'NOT_PREPARED'
  if (set.status === 'GENERATING') return 'PREPARING'
  if (set.status === 'DRAFT') return 'DRAFT_READY'
  if (set.status === 'APPROVED') return 'APPROVED'
  return 'FAILED'
}

export function selectInterviewPreparationSummary(state: DemoState) {
  const scheduled = state.interviews.filter((interview) => interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS')
  const statuses = scheduled.map((interview) => ({ interview, status: selectInterviewQuestionPreparationStatus(state, interview.id) }))
  return {
    readyForReview: statuses.filter((item) => item.status === 'DRAFT_READY').length,
    approved: statuses.filter((item) => item.status === 'APPROVED').length,
    failed: statuses.filter((item) => item.status === 'FAILED').length,
    needsReview: statuses.filter((item) => item.status === 'DRAFT_READY' || item.status === 'FAILED').sort((a, b) => a.interview.scheduledStart.localeCompare(b.interview.scheduledStart)),
  }
}

export function selectInterviewQuestionSetReadiness(state: DemoState, interviewId: string) {
  const interview = state.interviews.find((item) => item.id === interviewId)
  const set = selectLatestInterviewQuestionSet(state, interviewId)
  const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  return interview && set && job ? evaluateInterviewQuestionSetReadiness({ questionSet: set, interview, requirements: deriveJobRequirements(job) }) : undefined
}

export function selectJobById(
  state: DemoState,
  jobId: string,
): Job | undefined {
  return state.jobs.find((job) => job.id === jobId)
}

export function selectJobsByStatus(state: DemoState, status: Job['status']): Job[] {
  return state.jobs.filter((job) => job.status === status)
}

export function selectJobReadiness(state: DemoState, jobId: string): JobReadinessResult {
  return evaluateJobReadiness(state, jobId)
}

export function selectJobRelatedRecordCounts(state: DemoState, jobId: string): JobRelatedRecordCounts {
  return deriveJobRelatedRecordCounts(state, jobId)
}

export function selectHiringWorkflowSetupProgress(state: DemoState, jobId: string): HiringWorkflowSetupProgress { return deriveHiringWorkflowSetupProgress(state, jobId) }
export function selectHiringWorkflowReadiness(state: DemoState, jobId: string): HiringWorkflowReadiness { return evaluateHiringWorkflowReadiness(state, jobId) }

export function selectCandidateById(
  state: DemoState,
  candidateId: string,
): Candidate | undefined {
  return state.candidates.find((candidate) => candidate.id === candidateId)
}

export function selectApplicationById(
  state: DemoState,
  applicationId: string,
): Application | undefined {
  return state.applications.find(
    (application) => application.id === applicationId,
  )
}

export function selectApplicationsByJobId(
  state: DemoState,
  jobId: string,
): Application[] {
  return state.applications.filter((application) => application.jobId === jobId)
}

export function selectApplicationFormsByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm[] {
  return state.applicationForms
    .filter((form) => form.jobId === jobId)
    .sort((left, right) => right.version - left.version)
}

export function selectPublishedApplicationFormByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm | undefined {
  return selectApplicationFormsByJobId(state, jobId).find(
    (form) => form.status === 'PUBLISHED',
  )
}

export function selectApplicationFormById(
  state: DemoState,
  formId: string,
): ApplicationForm | undefined {
  return state.applicationForms.find((form) => form.id === formId)
}

export function selectDraftApplicationFormByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm | undefined {
  return selectApplicationFormsByJobId(state, jobId).find(
    (form) => form.status === 'DRAFT',
  )
}

export function selectRubricsByJobId(
  state: DemoState,
  jobId: string,
): EvaluationRubric[] {
  return state.rubrics
    .filter((rubric) => rubric.jobId === jobId)
    .sort((left, right) => right.version - left.version)
}

export function selectPublishedRubricByJobId(
  state: DemoState,
  jobId: string,
): EvaluationRubric | undefined {
  return selectRubricsByJobId(state, jobId).find((rubric) => rubric.status === 'PUBLISHED')
}

export function selectDraftRubricByJobId(
  state: DemoState,
  jobId: string,
): EvaluationRubric | undefined {
  return selectRubricsByJobId(state, jobId).find((rubric) => rubric.status === 'DRAFT')
}

export function selectCandidateForApplication(
  state: DemoState,
  applicationId: string,
): Candidate | undefined {
  const application = selectApplicationById(state, applicationId)

  return application
    ? selectCandidateById(state, application.candidateId)
    : undefined
}

function selectLatestEvaluationByType(
  state: DemoState,
  applicationId: string,
  evaluationType: 'SCREENING' | 'FINAL',
): Evaluation | undefined {
  return state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === evaluationType,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

export function selectScreeningEvaluationsByApplicationId(
  state: DemoState,
  applicationId: string,
): Evaluation[] {
  return state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === 'SCREENING',
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function selectLatestScreeningEvaluation(
  state: DemoState,
  applicationId: string,
): Evaluation | undefined {
  return selectScreeningEvaluationsByApplicationId(state, applicationId)[0]
}

export function selectLatestFinalEvaluation(
  state: DemoState,
  applicationId: string,
): Evaluation | undefined {
  return selectLatestEvaluationByType(state, applicationId, 'FINAL')
}

export function selectInterviewByApplicationId(
  state: DemoState,
  applicationId: string,
): Interview | undefined {
  return state.interviews
    .filter((interview) => interview.applicationId === applicationId)
    .sort((left, right) => {
      const leftActive = left.status === 'SCHEDULED' || left.status === 'IN_PROGRESS'
      const rightActive = right.status === 'SCHEDULED' || right.status === 'IN_PROGRESS'
      if (leftActive !== rightActive) return leftActive ? -1 : 1
      return right.scheduledStart.localeCompare(left.scheduledStart)
    })[0]
}

export function selectInterviewById(
  state: DemoState,
  interviewId: string,
): Interview | undefined {
  return state.interviews.find((interview) => interview.id === interviewId)
}

export function selectActiveInterviewSchedulingPolicy(
  state: DemoState,
  jobId: string,
): InterviewSchedulingPolicy | undefined {
  return selectResolvedInterviewSchedulingPolicy(state, jobId)?.policy
}

export function selectResolvedInterviewSchedulingPolicy(
  state: DemoState,
  jobId: string,
): ResolvedInterviewSchedulingPolicy | undefined {
  const job = selectJobById(state, jobId)
  return job ? resolveInterviewSchedulingPolicy({ policies: state.interviewSchedulingPolicies, job }) : undefined
}

export function selectJobsWithoutResolvedSchedulingPolicy(state: DemoState): Job[] {
  return state.jobs.filter((job) => !selectResolvedInterviewSchedulingPolicy(state, job.id))
}

export type SchedulingPolicyResolutionSummary = {
  jobOverrides: number
  departmentTemplates: number
  organizationDefaults: number
  unresolvedJobs: number
}

export function selectSchedulingPolicyResolutionSummary(state: DemoState): SchedulingPolicyResolutionSummary {
  const resolved = state.jobs.map((job) => selectResolvedInterviewSchedulingPolicy(state, job.id))
  return {
    jobOverrides: resolved.filter((item) => item?.source === 'JOB_OVERRIDE').length,
    departmentTemplates: resolved.filter((item) => item?.source === 'DEPARTMENT_TEMPLATE').length,
    organizationDefaults: resolved.filter((item) => item?.source === 'ORGANIZATION_DEFAULT').length,
    unresolvedJobs: resolved.filter((item) => !item).length,
  }
}

export function selectSchedulingInvitationByToken(
  state: DemoState,
  token: string,
): InterviewSchedulingInvitation | undefined {
  return state.interviewSchedulingInvitations.find((item) => item.token === token)
}

export function selectSchedulingInvitationByApplicationId(
  state: DemoState,
  applicationId: string,
): InterviewSchedulingInvitation | undefined {
  return state.interviewSchedulingInvitations
    .filter((item) => item.applicationId === applicationId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
}

export function selectPendingSchedulingInvitations(
  state: DemoState,
): InterviewSchedulingInvitation[] {
  return state.interviewSchedulingInvitations
    .filter((item) => item.status === 'PENDING')
    .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt))
}

export function selectSchedulingExceptions(
  state: DemoState,
): InterviewSchedulingInvitation[] {
  return state.interviewSchedulingInvitations
    .filter((item) => item.status === 'EXCEPTION_REQUIRED')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export type SchedulingAutomationCardState =
  | 'IN_PROGRESS'
  | 'READY_TO_SHARE'
  | 'AWAITING_CANDIDATE'
  | 'SCHEDULED'
  | 'EXCEPTION'
  | 'EXPIRED'
  | 'CANCELLED'

export type SchedulingProgressStep = {
  id: string
  label: string
  status: 'COMPLETE' | 'CURRENT' | 'PENDING' | 'FAILED'
}

export type SchedulingAutomationViewModel = {
  invitation: InterviewSchedulingInvitation
  candidate: Candidate
  job: Job
  interviewerNames: string[]
  availableSlotCount: number
  state: SchedulingAutomationCardState
  responsibility: 'AURA' | 'CANDIDATE' | 'RECRUITER' | 'NONE'
  progressSteps: SchedulingProgressStep[]
  deliveryStatus: EmailDeliveryStatus
  deliveryAttemptCount: number
  deliveryError?: string
  sentAt?: string
  policySourceLabel?: string
}

const exceptionLabels: Record<SchedulingExceptionReason, string> = {
  POLICY_MISSING: 'Scheduling defaults required',
  INTERVIEWERS_UNAVAILABLE: 'No eligible interviewers are available',
  NO_AVAILABLE_SLOTS: 'No suitable time slots were found',
  INVITATION_EXPIRED: 'Candidate invitation expired',
  SLOT_CONFLICT: 'Selected time is no longer available',
  RESCHEDULE_LIMIT_REACHED: 'Candidate reached the reschedule limit',
}

export function getSchedulingExceptionLabel(
  reason?: SchedulingExceptionReason,
): string {
  return reason
    ? exceptionLabels[reason]
    : 'Automatic scheduling could not continue'
}

export function deriveSchedulingAutomationCardState(
  state: DemoState,
  invitation: InterviewSchedulingInvitation,
): SchedulingAutomationCardState {
  const linkedInterview = invitation.scheduledInterviewId
    ? state.interviews.find((item) => item.id === invitation.scheduledInterviewId)
    : undefined
  if (invitation.status === 'SCHEDULED' && linkedInterview) return 'SCHEDULED'
  if (invitation.status === 'CANCELLED' || linkedInterview?.status === 'CANCELLED') return 'CANCELLED'
  if (invitation.status === 'EXPIRED') return 'EXPIRED'
  if (invitation.status === 'EXCEPTION_REQUIRED' || invitation.delivery.status === 'FAILED' || invitation.delivery.status === 'NOT_SENT') return 'EXCEPTION'
  if (invitation.delivery.status === 'SENT') return 'AWAITING_CANDIDATE'
  if (invitation.delivery.status === 'QUEUED' || invitation.delivery.status === 'SENDING') return 'IN_PROGRESS'
  return 'READY_TO_SHARE'
}

function progressStatus(
  complete: boolean,
  current: boolean,
  failed: boolean,
): SchedulingProgressStep['status'] {
  if (failed) return 'FAILED'
  if (complete) return 'COMPLETE'
  return current ? 'CURRENT' : 'PENDING'
}

function deriveSchedulingProgress(
  state: DemoState,
  invitation: InterviewSchedulingInvitation,
  cardState: SchedulingAutomationCardState,
): SchedulingProgressStep[] {
  const policyComplete = Boolean(
    state.interviewSchedulingPolicies.find(
      (policy) => policy.id === invitation.policyId,
    ),
  )
  const interviewersComplete = invitation.interviewerIds.length > 0
  const slotsComplete = invitation.availableSlots.length > 0
  const candidateSelected = Boolean(invitation.selectedSlotId)
  const interviewConfirmed = cardState === 'SCHEDULED'
  const reason = invitation.exceptionReason

  return [
    {
      id: 'policy',
      label: 'Policy applied',
      status: progressStatus(
        policyComplete,
        cardState === 'IN_PROGRESS' && !policyComplete,
        reason === 'POLICY_MISSING',
      ),
    },
    {
      id: 'interviewers',
      label: 'Interviewers assigned',
      status: progressStatus(
        interviewersComplete,
        policyComplete && !interviewersComplete && cardState === 'IN_PROGRESS',
        reason === 'INTERVIEWERS_UNAVAILABLE',
      ),
    },
    {
      id: 'slots',
      label: 'Available times generated',
      status: progressStatus(
        slotsComplete,
        interviewersComplete && !slotsComplete && cardState === 'IN_PROGRESS',
        reason === 'NO_AVAILABLE_SLOTS',
      ),
    },
    {
      id: 'invitation',
      label: cardState === 'EXPIRED' ? 'Scheduling link expired' : 'Scheduling link prepared',
      status: progressStatus(
        slotsComplete && cardState !== 'EXPIRED' && cardState !== 'READY_TO_SHARE',
        slotsComplete && cardState === 'READY_TO_SHARE',
        cardState === 'EXPIRED' || reason === 'INVITATION_EXPIRED',
      ),
    },
    {
      id: 'selection',
      label: 'Candidate selected time',
      status: progressStatus(
        candidateSelected,
        cardState === 'AWAITING_CANDIDATE',
        reason === 'SLOT_CONFLICT' || reason === 'RESCHEDULE_LIMIT_REACHED',
      ),
    },
    {
      id: 'confirmation',
      label: 'Interview confirmed',
      status: progressStatus(interviewConfirmed, false, false),
    },
  ]
}

function deriveSchedulingResponsibility(
  cardState: SchedulingAutomationCardState,
): SchedulingAutomationViewModel['responsibility'] {
  if (cardState === 'IN_PROGRESS') return 'AURA'
  if (cardState === 'READY_TO_SHARE' || cardState === 'AWAITING_CANDIDATE') return 'CANDIDATE'
  if (cardState === 'EXCEPTION' || cardState === 'EXPIRED') return 'RECRUITER'
  return 'NONE'
}

export function selectSchedulingAutomationViewModels(
  state: DemoState,
): SchedulingAutomationViewModel[] {
  return state.interviewSchedulingInvitations
    .map((invitation): SchedulingAutomationViewModel | undefined => {
      const application = selectApplicationById(state, invitation.applicationId)
      const candidate = application
        ? selectCandidateById(state, application.candidateId)
        : undefined
      const job = selectJobById(state, invitation.jobId)
      if (!candidate || !job) return undefined
      const cardState = deriveSchedulingAutomationCardState(state, invitation)
      const storedPolicy = state.interviewSchedulingPolicies.find((policy) => policy.id === invitation.policyId)
      const sourceLabel = invitation.policySource === 'JOB_OVERRIDE'
        ? 'Custom policy for this job'
        : invitation.policySource === 'DEPARTMENT_TEMPLATE'
          ? `${storedPolicy?.department ?? job.department} default`
          : invitation.policySource === 'ORGANIZATION_DEFAULT'
            ? 'Organization default'
            : storedPolicy?.displayName
      return {
        invitation,
        candidate,
        job,
        interviewerNames: invitation.interviewerIds.map(
          (id) => schedulingInterviewers.find((person) => person.id === id)?.fullName ?? 'Assigned interviewer',
        ),
        availableSlotCount: invitation.availableSlots.length,
        state: cardState,
        responsibility: deriveSchedulingResponsibility(cardState),
        progressSteps: deriveSchedulingProgress(state, invitation, cardState),
        deliveryStatus: invitation.delivery.status,
        deliveryAttemptCount: invitation.delivery.attemptCount,
        deliveryError: invitation.delivery.lastErrorMessage,
        sentAt: invitation.delivery.sentAt,
        policySourceLabel: sourceLabel,
      }
    })
    .filter((item): item is SchedulingAutomationViewModel => Boolean(item))
    .sort((left, right) => right.invitation.updatedAt.localeCompare(left.invitation.updatedAt))
}

export function selectInvitationsPendingEmailDelivery(state: DemoState): InterviewSchedulingInvitation[] {
  return state.interviewSchedulingInvitations.filter((item) => item.delivery.status === 'QUEUED' || item.delivery.status === 'SENDING')
}

export function selectFailedEmailInvitations(state: DemoState): InterviewSchedulingInvitation[] {
  return state.interviewSchedulingInvitations.filter((item) => item.delivery.status === 'FAILED')
}

export type SchedulingEmailDeliverySummary = { queued: number; sending: number; sent: number; failed: number; notSent: number }
export function selectSchedulingEmailDeliverySummary(state: DemoState): SchedulingEmailDeliverySummary {
  const statuses = state.interviewSchedulingInvitations.map((item) => item.delivery.status)
  return { queued: statuses.filter((item) => item === 'QUEUED').length, sending: statuses.filter((item) => item === 'SENDING').length, sent: statuses.filter((item) => item === 'SENT').length, failed: statuses.filter((item) => item === 'FAILED').length, notSent: statuses.filter((item) => item === 'NOT_SENT').length }
}

export function selectSchedulingAutomationViewModelByApplicationId(
  state: DemoState,
  applicationId: string,
): SchedulingAutomationViewModel | undefined {
  return selectSchedulingAutomationViewModels(state).find(
    (item) => item.invitation.applicationId === applicationId,
  )
}

export function selectInvitationsExpiringSoon(
  state: DemoState,
  now: Date,
  hours: number,
): InterviewSchedulingInvitation[] {
  const start = now.getTime()
  const end = start + Math.max(0, hours) * 3_600_000
  return selectPendingSchedulingInvitations(state).filter((item) => {
    const expiry = new Date(item.expiresAt).getTime()
    return expiry >= start && expiry <= end
  })
}

export type SelfSchedulingCandidate = {
  application: Application
  candidate: Candidate
  job: Job
  decision: Decision
  policy?: InterviewSchedulingPolicy
  invitation?: InterviewSchedulingInvitation
  interview?: Interview
}

export function selectSelfSchedulingCandidates(state: DemoState): SelfSchedulingCandidate[] {
  return state.applications
    .map((application): SelfSchedulingCandidate | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)
      const decision = selectLatestDecisionByApplicationId(state, application.id)
      const policy = selectResolvedInterviewSchedulingPolicy(state, application.jobId)?.policy
      const invitation = selectSchedulingInvitationByApplicationId(state, application.id)
      const interview = selectInterviewByApplicationId(state, application.id)
      const positive = decision?.humanRecommendation === 'STRONG_YES' ||
        decision?.humanRecommendation === 'YES' ||
        decision?.humanRecommendation === 'REVIEW'
      const activeInterview = state.interviews.some((item) =>
        item.applicationId === application.id &&
        (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS'),
      )
      return candidate && job && decision && positive && policy &&
        application.currentStage === 'SHORTLIST_REVIEW' && !activeInterview &&
        invitation?.status !== 'PENDING' && invitation?.status !== 'SCHEDULED'
        ? { application, candidate, job, decision, policy, invitation, interview }
        : undefined
    })
    .filter((item): item is SelfSchedulingCandidate => Boolean(item))
    .sort((left, right) => right.decision.createdAt.localeCompare(left.decision.createdAt))
}

export type InterviewAutomationSummary = {
  invitationsReadyToShare: number
  awaitingCandidateScheduling: number
  scheduledInterviews: number
  schedulingExceptions: number
  interviewsToday: number
}

export function selectInterviewAutomationSummary(
  state: DemoState,
  now: Date,
): InterviewAutomationSummary {
  const today = now.toISOString().slice(0, 10)
  return {
    invitationsReadyToShare: selectSchedulingAutomationViewModels(state).filter(
      (item) => item.state === 'READY_TO_SHARE',
    ).length,
    awaitingCandidateScheduling: selectSchedulingAutomationViewModels(state).filter(
      (item) => item.state === 'READY_TO_SHARE' || item.state === 'AWAITING_CANDIDATE',
    ).length,
    scheduledInterviews: state.interviews.filter(
      (item) => item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS',
    ).length,
    schedulingExceptions: selectSchedulingAutomationViewModels(state).filter(
      (item) => item.state === 'EXCEPTION' || item.state === 'EXPIRED',
    ).length,
    interviewsToday: state.interviews.filter(
      (item) => item.status !== 'CANCELLED' && item.scheduledStart.slice(0, 10) === today,
    ).length,
  }
}

export type InterviewSchedulingCandidate = {
  application: Application
  candidate: Candidate
  job: Job
  decision: Decision
  existingInterview?: Interview
}

export function selectInterviewSchedulingCandidates(
  state: DemoState,
): InterviewSchedulingCandidate[] {
  return state.applications
    .map((application): InterviewSchedulingCandidate | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)
      const decision = selectLatestDecisionByApplicationId(state, application.id)
      const positiveDecision =
        decision?.humanRecommendation === 'STRONG_YES' ||
        decision?.humanRecommendation === 'YES' ||
        decision?.humanRecommendation === 'REVIEW'
      const existingInterview = selectInterviewByApplicationId(
        state,
        application.id,
      )
      const hasActiveInterview = state.interviews.some(
        (interview) =>
          interview.applicationId === application.id &&
          (interview.status === 'SCHEDULED' ||
            interview.status === 'IN_PROGRESS'),
      )

      return candidate &&
        job &&
        decision &&
        positiveDecision &&
        application.currentStage === 'SHORTLIST_REVIEW' &&
        !hasActiveInterview
        ? { application, candidate, job, decision, existingInterview }
        : undefined
    })
    .filter((item): item is InterviewSchedulingCandidate => item !== undefined)
    .sort((left, right) =>
      right.decision.createdAt.localeCompare(left.decision.createdAt),
    )
}

export type InterviewListItem = {
  interview: Interview
  application: Application
  candidate: Candidate
  job: Job
}

export function selectInterviewListItems(state: DemoState): InterviewListItem[] {
  const statusPriority: Record<Interview['status'], number> = {
    SCHEDULED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    CANCELLED: 3,
  }
  return state.interviews
    .map((interview): InterviewListItem | undefined => {
      const application = selectApplicationById(state, interview.applicationId)
      const candidate = application
        ? selectCandidateById(state, application.candidateId)
        : undefined
      const job = application ? selectJobById(state, application.jobId) : undefined
      return application && candidate && job
        ? { interview, application, candidate, job }
        : undefined
    })
    .filter((item): item is InterviewListItem => item !== undefined)
    .sort((left, right) => {
      const priorityDifference =
        statusPriority[left.interview.status] - statusPriority[right.interview.status]
      if (priorityDifference !== 0) return priorityDifference
      return left.interview.status === 'SCHEDULED' ||
        left.interview.status === 'IN_PROGRESS'
        ? left.interview.scheduledStart.localeCompare(
            right.interview.scheduledStart,
          )
        : right.interview.scheduledStart.localeCompare(
            left.interview.scheduledStart,
          )
    })
}

export function selectTranscriptByInterviewId(
  state: DemoState,
  interviewId: string,
): Transcript | undefined {
  return state.transcripts.find(
    (transcript) => transcript.interviewId === interviewId,
  )
}

export function selectCommunicationsByApplicationId(
  state: DemoState,
  applicationId: string,
): Communication[] {
  return state.communications.filter(
    (communication) => communication.applicationId === applicationId,
  )
}

export function selectDecisionByApplicationId(
  state: DemoState,
  applicationId: string,
): Decision | undefined {
  return selectLatestDecisionByApplicationId(state, applicationId)
}

export function selectLatestDecisionByApplicationId(
  state: DemoState,
  applicationId: string,
): Decision | undefined {
  return state.decisions
    .filter((decision) => decision.applicationId === applicationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

export type CandidateScreeningViewModel = {
  candidate: Candidate
  application: Application
  job: Job
  rubric?: EvaluationRubric
  screeningEvaluation?: Evaluation
  decision?: Decision
}

export function selectCandidateScreeningViewModel(
  state: DemoState,
  applicationId: string,
): CandidateScreeningViewModel | undefined {
  const application = selectApplicationById(state, applicationId)
  const candidate = application
    ? selectCandidateById(state, application.candidateId)
    : undefined
  const job = application ? selectJobById(state, application.jobId) : undefined

  if (!application || !candidate || !job) return undefined

  const screeningEvaluation = selectLatestScreeningEvaluation(
    state,
    application.id,
  )

  return {
    candidate,
    application,
    job,
    rubric: selectPublishedRubricByJobId(state, job.id),
    screeningEvaluation,
    decision: screeningEvaluation
      ? state.decisions
          .filter(
            (decision) => decision.evaluationId === screeningEvaluation.id,
          )
          .sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt),
          )[0]
      : undefined,
  }
}

export type DashboardMetrics = {
  activeJobs: number
  totalCandidates: number
  pendingRecruiterReviews: number
  interviewsToday: number
}

export function selectDashboardMetrics(
  state: DemoState,
  now: Date,
): DashboardMetrics {
  const calendarDate = now.toISOString().slice(0, 10)

  return {
    activeJobs: state.jobs.filter((job) => job.status === 'OPEN').length,
    totalCandidates: state.candidates.length,
    pendingRecruiterReviews: state.applications.filter((application) => {
      const evaluation = selectLatestScreeningEvaluation(state, application.id)
      const decision = selectDecisionByApplicationId(state, application.id)
      return (
        evaluation?.status === 'COMPLETED' &&
        !decision
      )
    }).length,
    interviewsToday: state.interviews.filter(
      (interview) => interview.scheduledStart.slice(0, 10) === calendarDate,
    ).length,
  }
}

export type HiringFunnel = {
  applications: number
  aiScreened: number
  shortlisted: number
  interviewed: number
  selected: number
}

export function selectHiringFunnel(
  state: DemoState,
  jobId?: string,
): HiringFunnel {
  const applications = jobId
    ? selectApplicationsByJobId(state, jobId)
    : state.applications

  return {
    applications: applications.length,
    aiScreened: applications.filter((application) =>
      state.evaluations.some(
        (evaluation) =>
          evaluation.applicationId === application.id &&
          evaluation.evaluationType === 'SCREENING' &&
          evaluation.status === 'COMPLETED',
      ),
    ).length,
    shortlisted: applications.filter((application) => {
      const recommendation =
        selectLatestDecisionByApplicationId(state, application.id)
          ?.humanRecommendation ??
        selectLatestScreeningEvaluation(state, application.id)?.recommendation

      return recommendation === 'STRONG_YES' || recommendation === 'YES'
    }).length,
    interviewed: applications.filter((application) =>
      state.interviews.some(
        (interview) =>
          interview.applicationId === application.id &&
          interview.status === 'COMPLETED',
      ),
    ).length,
    selected: applications.filter((application) => {
      const decision = selectDecisionByApplicationId(state, application.id)

      return (
        application.status === 'SELECTED' ||
        decision?.humanDecision === 'SELECTED'
      )
    }).length,
  }
}

export function selectActiveJobs(state: DemoState): Job[] {
  return state.jobs
    .filter((job) => job.status === 'OPEN')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function selectArchivedJobs(state: DemoState): Job[] {
  return state.jobs
    .filter((job) => job.status === 'ARCHIVED')
    .sort((left, right) => (right.archivedAt ?? right.updatedAt).localeCompare(left.archivedAt ?? left.updatedAt))
}

export type RecentApplicationItem = {
  application: Application
  candidate: Candidate
  job: Job
  screeningEvaluation?: Evaluation
  decision?: Decision
}

export function selectRecentApplications(
  state: DemoState,
  limit = 5,
): RecentApplicationItem[] {
  return state.applications
    .map((application): RecentApplicationItem | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)

      return candidate && job
        ? {
            application,
            candidate,
            job,
            screeningEvaluation: selectLatestScreeningEvaluation(
              state,
              application.id,
            ),
            decision: selectLatestDecisionByApplicationId(
              state,
              application.id,
            ),
          }
        : undefined
    })
    .filter((item): item is RecentApplicationItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
    .slice(0, Math.max(0, limit))
}

export type UpcomingInterviewItem = {
  interview: Interview
  application: Application
  candidate: Candidate
  job: Job
}

export function selectUpcomingInterviews(
  state: DemoState,
  now: Date,
  limit = 5,
): UpcomingInterviewItem[] {
  const nowTimestamp = now.getTime()

  return state.interviews
    .filter(
      (interview) =>
        (interview.status === 'SCHEDULED' ||
          interview.status === 'IN_PROGRESS') &&
        new Date(interview.scheduledStart).getTime() >= nowTimestamp,
    )
    .map((interview): UpcomingInterviewItem | undefined => {
      const application = selectApplicationById(state, interview.applicationId)
      const candidate = application
        ? selectCandidateById(state, application.candidateId)
        : undefined
      const job = application
        ? selectJobById(state, application.jobId)
        : undefined

      return application && candidate && job
        ? { interview, application, candidate, job }
        : undefined
    })
    .filter((item): item is UpcomingInterviewItem => item !== undefined)
    .sort((left, right) =>
      left.interview.scheduledStart.localeCompare(
        right.interview.scheduledStart,
      ),
    )
    .slice(0, Math.max(0, limit))
}

export function selectUpcomingInterviewItems(
  state: DemoState,
  now: Date,
  limit = 5,
): UpcomingInterviewItem[] {
  return selectUpcomingInterviews(state, now, limit)
}

export function selectApplicationCountByJobId(
  state: DemoState,
  jobId: string,
): number {
  return state.applications.filter((application) => application.jobId === jobId)
    .length
}

export type CandidateApplicationItem = {
  application: Application
  job: Job
  screeningEvaluation?: Evaluation
  finalEvaluation?: Evaluation
  interview?: Interview
  decision?: Decision
}

export function selectCandidateApplications(
  state: DemoState,
  candidateId: string,
): CandidateApplicationItem[] {
  return state.applications
    .filter((application) => application.candidateId === candidateId)
    .map((application): CandidateApplicationItem | undefined => {
      const job = selectJobById(state, application.jobId)

      return job
        ? {
            application,
            job,
            screeningEvaluation: selectLatestScreeningEvaluation(
              state,
              application.id,
            ),
            finalEvaluation: selectLatestFinalEvaluation(state, application.id),
            interview: selectInterviewByApplicationId(state, application.id),
            decision: selectDecisionByApplicationId(state, application.id),
          }
        : undefined
    })
    .filter((item): item is CandidateApplicationItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
}

export type CandidateListItem = {
  candidate: Candidate
  application: Application
  job: Job
  screeningEvaluation?: Evaluation
  interview?: Interview
  decision?: Decision
  screeningQueueItem?: ScreeningQueueItem
  screeningStatus: CandidateScreeningDisplayStatus
}

export type CandidateScreeningDisplayStatus =
  | 'NOT_SCREENED'
  | 'SETUP_REQUIRED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export function selectScreeningQueueItemByApplicationId(
  state: DemoState,
  applicationId: string,
): ScreeningQueueItem | undefined {
  return state.screeningQueue.find(
    (item) => item.applicationId === applicationId,
  )
}

export function selectScreeningQueueItems(
  state: DemoState,
): ScreeningQueueItem[] {
  return state.screeningQueue
    .map((item) => item)
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
}

export function selectActiveScreeningQueueItems(
  state: DemoState,
): ScreeningQueueItem[] {
  return selectScreeningQueueItems(state).filter(
    (item) => item.status === 'QUEUED' || item.status === 'PROCESSING',
  )
}

export function selectFailedScreeningQueueItems(
  state: DemoState,
): ScreeningQueueItem[] {
  return selectScreeningQueueItems(state).filter(
    (item) => item.status === 'FAILED',
  )
}

export type ScreeningQueueSummary = {
  total: number
  queued: number
  processing: number
  completed: number
  failed: number
}

export function selectScreeningQueueSummary(
  state: DemoState,
): ScreeningQueueSummary {
  return state.screeningQueue.reduce<ScreeningQueueSummary>(
    (summary, item) => ({
      ...summary,
      total: summary.total + 1,
      queued: summary.queued + (item.status === 'QUEUED' ? 1 : 0),
      processing:
        summary.processing + (item.status === 'PROCESSING' ? 1 : 0),
      completed:
        summary.completed + (item.status === 'COMPLETED' ? 1 : 0),
      failed: summary.failed + (item.status === 'FAILED' ? 1 : 0),
    }),
    { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
  )
}

export function selectUnscreenedApplicationIds(
  state: DemoState,
  jobId?: string,
): string[] {
  return state.applications
    .filter((application) => !jobId || application.jobId === jobId)
    .filter(
      (application) =>
        !state.evaluations.some(
          (evaluation) =>
            evaluation.applicationId === application.id &&
            evaluation.evaluationType === 'SCREENING' &&
            evaluation.status === 'COMPLETED',
        ),
    )
    .filter((application) => {
      const queueItem = selectScreeningQueueItemByApplicationId(
        state,
        application.id,
      )
      return (
        !queueItem ||
        (queueItem.status !== 'QUEUED' &&
          queueItem.status !== 'PROCESSING' &&
          queueItem.status !== 'FAILED')
      )
    })
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
    .map((application) => application.id)
}

export function findApplicationsRequiringAutomaticScreening(
  state: DemoState,
): string[] {
  return state.applications
    .filter((application) => {
      const hasCompletedEvaluation = state.evaluations.some(
        (evaluation) =>
          evaluation.applicationId === application.id &&
          evaluation.evaluationType === 'SCREENING' &&
          evaluation.status === 'COMPLETED',
      )
      const hasBlockingQueueItem = state.screeningQueue.some(
        (item) =>
          item.applicationId === application.id &&
          (item.status === 'QUEUED' ||
            item.status === 'PROCESSING' ||
            item.status === 'FAILED'),
      )

      const hasPublishedRubric = Boolean(selectPublishedRubricByJobId(state, application.jobId))
      return hasPublishedRubric && !hasCompletedEvaluation && !hasBlockingQueueItem
    })
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
    .map((application) => application.id)
}

function deriveCandidateScreeningStatus(
  evaluation: Evaluation | undefined,
  queueItem: ScreeningQueueItem | undefined,
  hasPublishedRubric: boolean,
): CandidateScreeningDisplayStatus {
  if (evaluation?.status === 'COMPLETED') return 'COMPLETED'
  if (!hasPublishedRubric) return 'SETUP_REQUIRED'
  if (queueItem?.status === 'PROCESSING') return 'PROCESSING'
  if (queueItem?.status === 'QUEUED') return 'QUEUED'
  if (queueItem?.status === 'FAILED') return 'FAILED'
  return 'NOT_SCREENED'
}

export function selectCandidateListItems(
  state: DemoState,
  jobId?: string,
): CandidateListItem[] {
  return state.applications
    .filter((application) => !jobId || application.jobId === jobId)
    .map((application): CandidateListItem | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)
      const screeningEvaluation = selectLatestScreeningEvaluation(
        state,
        application.id,
      )
      const screeningQueueItem = selectScreeningQueueItemByApplicationId(
        state,
        application.id,
      )
      const publishedRubric = selectPublishedRubricByJobId(state, application.jobId)

      return candidate && job
        ? {
            candidate,
            application,
            job,
            screeningEvaluation,
            interview: selectInterviewByApplicationId(state, application.id),
            decision: selectDecisionByApplicationId(state, application.id),
            screeningQueueItem,
            screeningStatus: deriveCandidateScreeningStatus(
              screeningEvaluation,
              screeningQueueItem,
              Boolean(publishedRubric),
            ),
          }
        : undefined
    })
    .filter((item): item is CandidateListItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
}

const humanReviewPriority: Record<HumanReviewCategory, number> = {
  NEEDS_REVIEW: 0,
  FAILED: 1,
  RECOMMENDED: 2,
  NOT_RECOMMENDED: 3,
  REVIEWED: 4,
}

function deriveHumanReviewCategory(input: {
  evaluation?: Evaluation
  decision?: Decision
  queueItem?: ScreeningQueueItem
}): { category?: HumanReviewCategory; reviewReasons: string[] } {
  const { evaluation, decision, queueItem } = input

  if (decision) {
    return { category: 'REVIEWED', reviewReasons: ['Recruiter decision recorded'] }
  }

  if (queueItem?.status === 'FAILED' || evaluation?.status === 'FAILED') {
    return { category: 'FAILED', reviewReasons: ['Screening failed'] }
  }

  if (!evaluation || evaluation.status !== 'COMPLETED') {
    return { reviewReasons: [] }
  }

  const reviewReasons: string[] = []
  if (evaluation.recommendation === 'REVIEW') {
    reviewReasons.push('AI requested human review')
  }
  if (evaluation.confidence < 75) {
    reviewReasons.push('Low AI confidence')
  }
  if (reviewReasons.length > 0 && evaluation.concerns.length > 0) {
    reviewReasons.push('Screening concerns require recruiter attention')
  }
  if (reviewReasons.length > 0) {
    return { category: 'NEEDS_REVIEW', reviewReasons }
  }

  if (
    evaluation.recommendation === 'STRONG_YES' ||
    evaluation.recommendation === 'YES'
  ) {
    return {
      category: 'RECOMMENDED',
      reviewReasons: ['Ready for recruiter confirmation'],
    }
  }

  return {
    category: 'NOT_RECOMMENDED',
    reviewReasons: ['Negative recommendation requires recruiter review'],
  }
}

export function selectHumanReviewQueueItems(
  state: DemoState,
  jobId?: string,
): HumanReviewQueueItem[] {
  return state.applications
    .filter((application) => !jobId || application.jobId === jobId)
    .map((application): HumanReviewQueueItem | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)
      if (!candidate || !job) return undefined

      const evaluation = selectLatestScreeningEvaluation(state, application.id)
      const decision = selectLatestDecisionByApplicationId(state, application.id)
      const queueItem = selectScreeningQueueItemByApplicationId(
        state,
        application.id,
      )
      const derived = deriveHumanReviewCategory({
        evaluation,
        decision,
        queueItem,
      })
      if (!derived.category) return undefined

      return {
        application,
        candidate,
        job,
        evaluation,
        decision,
        category: derived.category,
        finalRecommendation:
          decision?.humanRecommendation ??
          (evaluation?.status === 'COMPLETED'
            ? evaluation.recommendation
            : undefined),
        reviewReasons: derived.reviewReasons,
      }
    })
    .filter((item): item is HumanReviewQueueItem => item !== undefined)
    .sort((left, right) => {
      const categoryDifference =
        humanReviewPriority[left.category] - humanReviewPriority[right.category]
      if (categoryDifference !== 0) return categoryDifference

      if (left.category === 'NEEDS_REVIEW') {
        const confidenceDifference =
          (left.evaluation?.confidence ?? 101) -
          (right.evaluation?.confidence ?? 101)
        if (confidenceDifference !== 0) return confidenceDifference
      }
      if (left.category === 'RECOMMENDED') {
        const scoreDifference =
          (right.evaluation?.overallScore ?? -1) -
          (left.evaluation?.overallScore ?? -1)
        if (scoreDifference !== 0) return scoreDifference
      }

      return right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      )
    })
}

export type HumanReviewQueueSummary = {
  total: number
  recommended: number
  needsReview: number
  notRecommended: number
  failed: number
  reviewed: number
}

export function selectHumanReviewQueueSummary(
  state: DemoState,
  jobId?: string,
): HumanReviewQueueSummary {
  return selectHumanReviewQueueItems(state, jobId).reduce<HumanReviewQueueSummary>(
    (summary, item) => ({
      total: summary.total + 1,
      recommended:
        summary.recommended + (item.category === 'RECOMMENDED' ? 1 : 0),
      needsReview:
        summary.needsReview + (item.category === 'NEEDS_REVIEW' ? 1 : 0),
      notRecommended:
        summary.notRecommended +
        (item.category === 'NOT_RECOMMENDED' ? 1 : 0),
      failed: summary.failed + (item.category === 'FAILED' ? 1 : 0),
      reviewed: summary.reviewed + (item.category === 'REVIEWED' ? 1 : 0),
    }),
    {
      total: 0,
      recommended: 0,
      needsReview: 0,
      notRecommended: 0,
      failed: 0,
      reviewed: 0,
    },
  )
}

export function selectHumanReviewQueueItem(
  state: DemoState,
  applicationId: string,
): HumanReviewQueueItem | undefined {
  return selectHumanReviewQueueItems(state).find(
    (item) => item.application.id === applicationId,
  )
}

export type CandidateTimelineEvent = {
  id: string
  type:
    | 'APPLICATION_SUBMITTED'
    | 'SCREENING_COMPLETED'
    | 'SCHEDULING_INVITATION_PREPARED'
    | 'SCHEDULING_INVITATION_EXPIRED'
    | 'SCHEDULING_EXCEPTION'
    | 'INTERVIEW_SCHEDULED'
    | 'INTERVIEW_RESCHEDULED'
    | 'INTERVIEW_CANCELLED'
    | 'INTERVIEW_COMPLETED'
    | 'INTERVIEW_QUESTIONS_PREPARED'
    | 'INTERVIEW_PLAN_APPROVED'
    | 'INTERVIEW_STARTED'
    | 'INTERVIEW_PAUSED'
    | 'FINAL_EVALUATION_COMPLETED'
    | 'DECISION_RECORDED'
    | 'COMMUNICATION_SENT'
  title: string
  description?: string
  occurredAt: string
}

export function selectCandidateTimeline(
  state: DemoState,
  applicationId: string,
): CandidateTimelineEvent[] {
  const application = selectApplicationById(state, applicationId)

  if (!application) {
    return []
  }

  const events: CandidateTimelineEvent[] = [
    {
      id: `application-submitted-${application.id}`,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application submitted',
      description: 'The candidate submitted their application for review.',
      occurredAt: application.submittedAt,
    },
  ]

  state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === 'SCREENING' &&
        evaluation.status === 'COMPLETED',
    )
    .forEach((evaluation) => {
      events.push({
        id: `screening-completed-${evaluation.id}`,
        type: 'SCREENING_COMPLETED',
        title: 'AI screening completed',
        description: 'A screening recommendation is available for review.',
        occurredAt: evaluation.createdAt,
      })
    })

  state.interviews
    .filter((interview) => interview.applicationId === applicationId)
    .forEach((interview) => {
      const modeLabel =
        interview.mode === 'PHONE'
          ? 'phone'
          : interview.mode === 'ONSITE'
            ? 'on-site'
            : 'video'
      events.push({
        id: `interview-scheduled-${interview.id}`,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview scheduled',
        description: `The candidate selected a ${modeLabel} interview time.`,
        occurredAt: interview.createdAt ?? interview.scheduledStart,
      })

      if (interview.status === 'CANCELLED') {
        events.push({
          id: `interview-cancelled-${interview.id}`,
          type: 'INTERVIEW_CANCELLED',
          title: 'Interview cancelled',
          description:
            'The scheduled interview was cancelled and the application returned to shortlist review.',
          occurredAt: interview.updatedAt ?? interview.scheduledStart,
        })
      }

      if (interview.status === 'COMPLETED' && !state.interviewSessions.some((session) => session.interviewId === interview.id && session.status === 'COMPLETED')) {
        events.push({
          id: `interview-completed-${interview.id}`,
          type: 'INTERVIEW_COMPLETED',
          title: 'Interview completed',
          description: 'The scheduled interview session was completed.',
          occurredAt: interview.scheduledEnd,
        })
      }
    })

  const applicationInterviewIds = new Set(state.interviews.filter((interview) => interview.applicationId === applicationId).map((interview) => interview.id))
  state.interviewQuestionSets.filter((set) => applicationInterviewIds.has(set.interviewId)).forEach((set) => {
    if (set.generatedAt || set.status !== 'GENERATION_FAILED') events.push({ id: `interview-questions-prepared-${set.id}`, type: 'INTERVIEW_QUESTIONS_PREPARED', title: 'Interview questions prepared', description: `A candidate-specific interview plan with ${set.questions.length} questions was prepared.`, occurredAt: set.generatedAt ?? set.createdAt })
    if (set.status === 'APPROVED' && set.approvedAt) events.push({ id: `interview-plan-approved-${set.id}`, type: 'INTERVIEW_PLAN_APPROVED', title: 'Interview plan approved', description: 'The interview question plan was approved for the scheduled interview.', occurredAt: set.approvedAt })
  })
  state.interviewSessions.filter((session) => applicationInterviewIds.has(session.interviewId)).forEach((session) => {
    const summary = selectInterviewSessionProgressSummary(session)
    if (session.startedAt) events.push({ id: `interview-started-${session.id}`, type: 'INTERVIEW_STARTED', title: 'Interview started', occurredAt: session.startedAt })
    if (session.status === 'PAUSED' && session.pausedAt) events.push({ id: `interview-paused-${session.id}`, type: 'INTERVIEW_PAUSED', title: 'Interview paused', occurredAt: session.pausedAt })
    if (session.status === 'COMPLETED' && session.completedAt) events.push({ id: `interview-session-completed-${session.id}`, type: 'INTERVIEW_COMPLETED', title: 'Interview completed', description: `The interview ended after ${Math.round(session.accumulatedActiveSeconds / 60)} minutes. ${summary.asked} questions were asked.`, occurredAt: session.completedAt })
  })

  state.interviewSchedulingInvitations
    .filter((invitation) => invitation.applicationId === applicationId)
    .forEach((invitation) => {
      if (invitation.status !== 'EXCEPTION_REQUIRED') {
        events.push({
          id: `scheduling-invitation-prepared-${invitation.id}`,
          type: 'SCHEDULING_INVITATION_PREPARED',
          title: 'Interview scheduling invitation prepared',
          description: 'Candidate-selectable interview availability was prepared automatically.',
          occurredAt: invitation.createdAt,
        })
      }
      if (invitation.status === 'EXPIRED') {
        events.push({
          id: `scheduling-invitation-expired-${invitation.id}`,
          type: 'SCHEDULING_INVITATION_EXPIRED',
          title: 'Scheduling invitation expired',
          occurredAt: invitation.expiresAt,
        })
      }
      if (invitation.status === 'EXCEPTION_REQUIRED') {
        events.push({
          id: `scheduling-exception-${invitation.id}`,
          type: 'SCHEDULING_EXCEPTION',
          title: 'Interview scheduling requires attention',
          description: invitation.lastError,
          occurredAt: invitation.updatedAt,
        })
      }
      if (invitation.lastRescheduledAt) {
        events.push({
          id: `interview-rescheduled-${invitation.id}-${invitation.rescheduleCount}`,
          type: 'INTERVIEW_RESCHEDULED',
          title: 'Interview rescheduled',
          description: 'The candidate selected a new interview time.',
          occurredAt: invitation.lastRescheduledAt,
        })
      }
    })

  state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === 'FINAL' &&
        evaluation.status === 'COMPLETED',
    )
    .forEach((evaluation) => {
      events.push({
        id: `final-evaluation-completed-${evaluation.id}`,
        type: 'FINAL_EVALUATION_COMPLETED',
        title: 'Final evaluation completed',
        description: 'The final candidate evaluation was completed.',
        occurredAt: evaluation.createdAt,
      })
    })

  state.decisions
    .filter((decision) => decision.applicationId === applicationId)
    .forEach((decision) => {
      const aiLabel = getScreeningRecommendationLabel(
        decision.aiRecommendation,
      )
      const humanLabel = getScreeningRecommendationLabel(
        decision.humanRecommendation,
      )
      events.push({
        id: `decision-recorded-${decision.id}`,
        type: 'DECISION_RECORDED',
        title:
          decision.reviewAction === 'CONFIRM'
            ? 'Screening recommendation confirmed'
            : 'Screening recommendation overridden',
        description:
          decision.reviewAction === 'CONFIRM'
            ? `The recruiter confirmed AURA’s recommendation of “${humanLabel}”.`
            : `AURA recommended “${aiLabel}”. The recruiter recorded “${humanLabel}”.`,
        occurredAt: decision.createdAt,
      })
    })

  state.communications
    .filter(
      (communication) =>
        communication.applicationId === applicationId &&
        communication.status === 'SENT' &&
        communication.sentAt,
    )
    .forEach((communication) => {
      if (communication.sentAt) {
        events.push({
          id: `communication-sent-${communication.id}`,
          type: 'COMMUNICATION_SENT',
          title: 'Communication sent',
          description: communication.subject,
          occurredAt: communication.sentAt,
        })
      }
    })

  return events.sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt),
  )
}
