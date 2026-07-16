import type { InterviewQuestion } from './interviewQuestion'

export type InterviewQuestionSetStatus = 'GENERATING' | 'DRAFT' | 'APPROVED' | 'GENERATION_FAILED'

export type InterviewQuestionSet = {
  id: string
  interviewId: string
  version: number
  status: InterviewQuestionSetStatus
  questions: InterviewQuestion[]
  generatedAt?: string
  approvedAt?: string
  approvedBy?: string
  generationSummary?: string
  generationError?: string
  createdAt: string
  updatedAt: string
}
