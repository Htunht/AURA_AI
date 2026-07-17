import applicationsData from '../data/applications.json'
import applicationFormsData from '../data/applicationForms.json'
import candidatesData from '../data/candidates.json'
import communicationsData from '../data/communications.json'
import evaluationsData from '../data/evaluations.json'
import interviewsData from '../data/interviews.json'
import interviewSchedulingPoliciesData from '../data/interviewSchedulingPolicies.json'
import jobsData from '../data/jobs.json'
import rubricsData from '../data/rubrics.json'
import transcriptsData from '../data/transcripts.json'
import {
  demoReducer,
  initialDemoState,
  type DemoState,
} from '../store/demoReducer'
import {
  selectApplicationById,
  selectApplicationFormById,
  selectCandidateById,
  selectCommunicationsByApplicationId,
  selectDashboardMetrics,
  selectHiringFunnel,
  selectInterviewByApplicationId,
  selectJobById,
  selectLatestLegacyFinalEvaluation,
  selectLatestScreeningEvaluation,
  selectPublishedApplicationFormByJobId,
  selectTranscriptByInterviewId,
} from '../store/demoSelectors'
import type { ApplicationForm } from '../types/applicationForm'
import type { Decision } from '../types/decision'
import type { InterviewQuestion } from '../types/interview'

export type DemoStoreValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) {
    errors.push(message)
  }
}

function validateInitialCounts(errors: string[]) {
  const expectedCounts: Array<[keyof DemoState, number]> = [
    ['jobs', jobsData.length],
    ['candidates', candidatesData.length],
    ['applications', applicationsData.length],
    ['applicationForms', applicationFormsData.length],
    ['rubrics', rubricsData.length],
    ['evaluations', evaluationsData.length],
    ['interviews', interviewsData.length],
    ['interviewSchedulingPolicies', interviewSchedulingPoliciesData.length],
    ['interviewSchedulingInvitations', 0],
    ['transcripts', transcriptsData.length],
    ['communications', communicationsData.length],
    ['candidateCommunicationDrafts', 0],
    ['holdFollowUps', 0],
    ['decisions', 0],
    ['screeningQueue', 0],
  ]

  for (const [collection, expectedCount] of expectedCounts) {
    recordCheck(
      errors,
      initialDemoState[collection].length === expectedCount,
      `Initial ${collection} count does not match the source data`,
    )
  }
}

function createValidationDraftForm(): ApplicationForm {
  return {
    id: 'form-validation-job-001-v2',
    jobId: 'job-001',
    name: 'Validation Recruitment Form',
    status: 'DRAFT',
    version: 2,
    fields: [
      {
        id: 'field-validation-full-name',
        key: 'full_name',
        label: 'Full Name',
        type: 'TEXT',
        required: true,
      },
      {
        id: 'field-validation-email',
        key: 'email',
        label: 'Email',
        type: 'EMAIL',
        required: true,
      },
      {
        id: 'field-validation-cv',
        key: 'cv',
        label: 'CV',
        type: 'FILE',
        required: true,
      },
    ],
    createdAt: '2026-07-17T08:00:00Z',
    updatedAt: '2026-07-17T08:00:00Z',
  }
}

