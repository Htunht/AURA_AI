import type {
  CandidateSubmission,
  ApplicationSubmissionAnswer,
} from '../types/application'
import type {
  ApplicationForm,
  ApplicationFormField,
} from '../types/applicationForm'
import { normalizeUrlFieldValue } from './urlFieldValidation'

export type ApplicationSubmissionValidationResult = {
  valid: boolean
  errors: string[]
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateAnswerValue(
  field: ApplicationFormField,
  answer: ApplicationSubmissionAnswer,
  errors: string[],
) {
  const { value } = answer

  if (field.key === 'github_repository_url' && field.type !== 'URL') {
    errors.push('GitHub Repository URL must use a URL field, not a file upload.')
    return
  }

  if (
    field.type === 'TEXT' ||
    field.type === 'EMAIL' ||
    field.type === 'PHONE' ||
    field.type === 'URL' ||
    field.type === 'TEXTAREA' ||
    field.type === 'FILE'
  ) {
    if (typeof value !== 'string') {
      errors.push(`Field ${field.key} requires a string value.`)
      return
    }

    if (field.required && !value.trim()) {
      errors.push(`Required field ${field.key} must not be blank.`)
    }

    if (field.type === 'EMAIL' && value.trim() && !emailPattern.test(value)) {
      errors.push(`Field ${field.key} must contain a valid email address.`)
    }

    if (field.type === 'URL') {
      const normalized = normalizeUrlFieldValue(field, value)
      if (!normalized.valid) {
        errors.push(`Field ${field.key}: ${normalized.error}`)
      }
    }

    return
  }

  if (field.type === 'NUMBER') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`Field ${field.key} requires a finite number.`)
    }
    return
  }

  if (!Array.isArray(value)) {
    errors.push(`Field ${field.key} requires a string array.`)
    return
  }

  if (field.required && value.length === 0) {
    errors.push(`Required field ${field.key} must contain a value.`)
  }

  const allowedValues = new Set(
    (field.options ?? []).map((option) => option.value),
  )
  const invalidValues = value.filter((item) => !allowedValues.has(item))

  if (invalidValues.length > 0) {
    errors.push(
      `Field ${field.key} contains unsupported option values: ${invalidValues.join(', ')}.`,
    )
  }
}

export function validateApplicationSubmission(
  form: ApplicationForm,
  submission: CandidateSubmission,
): ApplicationSubmissionValidationResult {
  const errors: string[] = []
  const fieldsById = new Map(form.fields.map((field) => [field.id, field]))
  const answersByFieldId = new Map(
    submission.answers.map((answer) => [answer.fieldId, answer]),
  )

  if (submission.formId !== form.id) {
    errors.push('Submission formId does not match the application form.')
  }

  if (submission.jobId !== form.jobId) {
    errors.push('Submission jobId does not match the application form job.')
  }

  for (const field of form.fields) {
    if (field.required && !answersByFieldId.has(field.id)) {
      errors.push(`Required field ${field.key} is missing.`)
    }
  }

  for (const answer of submission.answers) {
    const field = fieldsById.get(answer.fieldId)

    if (!field) {
      errors.push(`Submission contains unknown field ID ${answer.fieldId}.`)
      continue
    }

    if (answer.fieldKey !== field.key) {
      errors.push(`Field key for ${answer.fieldId} does not match the form.`)
    }

    if (answer.fieldType !== field.type) {
      errors.push(`Field type for ${answer.fieldId} does not match the form.`)
      continue
    }

    validateAnswerValue(field, answer, errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
