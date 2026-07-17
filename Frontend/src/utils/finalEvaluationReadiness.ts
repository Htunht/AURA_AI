import type { EvaluationChallenge } from '../types/evaluationChallenge'
import type { FinalEvaluation } from '../types/finalEvaluation'

export type FinalEvaluationReadiness = { readyForDecision: boolean; assessedWeightPercent: number; questionCount: number; assessedQuestionCount: number; competencyCount: number; assessedCompetencyCount: number; mustHavePassed: number; mustHaveTotal: number; blockingIssues: string[]; warnings: string[] }
export function evaluateFinalEvaluationReadiness(evaluation: FinalEvaluation, challenges: EvaluationChallenge[]): FinalEvaluationReadiness {
  const blockingIssues: string[] = []
  const warnings: string[] = []
  if (evaluation.status === 'GENERATION_FAILED') blockingIssues.push('Evaluation generation failed.')
  if (!evaluation.systemScoreLocked || !evaluation.systemRecommendationLocked) blockingIssues.push('System score provenance is invalid.')
  if (evaluation.assessedWeightPercent < 70) blockingIssues.push('Less than 70% of weighted competencies were assessed.')
  if (challenges.some((item) => item.status === 'OPEN')) blockingIssues.push('Resolve open evidence challenges before recording a decision.')
  if (evaluation.dataQualityIssues.length && evaluation.systemRecommendation === 'INSUFFICIENT_EVIDENCE') blockingIssues.push('Critical evaluation data remains unresolved.')
  if (evaluation.status === 'DECIDED') blockingIssues.push('The final decision has already been recorded.')
  if (evaluation.overallConfidence === 'LOW') warnings.push('Overall evidence confidence is low.')
  if (evaluation.competencyAssessments.some((item) => item.importance === 'PREFERRED' && item.assessmentState === 'NOT_ASSESSED')) warnings.push('Some preferred competencies were not assessed.')
  return { readyForDecision: evaluation.status === 'READY_FOR_DECISION' && blockingIssues.length === 0, assessedWeightPercent: evaluation.assessedWeightPercent, questionCount: evaluation.questionAssessments.length, assessedQuestionCount: evaluation.questionAssessments.filter((item) => item.assessmentState !== 'NOT_ASSESSED').length, competencyCount: evaluation.competencyAssessments.length, assessedCompetencyCount: evaluation.competencyAssessments.filter((item) => item.assessmentState !== 'NOT_ASSESSED').length, mustHavePassed: evaluation.mustHavePassed, mustHaveTotal: evaluation.mustHaveTotal, blockingIssues, warnings }
}