function validateApplicationFormActions(errors: string[]) {
  const publishedForm = selectPublishedApplicationFormByJobId(
    initialDemoState,
    'job-001',
  )

  recordCheck(
    errors,
    Boolean(publishedForm),
    'job-001 does not have a published application form',
  )
  recordCheck(
    errors,
    ['full_name', 'email', 'cv'].every((key) =>
      publishedForm?.fields.some((field) => field.key === key),
    ),
    'Published job-001 form is missing a recruitment identity field',
  )

  const draftForm = createValidationDraftForm()
  const addedState = demoReducer(initialDemoState, {
    type: 'ADD_APPLICATION_FORM',
    payload: draftForm,
  })
  recordCheck(
    errors,
    selectApplicationFormById(addedState, draftForm.id)?.id === draftForm.id,
    'Adding an application form failed',
  )

  const duplicateState = demoReducer(addedState, {
    type: 'ADD_APPLICATION_FORM',
    payload: draftForm,
  })
  recordCheck(
    errors,
    duplicateState === addedState,
    'Duplicate application form ID was accepted',
  )

  const phoneField = {
    id: 'field-validation-phone',
    key: 'phone',
    label: 'Phone',
    type: 'PHONE' as const,
    required: false,
  }
  const fieldAddedState = demoReducer(addedState, {
    type: 'ADD_APPLICATION_FORM_FIELD',
    payload: { formId: draftForm.id, field: phoneField },
  })
  recordCheck(
    errors,
    selectApplicationFormById(fieldAddedState, draftForm.id)?.fields.some(
      (field) => field.id === phoneField.id,
    ) === true,
    'Adding a field to a draft form failed',
  )

  const duplicateKeyState = demoReducer(fieldAddedState, {
    type: 'ADD_APPLICATION_FORM_FIELD',
    payload: {
      formId: draftForm.id,
      field: { ...phoneField, id: 'field-validation-duplicate-phone' },
    },
  })
  recordCheck(
    errors,
    duplicateKeyState === fieldAddedState,
    'Duplicate draft field key was accepted',
  )

  const removedState = demoReducer(fieldAddedState, {
    type: 'REMOVE_APPLICATION_FORM_FIELD',
    payload: { formId: draftForm.id, fieldId: phoneField.id },
  })
  recordCheck(
    errors,
    selectApplicationFormById(removedState, draftForm.id)?.fields.some(
      (field) => field.id === phoneField.id,
    ) === false,
    'Removing a draft form field failed',
  )

  const movedState = demoReducer(addedState, {
    type: 'MOVE_APPLICATION_FORM_FIELD',
    payload: {
      formId: draftForm.id,
      fieldId: 'field-validation-email',
      direction: 'UP',
    },
  })
  recordCheck(
    errors,
    selectApplicationFormById(movedState, draftForm.id)?.fields[0]?.id ===
      'field-validation-email',
    'Moving a draft form field did not change field order',
  )

  const reorderedState = demoReducer(addedState, {
    type: 'REORDER_APPLICATION_FORM_FIELDS',
    payload: {
      formId: draftForm.id,
      activeFieldId: 'field-validation-cv',
      overFieldId: 'field-validation-full-name',
    },
  })
  const reorderedForm = selectApplicationFormById(
    reorderedState,
    draftForm.id,
  )
  const reorderedIds = reorderedForm?.fields.map((field) => field.id) ?? []

  recordCheck(
    errors,
    reorderedIds[0] === 'field-validation-cv',
    'Reordering a draft field did not move it to the target position',
  )
  recordCheck(
    errors,
    reorderedIds.length === draftForm.fields.length,
    'Reordering changed the application form field count',
  )
  recordCheck(
    errors,
    new Set(reorderedIds).size === reorderedIds.length,
    'Reordering created duplicate application form field IDs',
  )
  recordCheck(
    errors,
    draftForm.fields.every((field) => reorderedForm?.fields.includes(field)),
    'Reordering did not preserve the original field objects',
  )

  const missingActiveState = demoReducer(addedState, {
    type: 'REORDER_APPLICATION_FORM_FIELDS',
    payload: {
      formId: draftForm.id,
      activeFieldId: 'field-validation-missing',
      overFieldId: 'field-validation-full-name',
    },
  })
  recordCheck(
    errors,
    missingActiveState === addedState,
    'Reordering accepted a missing active field ID',
  )

  const missingOverState = demoReducer(addedState, {
    type: 'REORDER_APPLICATION_FORM_FIELDS',
    payload: {
      formId: draftForm.id,
      activeFieldId: 'field-validation-full-name',
      overFieldId: 'field-validation-missing',
    },
  })
  recordCheck(
    errors,
    missingOverState === addedState,
    'Reordering accepted a missing target field ID',
  )

  const selfReorderedState = demoReducer(addedState, {
    type: 'REORDER_APPLICATION_FORM_FIELDS',
    payload: {
      formId: draftForm.id,
      activeFieldId: 'field-validation-full-name',
      overFieldId: 'field-validation-full-name',
    },
  })
  recordCheck(
    errors,
    selfReorderedState === addedState,
    'Reordering a field over itself changed state',
  )

  if (publishedForm) {
    const publishedEditState = demoReducer(initialDemoState, {
      type: 'ADD_APPLICATION_FORM_FIELD',
      payload: { formId: publishedForm.id, field: phoneField },
    })
    recordCheck(
      errors,
      publishedEditState === initialDemoState,
      'A published form accepted a field edit',
    )

    const publishedReorderState = demoReducer(initialDemoState, {
      type: 'REORDER_APPLICATION_FORM_FIELDS',
      payload: {
        formId: publishedForm.id,
        activeFieldId: publishedForm.fields[0]?.id ?? '',
        overFieldId: publishedForm.fields[1]?.id ?? '',
      },
    })
    recordCheck(
      errors,
      publishedReorderState === initialDemoState,
      'A published form accepted field reordering',
    )
  }

  const invalidDraft: ApplicationForm = {
    ...draftForm,
    id: 'form-validation-invalid',
    version: 3,
    fields: [draftForm.fields[0]],
  }
  const invalidAddedState = demoReducer(initialDemoState, {
    type: 'ADD_APPLICATION_FORM',
    payload: invalidDraft,
  })
  const invalidPublishedState = demoReducer(invalidAddedState, {
    type: 'PUBLISH_APPLICATION_FORM',
    payload: {
      formId: invalidDraft.id,
      updatedAt: '2026-07-17T09:00:00Z',
    },
  })
  recordCheck(
    errors,
    invalidPublishedState === invalidAddedState,
    'Publishing an invalid application form was accepted',
  )

  const publishedState = demoReducer(addedState, {
    type: 'PUBLISH_APPLICATION_FORM',
    payload: {
      formId: draftForm.id,
      updatedAt: '2026-07-17T09:30:00Z',
    },
  })
  recordCheck(
    errors,
    selectApplicationFormById(publishedState, draftForm.id)?.status ===
      'PUBLISHED',
    'Publishing a valid draft form failed',
  )
  recordCheck(
    errors,
    selectApplicationFormById(publishedState, 'form-job-001-v1')?.status ===
      'ARCHIVED',
    'Publishing a new form did not archive the previous job form',
  )

  const john = initialDemoState.candidates.find(
    (candidate) => candidate.id === 'candidate-001',
  )
  if (john) {
    const duplicateCandidateState = demoReducer(initialDemoState, {
      type: 'ADD_CANDIDATE',
      payload: {
        ...john,
        id: 'candidate-validation-duplicate-email',
        email: john.email.toUpperCase(),
      },
    })
    recordCheck(
      errors,
      duplicateCandidateState === initialDemoState,
      'Case-insensitive duplicate candidate email was accepted',
    )
  }

  const johnApplication = initialDemoState.applications.find(
    (application) => application.id === 'application-001',
  )
  if (johnApplication) {
    const duplicateApplicationState = demoReducer(initialDemoState, {
      type: 'ADD_APPLICATION',
      payload: {
        ...johnApplication,
        id: 'application-validation-duplicate-candidate-job',
      },
    })
    recordCheck(
      errors,
      duplicateApplicationState === initialDemoState,
      'Duplicate candidate and job application was accepted',
    )
  }
}

