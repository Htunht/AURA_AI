import type { ApplicationFormField } from '../types/applicationForm'

export function getApplicationFormInputType(field: Pick<ApplicationFormField, 'type'>): string {
  if (field.type === 'EMAIL') return 'email'
  if (field.type === 'PHONE') return 'tel'
  if (field.type === 'URL') return 'url'
  if (field.type === 'NUMBER') return 'number'
  if (field.type === 'FILE') return 'file'
  return 'text'
}

