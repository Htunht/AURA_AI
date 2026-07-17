import { aggregateCompetencyScores } from '../services/competencyScoreAggregation'
import { calculateFinalEvidenceScore } from '../services/finalEvidenceScore'
import { deriveSystemRecommendation } from '../services/finalEvaluationRecommendation'
import { generateFinalEvaluation } from '../services/finalEvaluationGeneration'
import { scoreInterviewQuestions } from '../services/interviewQuestionScoring'
import type { FinalEvaluationGenerationInput } from '../types/finalEvaluationGeneration'
import type { InterviewQuestionAssessment } from '../types/interviewQuestionAssessment'
import { createCompetencyAssessmentId, createQuestionAssessmentId } from './finalEvaluationIds'
import { createFinalEvaluationValidationFixture } from './finalEvaluationValidationFixture'

export type InterviewScoringValidationResult = { valid: boolean; errors: string[] }
export function validateInterviewScoringDomain(): InterviewScoringValidationResult {
  const errors: string[] = []; const fixture = createFinalEvaluationValidationFixture(); const { evaluation, rubric, set, transcript, analysis, session, application, job, interview, evidence, stamp } = fixture
  const input: FinalEvaluationGenerationInput = { finalEvaluationId: evaluation.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, rubric, questions: set.questions, answerSegments: transcript.segments.map((item) => ({ id: item.id, questionId: item.questionId, text: item.text })), approvedEvidence: evidence, interviewAnalysis: analysis, sessionQuestionProgress: session.questionProgress }
  const snapshot = JSON.stringify(input); const first = scoreInterviewQuestions(input); const second = scoreInterviewQuestions(input)
  if (JSON.stringify(first) !== JSON.stringify(second) || JSON.stringify(input) !== snapshot) errors.push('Question scoring is not deterministic or mutated input.')
  if (first.assessments.map((item) => item.systemRating).join(',') !== '1,2,3,4,5') errors.push(`Behavioral rating anchors did not produce ratings 1–5: ${first.assessments.map((item) => item.systemRating).join(',')}`)
  if (first.assessments.some((item) => item.id !== createQuestionAssessmentId(interview.id, item.questionId))) errors.push('Question assessment IDs are not deterministic.')
  if (first.assessments.some((item) => item.systemRating !== undefined && (!item.matchedAnchorLabel || !item.transcriptSegmentIds.length || !item.confidence))) errors.push('A rating lacks an anchor, evidence reference, or confidence.')
  const skippedInput = { ...input, sessionQuestionProgress: input.sessionQuestionProgress.map((item, index) => index === 0 ? { ...item, status: 'SKIPPED' as const } : index === 1 ? { ...item, status: 'NOT_REACHED' as const } : item), answerSegments: input.answerSegments.filter((_, index) => index !== 2) }; const skipped = scoreInterviewQuestions(skippedInput).assessments
  if (skipped.slice(0, 3).some((item) => item.assessmentState !== 'NOT_ASSESSED' || item.systemRating !== undefined)) errors.push('Skipped, not-reached, or unmapped questions received a numeric rating.')
  const longInput = { ...input, answerSegments: input.answerSegments.map((item, index) => index === 0 ? { ...item, text: 'words '.repeat(500) } : item) }; if (scoreInterviewQuestions(longInput).assessments[0].systemRating !== 1) errors.push('Answer length alone increased a question rating.')
  if (!first.assessments.some((item) => item.confidence === 'LOW' && item.requiresHumanReview)) errors.push('Low-confidence evidence did not require review.')
  const generationSnapshot = JSON.stringify({ rubric, questions: set.questions, evidence, analysis }); const generatedAgain = generateFinalEvaluation({ candidateId: fixture.candidate.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, analysisId: analysis.id, rubric, questions: set.questions, answerSegments: input.answerSegments, evidence, analysis, sessionProgress: session.questionProgress, existingEvaluations: [], generatedAt: stamp }).finalEvaluation
  if (JSON.stringify(evaluation) !== JSON.stringify(generatedAgain) || JSON.stringify({ rubric, questions: set.questions, evidence, analysis }) !== generationSnapshot) errors.push('Final evaluation generation is not deterministic or mutated inputs.')
  if (evaluation.competencyAssessments.some((item) => item.id !== createCompetencyAssessmentId(interview.id, item.competencyKey))) errors.push('Competency assessment IDs are not deterministic.')
  const base = first.assessments[0]; const paired: InterviewQuestionAssessment[] = [{ ...base, id: 'core', questionId: 'core', competencyKeys: ['weighted'], systemRating: 2, assessmentState: 'PARTIALLY_DEMONSTRATED' }, { ...base, id: 'optional', questionId: 'optional', competencyKeys: ['weighted'], systemRating: 5, assessmentState: 'DEMONSTRATED' }]; const weightedRubric = { ...rubric, competencies: [{ ...rubric.competencies[0], competencyKey: 'weighted', questionIds: ['core', 'optional'], weight: 100 }] }; const aggregate = aggregateCompetencyScores({ finalEvaluationId: evaluation.id, interviewId: interview.id, rubric: weightedRubric, questionAssessments: paired, evidence: [], createdAt: stamp, questionPriorities: { core: 'CORE', optional: 'OPTIONAL' } }).competencyAssessments[0]
  if (aggregate.systemRating !== 3) errors.push('Optional questions did not receive lower aggregation contribution.')
  const score = calculateFinalEvidenceScore(evaluation.competencyAssessments); if (score.assessedWeightPercent !== evaluation.assessedWeightPercent || score.weightedEvidenceScore !== evaluation.weightedEvidenceScore) errors.push('Weighted score or assessed coverage is incorrect.')
  const lowCoverage = calculateFinalEvidenceScore(evaluation.competencyAssessments.map((item, index) => index === 0 ? item : { ...item, assessmentState: 'NOT_ASSESSED' as const, systemRating: undefined, normalizedScore: undefined })); if (lowCoverage.assessedWeightPercent >= 70 || lowCoverage.weightedEvidenceScore !== undefined) errors.push('Low assessed coverage displayed a numeric score.')
  if (deriveSystemRecommendation({ score: 80, assessedWeightPercent: 100, mustHaveGaps: [], unresolvedMustHaves: [], dataQualityIssues: [], overallConfidence: 'HIGH' }).recommendation !== 'ADVANCE') errors.push('ADVANCE recommendation rules failed.')
  if (deriveSystemRecommendation({ score: 80, assessedWeightPercent: 100, mustHaveGaps: ['Failed gate'], unresolvedMustHaves: [], dataQualityIssues: [], overallConfidence: 'HIGH' }).recommendation !== 'DO_NOT_ADVANCE') errors.push('DO_NOT_ADVANCE gate rules failed.')
  if (deriveSystemRecommendation({ score: 80, assessedWeightPercent: 100, mustHaveGaps: [], unresolvedMustHaves: ['Not assessed'], dataQualityIssues: [], overallConfidence: 'MEDIUM' }).recommendation !== 'HOLD_FOR_REVIEW') errors.push('HOLD_FOR_REVIEW uncertainty rules failed.')
  if (deriveSystemRecommendation({ assessedWeightPercent: 50, mustHaveGaps: [], unresolvedMustHaves: [], dataQualityIssues: [], overallConfidence: 'LOW' }).recommendation !== 'INSUFFICIENT_EVIDENCE') errors.push('INSUFFICIENT_EVIDENCE coverage rules failed.')
  if (!evaluation.systemScoreLocked || !evaluation.systemRecommendationLocked) errors.push('System score or recommendation is not locked.')
  const serializedInput = JSON.stringify(input); if (/fullName|email|photo|gender|race|ethnicity|religion|accent|voiceTone|facial|eyeContact|humanDecision/i.test(serializedInput)) errors.push('Scoring input contains identity, protected, appearance, voice, or outcome fields.')
  if (JSON.stringify(fixture.initial) !== JSON.stringify(createFinalEvaluationValidationFixture().initial)) errors.push('Initial state changed.')
  try { JSON.stringify(evaluation) } catch { errors.push('Evaluation state is not JSON serializable.') }
  return { valid: errors.length === 0, errors }
}