function validateDecisionActions(errors: string[]) {
  const validConfirmation: Decision = {
    id: 'decision-validation-confirm',
    applicationId: 'application-001',
    evaluationId: 'evaluation-screening-001',
    reviewAction: 'CONFIRM',
    aiRecommendation: 'STRONG_YES',
    humanRecommendation: 'STRONG_YES',
    humanDecision: 'NEXT_STAGE',
    createdAt: '2026-07-16T12:00:00Z',
  }
  const confirmedState = demoReducer(initialDemoState, {
    type: 'CONFIRM_RECOMMENDATION',
    payload: { decision: validConfirmation },
  })

  recordCheck(
    errors,
    confirmedState.decisions.some(
      (decision) => decision.id === validConfirmation.id,
    ),
    'A valid confirmation was not stored',
  )

  const invalidConfirmation: Decision = {
    ...validConfirmation,
    id: 'decision-validation-invalid-confirm',
    humanRecommendation: 'YES',
  }
  const invalidConfirmationState = demoReducer(initialDemoState, {
    type: 'CONFIRM_RECOMMENDATION',
    payload: { decision: invalidConfirmation },
  })

  recordCheck(
    errors,
    invalidConfirmationState === initialDemoState,
    'A confirmation with mismatched recommendations was accepted',
  )

  const invalidOverride: Decision = {
    id: 'decision-validation-invalid-override',
    applicationId: 'application-003',
    evaluationId: 'evaluation-screening-003',
    reviewAction: 'OVERRIDE',
    aiRecommendation: 'REVIEW',
    humanRecommendation: 'YES',
    humanDecision: 'NEXT_STAGE',
    overrideReason: '   ',
    createdAt: '2026-07-16T12:05:00Z',
  }
  const invalidOverrideState = demoReducer(initialDemoState, {
    type: 'OVERRIDE_RECOMMENDATION',
    payload: { decision: invalidOverride },
  })

  recordCheck(
    errors,
    invalidOverrideState === initialDemoState,
    'An override without a reason was accepted',
  )

  const validOverride: Decision = {
    ...invalidOverride,
    id: 'decision-validation-valid-override',
    overrideReason: 'The reviewer verified additional relevant project work.',
  }
  const validOverrideState = demoReducer(initialDemoState, {
    type: 'OVERRIDE_RECOMMENDATION',
    payload: { decision: validOverride },
  })

  recordCheck(
    errors,
    validOverrideState.decisions.some(
      (decision) => decision.id === validOverride.id,
    ),
    'A valid override was not stored',
  )
}

