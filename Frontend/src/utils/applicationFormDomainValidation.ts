import { prepareApplicationSubmission } from '../services/applicationSubmission'
import { initialDemoState } from '../store/demoReducer'
import { selectPublishedApplicationFormByJobId } from '../store/demoSelectors'
import type {
  ApplicationSubmissionAnswer,
  CandidateSubmission,
} from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import { validateApplicationSubmission } from './applicationSubmissionValidation'

export type ApplicationFormDomainValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) {
    errors.push(message)
  }
}

function createValidSubmission(form: ApplicationForm): CandidateSubmission {
  const values: Record<string, string | number | string[]> = {
    full_name: 'Taylor Morgan',
    email: 'taylor.morgan@example.com',
    phone: '+1-555-0199',
    current_position: 'Frontend Engineer',
    years_experience: 5,
    location: 'Boston, MA',
    skills: ['React', 'TypeScript', 'REST API Integration'],
    motivation: 'I want to build reliable hiring products with a strong frontend team.',
    best_project: 'I led the frontend delivery of a multi-tenant analytics platform.',
    problem_solving: 'I profiled a slow data grid and reduced unnecessary rendering.',
    cv: 'taylor-morgan-cv.pdf',
  }
  const answers: ApplicationSubmissionAnswer[] = form.fields.map((field) => ({
    fieldId: field.id,
    fieldKey: field.key,
    fieldType: field.type,
    value: values[field.key] ?? '',
  }))

  return {
    formId: form.id,
    jobId: form.jobId,
    answers,
  }
}

