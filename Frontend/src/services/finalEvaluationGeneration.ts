import type { FinalEvaluation } from '../types/finalEvaluation'
import type { DeidentifiedAnswerSegment } from '../types/finalEvaluationGeneration'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewEvidence } from '../types/interviewEvidence'
import type { InterviewQuestion } from '../types/interviewQuestion'
import type { PublishedInterviewScoringRubric } from '../types/interviewScoringRubric'
import type { InterviewSessionQuestionProgress } from '../types/interviewSession'
import { createFinalEvaluationId } from '../utils/finalEvaluationIds'
import { interviewScoringRubricIsValid } from '../utils/interviewScoringRubric'
import { aggregateCompetencyScores } from './competencyScoreAggregation'
import { calculateFinalEvidenceScore } from './finalEvidenceScore'
import { deriveSystemRecommendation } from './finalEvaluationRecommendation'
import { scoreInterviewQuestions } from './interviewQuestionScoring'

export type FinalEvaluationGenerationResult = { finalEvaluation: FinalEvaluation; warnings: string[] }
export function generateFinalEvaluation(input: { candidateId: string; applicationId: string; jobId: string; interviewId: string; analysisId: string; rubric: PublishedInterviewScoringRubric; questions: InterviewQuestion[]; answerSegments: DeidentifiedAnswerSegment[]; evidence: InterviewEvidence[]; analysis: InterviewAnalysis; sessionProgress: InterviewSessionQuestionProgress[]; existingEvaluations: FinalEvaluation[]; generatedAt: string }): FinalEvaluationGenerationResult {
  if (input.analysis.status !== 'APPROVED' || !interviewScoringRubricIsValid(input.rubric)) throw new Error('Approved analysis and a valid published rubric are required.')
  const version = Math.max(0, ...input.existingEvaluations.filter((item) => item.applicationId === input.applicationId).map((item) => item.version)) + 1
  const id = createFinalEvaluationId(input.candidateId, input.jobId, version)
  const scoringInput = { finalEvaluationId: id, applicationId: input.applicationId, jobId: input.jobId, interviewId: input.interviewId, rubric: input.rubric, questions: input.questions.map((item) => ({ ...item, requirementIds: [...item.requirementIds], criterionKeys: [...item.criterionKeys], evidenceReferences: [...item.evidenceReferences] })), answerSegments: input.answerSegments.map((item) => ({ ...item })), approvedEvidence: input.evidence.map((item) => ({ ...item, transcriptSegmentIds: [...item.transcriptSegmentIds], questionIds: [...item.questionIds], requirementIds: [...item.requirementIds], criterionKeys: [...item.criterionKeys] })), interviewAnalysis: { ...input.analysis, evidence: input.analysis.evidence.map((item) => ({ ...item })), strengths: [...input.analysis.strengths], concerns: [...input.analysis.concerns], missingEvidence: [...input.analysis.missingEvidence] }, sessionQuestionProgress: input.sessionProgress.map((item) => ({ ...item, followUpNotes: [...item.followUpNotes] })) }
  const questionResult = scoreInterviewQuestions(scoringInput)
  const competencyResult = aggregateCompetencyScores({ finalEvaluationId: id, interviewId: input.interviewId, rubric: input.rubric, questionAssessments: questionResult.assessments, evidence: input.evidence, createdAt: input.generatedAt, questionPriorities: Object.fromEntries(input.questions.map((item) => [item.id, item.priority])) })
  const score = calculateFinalEvidenceScore(competencyResult.competencyAssessments)
  const recommendation = deriveSystemRecommendation({ score: score.weightedEvidenceScore, assessedWeightPercent: score.assessedWeightPercent, mustHaveGaps: score.mustHaveGaps, unresolvedMustHaves: score.unresolvedMustHaves, dataQualityIssues: score.dataQualityIssues, overallConfidence: score.overallConfidence })
  return { finalEvaluation: { id, version, candidateId: input.candidateId, applicationId: input.applicationId, jobId: input.jobId, interviewId: input.interviewId, interviewAnalysisId: input.analysisId, rubricId: input.rubric.id, rubricVersion: input.rubric.version, status: recommendation.recommendation === 'INSUFFICIENT_EVIDENCE' || score.dataQualityIssues.length ? 'DRAFT' : 'READY_FOR_DECISION', questionAssessments: questionResult.assessments, competencyAssessments: competencyResult.competencyAssessments, weightedEvidenceScore: score.weightedEvidenceScore, assessedWeightPercent: score.assessedWeightPercent, mustHavePassed: score.mustHavePassed, mustHaveTotal: score.mustHaveTotal, mustHaveGaps: score.mustHaveGaps, unresolvedEvidence: score.unresolvedEvidence, dataQualityIssues: score.dataQualityIssues, overallConfidence: score.overallConfidence, systemRecommendation: recommendation.recommendation, systemRecommendationRationale: recommendation.rationale, systemScoreLocked: true, systemRecommendationLocked: true, generatedAt: input.generatedAt, createdAt: input.generatedAt, updatedAt: input.generatedAt }, warnings: [...questionResult.warnings, ...competencyResult.warnings] }
}