function validateInterviewQuestionDeduplication(errors: string[]) {
  const interview = selectInterviewByApplicationId(
    initialDemoState,
    'application-001',
  )

  if (!interview || interview.questions.length === 0) {
    errors.push('John interview questions are unavailable for deduplication')
    return
  }

  const existingQuestion = interview.questions[0]
  const newQuestion: InterviewQuestion = {
    id: 'question-validation-new',
    type: 'FOLLOW_UP',
    question: 'What tradeoff would you revisit with more time?',
    reason: 'Validate question deduplication behavior.',
  }
  const updatedState = demoReducer(initialDemoState, {
    type: 'ADD_INTERVIEW_QUESTIONS',
    payload: {
      interviewId: interview.id,
      questions: [existingQuestion, newQuestion, newQuestion],
    },
  })
  const updatedInterview = updatedState.interviews.find(
    (item) => item.id === interview.id,
  )
  const questionIds = updatedInterview?.questions.map((question) => question.id)

  recordCheck(
    errors,
    questionIds?.length === interview.questions.length + 1,
    'Adding interview questions did not append exactly one unique question',
  )
  recordCheck(
    errors,
    new Set(questionIds).size === questionIds?.length,
    'Adding interview questions introduced duplicate IDs',
  )
}

function validateSentCommunicationProtection(errors: string[]) {
  const communication = initialDemoState.communications.find(
    (item) => item.id === 'communication-001',
  )

  if (!communication) {
    errors.push('Communication communication-001 is unavailable')
    return
  }

  const sentState = demoReducer(initialDemoState, {
    type: 'UPDATE_COMMUNICATION_STATUS',
    payload: {
      communicationId: communication.id,
      status: 'SENT',
      sentAt: '2026-07-16T12:30:00Z',
    },
  })
  const editedState = demoReducer(sentState, {
    type: 'UPDATE_COMMUNICATION_DRAFT',
    payload: {
      communicationId: communication.id,
      subject: 'Changed after sending',
      body: 'This edit must not be stored.',
    },
  })
  const sentCommunication = editedState.communications.find(
    (item) => item.id === communication.id,
  )

  recordCheck(
    errors,
    editedState === sentState,
    'Editing a sent communication did not return the existing state',
  )
  recordCheck(
    errors,
    sentCommunication?.subject === communication.subject &&
      sentCommunication.body === communication.body,
    'A sent communication draft was edited',
  )
  recordCheck(
    errors,
    sentCommunication?.sentAt === '2026-07-16T12:30:00Z',
    'The supplied sentAt timestamp was not persisted',
  )
}

