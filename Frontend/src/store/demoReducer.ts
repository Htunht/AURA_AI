import type {
  Application,
  ApplicationStage,
  ApplicationStatus,
} from '../types/application'
import type {
  ApplicationForm,
  ApplicationFormField,
} from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { CommunicationStatus } from '../types/communication'
import type { Decision } from '../types/decision'
import type { Evaluation, EvaluationStatus } from '../types/evaluation'
import type { Interview, InterviewQuestion, InterviewStatus } from '../types/interview'
import type { InterviewQuestion as PreparedInterviewQuestion, InterviewQuestionCategory, InterviewQuestionPriority } from '../types/interviewQuestion'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewSession } from '../types/interviewSession'
import type { InterviewTranscript, InterviewTranscriptSegment } from '../types/interviewTranscript'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewEvidence } from '../types/interviewEvidence'
import type { FinalEvaluation, DecisionDisagreementReason, HumanFinalDecision } from '../types/finalEvaluation'
import type { EvaluationChallenge } from '../types/evaluationChallenge'
import type { UserRole } from '../types/role'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import type { EmailDeliveryErrorCode } from '../types/emailDelivery'
import type { Transcript } from '../types/transcript'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import type { EvaluationRubric } from '../types/rubric'
import { validateRecruitmentApplicationForm } from '../utils/applicationFormValidation'
import { canDeleteJob, canOpenJob, isValidJobTransition, validateJob } from '../utils/jobValidation'
import { evaluateWorkflowArtifacts } from '../utils/hiringWorkflowSetup'
import { canRecoverSchedulingEmail } from '../utils/schedulingEmailRecovery'
import { isSameSchedulingPolicyTarget } from '../utils/interviewSchedulingPolicyResolution'
import { createInitialDemoState } from './demoInitialState'
import { cloneQuestion } from '../utils/interviewQuestionMigration'
import { evaluateInterviewQuestionSetReadiness } from '../utils/interviewQuestionSetReadiness'
import { deriveJobRequirements } from '../utils/jobRequirements'
import { evaluateInterviewTranscriptReadiness } from '../utils/interviewTranscriptReadiness'
import { evaluateInterviewAnalysisReadiness } from '../utils/interviewAnalysisReadiness'
import { canRecordFinalDecision, doesHumanDecisionDifferFromSystem } from '../utils/finalDecisionPermissions'
import type { DemoState } from './demoStateTypes'
import type { DemoPostInterviewFastForwardResult } from '../services/demoPostInterviewFastForward'
import { finalEvaluationSourcesChanged } from '../utils/finalEvaluationSourceFingerprint'

export { initialDemoState } from './demoInitialState'
export type { DemoState } from './demoStateTypes'

