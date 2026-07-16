export type InterviewSessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'
export type InterviewQuestionProgressStatus = 'NOT_ASKED' | 'CURRENT' | 'ASKED' | 'SKIPPED' | 'NOT_REACHED'

export type InterviewSessionQuestionProgress = {
  questionId: string
  status: InterviewQuestionProgressStatus
  interviewerNotes: string
  followUpNotes: string[]
  startedAt?: string
  completedAt?: string
  skippedAt?: string
}

export type InterviewSession = {
  id: string
  interviewId: string
  questionSetId: string
  status: InterviewSessionStatus
  questionProgress: InterviewSessionQuestionProgress[]
  currentQuestionId?: string
  startedAt?: string
  pausedAt?: string
  resumedAt?: string
  completedAt?: string
  accumulatedActiveSeconds: number
  generalNotes: string
  completionSummary?: string
  createdAt: string
  updatedAt: string
}
