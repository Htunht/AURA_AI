import type { EvaluationChallenge } from '../types/evaluationChallenge'
import type { FinalEvaluation } from '../types/finalEvaluation'

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const createFinalEvaluationId = (candidateId: string, jobId: string, version = 1) => `final-evaluation-${candidateId}-${jobId}-v${String(version).padStart(3, '0')}`
export const createQuestionAssessmentId = (interviewId: string, questionId: string) => `question-assessment-${interviewId}-${questionId}`
export const createCompetencyAssessmentId = (interviewId: string, competencyKey: string) => `competency-assessment-${interviewId}-${normalize(competencyKey)}`
export const createEvaluationChallengeId = (items: EvaluationChallenge[], evaluationId: string) => `evaluation-challenge-${evaluationId}-${String(items.filter((item) => item.finalEvaluationId === evaluationId).length + 1).padStart(3, '0')}`
export const nextFinalEvaluationVersion = (items: FinalEvaluation[], applicationId: string) => Math.max(0, ...items.filter((item) => item.applicationId === applicationId).map((item) => item.version)) + 1
