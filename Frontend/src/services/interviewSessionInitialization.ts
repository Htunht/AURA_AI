import type { Interview } from '../types/interview'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewSession } from '../types/interviewSession'

export function createInterviewSessionId(interviewId: string): string { return `session-${interviewId}` }

export function createInterviewSession({ interview, questionSet, createdAt }: { interview: Interview; questionSet: InterviewQuestionSet; createdAt: string }): InterviewSession {
  if (questionSet.interviewId !== interview.id || questionSet.status !== 'APPROVED') throw new Error('An approved question plan is required to initialize the interview session.')
  return { id: createInterviewSessionId(interview.id), interviewId: interview.id, questionSetId: questionSet.id, status: 'NOT_STARTED', questionProgress: [...questionSet.questions].sort((a, b) => a.order - b.order).map((question) => ({ questionId: question.id, status: 'NOT_ASKED', interviewerNotes: '', followUpNotes: [] })), accumulatedActiveSeconds: 0, generalNotes: '', createdAt, updatedAt: createdAt }
}
