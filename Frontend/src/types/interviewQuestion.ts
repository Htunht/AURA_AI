export type InterviewQuestionCategory =
  | 'INTRODUCTION'
  | 'ROLE_REQUIREMENT'
  | 'TECHNICAL'
  | 'EXPERIENCE'
  | 'BEHAVIORAL'
  | 'PROBLEM_SOLVING'
  | 'SCREENING_FOLLOW_UP'
  | 'MISSING_EVIDENCE'
  | 'CANDIDATE_QUESTION'

export type InterviewQuestionSource = 'SYSTEM_GENERATED' | 'INTERVIEWER_ADDED'
export type InterviewQuestionPriority = 'CORE' | 'FOLLOW_UP' | 'OPTIONAL'
export type InterviewQuestionStatus = 'DRAFT' | 'APPROVED'

export type InterviewQuestion = {
  id: string
  interviewId: string
  text: string
  category: InterviewQuestionCategory
  source: InterviewQuestionSource
  priority: InterviewQuestionPriority
  status: InterviewQuestionStatus
  estimatedMinutes: number
  order: number
  requirementIds: string[]
  criterionKeys: string[]
  evidenceReferences: string[]
  generationReason?: string
  interviewerGuidance?: string
  expectedEvidence?: string
  createdAt: string
  updatedAt: string
}
