import type { Application } from './application'
import type { Candidate } from './candidate'
import type { Evaluation } from './evaluation'
import type { Job } from './job'
import type { EvaluationRubric } from './rubric'

export type BatchScreeningCandidateInput = {
  application: Application
  candidate: Candidate
  job: Job
  rubric: EvaluationRubric
}

export type BatchScreeningFailure = {
  applicationId: string
  message: string
}

export type BatchScreeningResult = {
  completed: Evaluation[]
  failed: BatchScreeningFailure[]
}

export type BatchScreeningProgressEvent =
  | { type: 'ITEM_STARTED'; applicationId: string }
  | {
      type: 'ITEM_COMPLETED'
      applicationId: string
      evaluation: Evaluation
    }
  | { type: 'ITEM_FAILED'; applicationId: string; message: string }
