import type { ApplicationForm } from '../types/applicationForm'

export type ApplicationFormValidationResult = {
  valid: boolean
  errors: string[]
}

function hasDuplicate(values: string[]): boolean {
  return new Set(values).size !== values.length
}

export function validateApplicationForm(
  form: ApplicationForm,
): ApplicationFormValidationResult {
  const errors: string[] = []

  if (form.fields.length === 0) {
    errors.push('Application form must contain at least one field.')
  }

  if (hasDuplicate(form.fields.map((field) => field.id))) {
    errors.push('Application form field IDs must be unique.')
  }

  if (hasDuplicate(form.fields.map((field) => field.key))) {
    errors.push('Application form field keys must be unique.')
  }

  for (const field of form.fields) {
    if (!field.key.trim()) {
      errors.push(`Field ${field.id} must have a non-empty key.`)
    }

    if (!field.label.trim()) {
      errors.push(`Field ${field.id} must have a non-empty label.`)
    }

    if (field.screeningMapping && (new Set(field.screeningMapping.requirementIds).size !== field.screeningMapping.requirementIds.length || new Set(field.screeningMapping.criterionKeys).size !== field.screeningMapping.criterionKeys.length)) {
      errors.push(`Screening purpose mappings for field ${field.id} must be unique.`)
    }

    if (field.type === 'MULTI_SELECT') {
      const options = field.options ?? []

      if (options.length === 0) {
        errors.push(`MULTI_SELECT field ${field.id} must contain an option.`)
      }

      if (hasDuplicate(options.map((option) => option.id))) {
        errors.push(`Option IDs for field ${field.id} must be unique.`)
      }

      if (hasDuplicate(options.map((option) => option.value))) {
        errors.push(`Option values for field ${field.id} must be unique.`)
      }
    } else if (field.options && field.options.length > 0) {
      errors.push(`Non-MULTI_SELECT field ${field.id} must not define options.`)
    }
  }

  for (const identityKey of ['full_name', 'email']) {
    if (!form.fields.some((field) => field.key === identityKey)) {
      errors.push(`Application form must contain the ${identityKey} field.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateRecruitmentApplicationForm(
  form: ApplicationForm,
): ApplicationFormValidationResult {
  const genericValidation = validateApplicationForm(form)
  const errors = [...genericValidation.errors]

  if (!form.fields.some((field) => field.key === 'cv')) {
    errors.push('Recruitment application form must contain the cv field.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
