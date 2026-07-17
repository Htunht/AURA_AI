export type InterviewStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'

export type InterviewMode = 'VIDEO' | 'PHONE' | 'ONSITE'

export type InterviewQuestionType =
  | 'CORE'
  | 'TECHNICAL'
  | 'BEHAVIORAL'
  | 'FOLLOW_UP'
  | 'VERIFICATION'

export type InterviewQuestion = {
  id: string
  type: InterviewQuestionType
  question: string
  reason: string
  sourceContext?: string
}

export type Interviewer = {
  id: string
  name: string
  role: string
}

export type Interview = {
  id: string
  applicationId: string
  jobId?: string
  scheduledStart: string
  scheduledEnd: string
  timezone: string
  status: InterviewStatus
  mode?: InterviewMode
  interviewers: Interviewer[]
  location?: string
  meetingLink?: string
  notes?: string
  questions: InterviewQuestion[]
  createdAt?: string
  updatedAt?: string
}
