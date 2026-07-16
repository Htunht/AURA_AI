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
import type { InterviewQuestion, InterviewStatus } from '../types/interview'
import type { Transcript } from '../types/transcript'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import { validateRecruitmentApplicationForm } from '../utils/applicationFormValidation'
import { createInitialDemoState } from './demoInitialState'
import type { DemoState } from './demoStateTypes'

export { initialDemoState } from './demoInitialState'
export type { DemoState } from './demoStateTypes'

export type DemoAction =
  | { type: 'RESET_DEMO_STATE' }
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
  | { type: 'ADD_CANDIDATE'; payload: Candidate }
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
  | {
      type: 'ADD_INTERVIEW_QUESTIONS'
      payload: { interviewId: string; questions: InterviewQuestion[] }
    }
  | {
      type: 'UPDATE_INTERVIEW_STATUS'
      payload: { interviewId: string; status: InterviewStatus }
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

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'RESET_DEMO_STATE':
      return createInitialDemoState()

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

        if (!application || hasCompletedEvaluation || hasQueueRecord) continue

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

    case 'UPDATE_INTERVIEW_STATUS':
      return {
        ...state,
        interviews: state.interviews.map((interview) =>
          interview.id === action.payload.interviewId
            ? { ...interview, status: action.payload.status }
            : interview,
        ),
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