export function validateDemoStore(): DemoStoreValidationResult {
  const errors: string[] = []

  validateInitialCounts(errors)

  recordCheck(
    errors,
    selectJobById(initialDemoState, 'job-001')?.id === 'job-001',
    'selectJobById did not find job-001',
  )
  recordCheck(
    errors,
    selectCandidateById(initialDemoState, 'candidate-001')?.id ===
      'candidate-001',
    'selectCandidateById did not find candidate-001',
  )
  recordCheck(
    errors,
    selectApplicationById(initialDemoState, 'application-001')?.id ===
      'application-001',
    'selectApplicationById did not find application-001',
  )
  recordCheck(
    errors,
    Boolean(
      selectLatestScreeningEvaluation(initialDemoState, 'application-001'),
    ),
    'John does not have a latest screening evaluation',
  )
  recordCheck(
    errors,
    Boolean(selectLatestLegacyFinalEvaluation(initialDemoState, 'application-001')),
    'John does not have a final evaluation',
  )

  const johnInterview = selectInterviewByApplicationId(
    initialDemoState,
    'application-001',
  )
  recordCheck(errors, Boolean(johnInterview), 'John does not have an interview')
  recordCheck(
    errors,
    Boolean(
      johnInterview &&
        selectTranscriptByInterviewId(initialDemoState, johnInterview.id),
    ),
    'John interview does not have a transcript',
  )
  recordCheck(
    errors,
    selectCommunicationsByApplicationId(initialDemoState, 'application-001')
      .length > 0,
    'John application does not have a communication',
  )

  const dashboardMetrics = selectDashboardMetrics(
    initialDemoState,
    new Date('2026-07-16T10:30:00Z'),
  )
  recordCheck(
    errors,
    Object.values(dashboardMetrics).every((metric) => metric >= 0),
    'Dashboard metrics contain a negative value',
  )

  const hiringFunnel = selectHiringFunnel(initialDemoState, 'job-001')
  recordCheck(
    errors,
    Object.values(hiringFunnel).every((metric) => metric >= 0),
    'Hiring funnel contains a negative value',
  )
  recordCheck(
    errors,
    hiringFunnel.aiScreened <= hiringFunnel.applications &&
      hiringFunnel.shortlisted <= hiringFunnel.applications &&
      hiringFunnel.interviewed <= hiringFunnel.applications &&
      hiringFunnel.selected <= hiringFunnel.applications,
    'Hiring funnel contains a value greater than total applications',
  )

  validateDecisionActions(errors)
  validateApplicationFormActions(errors)
  validateInterviewQuestionDeduplication(errors)
  validateSentCommunicationProtection(errors)

  recordCheck(
    errors,
    initialDemoState.decisions.length === 0,
    'Reducer validation mutated the initial decisions array',
  )

  return {
    valid: errors.length === 0,
    errors,
  }
}
