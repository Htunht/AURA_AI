import type { Interview } from '../types/interview'
import type { InterviewQuestion, InterviewQuestionCategory } from '../types/interviewQuestion'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'

function legacyCategory(type: string): InterviewQuestionCategory {
  if (type === 'TECHNICAL') return 'TECHNICAL'
  if (type === 'BEHAVIORAL') return 'BEHAVIORAL'
  if (type === 'FOLLOW_UP' || type === 'VERIFICATION') return 'SCREENING_FOLLOW_UP'
  return 'ROLE_REQUIREMENT'
}

export function migrateLegacyInterviewQuestions(interviews: Interview[], questionSets: InterviewQuestionSet[]): InterviewQuestionSet[] {
  const result = questionSets.map((set) => ({ ...set, questions: set.questions.map((question) => cloneQuestion(question)) }))
  interviews.forEach((interview) => {
    if (!interview.questions.length || result.some((set) => set.interviewId === interview.id)) return
    const createdAt = interview.createdAt ?? interview.scheduledStart
    result.push({
      id: `question-set-${interview.id}-v001`, interviewId: interview.id, version: 1, status: 'DRAFT', generatedAt: createdAt, createdAt, updatedAt: createdAt,
      generationSummary: 'Legacy interview questions were preserved as a reviewable version-1 plan.',
      questions: interview.questions.map((question, index) => ({
        id: question.id, interviewId: interview.id, text: question.question, category: legacyCategory(question.type), source: 'SYSTEM_GENERATED', priority: question.type === 'FOLLOW_UP' ? 'FOLLOW_UP' : 'CORE', status: 'DRAFT', estimatedMinutes: 4, order: index + 1,
        requirementIds: [], criterionKeys: [], evidenceReferences: question.sourceContext ? [question.sourceContext] : [], generationReason: question.reason, createdAt, updatedAt: createdAt,
      })),
    })
  })
  return result
}

export function cloneQuestion(question: InterviewQuestion): InterviewQuestion {
  return { ...question, requirementIds: [...question.requirementIds], criterionKeys: [...question.criterionKeys], evidenceReferences: [...question.evidenceReferences] }
}
