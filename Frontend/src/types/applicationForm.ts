export type ApplicationFormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ApplicationFormFieldType =
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'TEXTAREA'
  | 'MULTI_SELECT'
  | 'FILE'

export type ApplicationFormFieldOption = {
  id: string
  label: string
  value: string
}

export type ApplicationFormField = {
  id: string
  key: string
  label: string
  type: ApplicationFormFieldType
  required: boolean
  placeholder?: string
  helpText?: string
  options?: ApplicationFormFieldOption[]
  screeningMapping?: {
    requirementIds: string[]
    criterionKeys: string[]
    evidenceImportance: 'REQUIRED' | 'PREFERRED' | 'SUPPORTING'
  }
}

export type ApplicationForm = {
  id: string
  jobId: string
  name: string
  description?: string
  status: ApplicationFormStatus
  version: number
  fields: ApplicationFormField[]
  createdAt: string
  updatedAt: string
  requirementFingerprint?: string
}
