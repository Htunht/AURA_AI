import type { InterviewAnalysis } from './interviewAnalysis'
import type { InterviewEvidence } from './interviewEvidence'
import type { InterviewQuestion } from './interviewQuestion'
import type { PublishedInterviewScoringRubric } from './interviewScoringRubric'
import type { InterviewSessionQuestionProgress } from './interviewSession'

export type DeidentifiedAnswerSegment = { id: string; questionId?: string; text: string }
export type FinalEvaluationGenerationInput = {
  finalEvaluationId: string
  applicationId: string
  jobId: string
  interviewId: string
  rubric: PublishedInterviewScoringRubric
  questions: InterviewQuestion[]
  answerSegments: DeidentifiedAnswerSegment[]
  approvedEvidence: InterviewEvidence[]
  interviewAnalysis: InterviewAnalysis
  sessionQuestionProgress: InterviewSessionQuestionProgress[]
}