export function validateApplicationFormDomain(): ApplicationFormDomainValidationResult {
  const errors: string[] = []
  const sourceBefore = JSON.stringify({
    applicationForms: initialDemoState.applicationForms,
    candidates: initialDemoState.candidates,
    applications: initialDemoState.applications,
  })
  const formJobIds = new Set(
    initialDemoState.applicationForms.map((form) => form.jobId),
  )

  recordCheck(
    errors,
    initialDemoState.jobs.every((job) => formJobIds.has(job.id)),
    'Not every demo job has an application form',
  )

  const form = selectPublishedApplicationFormByJobId(
    initialDemoState,
    'job-001',
  )

  if (!form) {
    errors.push('job-001 does not have a published application form')
    return { valid: false, errors }
  }

  recordCheck(
    errors,
    form.status === 'PUBLISHED',
    'job-001 application form is not published',
  )
  recordCheck(
    errors,
    form.fields.length === 11,
    'job-001 application form does not contain exactly 11 fields',
  )
  recordCheck(
    errors,
    ['full_name', 'email', 'cv'].every((key) =>
      form.fields.some((field) => field.key === key),
    ),
    'job-001 form is missing a required recruitment identity field',
  )

  const skillsField = form.fields.find((field) => field.key === 'skills')
  recordCheck(
    errors,
    skillsField?.type === 'MULTI_SELECT',
    'job-001 skills field is not MULTI_SELECT',
  )
  const skillsOptions = skillsField?.options ?? []
  recordCheck(
    errors,
    new Set(skillsOptions.map((option) => option.id)).size ===
      skillsOptions.length &&
      new Set(skillsOptions.map((option) => option.value)).size ===
        skillsOptions.length,
    'job-001 skills options are not unique',
  )

  const validSubmission = createValidSubmission(form)
  recordCheck(
    errors,
    validateApplicationSubmission(form, validSubmission).valid,
    'A valid application submission was rejected',
  )

  const emailField = form.fields.find((field) => field.key === 'email')
  const missingEmailSubmission: CandidateSubmission = {
    ...validSubmission,
    answers: validSubmission.answers.filter(
      (answer) => answer.fieldId !== emailField?.id,
    ),
  }
  recordCheck(
    errors,
    !validateApplicationSubmission(form, missingEmailSubmission).valid,
    'A submission missing required email was accepted',
  )

  const unknownFieldSubmission: CandidateSubmission = {
    ...validSubmission,
    answers: [
      ...validSubmission.answers,
      {
        fieldId: 'field-unknown',
        fieldKey: 'unknown',
        fieldType: 'TEXT',
        value: 'Unknown field value',
      },
    ],
  }
  recordCheck(
    errors,
    !validateApplicationSubmission(form, unknownFieldSubmission).valid,
    'A submission with an unknown field ID was accepted',
  )

  const invalidSkillsSubmission: CandidateSubmission = {
    ...validSubmission,
    answers: validSubmission.answers.map((answer) =>
      answer.fieldId === skillsField?.id
        ? { ...answer, value: ['Unsupported Skill'] }
        : answer,
    ),
  }
  recordCheck(
    errors,
    !validateApplicationSubmission(form, invalidSkillsSubmission).valid,
    'A submission with an invalid skills option was accepted',
  )

  const prepared = prepareApplicationSubmission({
    form,
    submission: validSubmission,
    existingCandidates: initialDemoState.candidates,
    candidateId: 'candidate-validation-new',
    applicationId: 'application-validation-new',
    documentId: 'document-validation-new-cv',
    submittedAt: '2026-07-18T09:00:00Z',
  })
  recordCheck(
    errors,
    prepared.candidate.id === 'candidate-validation-new',
    'Submission preparation did not produce a new candidate',
  )
  recordCheck(
    errors,
    prepared.application.id === 'application-validation-new',
    'Submission preparation did not produce an application',
  )
  recordCheck(
    errors,
    prepared.application.status === 'SUBMITTED',
    'Prepared application status is not SUBMITTED',
  )
  recordCheck(
    errors,
    prepared.application.currentStage === 'APPLICATION',
    'Prepared application stage is not APPLICATION',
  )
  recordCheck(
    errors,
    prepared.application.documents[0]?.id === 'document-validation-new-cv' &&
      prepared.application.documents[0]?.fileName === 'taylor-morgan-cv.pdf',
    'Submission preparation did not create CV document metadata',
  )

  const guidedExperienceField = form.fields.find(
    (field) => field.key === 'years_experience',
  )
  if (guidedExperienceField) {
    const guidedForm: ApplicationForm = {
      ...form,
      fields: form.fields.map((field) =>
        field.id === guidedExperienceField.id
          ? { ...field, key: 'years_of_experience' }
          : field,
      ),
    }
    const guidedSubmission: CandidateSubmission = {
      ...validSubmission,
      answers: validSubmission.answers.map((answer) =>
        answer.fieldId === guidedExperienceField.id
          ? { ...answer, fieldKey: 'years_of_experience' }
          : answer,
      ),
    }
    const guidedPrepared = prepareApplicationSubmission({
      form: guidedForm,
      submission: guidedSubmission,
      existingCandidates: [],
      candidateId: 'candidate-validation-guided',
      applicationId: 'application-validation-guided',
      documentId: 'document-validation-guided-cv',
      submittedAt: '2026-07-18T09:15:00Z',
    })
    recordCheck(
      errors,
      guidedPrepared.candidate.yearsExperience === 5,
      'Guided experience field was not copied to the candidate profile',
    )

    const existingGuidedPrepared = prepareApplicationSubmission({
      form: guidedForm,
      submission: guidedSubmission,
      existingCandidates: [
        { ...guidedPrepared.candidate, yearsExperience: 0 },
      ],
      candidateId: 'candidate-validation-guided-unused',
      applicationId: 'application-validation-guided-existing',
      documentId: 'document-validation-guided-existing-cv',
      submittedAt: '2026-07-18T09:20:00Z',
    })
    recordCheck(
      errors,
      existingGuidedPrepared.candidate.id === guidedPrepared.candidate.id &&
        existingGuidedPrepared.candidate.yearsExperience === 5,
      'A repeat applicant did not refresh the stored experience value',
    )
  }

  const john = initialDemoState.candidates.find(
    (candidate) => candidate.id === 'candidate-001',
  )
  if (john && emailField) {
    const existingCandidateSubmission: CandidateSubmission = {
      ...validSubmission,
      answers: validSubmission.answers.map((answer) =>
        answer.fieldId === emailField.id
          ? { ...answer, value: john.email.toUpperCase() }
          : answer,
      ),
    }
    const existingPrepared = prepareApplicationSubmission({
      form,
      submission: existingCandidateSubmission,
      existingCandidates: initialDemoState.candidates,
      candidateId: 'candidate-validation-unused',
      applicationId: 'application-validation-existing',
      documentId: 'document-validation-existing-cv',
      submittedAt: '2026-07-18T09:30:00Z',
    })

    recordCheck(
      errors,
      existingPrepared.candidate.id === john.id &&
        existingPrepared.application.candidateId === john.id,
      'Existing candidate email did not reuse the stable candidate ID',
    )
  }

  const sourceAfter = JSON.stringify({
    applicationForms: initialDemoState.applicationForms,
    candidates: initialDemoState.candidates,
    applications: initialDemoState.applications,
  })
  recordCheck(
    errors,
    sourceAfter === sourceBefore,
    'Application form domain validation mutated source state arrays',
  )

  return {
    valid: errors.length === 0,
    errors,
  }
}
