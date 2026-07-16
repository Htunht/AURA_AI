import type { InterviewQuestion } from '../types/interviewQuestion'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'

function nextSequence(ids: string[], prefix: string): number {
  return Math.max(0, ...ids.map((id) => id.startsWith(prefix) ? Number(id.slice(prefix.length)) : 0).filter(Number.isFinite)) + 1
}

export function createNextInterviewQuestionSetId(questionSets: InterviewQuestionSet[], interviewId: string): string {
  const prefix = `question-set-${interviewId}-v`
  return `${prefix}${String(nextSequence(questionSets.map((set) => set.id), prefix)).padStart(3, '0')}`
}

export function createNextInterviewQuestionId(questions: InterviewQuestion[], interviewId: string): string {
  const prefix = `question-${interviewId}-`
  return `${prefix}${String(nextSequence(questions.map((question) => question.id), prefix)).padStart(3, '0')}`
}