export type DemoAction =
  | { type: 'RESET_DEMO_STATE' }
  | { type: 'REPLACE_DEMO_STATE'; payload: { state: DemoState } }
  | { type: 'ADD_JOB'; payload: { job: import('../types/job').Job } }
  | { type: 'UPDATE_JOB'; payload: { jobId: string; changes: Partial<Pick<import('../types/job').Job, 'title' | 'department' | 'description' | 'positionsCount' | 'employmentType' | 'workArrangement' | 'location' | 'minimumExperienceYears' | 'requiredSkills' | 'applicationDeadline'>>; updatedAt: string } }
  | { type: 'CHANGE_JOB_STATUS'; payload: { jobId: string; status: import('../types/job').JobStatus; changedAt: string } }
  | { type: 'DELETE_JOB'; payload: { jobId: string } }
  | { type: 'PUBLISH_HIRING_WORKFLOW'; payload: { jobId: string; formId: string; rubricId: string; publishedAt: string } }
  | {
      type: 'UPDATE_APPLICATION_STATUS'
      payload: { applicationId: string; status: ApplicationStatus }
    }
  | {
      type: 'UPDATE_APPLICATION_STAGE'
      payload: { applicationId: string; stage: ApplicationStage }
    }
  | { type: 'ADD_APPLICATION_FORM'; payload: ApplicationForm }
  | { type: 'UPDATE_APPLICATION_FORM'; payload: ApplicationForm }
  | {
      type: 'ADD_APPLICATION_FORM_FIELD'
      payload: { formId: string; field: ApplicationFormField }
    }
  | {
      type: 'UPDATE_APPLICATION_FORM_FIELD'
      payload: { formId: string; field: ApplicationFormField }
    }
  | {
      type: 'REMOVE_APPLICATION_FORM_FIELD'
      payload: { formId: string; fieldId: string }
    }
  | {
      type: 'MOVE_APPLICATION_FORM_FIELD'
      payload: { formId: string; fieldId: string; direction: 'UP' | 'DOWN' }
    }
  | {
      type: 'REORDER_APPLICATION_FORM_FIELDS'
      payload: {
        formId: string
        activeFieldId: string
        overFieldId: string
      }
    }
  | {
      type: 'PUBLISH_APPLICATION_FORM'
      payload: { formId: string; updatedAt: string }
    }
  | { type: 'ADD_RUBRIC'; payload: { rubric: EvaluationRubric } }
  | { type: 'UPDATE_RUBRIC'; payload: { rubric: EvaluationRubric } }
  | { type: 'PUBLISH_RUBRIC'; payload: { rubricId: string; updatedAt: string } }
  | { type: 'ADD_CANDIDATE'; payload: Candidate }
  | { type: 'UPDATE_CANDIDATE'; payload: Candidate }
  | { type: 'ADD_APPLICATION'; payload: Application }
  | { type: 'ADD_EVALUATION'; payload: Evaluation }
  | {
      type: 'UPDATE_EVALUATION_STATUS'
      payload: { evaluationId: string; status: EvaluationStatus }
    }
  | { type: 'CONFIRM_RECOMMENDATION'; payload: { decision: Decision } }
  | { type: 'OVERRIDE_RECOMMENDATION'; payload: { decision: Decision } }
  | {
      type: 'QUEUE_SCREENING_APPLICATION'
      payload: { applicationId: string; queuedAt: string }
    }
  | {
      type: 'QUEUE_SCREENING_APPLICATIONS'
      payload: { applicationIds: string[]; queuedAt: string }
    }
  | {
      type: 'START_SCREENING_QUEUE_ITEM'
      payload: { queueItemId: string; startedAt: string }
    }
  | {
      type: 'COMPLETE_SCREENING_QUEUE_ITEM'
      payload: { queueItemId: string; completedAt: string }
    }
  | {
      type: 'FAIL_SCREENING_QUEUE_ITEM'
      payload: { queueItemId: string; completedAt: string; error: string }
    }
  | {
      type: 'RETRY_SCREENING_QUEUE_ITEM'
      payload: { queueItemId: string; queuedAt: string }
    }
  | { type: 'CLEAR_COMPLETED_SCREENING_QUEUE_ITEMS' }
  | { type: 'ADD_INTERVIEW'; payload: { interview: Interview } }
  | { type: 'ADD_INTERVIEW_SCHEDULING_POLICY'; payload: { policy: InterviewSchedulingPolicy } }
  | { type: 'UPDATE_INTERVIEW_SCHEDULING_POLICY'; payload: { policyId: string; changes: Partial<Omit<InterviewSchedulingPolicy, 'id' | 'scope' | 'department' | 'jobId' | 'version' | 'status' | 'createdAt'>> } }
  | { type: 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY'; payload: { policyId: string; updatedAt: string } }
  | { type: 'ARCHIVE_INTERVIEW_SCHEDULING_POLICY'; payload: { policyId: string; updatedAt: string } }
  | { type: 'QUEUE_SCHEDULING_EMAIL'; payload: { invitationId: string; queuedAt: string } }
  | { type: 'START_SCHEDULING_EMAIL'; payload: { invitationId: string; startedAt: string } }
  | { type: 'COMPLETE_SCHEDULING_EMAIL'; payload: { invitationId: string; sentAt: string; providerMessageId?: string } }
  | { type: 'FAIL_SCHEDULING_EMAIL'; payload: { invitationId: string; failedAt: string; errorCode: EmailDeliveryErrorCode; errorMessage: string } }
  | { type: 'RETRY_SCHEDULING_EMAIL'; payload: { invitationId: string; queuedAt: string } }
  | { type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION'; payload: { queuedAt: string; invitationId?: string } }
  | { type: 'RETRY_FAILED_SCHEDULING_EMAILS'; payload: { queuedAt: string } }
  | { type: 'ADD_SCHEDULING_INVITATION'; payload: { invitation: InterviewSchedulingInvitation } }
  | { type: 'UPDATE_SCHEDULING_INVITATION'; payload: { invitationId: string; changes: Partial<Omit<InterviewSchedulingInvitation, 'id' | 'applicationId' | 'jobId' | 'createdAt'>> } }
  | { type: 'MARK_SCHEDULING_EXCEPTION'; payload: { invitation: InterviewSchedulingInvitation } }
  | { type: 'EXPIRE_SCHEDULING_INVITATION'; payload: { invitationId: string; updatedAt: string } }
  | { type: 'CANCEL_SCHEDULING_INVITATION'; payload: { invitationId: string; updatedAt: string } }
  | { type: 'CONFIRM_SELF_SCHEDULED_INTERVIEW'; payload: { invitationId: string; slotId: string; interview: Interview } }
  | { type: 'RESCHEDULE_SELF_SCHEDULED_INTERVIEW'; payload: { invitationId: string; slotId: string; interview: Interview; rescheduledAt: string } }
  | {
      type: 'UPDATE_INTERVIEW'
      payload: {
        interviewId: string
        changes: Partial<
          Pick<
            Interview,
            | 'scheduledStart'
            | 'scheduledEnd'
            | 'timezone'
            | 'mode'
            | 'interviewers'
            | 'location'
            | 'meetingLink'
            | 'notes'
            | 'updatedAt'
          >
        >
      }
    }
  | {
      type: 'ADD_INTERVIEW_QUESTIONS'
      payload: { interviewId: string; questions: InterviewQuestion[] }
    }
  | { type: 'ADD_INTERVIEW_QUESTION_SET'; payload: { questionSet: InterviewQuestionSet } }
  | { type: 'UPDATE_INTERVIEW_QUESTION'; payload: { questionSetId: string; questionId: string; changes: { text?: string; category?: InterviewQuestionCategory; priority?: InterviewQuestionPriority; estimatedMinutes?: number; interviewerGuidance?: string; expectedEvidence?: string }; updatedAt: string } }
  | { type: 'ADD_INTERVIEW_QUESTION'; payload: { questionSetId: string; question: PreparedInterviewQuestion; afterQuestionId?: string; updatedAt: string } }
  | { type: 'REMOVE_INTERVIEW_QUESTION'; payload: { questionSetId: string; questionId: string; updatedAt: string } }
  | { type: 'MOVE_INTERVIEW_QUESTION'; payload: { questionSetId: string; questionId: string; direction?: 'UP' | 'DOWN'; overQuestionId?: string; updatedAt: string } }
  | { type: 'APPROVE_INTERVIEW_QUESTION_SET'; payload: { questionSetId: string; approvedAt: string; approvedBy: string } }
  | { type: 'MARK_INTERVIEW_QUESTION_GENERATION_FAILED'; payload: { questionSet: InterviewQuestionSet } }
  | { type: 'REGENERATE_INTERVIEW_QUESTION_SET'; payload: { previousQuestionSetId: string; questionSet: InterviewQuestionSet } }
  | { type: 'ADD_INTERVIEW_SESSION'; payload: { session: InterviewSession } }
  | { type: 'START_INTERVIEW_SESSION'; payload: { sessionId: string; startedAt: string } }
  | { type: 'PAUSE_INTERVIEW_SESSION'; payload: { sessionId: string; pausedAt: string; activeSecondsSinceResume: number } }
  | { type: 'RESUME_INTERVIEW_SESSION'; payload: { sessionId: string; resumedAt: string } }
  | { type: 'UPDATE_SESSION_QUESTION_NOTES'; payload: { sessionId: string; questionId: string; notes: string; updatedAt: string } }
  | { type: 'ADD_SESSION_FOLLOW_UP'; payload: { sessionId: string; questionId: string; followUp: string; updatedAt: string } }
  | { type: 'REMOVE_SESSION_FOLLOW_UP'; payload: { sessionId: string; questionId: string; followUpIndex: number; updatedAt: string } }
  | { type: 'MARK_SESSION_QUESTION_ASKED'; payload: { sessionId: string; questionId: string; completedAt: string } }
  | { type: 'MARK_SESSION_QUESTION_SKIPPED'; payload: { sessionId: string; questionId: string; skippedAt: string } }
  | { type: 'SET_CURRENT_SESSION_QUESTION'; payload: { sessionId: string; questionId: string; changedAt: string } }
  | { type: 'UPDATE_INTERVIEW_SESSION_GENERAL_NOTES'; payload: { sessionId: string; notes: string; updatedAt: string } }
  | { type: 'COMPLETE_INTERVIEW_SESSION'; payload: { sessionId: string; completedAt: string; activeSecondsSinceResume: number } }
  | { type: 'ADD_INTERVIEW_TRANSCRIPT'; payload: { transcript: InterviewTranscript } }
  | { type: 'UPDATE_INTERVIEW_TRANSCRIPT_RAW_TEXT'; payload: { transcriptId: string; rawText: string; updatedAt: string } }
  | { type: 'REPLACE_INTERVIEW_TRANSCRIPT_SEGMENTS'; payload: { transcriptId: string; segments: InterviewTranscriptSegment[]; updatedAt: string } }
  | { type: 'UPDATE_INTERVIEW_TRANSCRIPT_SEGMENT'; payload: { transcriptId: string; segmentId: string; changes: Partial<Pick<InterviewTranscriptSegment, 'speaker' | 'speakerLabel' | 'text' | 'questionId'>>; updatedAt: string } }
  | { type: 'ADD_INTERVIEW_TRANSCRIPT_SEGMENT'; payload: { transcriptId: string; segment: InterviewTranscriptSegment; updatedAt: string } }
  | { type: 'REMOVE_INTERVIEW_TRANSCRIPT_SEGMENT'; payload: { transcriptId: string; segmentId: string; updatedAt: string } }
  | { type: 'MOVE_INTERVIEW_TRANSCRIPT_SEGMENT'; payload: { transcriptId: string; segmentId: string; direction: 'UP' | 'DOWN'; updatedAt: string } }
  | { type: 'APPROVE_INTERVIEW_TRANSCRIPT'; payload: { transcriptId: string; approvedAt: string; approvedBy: string } }
  | { type: 'ADD_INTERVIEW_ANALYSIS'; payload: { analysis: InterviewAnalysis } }
  | { type: 'UPDATE_INTERVIEW_EVIDENCE'; payload: { analysisId: string; evidenceId: string; changes: Partial<Pick<InterviewEvidence, 'type' | 'strength' | 'title' | 'summary' | 'interviewerNote' | 'transcriptSegmentIds' | 'questionIds' | 'requirementIds'>>; updatedAt: string } }
  | { type: 'ADD_INTERVIEW_EVIDENCE'; payload: { analysisId: string; evidence: InterviewEvidence; updatedAt: string } }
  | { type: 'REMOVE_INTERVIEW_EVIDENCE'; payload: { analysisId: string; evidenceId: string; updatedAt: string } }
  | { type: 'UPDATE_INTERVIEW_ANALYSIS_CONTENT'; payload: { analysisId: string; interviewerSummary?: string; strengths?: string[]; concerns?: string[]; missingEvidence?: string[]; updatedAt: string } }
  | { type: 'APPROVE_INTERVIEW_ANALYSIS'; payload: { analysisId: string; approvedAt: string; approvedBy: string } }
  | { type: 'APPLY_DEMO_POST_INTERVIEW_FAST_FORWARD'; payload: { result: DemoPostInterviewFastForwardResult } }
  | { type: 'MARK_INTERVIEW_ANALYSIS_GENERATION_FAILED'; payload: { analysis: InterviewAnalysis } }
  | { type: 'RETRY_INTERVIEW_ANALYSIS_GENERATION'; payload: { analysisId: string } }
  | { type: 'ADD_FINAL_EVALUATION'; payload: { evaluation: FinalEvaluation } }
  | { type: 'MARK_FINAL_EVALUATION_GENERATION_FAILED'; payload: { evaluation: FinalEvaluation } }
  | { type: 'ADD_EVALUATION_CHALLENGE'; payload: { challenge: EvaluationChallenge; actorRole: UserRole } }
  | { type: 'RESOLVE_EVALUATION_CHALLENGE'; payload: { challengeId: string; resolutionNote: string; resolvedAt: string; actorRole: UserRole } }
  | { type: 'DISMISS_EVALUATION_CHALLENGE'; payload: { challengeId: string; resolutionNote: string; resolvedAt: string; actorRole: UserRole } }
  | { type: 'ADD_RECALCULATED_FINAL_EVALUATION'; payload: { previousEvaluationId: string; evaluation: FinalEvaluation } }
  | { type: 'RECORD_HUMAN_FINAL_DECISION'; payload: { finalEvaluationId: string; decision: HumanFinalDecision; decisionReason: string; candidateFacingReasonDraft?: string; disagreementReason?: DecisionDisagreementReason; disagreementExplanation?: string; holdReviewDate?: string; decidedBy: string; decidedByRole: UserRole; decidedAt: string } }
  | {
      type: 'UPDATE_INTERVIEW_STATUS'
      payload: { interviewId: string; status: InterviewStatus; updatedAt?: string }
    }
  | { type: 'ADD_TRANSCRIPT'; payload: Transcript }
  | {
      type: 'UPDATE_COMMUNICATION_DRAFT'
      payload: { communicationId: string; subject: string; body: string }
    }
  | {
      type: 'UPDATE_COMMUNICATION_STATUS'
      payload: {
        communicationId: string
        status: CommunicationStatus
        sentAt?: string
      }
    }

function warnInvalidDecision(message: string) {
  if (import.meta.env.DEV) {
    console.warn(message)
  }
}

function hasPositiveHumanDecision(state: DemoState, applicationId: string) {
  const decision = state.decisions
    .filter((item) => item.applicationId === applicationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  return decision?.humanRecommendation === 'STRONG_YES' ||
    decision?.humanRecommendation === 'YES' ||
    decision?.humanRecommendation === 'REVIEW'
}

function interviewHasConflict(
  interviews: Interview[],
  interview: Interview,
  excludeInterviewId?: string,
) {
  const interviewerIds = new Set(interview.interviewers.map((person) => person.id))
  return interviews.some((existing) =>
    existing.id !== excludeInterviewId &&
    (existing.status === 'SCHEDULED' || existing.status === 'IN_PROGRESS') &&
    interview.scheduledStart < existing.scheduledEnd &&
    interview.scheduledEnd > existing.scheduledStart &&
    existing.interviewers.some((person) => interviewerIds.has(person.id)),
  )
}

function clonePolicy(policy: InterviewSchedulingPolicy): InterviewSchedulingPolicy {
  return {
    ...policy,
    workingDays: [...policy.workingDays],
    requiredInterviewerRoles: [...policy.requiredInterviewerRoles],
    fixedInterviewerIds: [...policy.fixedInterviewerIds],
  }
}

function cloneRubric(rubric: EvaluationRubric): EvaluationRubric {
  return { ...rubric, criteria: rubric.criteria.map((criterion) => ({ ...criterion })), requirementRules: rubric.requirementRules?.map((rule) => ({ ...rule, fieldKeys: [...rule.fieldKeys] })) }
}

function cloneApplicationField(field: ApplicationFormField): ApplicationFormField { return { ...field, options: field.options?.map((option) => ({ ...option })), screeningMapping: field.screeningMapping ? { ...field.screeningMapping, requirementIds: [...field.screeningMapping.requirementIds], criterionKeys: [...field.screeningMapping.criterionKeys] } : undefined } }
function cloneApplicationForm(form: ApplicationForm): ApplicationForm { return { ...form, fields: form.fields.map(cloneApplicationField) } }

function cloneJob(job: import('../types/job').Job): import('../types/job').Job {
  return { ...job, requiredSkills: job.requiredSkills.map((skill) => ({ ...skill })) }
}

function normalizePreparedQuestions(questions: PreparedInterviewQuestion[]): PreparedInterviewQuestion[] {
  return questions.map((question, index) => ({ ...cloneQuestion(question), order: index + 1 }))
}

function cloneQuestionSet(questionSet: InterviewQuestionSet): InterviewQuestionSet {
  return { ...questionSet, questions: normalizePreparedQuestions(questionSet.questions) }
}

function isPublishableRubric(rubric: EvaluationRubric) {
  return rubric.name.trim().length > 0 &&
    rubric.criteria.length > 0 &&
    new Set(rubric.criteria.map((criterion) => criterion.key)).size === rubric.criteria.length &&
    rubric.criteria.every((criterion) =>
      criterion.key.trim().length > 0 && criterion.name.trim().length > 0 &&
      criterion.description.trim().length > 0 && criterion.evaluationGuidance.trim().length > 0 &&
      Number.isFinite(criterion.weight) && criterion.weight > 0,
    ) &&
    rubric.criteria.reduce((total, criterion) => total + criterion.weight, 0) === 100
}

function cloneInvitation(invitation: InterviewSchedulingInvitation): InterviewSchedulingInvitation {
  return {
    ...invitation,
    delivery: { ...invitation.delivery },
    interviewerIds: [...invitation.interviewerIds],
    availableSlots: invitation.availableSlots.map((slot) => ({
      ...slot,
      interviewerIds: [...slot.interviewerIds],
    })),
  }
}

function finalEvaluationProvenanceIsValid(state: DemoState, evaluation: FinalEvaluation) {
  const application = state.applications.find((item) => item.id === evaluation.applicationId && item.candidateId === evaluation.candidateId && item.jobId === evaluation.jobId)
  const interview = state.interviews.find((item) => item.id === evaluation.interviewId && item.applicationId === evaluation.applicationId && item.status === 'COMPLETED')
  const analysis = state.interviewAnalyses.find((item) => item.id === evaluation.interviewAnalysisId && item.interviewId === evaluation.interviewId && item.status === 'APPROVED')
  const rubric = state.rubrics.find((item) => `interview-scoring-${item.id}` === evaluation.rubricId && item.jobId === evaluation.jobId && item.version === evaluation.rubricVersion && item.status === 'PUBLISHED')
  const assessedQuestionsValid = evaluation.questionAssessments.every((item) => item.finalEvaluationId === evaluation.id && (item.assessmentState === 'NOT_ASSESSED' ? item.systemRating === undefined : item.systemRating !== undefined && item.matchedAnchorRating === item.systemRating && (item.transcriptSegmentIds.length > 0 || item.evidenceIds.length > 0)))
  const competenciesValid = evaluation.competencyAssessments.every((item) => item.finalEvaluationId === evaluation.id && (item.assessmentState === 'NOT_ASSESSED' ? item.systemRating === undefined : item.systemRating !== undefined))
  return Boolean(application && interview && analysis && rubric && evaluation.systemScoreLocked && evaluation.systemRecommendationLocked && assessedQuestionsValid && competenciesValid)
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'RESET_DEMO_STATE':
      return createInitialDemoState()

    case 'REPLACE_DEMO_STATE':
      return action.payload.state

    case 'ADD_JOB': {
      const job = action.payload.job
      if (job.status !== 'DRAFT' || state.jobs.some((item) => item.id === job.id) || !validateJob(job).valid) return state
      return { ...state, jobs: [...state.jobs, cloneJob(job)] }
    }

    case 'UPDATE_JOB': {
      const existing = state.jobs.find((job) => job.id === action.payload.jobId)
      if (!existing) return state
      const updated = cloneJob({ ...existing, ...action.payload.changes, id: existing.id, status: existing.status, createdAt: existing.createdAt, updatedAt: action.payload.updatedAt, openedAt: existing.openedAt, closedAt: existing.closedAt, archivedAt: existing.archivedAt })
      if (!validateJob(updated).valid) return state
      return { ...state, jobs: state.jobs.map((job) => job.id === existing.id ? updated : job) }
    }

    case 'CHANGE_JOB_STATUS': {
      const job = state.jobs.find((item) => item.id === action.payload.jobId)
      if (!job || !isValidJobTransition(job.status, action.payload.status)) return state
      if (action.payload.status === 'OPEN' && !canOpenJob(state, job.id, action.payload.changedAt).ready) return state
      const next = cloneJob({
        ...job,
        status: action.payload.status,
        updatedAt: action.payload.changedAt,
        ...(action.payload.status === 'OPEN' ? { openedAt: action.payload.changedAt, closedAt: undefined } : {}),
        ...(action.payload.status === 'CLOSED' ? { closedAt: action.payload.changedAt } : {}),
        ...(action.payload.status === 'ARCHIVED' ? { archivedAt: action.payload.changedAt } : {}),
        ...(job.status === 'ARCHIVED' && action.payload.status === 'DRAFT' ? { archivedAt: undefined } : {}),
      })
      return { ...state, jobs: state.jobs.map((item) => item.id === job.id ? next : item) }
    }

    case 'DELETE_JOB':
      return canDeleteJob(state, action.payload.jobId).allowed
        ? { ...state, jobs: state.jobs.filter((job) => job.id !== action.payload.jobId) }
        : state

    case 'PUBLISH_HIRING_WORKFLOW': {
      const job = state.jobs.find((item) => item.id === action.payload.jobId)
      const form = state.applicationForms.find((item) => item.id === action.payload.formId)
      const rubric = state.rubrics.find((item) => item.id === action.payload.rubricId)
      if (!job || !form || !rubric || form.jobId !== job.id || rubric.jobId !== job.id || form.status !== 'DRAFT' || rubric.status !== 'DRAFT' || !evaluateWorkflowArtifacts(job, form, rubric).ready) return state
      return {
        ...state,
        applicationForms: state.applicationForms.map((item) => item.id === form.id ? cloneApplicationForm({ ...item, status: 'PUBLISHED', updatedAt: action.payload.publishedAt }) : item.jobId === job.id && item.status === 'PUBLISHED' ? { ...item, status: 'ARCHIVED', updatedAt: action.payload.publishedAt } : item),
        rubrics: state.rubrics.map((item) => item.id === rubric.id ? cloneRubric({ ...item, status: 'PUBLISHED', updatedAt: action.payload.publishedAt }) : item.jobId === job.id && item.status === 'PUBLISHED' ? { ...item, status: 'ARCHIVED', updatedAt: action.payload.publishedAt } : item),
      }
    }

    case 'UPDATE_APPLICATION_STATUS':
      return {
        ...state,
        applications: state.applications.map((application) =>
          application.id === action.payload.applicationId
            ? { ...application, status: action.payload.status }
            : application,
        ),
      }

    case 'UPDATE_APPLICATION_STAGE':
      return {
        ...state,
        applications: state.applications.map((application) =>
          application.id === action.payload.applicationId
            ? { ...application, currentStage: action.payload.stage }
            : application,
        ),
      }

    case 'ADD_APPLICATION_FORM':
      if (state.applicationForms.some((form) => form.id === action.payload.id)) {
        return state
      }

      return {
        ...state,
        applicationForms: [...state.applicationForms, action.payload],
      }

    case 'UPDATE_APPLICATION_FORM':
      if (!state.applicationForms.some((form) => form.id === action.payload.id)) {
        return state
      }

      return {
        ...state,
        applicationForms: state.applicationForms.map((form) =>
          form.id === action.payload.id ? action.payload : form,
        ),
      }

    case 'ADD_APPLICATION_FORM_FIELD': {
      const form = state.applicationForms.find(
        (item) => item.id === action.payload.formId,
      )

      if (
        !form ||
        form.status !== 'DRAFT' ||
        form.fields.some(
          (field) =>
            field.id === action.payload.field.id ||
            field.key === action.payload.field.key,
        )
      ) {
        return state
      }

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) =>
          item.id === form.id
            ? { ...item, fields: [...item.fields, action.payload.field] }
            : item,
        ),
      }
    }

    case 'UPDATE_APPLICATION_FORM_FIELD': {
      const form = state.applicationForms.find(
        (item) => item.id === action.payload.formId,
      )
      const fieldExists = form?.fields.some(
        (field) => field.id === action.payload.field.id,
      )
      const duplicateKey = form?.fields.some(
        (field) =>
          field.id !== action.payload.field.id &&
          field.key === action.payload.field.key,
      )

      if (
        !form ||
        form.status !== 'DRAFT' ||
        !fieldExists ||
        duplicateKey
      ) {
        return state
      }

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) =>
          item.id === form.id
            ? {
                ...item,
                fields: item.fields.map((field) =>
                  field.id === action.payload.field.id
                    ? action.payload.field
                    : field,
                ),
              }
            : item,
        ),
      }
    }

    case 'REMOVE_APPLICATION_FORM_FIELD': {
      const form = state.applicationForms.find(
        (item) => item.id === action.payload.formId,
      )

      if (
        !form ||
        form.status !== 'DRAFT' ||
        !form.fields.some((field) => field.id === action.payload.fieldId)
      ) {
        return state
      }

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) =>
          item.id === form.id
            ? {
                ...item,
                fields: item.fields.filter(
                  (field) => field.id !== action.payload.fieldId,
                ),
              }
            : item,
        ),
      }
    }

    case 'MOVE_APPLICATION_FORM_FIELD': {
      const form = state.applicationForms.find(
        (item) => item.id === action.payload.formId,
      )
      const fieldIndex = form?.fields.findIndex(
        (field) => field.id === action.payload.fieldId,
      )

      if (!form || form.status !== 'DRAFT' || fieldIndex === undefined) {
        return state
      }

      const targetIndex =
        action.payload.direction === 'UP' ? fieldIndex - 1 : fieldIndex + 1

      if (
        fieldIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= form.fields.length
      ) {
        return state
      }

      const fields = [...form.fields]
      ;[fields[fieldIndex], fields[targetIndex]] = [
        fields[targetIndex],
        fields[fieldIndex],
      ]

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) =>
          item.id === form.id ? { ...item, fields } : item,
        ),
      }
    }

    case 'REORDER_APPLICATION_FORM_FIELDS': {
      const { formId, activeFieldId, overFieldId } = action.payload

      if (activeFieldId === overFieldId) {
        return state
      }

      const form = state.applicationForms.find((item) => item.id === formId)

      if (!form || form.status !== 'DRAFT') {
        return state
      }

      const activeIndex = form.fields.findIndex(
        (field) => field.id === activeFieldId,
      )
      const overIndex = form.fields.findIndex(
        (field) => field.id === overFieldId,
      )

      if (activeIndex < 0 || overIndex < 0) {
        return state
      }

      const fields = [...form.fields]
      const activeField = fields[activeIndex]

      if (!activeField) {
        return state
      }

      fields.splice(activeIndex, 1)
      fields.splice(overIndex, 0, activeField)

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) =>
          item.id === form.id ? { ...item, fields } : item,
        ),
      }
    }

    case 'PUBLISH_APPLICATION_FORM': {
      const form = state.applicationForms.find(
        (item) => item.id === action.payload.formId,
      )

      if (
        !form ||
        form.status !== 'DRAFT' ||
        !validateRecruitmentApplicationForm(form).valid
      ) {
        return state
      }

      return {
        ...state,
        applicationForms: state.applicationForms.map((item) => {
          if (item.id === form.id) {
            return {
              ...item,
              status: 'PUBLISHED',
              updatedAt: action.payload.updatedAt,
            }
          }

          return item.jobId === form.jobId && item.status === 'PUBLISHED'
            ? { ...item, status: 'ARCHIVED' }
            : item
        }),
      }
    }

    case 'ADD_RUBRIC': {
      const rubric = action.payload.rubric
      if (
        rubric.status !== 'DRAFT' || !Number.isInteger(rubric.version) || rubric.version < 1 ||
        !state.jobs.some((job) => job.id === rubric.jobId) ||
        state.rubrics.some((item) => item.id === rubric.id ||
          (item.jobId === rubric.jobId && (item.version === rubric.version || item.status === 'DRAFT')))
      ) return state
      return { ...state, rubrics: [...state.rubrics, cloneRubric(rubric)] }
    }

    case 'UPDATE_RUBRIC': {
      const rubric = state.rubrics.find((item) => item.id === action.payload.rubric.id)
      if (
        !rubric || rubric.status !== 'DRAFT' || action.payload.rubric.status !== 'DRAFT' ||
        rubric.jobId !== action.payload.rubric.jobId || rubric.version !== action.payload.rubric.version
      ) return state
      return {
        ...state,
        rubrics: state.rubrics.map((item) =>
          item.id === rubric.id ? cloneRubric(action.payload.rubric) : item,
        ),
      }
    }

    case 'PUBLISH_RUBRIC': {
      const rubric = state.rubrics.find((item) => item.id === action.payload.rubricId)
      if (!rubric || rubric.status !== 'DRAFT' || !isPublishableRubric(rubric)) return state
      return {
        ...state,
        rubrics: state.rubrics.map((item) => {
          if (item.id === rubric.id) return { ...item, status: 'PUBLISHED', updatedAt: action.payload.updatedAt }
          return item.jobId === rubric.jobId && item.status === 'PUBLISHED'
            ? { ...item, status: 'ARCHIVED', updatedAt: action.payload.updatedAt }
            : item
        }),
      }
    }

    case 'ADD_CANDIDATE':
      if (
        state.candidates.some(
          (candidate) =>
            candidate.id === action.payload.id ||
            candidate.email.toLowerCase() === action.payload.email.toLowerCase(),
        )
      ) {
        return state
      }

      return { ...state, candidates: [...state.candidates, action.payload] }

    case 'UPDATE_CANDIDATE':
      if (
        !state.candidates.some(
          (candidate) => candidate.id === action.payload.id,
        ) ||
        state.candidates.some(
          (candidate) =>
            candidate.id !== action.payload.id &&
            candidate.email.toLowerCase() === action.payload.email.toLowerCase(),
        )
      ) {
        return state
      }

      return {
        ...state,
        candidates: state.candidates.map((candidate) =>
          candidate.id === action.payload.id ? action.payload : candidate,
        ),
      }

    case 'ADD_APPLICATION':
      if (
        state.applications.some(
          (application) =>
            application.id === action.payload.id ||
            (application.candidateId === action.payload.candidateId &&
              application.jobId === action.payload.jobId),
        )
      ) {
        return state
      }

      return {
        ...state,
        applications: [...state.applications, action.payload],
      }

    case 'ADD_EVALUATION':
      if (
        state.evaluations.some(
          (evaluation) => evaluation.id === action.payload.id,
        )
      ) {
        return state
      }

      return {
        ...state,
        evaluations: [...state.evaluations, action.payload],
      }

    case 'UPDATE_EVALUATION_STATUS':
      return {
        ...state,
        evaluations: state.evaluations.map((evaluation) =>
          evaluation.id === action.payload.evaluationId
            ? { ...evaluation, status: action.payload.status }
            : evaluation,
        ),
      }

    case 'CONFIRM_RECOMMENDATION': {
      const { decision } = action.payload
      const evaluation = state.evaluations.find(
        (item) => item.id === decision.evaluationId,
      )
      const application = state.applications.find(
        (item) => item.id === decision.applicationId,
      )

      if (
        decision.reviewAction !== 'CONFIRM' ||
        decision.aiRecommendation !== decision.humanRecommendation ||
        !evaluation ||
        evaluation.evaluationType !== 'SCREENING' ||
        evaluation.status !== 'COMPLETED' ||
        !application ||
        evaluation.applicationId !== decision.applicationId ||
        evaluation.recommendation !== decision.aiRecommendation ||
        state.decisions.some(
          (item) =>
            item.id === decision.id ||
            item.evaluationId === decision.evaluationId,
        )
      ) {
        warnInvalidDecision(
          'Invalid confirmation: the evaluation must be valid, recommendations must match, and no decision may already exist.',
        )
        return state
      }

      return { ...state, decisions: [...state.decisions, decision] }
    }

    case 'OVERRIDE_RECOMMENDATION': {
      const { decision } = action.payload
      const evaluation = state.evaluations.find(
        (item) => item.id === decision.evaluationId,
      )
      const application = state.applications.find(
        (item) => item.id === decision.applicationId,
      )

      if (
        decision.reviewAction !== 'OVERRIDE' ||
        decision.aiRecommendation === decision.humanRecommendation ||
        (decision.overrideReason?.trim().length ?? 0) < 15 ||
        !evaluation ||
        evaluation.evaluationType !== 'SCREENING' ||
        evaluation.status !== 'COMPLETED' ||
        !application ||
        evaluation.applicationId !== decision.applicationId ||
        evaluation.recommendation !== decision.aiRecommendation ||
        state.decisions.some(
          (item) =>
            item.id === decision.id ||
            item.evaluationId === decision.evaluationId,
        )
      ) {
        warnInvalidDecision(
          'Invalid override: the evaluation and changed recommendation must be valid, a reason is required, and no decision may already exist.',
        )
        return state
      }

      return { ...state, decisions: [...state.decisions, decision] }
    }

    case 'QUEUE_SCREENING_APPLICATION':
    case 'QUEUE_SCREENING_APPLICATIONS': {
      const seenIds = new Set<string>()
      const queueItems: ScreeningQueueItem[] = []
      const applicationIds =
        action.type === 'QUEUE_SCREENING_APPLICATION'
          ? [action.payload.applicationId]
          : action.payload.applicationIds

      for (const applicationId of applicationIds) {
        if (seenIds.has(applicationId)) continue
        seenIds.add(applicationId)
        const application = state.applications.find(
          (item) => item.id === applicationId,
        )
        const hasCompletedEvaluation = state.evaluations.some(
          (evaluation) =>
            evaluation.applicationId === applicationId &&
            evaluation.evaluationType === 'SCREENING' &&
            evaluation.status === 'COMPLETED',
        )
        const hasQueueRecord = state.screeningQueue.some(
          (item) => item.applicationId === applicationId,
        )
        const hasPublishedRubric = application
          ? state.rubrics.some(
              (rubric) => rubric.jobId === application.jobId && rubric.status === 'PUBLISHED',
            )
          : false

        if (!application || !hasPublishedRubric || hasCompletedEvaluation || hasQueueRecord) continue

        queueItems.push({
          id: `screening-queue-${application.id}`,
          applicationId: application.id,
          jobId: application.jobId,
          status: 'QUEUED',
          queuedAt: action.payload.queuedAt,
          attemptCount: 0,
        })
      }

      if (queueItems.length === 0) return state

      const queuedApplicationIds = new Set(
        queueItems.map((item) => item.applicationId),
      )

      return {
        ...state,
        applications: state.applications.map((application) =>
          queuedApplicationIds.has(application.id)
            ? { ...application, currentStage: 'AI_SCREENING' }
            : application,
        ),
        screeningQueue: [...state.screeningQueue, ...queueItems],
      }
    }

    case 'START_SCREENING_QUEUE_ITEM': {
      const item = state.screeningQueue.find(
        (queueItem) => queueItem.id === action.payload.queueItemId,
      )
      if (!item || item.status !== 'QUEUED') return state

      return {
        ...state,
        screeningQueue: state.screeningQueue.map((queueItem) =>
          queueItem.id === item.id
            ? {
                ...queueItem,
                status: 'PROCESSING',
                startedAt: action.payload.startedAt,
                completedAt: undefined,
                error: undefined,
                attemptCount: queueItem.attemptCount + 1,
              }
            : queueItem,
        ),
      }
    }

    case 'COMPLETE_SCREENING_QUEUE_ITEM':
      if (
        !state.screeningQueue.some(
          (item) =>
            item.id === action.payload.queueItemId &&
            item.status === 'PROCESSING',
        )
      ) {
        return state
      }
      return {
        ...state,
        screeningQueue: state.screeningQueue.map((item) =>
          item.id === action.payload.queueItemId
            ? {
                ...item,
                status: 'COMPLETED',
                completedAt: action.payload.completedAt,
                error: undefined,
              }
            : item,
        ),
      }

    case 'FAIL_SCREENING_QUEUE_ITEM':
      if (
        !state.screeningQueue.some(
          (item) =>
            item.id === action.payload.queueItemId &&
            item.status === 'PROCESSING',
        )
      ) {
        return state
      }
      return {
        ...state,
        screeningQueue: state.screeningQueue.map((item) =>
          item.id === action.payload.queueItemId
            ? {
                ...item,
                status: 'FAILED',
                completedAt: action.payload.completedAt,
                error: action.payload.error,
              }
            : item,
        ),
      }

    case 'RETRY_SCREENING_QUEUE_ITEM':
      if (
        !state.screeningQueue.some(
          (item) =>
            item.id === action.payload.queueItemId && item.status === 'FAILED',
        )
      ) {
        return state
      }
      return {
        ...state,
        screeningQueue: state.screeningQueue.map((item) =>
          item.id === action.payload.queueItemId
            ? {
                ...item,
                status: 'QUEUED',
                queuedAt: action.payload.queuedAt,
                startedAt: undefined,
                completedAt: undefined,
                error: undefined,
              }
            : item,
        ),
      }

    case 'CLEAR_COMPLETED_SCREENING_QUEUE_ITEMS':
      if (!state.screeningQueue.some((item) => item.status === 'COMPLETED')) {
        return state
      }
      return {
        ...state,
        screeningQueue: state.screeningQueue.filter(
          (item) => item.status !== 'COMPLETED',
        ),
      }

    case 'ADD_INTERVIEW_SCHEDULING_POLICY': {
      const policy = action.payload.policy
      const validTarget = policy.scope === 'ORGANIZATION'
        ? !policy.department && !policy.jobId
        : policy.scope === 'DEPARTMENT'
          ? Boolean(policy.department?.trim()) && !policy.jobId
          : Boolean(policy.jobId && state.jobs.some((job) => job.id === policy.jobId)) && !policy.department
      if (
        state.interviewSchedulingPolicies.some((item) => item.id === policy.id) ||
        !validTarget ||
        !policy.displayName.trim() ||
        !Number.isInteger(policy.version) ||
        policy.version < 1 ||
        policy.status !== 'DRAFT'
      ) return state
      return {
        ...state,
        interviewSchedulingPolicies: [
          ...state.interviewSchedulingPolicies,
          clonePolicy(policy),
        ],
      }
    }

    case 'UPDATE_INTERVIEW_SCHEDULING_POLICY': {
      const policy = state.interviewSchedulingPolicies.find(
        (item) => item.id === action.payload.policyId,
      )
      if (!policy || policy.status !== 'DRAFT') return state
      return {
        ...state,
        interviewSchedulingPolicies: state.interviewSchedulingPolicies.map((item) =>
          item.id === policy.id
            ? clonePolicy({ ...item, ...action.payload.changes })
            : item,
        ),
      }
    }

    case 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY': {
      const policy = state.interviewSchedulingPolicies.find(
        (item) => item.id === action.payload.policyId,
      )
      if (!policy || policy.status !== 'DRAFT') return state
      return {
        ...state,
        interviewSchedulingPolicies: state.interviewSchedulingPolicies.map((item) => {
          if (item.id === policy.id) {
            return { ...item, status: 'ACTIVE', updatedAt: action.payload.updatedAt }
          }
          if (isSameSchedulingPolicyTarget(item, policy) && item.status === 'ACTIVE') {
            return { ...item, status: 'ARCHIVED', updatedAt: action.payload.updatedAt }
          }
          return item
        }),
      }
    }

    case 'ARCHIVE_INTERVIEW_SCHEDULING_POLICY': {
      const policy = state.interviewSchedulingPolicies.find(
        (item) => item.id === action.payload.policyId,
      )
      if (!policy || policy.status === 'ARCHIVED') return state
      return {
        ...state,
        interviewSchedulingPolicies: state.interviewSchedulingPolicies.map((item) =>
          item.id === policy.id
            ? { ...item, status: 'ARCHIVED', updatedAt: action.payload.updatedAt }
            : item,
        ),
      }
    }

    case 'QUEUE_SCHEDULING_EMAIL':
    case 'RETRY_SCHEDULING_EMAIL': {
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === action.payload.invitationId)
      if (!invitation || invitation.status !== 'PENDING' || !['NOT_SENT', 'FAILED'].includes(invitation.delivery.status) || invitation.delivery.provider === 'DISABLED') return state
      return { ...state, interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) => item.id === invitation.id ? { ...item, delivery: { provider: item.delivery.provider, status: 'QUEUED', attemptCount: item.delivery.attemptCount, queuedAt: action.payload.queuedAt } } : item) }
    }

    case 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION': {
      const recoverable = state.interviewSchedulingInvitations.some((item) =>
        (!action.payload.invitationId || item.id === action.payload.invitationId) &&
        canRecoverSchedulingEmail(item),
      )
      if (!recoverable) return state

      return {
        ...state,
        interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) =>
          (!action.payload.invitationId || item.id === action.payload.invitationId) &&
          canRecoverSchedulingEmail(item)
            ? {
                ...item,
                delivery: {
                  provider: 'EMAILJS',
                  status: 'QUEUED',
                  attemptCount: item.delivery.attemptCount,
                  queuedAt: action.payload.queuedAt,
                },
              }
            : item,
        ),
      }
    }

    case 'START_SCHEDULING_EMAIL': {
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === action.payload.invitationId)
      if (!invitation || invitation.status !== 'PENDING' || invitation.delivery.status !== 'QUEUED') return state
      return { ...state, interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) => item.id === invitation.id ? { ...item, delivery: { ...item.delivery, status: 'SENDING', attemptCount: item.delivery.attemptCount + 1, sendingStartedAt: action.payload.startedAt, failedAt: undefined, lastErrorCode: undefined, lastErrorMessage: undefined, providerMessageId: undefined } } : item) }
    }

    case 'COMPLETE_SCHEDULING_EMAIL': {
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === action.payload.invitationId)
      if (!invitation || invitation.delivery.status !== 'SENDING') return state
      return { ...state, interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) => item.id === invitation.id ? { ...item, delivery: { ...item.delivery, status: 'SENT', sentAt: action.payload.sentAt, failedAt: undefined, lastErrorCode: undefined, lastErrorMessage: undefined, providerMessageId: action.payload.providerMessageId } } : item) }
    }

    case 'FAIL_SCHEDULING_EMAIL': {
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === action.payload.invitationId)
      if (!invitation || invitation.delivery.status !== 'SENDING') return state
      return { ...state, interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) => item.id === invitation.id ? { ...item, delivery: { ...item.delivery, status: 'FAILED', failedAt: action.payload.failedAt, lastErrorCode: action.payload.errorCode, lastErrorMessage: action.payload.errorMessage, providerMessageId: undefined } } : item) }
    }

    case 'RETRY_FAILED_SCHEDULING_EMAILS':
      return { ...state, interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) => item.status === 'PENDING' && item.delivery.status === 'FAILED' && item.delivery.provider !== 'DISABLED' ? { ...item, delivery: { provider: item.delivery.provider, status: 'QUEUED', attemptCount: item.delivery.attemptCount, queuedAt: action.payload.queuedAt } } : item) }

    case 'ADD_SCHEDULING_INVITATION': {
      const invitation = action.payload.invitation
      const application = state.applications.find(
        (item) => item.id === invitation.applicationId,
      )
      const activePolicy = state.interviewSchedulingPolicies.find(
        (item) => item.id === invitation.policyId && item.status === 'ACTIVE',
      )
      const hasActiveInterview = state.interviews.some(
        (item) => item.applicationId === invitation.applicationId &&
          (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS'),
      )
      const hasPendingInvitation = state.interviewSchedulingInvitations.some(
        (item) => item.applicationId === invitation.applicationId && item.status === 'PENDING',
      )
      if (
        !application || !activePolicy || application.jobId !== invitation.jobId ||
        application.currentStage !== 'SHORTLIST_REVIEW' ||
        !hasPositiveHumanDecision(state, application.id) || hasActiveInterview ||
        hasPendingInvitation || invitation.status !== 'PENDING' ||
        invitation.availableSlots.length === 0 ||
        state.interviewSchedulingInvitations.some(
          (item) => item.id === invitation.id || item.token === invitation.token,
        )
      ) return state
      return {
        ...state,
        interviewSchedulingInvitations: [
          ...state.interviewSchedulingInvitations,
          cloneInvitation(invitation),
        ],
      }
    }

    case 'MARK_SCHEDULING_EXCEPTION': {
      const invitation = action.payload.invitation
      if (
        invitation.status !== 'EXCEPTION_REQUIRED' ||
        !state.applications.some((item) => item.id === invitation.applicationId)
      ) return state
      const existing = state.interviewSchedulingInvitations.find(
        (item) => item.applicationId === invitation.applicationId &&
          (item.status === 'EXCEPTION_REQUIRED' || item.status === 'PENDING'),
      )
      return {
        ...state,
        interviewSchedulingInvitations: existing
          ? state.interviewSchedulingInvitations.map((item) =>
              item.id === existing.id
                ? cloneInvitation({ ...invitation, id: existing.id, token: existing.token })
                : item,
            )
          : [...state.interviewSchedulingInvitations, cloneInvitation(invitation)],
      }
    }

    case 'UPDATE_SCHEDULING_INVITATION': {
      const invitation = state.interviewSchedulingInvitations.find(
        (item) => item.id === action.payload.invitationId,
      )
      if (
        !invitation || invitation.status === 'SCHEDULED' ||
        (action.payload.changes.token !== undefined &&
          state.interviewSchedulingInvitations.some(
            (item) => item.id !== invitation.id && item.token === action.payload.changes.token,
          ))
      ) return state
      return {
        ...state,
        interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) =>
          item.id === invitation.id
            ? cloneInvitation({
                ...item,
                ...action.payload.changes,
                ...(action.payload.changes.status === 'PENDING'
                  ? { lastError: undefined, exceptionReason: undefined }
                  : {}),
              })
            : item,
        ),
      }
    }

    case 'EXPIRE_SCHEDULING_INVITATION':
    case 'CANCEL_SCHEDULING_INVITATION': {
      const invitation = state.interviewSchedulingInvitations.find(
        (item) => item.id === action.payload.invitationId,
      )
      if (
        !invitation ||
        (action.type === 'EXPIRE_SCHEDULING_INVITATION'
          ? invitation.status !== 'PENDING'
          : invitation.status !== 'PENDING' && invitation.status !== 'SCHEDULED')
      ) return state
      return {
        ...state,
        interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) =>
          item.id === invitation.id
            ? {
                ...item,
                status: action.type === 'EXPIRE_SCHEDULING_INVITATION' ? 'EXPIRED' : 'CANCELLED',
                updatedAt: action.payload.updatedAt,
                ...(action.type === 'EXPIRE_SCHEDULING_INVITATION'
                  ? { exceptionReason: 'INVITATION_EXPIRED' as const }
                  : {}),
              }
            : item,
        ),
      }
    }

    case 'CONFIRM_SELF_SCHEDULED_INTERVIEW': {
      const { invitationId, slotId, interview } = action.payload
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === invitationId)
      const slot = invitation?.availableSlots.find((item) => item.id === slotId)
      const hasActiveInterview = state.interviews.some(
        (item) => item.applicationId === invitation?.applicationId &&
          (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS'),
      )
      if (
        !invitation || invitation.status !== 'PENDING' || !slot || hasActiveInterview ||
        interview.status !== 'SCHEDULED' ||
        interview.applicationId !== invitation.applicationId ||
        interview.scheduledStart !== slot.start || interview.scheduledEnd !== slot.end ||
        interview.interviewers.length !== slot.interviewerIds.length ||
        interview.interviewers.some((person) => !slot.interviewerIds.includes(person.id)) ||
        interview.scheduledEnd <= interview.scheduledStart ||
        state.interviews.some((item) => item.id === interview.id) ||
        interviewHasConflict(state.interviews, interview) ||
        (interview.createdAt ? interview.createdAt >= invitation.expiresAt : true)
      ) return state
      return {
        ...state,
        interviews: [...state.interviews, {
          ...interview,
          interviewers: interview.interviewers.map((person) => ({ ...person })),
          questions: interview.questions.map((question) => ({ ...question })),
        }],
        applications: state.applications.map((application) =>
          application.id === invitation.applicationId
            ? { ...application, currentStage: 'INTERVIEW' }
            : application,
        ),
        interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) =>
          item.id === invitation.id
            ? {
                ...item,
                status: 'SCHEDULED',
                selectedSlotId: slot.id,
                scheduledInterviewId: interview.id,
                updatedAt: interview.createdAt!,
                exceptionReason: undefined,
                lastError: undefined,
              }
            : item,
        ),
      }
    }

    case 'RESCHEDULE_SELF_SCHEDULED_INTERVIEW': {
      const { invitationId, slotId, interview, rescheduledAt } = action.payload
      const invitation = state.interviewSchedulingInvitations.find((item) => item.id === invitationId)
      const currentInterview = invitation?.scheduledInterviewId
        ? state.interviews.find((item) => item.id === invitation.scheduledInterviewId)
        : undefined
      const policy = invitation
        ? state.interviewSchedulingPolicies.find((item) => item.id === invitation.policyId)
        : undefined
      const slot = invitation?.availableSlots.find((item) => item.id === slotId)
      if (
        !invitation || invitation.status !== 'SCHEDULED' || !currentInterview || !policy || !slot ||
        invitation.rescheduleCount >= policy.candidateRescheduleLimit ||
        interview.status !== 'SCHEDULED' ||
        interview.id !== currentInterview.id || interview.applicationId !== currentInterview.applicationId ||
        interview.scheduledStart !== slot.start || interview.scheduledEnd !== slot.end ||
        interview.interviewers.length !== slot.interviewerIds.length ||
        interview.interviewers.some((person) => !slot.interviewerIds.includes(person.id)) ||
        interviewHasConflict(state.interviews, interview, currentInterview.id)
      ) return state
      return {
        ...state,
        interviews: state.interviews.map((item) =>
          item.id === currentInterview.id
            ? { ...item, ...interview, id: item.id, questions: item.questions, updatedAt: rescheduledAt }
            : item,
        ),
        interviewSchedulingInvitations: state.interviewSchedulingInvitations.map((item) =>
          item.id === invitation.id
            ? {
                ...item,
                selectedSlotId: slot.id,
                rescheduleCount: item.rescheduleCount + 1,
                updatedAt: rescheduledAt,
                lastRescheduledAt: rescheduledAt,
              }
            : item,
        ),
      }
    }

    case 'ADD_INTERVIEW': {
      const interview = action.payload.interview
      const applicationExists = state.applications.some(
        (application) => application.id === interview.applicationId,
      )
      const hasActiveInterview = state.interviews.some(
        (item) =>
          item.applicationId === interview.applicationId &&
          (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS'),
      )
      if (
        !applicationExists ||
        state.interviews.some((item) => item.id === interview.id) ||
        hasActiveInterview ||
        interview.scheduledEnd <= interview.scheduledStart
      ) {
        return state
      }
      return {
        ...state,
        interviews: [
          ...state.interviews,
          {
            ...interview,
            interviewers: interview.interviewers.map((person) => ({ ...person })),
            questions: interview.questions.map((question) => ({ ...question })),
          },
        ],
      }
    }

    case 'UPDATE_INTERVIEW': {
      const interview = state.interviews.find(
        (item) => item.id === action.payload.interviewId,
      )
      if (!interview) return state
      const scheduledStart =
        action.payload.changes.scheduledStart ?? interview.scheduledStart
      const scheduledEnd =
        action.payload.changes.scheduledEnd ?? interview.scheduledEnd
      if (scheduledEnd <= scheduledStart) return state
      return {
        ...state,
        interviews: state.interviews.map((item) =>
          item.id === interview.id
            ? {
                ...item,
                ...action.payload.changes,
                interviewers: action.payload.changes.interviewers
                  ? action.payload.changes.interviewers.map((person) => ({ ...person }))
                  : item.interviewers,
              }
            : item,
        ),
      }
    }

    case 'ADD_INTERVIEW_QUESTIONS': {
      const interview = state.interviews.find(
        (item) => item.id === action.payload.interviewId,
      )

      if (!interview) {
        return state
      }

      const questionIds = new Set(
        interview.questions.map((question) => question.id),
      )
      const newQuestions = action.payload.questions.filter((question) => {
        if (questionIds.has(question.id)) {
          return false
        }

        questionIds.add(question.id)
        return true
      })

      if (newQuestions.length === 0) {
        return state
      }

      return {
        ...state,
        interviews: state.interviews.map((item) =>
          item.id === action.payload.interviewId
            ? { ...item, questions: [...item.questions, ...newQuestions] }
            : item,
        ),
      }
    }

    case 'ADD_INTERVIEW_QUESTION_SET':
    case 'MARK_INTERVIEW_QUESTION_GENERATION_FAILED': {
      const questionSet = action.payload.questionSet
      const interview = state.interviews.find((item) => item.id === questionSet.interviewId)
      const questionIds = questionSet.questions.map((question) => question.id)
      const validQuestions = questionSet.questions.every((question) => question.interviewId === questionSet.interviewId)
      if (!interview || !['SCHEDULED', 'IN_PROGRESS'].includes(interview.status) || state.interviewQuestionSets.some((item) => item.id === questionSet.id) || state.interviewQuestionSets.some((item) => item.interviewId === questionSet.interviewId && (item.status === 'DRAFT' || item.status === 'APPROVED')) || new Set(questionIds).size !== questionIds.length || !validQuestions) return state
      return { ...state, interviewQuestionSets: [...state.interviewQuestionSets, cloneQuestionSet(questionSet)] }
    }

    case 'UPDATE_INTERVIEW_QUESTION': {
      const set = state.interviewQuestionSets.find((item) => item.id === action.payload.questionSetId)
      const question = set?.questions.find((item) => item.id === action.payload.questionId)
      const { text, estimatedMinutes } = action.payload.changes
      if (!set || set.status !== 'DRAFT' || !question || (text !== undefined && text.trim().length < 10) || (estimatedMinutes !== undefined && (estimatedMinutes < 1 || estimatedMinutes > 15))) return state
      return { ...state, interviewQuestionSets: state.interviewQuestionSets.map((item) => item.id !== set.id ? item : { ...item, updatedAt: action.payload.updatedAt, questions: item.questions.map((entry) => entry.id === question.id ? { ...entry, ...action.payload.changes, text: text?.trim() ?? entry.text, updatedAt: action.payload.updatedAt } : entry) }) }
    }

    case 'ADD_INTERVIEW_QUESTION': {
      const set = state.interviewQuestionSets.find((item) => item.id === action.payload.questionSetId)
      const question = action.payload.question
      if (!set || set.status !== 'DRAFT' || question.interviewId !== set.interviewId || question.text.trim().length < 10 || question.estimatedMinutes < 1 || question.estimatedMinutes > 15 || set.questions.some((item) => item.id === question.id)) return state
      const questions = [...set.questions]
      const afterIndex = action.payload.afterQuestionId ? questions.findIndex((item) => item.id === action.payload.afterQuestionId) : -1
      questions.splice(afterIndex >= 0 ? afterIndex + 1 : questions.length, 0, cloneQuestion(question))
      return { ...state, interviewQuestionSets: state.interviewQuestionSets.map((item) => item.id === set.id ? { ...item, updatedAt: action.payload.updatedAt, questions: normalizePreparedQuestions(questions) } : item) }
    }

    case 'REMOVE_INTERVIEW_QUESTION': {
      const set = state.interviewQuestionSets.find((item) => item.id === action.payload.questionSetId)
      if (!set || set.status !== 'DRAFT' || set.questions.length <= 1 || !set.questions.some((item) => item.id === action.payload.questionId)) return state
      return { ...state, interviewQuestionSets: state.interviewQuestionSets.map((item) => item.id === set.id ? { ...item, updatedAt: action.payload.updatedAt, questions: normalizePreparedQuestions(item.questions.filter((question) => question.id !== action.payload.questionId)) } : item) }
    }

    case 'MOVE_INTERVIEW_QUESTION': {
      const set = state.interviewQuestionSets.find((item) => item.id === action.payload.questionSetId)
      if (!set || set.status !== 'DRAFT') return state
      const from = set.questions.findIndex((item) => item.id === action.payload.questionId)
      const to = action.payload.overQuestionId ? set.questions.findIndex((item) => item.id === action.payload.overQuestionId) : action.payload.direction === 'UP' ? from - 1 : from + 1
      if (from < 0 || to < 0 || to >= set.questions.length || from === to) return state
      const questions = [...set.questions]
      const [moved] = questions.splice(from, 1)
      questions.splice(to, 0, moved)
      return { ...state, interviewQuestionSets: state.interviewQuestionSets.map((item) => item.id === set.id ? { ...item, updatedAt: action.payload.updatedAt, questions: normalizePreparedQuestions(questions) } : item) }
    }

    case 'APPROVE_INTERVIEW_QUESTION_SET': {
      const set = state.interviewQuestionSets.find((item) => item.id === action.payload.questionSetId)
      const interview = set ? state.interviews.find((item) => item.id === set.interviewId) : undefined
      const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
      const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
      if (!set || set.status !== 'DRAFT' || !interview || !job || !action.payload.approvedBy.trim() || !evaluateInterviewQuestionSetReadiness({ questionSet: set, interview, requirements: deriveJobRequirements(job) }).ready) return state
      return { ...state, interviewQuestionSets: state.interviewQuestionSets.map((item) => item.id === set.id ? { ...item, status: 'APPROVED', approvedAt: action.payload.approvedAt, approvedBy: action.payload.approvedBy, updatedAt: action.payload.approvedAt, questions: item.questions.map((question) => ({ ...question, status: 'APPROVED', updatedAt: action.payload.approvedAt })) } : item) }
    }

    case 'REGENERATE_INTERVIEW_QUESTION_SET': {
      const previous = state.interviewQuestionSets.find((item) => item.id === action.payload.previousQuestionSetId)
      const next = action.payload.questionSet
      if (!previous || !['DRAFT', 'GENERATION_FAILED'].includes(previous.status) || next.interviewId !== previous.interviewId || next.version !== previous.version + 1 || state.interviewQuestionSets.some((item) => item.id === next.id)) return state
      return { ...state, interviewQuestionSets: [...state.interviewQuestionSets.filter((item) => item.id !== previous.id), cloneQuestionSet(next)] }
    }

    case 'ADD_INTERVIEW_SESSION': {
      const session = action.payload.session
      const interview = state.interviews.find((item) => item.id === session.interviewId)
      const set = state.interviewQuestionSets.find((item) => item.id === session.questionSetId)
      const validIds = new Set(set?.questions.map((question) => question.id) ?? [])
      const progressIds = session.questionProgress.map((item) => item.questionId)
      if (!interview || !set || set.status !== 'APPROVED' || set.interviewId !== interview.id || state.interviewSessions.some((item) => item.id === session.id || item.interviewId === session.interviewId) || progressIds.length !== validIds.size || new Set(progressIds).size !== progressIds.length || progressIds.some((id) => !validIds.has(id))) return state
      return { ...state, interviewSessions: [...state.interviewSessions, { ...session, questionProgress: session.questionProgress.map((item) => ({ ...item, followUpNotes: [...item.followUpNotes] })) }] }
    }

    case 'START_INTERVIEW_SESSION': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      const interview = session ? state.interviews.find((item) => item.id === session.interviewId) : undefined
      const set = session ? state.interviewQuestionSets.find((item) => item.id === session.questionSetId) : undefined
      const first = session?.questionProgress[0]
      if (!session || !interview || !set || !first || session.status !== 'NOT_STARTED' || interview.status !== 'SCHEDULED' || set.status !== 'APPROVED') return state
      return { ...state, interviews: state.interviews.map((item) => item.id === interview.id ? { ...item, status: 'IN_PROGRESS', updatedAt: action.payload.startedAt } : item), interviewSessions: state.interviewSessions.map((item) => item.id === session.id ? { ...item, status: 'IN_PROGRESS', startedAt: action.payload.startedAt, updatedAt: action.payload.startedAt, currentQuestionId: first.questionId, questionProgress: item.questionProgress.map((progress, index) => index === 0 ? { ...progress, status: 'CURRENT', startedAt: action.payload.startedAt } : progress) } : item) }
    }

    case 'PAUSE_INTERVIEW_SESSION': {
      const { sessionId, pausedAt, activeSecondsSinceResume } = action.payload
      if (!Number.isFinite(activeSecondsSinceResume) || activeSecondsSinceResume < 0) return state
      return { ...state, interviewSessions: state.interviewSessions.map((session) => session.id === sessionId && session.status === 'IN_PROGRESS' ? { ...session, status: 'PAUSED', pausedAt, updatedAt: pausedAt, accumulatedActiveSeconds: session.accumulatedActiveSeconds + Math.floor(activeSecondsSinceResume) } : session) }
    }

    case 'RESUME_INTERVIEW_SESSION':
      return { ...state, interviewSessions: state.interviewSessions.map((session) => session.id === action.payload.sessionId && session.status === 'PAUSED' ? { ...session, status: 'IN_PROGRESS', resumedAt: action.payload.resumedAt, updatedAt: action.payload.resumedAt } : session) }

    case 'UPDATE_SESSION_QUESTION_NOTES': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      if (!session || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || action.payload.notes.length > 5000 || !session.questionProgress.some((item) => item.questionId === action.payload.questionId)) return state
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id === session.id ? { ...item, updatedAt: action.payload.updatedAt, questionProgress: item.questionProgress.map((progress) => progress.questionId === action.payload.questionId ? { ...progress, interviewerNotes: action.payload.notes } : progress) } : item) }
    }

    case 'ADD_SESSION_FOLLOW_UP': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      const progress = session?.questionProgress.find((item) => item.questionId === action.payload.questionId)
      const followUp = action.payload.followUp.trim()
      const normalized = followUp.toLocaleLowerCase().replace(/\s+/g, ' ')
      if (!session || !progress || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || followUp.length < 3 || followUp.length > 300 || progress.followUpNotes.length >= 10 || progress.followUpNotes.some((item) => item.trim().toLocaleLowerCase().replace(/\s+/g, ' ') === normalized)) return state
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id === session.id ? { ...item, updatedAt: action.payload.updatedAt, questionProgress: item.questionProgress.map((entry) => entry.questionId === progress.questionId ? { ...entry, followUpNotes: [...entry.followUpNotes, followUp] } : entry) } : item) }
    }

    case 'REMOVE_SESSION_FOLLOW_UP': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      const progress = session?.questionProgress.find((item) => item.questionId === action.payload.questionId)
      if (!session || !progress || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || action.payload.followUpIndex < 0 || action.payload.followUpIndex >= progress.followUpNotes.length) return state
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id === session.id ? { ...item, updatedAt: action.payload.updatedAt, questionProgress: item.questionProgress.map((entry) => entry.questionId === progress.questionId ? { ...entry, followUpNotes: entry.followUpNotes.filter((_, index) => index !== action.payload.followUpIndex) } : entry) } : item) }
    }

    case 'MARK_SESSION_QUESTION_ASKED':
    case 'MARK_SESSION_QUESTION_SKIPPED': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      if (!session || session.status !== 'IN_PROGRESS') return state
      const index = session.questionProgress.findIndex((item) => item.questionId === action.payload.questionId)
      if (index < 0 || session.questionProgress[index].status !== 'CURRENT') return state
      const nextIndex = session.questionProgress.findIndex((item, itemIndex) => itemIndex > index && item.status === 'NOT_ASKED')
      const changedAt = action.type === 'MARK_SESSION_QUESTION_ASKED' ? action.payload.completedAt : action.payload.skippedAt
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id !== session.id ? item : { ...item, updatedAt: changedAt, currentQuestionId: nextIndex >= 0 ? item.questionProgress[nextIndex].questionId : undefined, questionProgress: item.questionProgress.map((progress, progressIndex) => progressIndex === index ? { ...progress, status: action.type === 'MARK_SESSION_QUESTION_ASKED' ? 'ASKED' : 'SKIPPED', ...(action.type === 'MARK_SESSION_QUESTION_ASKED' ? { completedAt: changedAt } : { skippedAt: changedAt }) } : progressIndex === nextIndex ? { ...progress, status: 'CURRENT', startedAt: progress.startedAt ?? changedAt } : progress) }) }
    }

    case 'SET_CURRENT_SESSION_QUESTION': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      if (!session || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || !session.questionProgress.some((item) => item.questionId === action.payload.questionId)) return state
      const selected = session.questionProgress.find((item) => item.questionId === action.payload.questionId)!
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id !== session.id ? item : { ...item, currentQuestionId: selected.questionId, updatedAt: action.payload.changedAt, questionProgress: item.questionProgress.map((progress) => progress.questionId === selected.questionId ? (progress.status === 'NOT_ASKED' ? { ...progress, status: 'CURRENT', startedAt: progress.startedAt ?? action.payload.changedAt } : progress) : progress.status === 'CURRENT' ? { ...progress, status: 'NOT_ASKED' } : progress) }) }
    }

    case 'UPDATE_INTERVIEW_SESSION_GENERAL_NOTES': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      if (!session || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || action.payload.notes.length > 10000) return state
      return { ...state, interviewSessions: state.interviewSessions.map((item) => item.id === session.id ? { ...item, generalNotes: action.payload.notes, updatedAt: action.payload.updatedAt } : item) }
    }

    case 'COMPLETE_INTERVIEW_SESSION': {
      const session = state.interviewSessions.find((item) => item.id === action.payload.sessionId)
      const interview = session ? state.interviews.find((item) => item.id === session.interviewId) : undefined
      if (!session || !interview || !session.startedAt || !['IN_PROGRESS', 'PAUSED'].includes(session.status) || !Number.isFinite(action.payload.activeSecondsSinceResume) || action.payload.activeSecondsSinceResume < 0) return state
      const asked = session.questionProgress.filter((item) => item.status === 'ASKED').length
      const skipped = session.questionProgress.filter((item) => item.status === 'SKIPPED').length
      const notReached = session.questionProgress.length - asked - skipped
      const completionSummary = `${asked} question${asked === 1 ? '' : 's'} asked, ${skipped} skipped, and ${notReached} not reached.`
      return { ...state, interviews: state.interviews.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED', updatedAt: action.payload.completedAt } : item), interviewSessions: state.interviewSessions.map((item) => item.id !== session.id ? item : { ...item, status: 'COMPLETED', completedAt: action.payload.completedAt, updatedAt: action.payload.completedAt, currentQuestionId: undefined, accumulatedActiveSeconds: item.accumulatedActiveSeconds + Math.floor(action.payload.activeSecondsSinceResume), completionSummary, questionProgress: item.questionProgress.map((progress) => progress.status === 'CURRENT' || progress.status === 'NOT_ASKED' ? { ...progress, status: 'NOT_REACHED' } : progress) }) }
    }

    case 'UPDATE_INTERVIEW_STATUS':
      if (
        action.payload.status === 'CANCELLED' &&
        !state.interviews.some(
          (interview) =>
            interview.id === action.payload.interviewId &&
            interview.status === 'SCHEDULED',
        )
      ) {
        return state
      }
      return {
        ...state,
        interviews: state.interviews.map((interview) =>
          interview.id === action.payload.interviewId
            ? {
                ...interview,
                status: action.payload.status,
                ...(action.payload.updatedAt
                  ? { updatedAt: action.payload.updatedAt }
                  : {}),
              }
            : interview,
        ),
      }

    case 'ADD_INTERVIEW_TRANSCRIPT': {
      const transcript = action.payload.transcript; const interview = state.interviews.find((item) => item.id === transcript.interviewId); const session = state.interviewSessions.find((item) => item.id === transcript.sessionId); const ids = transcript.segments.map((item) => item.id)
      if (!interview || interview.status !== 'COMPLETED' || !session || session.status !== 'COMPLETED' || session.interviewId !== interview.id || state.interviewTranscripts.some((item) => item.id === transcript.id || item.interviewId === transcript.interviewId) || new Set(ids).size !== ids.length) return state
      return { ...state, interviewTranscripts: [...state.interviewTranscripts, { ...transcript, segments: transcript.segments.map((item, index) => ({ ...item, order: index + 1 })) }] }
    }
    case 'UPDATE_INTERVIEW_TRANSCRIPT_RAW_TEXT':
      if (action.payload.rawText.length > 100000 || !state.interviewTranscripts.some((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT')) return state
      return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT' ? { ...item, rawText: action.payload.rawText, updatedAt: action.payload.updatedAt } : item) }
    case 'REPLACE_INTERVIEW_TRANSCRIPT_SEGMENTS':
      if (!state.interviewTranscripts.some((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT')) return state
      return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT' && new Set(action.payload.segments.map((segment) => segment.id)).size === action.payload.segments.length ? { ...item, segments: action.payload.segments.map((segment, index) => ({ ...segment, order: index + 1 })), updatedAt: action.payload.updatedAt } : item) }
    case 'UPDATE_INTERVIEW_TRANSCRIPT_SEGMENT':
      if (!state.interviewTranscripts.some((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT')) return state
      return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT' ? { ...item, updatedAt: action.payload.updatedAt, segments: item.segments.map((segment) => segment.id === action.payload.segmentId && (action.payload.changes.text === undefined || action.payload.changes.text.trim()) ? { ...segment, ...action.payload.changes, text: action.payload.changes.text?.trim() ?? segment.text, updatedAt: action.payload.updatedAt } : segment) } : item) }
    case 'ADD_INTERVIEW_TRANSCRIPT_SEGMENT':
      if (!state.interviewTranscripts.some((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT')) return state
      return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT' && !item.segments.some((segment) => segment.id === action.payload.segment.id) && action.payload.segment.text.trim() ? { ...item, updatedAt: action.payload.updatedAt, segments: [...item.segments, { ...action.payload.segment, order: item.segments.length + 1 }] } : item) }
    case 'REMOVE_INTERVIEW_TRANSCRIPT_SEGMENT':
      if (!state.interviewTranscripts.some((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT')) return state
      return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === action.payload.transcriptId && item.status === 'DRAFT' && (item.segments.length > 1 || !item.rawText.trim()) ? { ...item, updatedAt: action.payload.updatedAt, segments: item.segments.filter((segment) => segment.id !== action.payload.segmentId).map((segment, index) => ({ ...segment, order: index + 1 })) } : item) }
    case 'MOVE_INTERVIEW_TRANSCRIPT_SEGMENT': {
      const transcript = state.interviewTranscripts.find((item) => item.id === action.payload.transcriptId); if (!transcript || transcript.status !== 'DRAFT') return state; const from = transcript.segments.findIndex((item) => item.id === action.payload.segmentId); const to = action.payload.direction === 'UP' ? from - 1 : from + 1; if (from < 0 || to < 0 || to >= transcript.segments.length) return state; const segments = [...transcript.segments]; const [moved] = segments.splice(from, 1); segments.splice(to, 0, moved); return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === transcript.id ? { ...item, updatedAt: action.payload.updatedAt, segments: segments.map((segment, index) => ({ ...segment, order: index + 1 })) } : item) }
    }
    case 'APPROVE_INTERVIEW_TRANSCRIPT': {
      const transcript = state.interviewTranscripts.find((item) => item.id === action.payload.transcriptId); const set = transcript ? state.interviewQuestionSets.find((item) => item.interviewId === transcript.interviewId && item.status === 'APPROVED') : undefined; if (!transcript || transcript.status !== 'DRAFT' || !set || !evaluateInterviewTranscriptReadiness({ transcript, questionSet: set }).ready) return state; return { ...state, interviewTranscripts: state.interviewTranscripts.map((item) => item.id === transcript.id ? { ...item, status: 'APPROVED', approvedAt: action.payload.approvedAt, approvedBy: action.payload.approvedBy, updatedAt: action.payload.approvedAt } : item) }
    }
    case 'ADD_INTERVIEW_ANALYSIS':
    case 'MARK_INTERVIEW_ANALYSIS_GENERATION_FAILED': {
      const analysis = action.payload.analysis; const transcript = state.interviewTranscripts.find((item) => item.id === analysis.transcriptId); if (!transcript || transcript.status !== 'APPROVED' || transcript.interviewId !== analysis.interviewId || state.interviewAnalyses.some((item) => item.id === analysis.id || item.interviewId === analysis.interviewId)) return state; return { ...state, interviewAnalyses: [...state.interviewAnalyses, { ...analysis, evidence: analysis.evidence.map((item) => ({ ...item, analysisId: analysis.id })) }] }
    }
    case 'RETRY_INTERVIEW_ANALYSIS_GENERATION': {
      const failed = state.interviewAnalyses.find((item) => item.id === action.payload.analysisId && item.status === 'GENERATION_FAILED')
      if (!failed) return state
      return { ...state, interviewAnalyses: state.interviewAnalyses.filter((item) => item.id !== failed.id) }
    }
    case 'UPDATE_INTERVIEW_EVIDENCE':
      return { ...state, interviewAnalyses: state.interviewAnalyses.map((analysis) => analysis.id === action.payload.analysisId && analysis.status === 'DRAFT' ? { ...analysis, updatedAt: action.payload.updatedAt, evidence: analysis.evidence.map((item) => item.id === action.payload.evidenceId ? { ...item, ...action.payload.changes, updatedAt: action.payload.updatedAt } : item) } : analysis) }
    case 'ADD_INTERVIEW_EVIDENCE':
      return { ...state, interviewAnalyses: state.interviewAnalyses.map((analysis) => analysis.id === action.payload.analysisId && analysis.status === 'DRAFT' && !analysis.evidence.some((item) => item.id === action.payload.evidence.id) ? { ...analysis, updatedAt: action.payload.updatedAt, evidence: [...analysis.evidence, { ...action.payload.evidence, analysisId: analysis.id }] } : analysis) }
    case 'REMOVE_INTERVIEW_EVIDENCE':
      return { ...state, interviewAnalyses: state.interviewAnalyses.map((analysis) => analysis.id === action.payload.analysisId && analysis.status === 'DRAFT' ? { ...analysis, updatedAt: action.payload.updatedAt, evidence: analysis.evidence.filter((item) => item.id !== action.payload.evidenceId) } : analysis) }
    case 'UPDATE_INTERVIEW_ANALYSIS_CONTENT':
      return { ...state, interviewAnalyses: state.interviewAnalyses.map((analysis) => analysis.id === action.payload.analysisId && analysis.status === 'DRAFT' ? { ...analysis, ...(action.payload.interviewerSummary !== undefined ? { interviewerSummary: action.payload.interviewerSummary.slice(0, 800) } : {}), ...(action.payload.strengths ? { strengths: action.payload.strengths.slice(0, 10) } : {}), ...(action.payload.concerns ? { concerns: action.payload.concerns.slice(0, 10) } : {}), ...(action.payload.missingEvidence ? { missingEvidence: action.payload.missingEvidence.slice(0, 10) } : {}), updatedAt: action.payload.updatedAt } : analysis) }
    case 'APPROVE_INTERVIEW_ANALYSIS': {
      const analysis = state.interviewAnalyses.find((item) => item.id === action.payload.analysisId); const transcript = analysis ? state.interviewTranscripts.find((item) => item.id === analysis.transcriptId) : undefined; const application = analysis ? state.interviews.find((item) => item.id === analysis.interviewId) : undefined; const app = application ? state.applications.find((item) => item.id === application.applicationId) : undefined; const job = app ? state.jobs.find((item) => item.id === app.jobId) : undefined; const questionSet = analysis ? state.interviewQuestionSets.find((item) => item.interviewId === analysis.interviewId && item.status === 'APPROVED') : undefined; if (!analysis || analysis.status !== 'DRAFT' || !transcript || !job || !questionSet || !evaluateInterviewAnalysisReadiness({ analysis, transcript, requirements: deriveJobRequirements(job), questionSet }).ready) return state; return { ...state, interviewAnalyses: state.interviewAnalyses.map((item) => item.id === analysis.id ? { ...item, status: 'APPROVED', approvedAt: action.payload.approvedAt, approvedBy: action.payload.approvedBy, updatedAt: action.payload.approvedAt } : item) }
    }
    case 'APPLY_DEMO_POST_INTERVIEW_FAST_FORWARD': {
      const result = action.payload.result
      const interview = state.interviews.find((item) => item.id === result.interviewId && item.status === 'COMPLETED')
      const session = state.interviewSessions.find((item) => item.interviewId === result.interviewId && item.status === 'COMPLETED')
      const questionSet = state.interviewQuestionSets.find((item) => item.interviewId === result.interviewId && item.status === 'APPROVED')
      const application = interview ? state.applications.find((item) => item.id === interview.applicationId && item.candidateId === result.candidateId) : undefined
      const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
      const transcript = result.transcript
      if (!interview || !session || !questionSet || !application || !job || transcript.interviewId !== interview.id || transcript.sessionId !== session.id || transcript.source !== 'SIMULATED' || state.interviewTranscripts.some((item) => item.interviewId === interview.id) || state.interviewAnalyses.some((item) => item.interviewId === interview.id) || state.finalEvaluations.some((item) => item.interviewId === interview.id)) return state
      const transcriptReady = evaluateInterviewTranscriptReadiness({ transcript, questionSet }).ready
      if (transcript.status === 'APPROVED' && (!transcriptReady || transcript.approvedBy !== 'AURA Demo Automation' || !transcript.approvedAt)) return state
      if (transcript.status === 'DRAFT' && (result.stage !== 'TRANSCRIPT_REVIEW' || result.analysis || result.finalEvaluation)) return state

      let next: DemoState = { ...state, interviewTranscripts: [...state.interviewTranscripts, transcript] }
      if (result.analysis) {
        const analysis = result.analysis
        if (transcript.status !== 'APPROVED' || analysis.interviewId !== interview.id || analysis.transcriptId !== transcript.id || !['DRAFT', 'APPROVED'].includes(analysis.status)) return state
        if (analysis.status === 'APPROVED' && (!evaluateInterviewAnalysisReadiness({ analysis, transcript, requirements: deriveJobRequirements(job), questionSet }).ready || analysis.approvedBy !== 'AURA Demo Automation' || !analysis.approvedAt)) return state
        if (analysis.status === 'DRAFT' && (result.stage !== 'ANALYSIS_REVIEW' || result.finalEvaluation)) return state
        next = { ...next, interviewAnalyses: [...next.interviewAnalyses, { ...analysis, evidence: analysis.evidence.map((item) => ({ ...item, analysisId: analysis.id })) }] }
      }
      if (result.finalEvaluation) {
        if (!result.analysis || result.analysis.status !== 'APPROVED' || !finalEvaluationProvenanceIsValid(next, result.finalEvaluation)) return state
        next = { ...next, finalEvaluations: [...next.finalEvaluations, result.finalEvaluation] }
      }
      if (result.stage === 'FINAL_EVALUATION' && !result.finalEvaluation) return state
      return next
    }

    case 'ADD_FINAL_EVALUATION':
    case 'MARK_FINAL_EVALUATION_GENERATION_FAILED': {
      const evaluation = action.payload.evaluation
      if (!finalEvaluationProvenanceIsValid(state, evaluation) || state.finalEvaluations.some((item) => item.id === evaluation.id || (item.applicationId === evaluation.applicationId && !item.supersededByEvaluationId))) return state
      return { ...state, finalEvaluations: [...state.finalEvaluations, evaluation] }
    }
    case 'ADD_EVALUATION_CHALLENGE': {
      const challenge = action.payload.challenge
      const evaluation = state.finalEvaluations.find((item) => item.id === challenge.finalEvaluationId)
      if (!evaluation || evaluation.status === 'DECIDED' || !['INTERVIEWER', 'RECRUITER', 'HIRING_MANAGER'].includes(action.payload.actorRole) || challenge.explanation.trim().length < 20 || state.evaluationChallenges.some((item) => item.id === challenge.id)) return state
      return { ...state, evaluationChallenges: [...state.evaluationChallenges, { ...challenge, explanation: challenge.explanation.trim() }] }
    }
    case 'RESOLVE_EVALUATION_CHALLENGE':
    case 'DISMISS_EVALUATION_CHALLENGE': {
      if (!['RECRUITER', 'HIRING_MANAGER'].includes(action.payload.actorRole) || action.payload.resolutionNote.trim().length < 10) return state
      const challenge = state.evaluationChallenges.find((item) => item.id === action.payload.challengeId)
      if (!challenge || challenge.status !== 'OPEN') return state
      return { ...state, evaluationChallenges: state.evaluationChallenges.map((item) => item.id === challenge.id ? { ...item, status: action.type === 'RESOLVE_EVALUATION_CHALLENGE' ? 'RESOLVED' : 'DISMISSED', resolvedAt: action.payload.resolvedAt, resolutionNote: action.payload.resolutionNote.trim() } : item) }
    }
    case 'ADD_RECALCULATED_FINAL_EVALUATION': {
      const previous = state.finalEvaluations.find((item) => item.id === action.payload.previousEvaluationId)
      const evaluation = action.payload.evaluation
      const transcript = previous ? state.interviewTranscripts.find((item) => item.interviewId === previous.interviewId && item.status === 'APPROVED') : undefined
      const analysis = previous ? state.interviewAnalyses.find((item) => item.id === previous.interviewAnalysisId && item.status === 'APPROVED') : undefined
      if (!previous || previous.status === 'DECIDED' || !transcript || !analysis || !finalEvaluationSourcesChanged(previous, transcript, analysis) || evaluation.version !== previous.version + 1 || evaluation.applicationId !== previous.applicationId || !finalEvaluationProvenanceIsValid(state, evaluation) || state.finalEvaluations.some((item) => item.id === evaluation.id)) return state
      return { ...state, finalEvaluations: [...state.finalEvaluations, evaluation] }
    }
    case 'RECORD_HUMAN_FINAL_DECISION': {
      const evaluation = state.finalEvaluations.find((item) => item.id === action.payload.finalEvaluationId)
      const reason = action.payload.decisionReason.trim()
      if (!evaluation || evaluation.status !== 'READY_FOR_DECISION' || !canRecordFinalDecision(action.payload.decidedByRole) || reason.length < 20 || reason.length > 2000 || state.evaluationChallenges.some((item) => item.finalEvaluationId === evaluation.id && item.status === 'OPEN')) return state
      const differs = doesHumanDecisionDifferFromSystem(evaluation.systemRecommendation, action.payload.decision)
      const explanation = action.payload.disagreementExplanation?.trim()
      if (differs && (!action.payload.disagreementReason || !explanation || explanation.length < 20 || explanation.length > 2000)) return state
      return { ...state, finalEvaluations: state.finalEvaluations.map((item) => item.id !== evaluation.id ? item : { ...item, status: 'DECIDED', humanDecision: action.payload.decision, humanDecisionReason: reason, candidateFacingReasonDraft: action.payload.candidateFacingReasonDraft?.trim() || undefined, differsFromSystem: differs, disagreementReason: differs ? action.payload.disagreementReason : undefined, disagreementExplanation: differs ? explanation : undefined, holdReviewDate: action.payload.decision === 'HOLD' ? action.payload.holdReviewDate : undefined, decidedBy: action.payload.decidedBy, decidedByRole: action.payload.decidedByRole, decidedAt: action.payload.decidedAt, updatedAt: action.payload.decidedAt }) }
    }

    case 'ADD_TRANSCRIPT': {
      const transcriptExists = state.transcripts.some(
        (transcript) => transcript.id === action.payload.id,
      )

      return {
        ...state,
        transcripts: transcriptExists
          ? state.transcripts.map((transcript) =>
              transcript.id === action.payload.id ? action.payload : transcript,
            )
          : [...state.transcripts, action.payload],
      }
    }

    case 'UPDATE_COMMUNICATION_DRAFT': {
      const communication = state.communications.find(
        (item) => item.id === action.payload.communicationId,
      )

      if (!communication || communication.status !== 'DRAFT') {
        return state
      }

      return {
        ...state,
        communications: state.communications.map((item) =>
          item.id === action.payload.communicationId
            ? {
                ...item,
                subject: action.payload.subject,
                body: action.payload.body,
              }
            : item,
        ),
      }
    }

    case 'UPDATE_COMMUNICATION_STATUS':
      return {
        ...state,
        communications: state.communications.map((communication) =>
          communication.id === action.payload.communicationId
            ? {
                ...communication,
                status: action.payload.status,
                ...(action.payload.status === 'SENT'
                  ? { sentAt: action.payload.sentAt }
                  : {}),
              }
            : communication,
        ),
      }
  }
}
