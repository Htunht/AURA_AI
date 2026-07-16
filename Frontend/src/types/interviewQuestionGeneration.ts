import type { Application } from './application'
import type { ApplicationForm } from './applicationForm'
import type { Candidate } from './candidate'
import type { Evaluation } from './evaluation'
import type { Interview } from './interview'
import type { InterviewQuestion } from './interviewQuestion'
import type { Job } from './job'
import type { JobRequirement } from './jobRequirement'

export type InterviewQuestionGenerationInput = {
  interview: Interview
  candidate: Candidate
  application: Application
  job: Job
  form?: ApplicationForm
  screeningEvaluation?: Evaluation
  requirements: JobRequirement[]
  durationMinutes: number
}

export type InterviewQuestionGenerationResult = {
  questions: InterviewQuestion[]
  summary: string
  warnings: string[]
}
