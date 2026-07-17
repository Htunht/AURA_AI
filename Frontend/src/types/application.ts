export type ApplicationStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEWING'
  | 'SELECTED'
  | 'REJECTED'
  | 'ON_HOLD'

export type BroadApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'FINAL_REVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'HOLD'

export type LegacyApplicationStage =
  | 'APPLICATION'
  | 'AI_SCREENING'
  | 'SHORTLIST_REVIEW'
  | 'DECISION'
  | 'COMMUNICATION'

export type ApplicationStage = BroadApplicationStage | LegacyApplicationStage

export type ApplicationAnswer = {
  id: string
  fieldKey: string
  label: string
  value: string | number | boolean | string[]
}

export type CandidateDocument = {
  id: string
  documentType: 'CV' | 'RESUME' | 'PORTFOLIO' | 'OTHER'
  fileName: string
  filePath: string
}

export type Application = {
  id: string
  jobId: string
  candidateId: string
  status: ApplicationStatus
  currentStage: ApplicationStage
  answers: ApplicationAnswer[]
  documents: CandidateDocument[]
  submittedAt: string
}

export type ApplicationSubmissionValue =
  | string
  | number
  | boolean
  | string[]

export type ApplicationSubmissionAnswer = {
  fieldId: string
  fieldKey: string
  fieldType: ApplicationFormFieldType
  value: ApplicationSubmissionValue
}

export type CandidateSubmission = {
  formId: string
  jobId: string
  answers: ApplicationSubmissionAnswer[]
}
import type { ApplicationFormFieldType } from './applicationForm'
