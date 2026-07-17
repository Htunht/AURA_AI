import type { CompetencyAssessment } from '../types/competencyAssessment'
import type { AssessmentConfidence } from '../types/interviewQuestionAssessment'

export type FinalEvidenceScoreResult = { weightedEvidenceScore?: number; assessedWeightPercent: number; mustHavePassed: number; mustHaveTotal: number; mustHaveGaps: string[]; unresolvedMustHaves: string[]; unresolvedEvidence: string[]; dataQualityIssues: string[]; overallConfidence: AssessmentConfidence }

export function calculateFinalEvidenceScore(competencies: CompetencyAssessment[]): FinalEvidenceScoreResult {
  const assessed = competencies.filter((item) => item.normalizedScore !== undefined)
  const assessedWeightPercent = assessed.reduce((sum, item) => sum + item.weight, 0)
  const weightedTotal = assessed.reduce((sum, item) => sum + (item.normalizedScore ?? 0) * item.weight, 0)
  const mustHaves = competencies.filter((item) => item.importance === 'MUST_HAVE')
  const mustHaveGaps = mustHaves.filter((item) => item.gatePassed === false).map((item) => `${item.label} is below the published minimum rating.`)
  const unresolvedMustHaves = mustHaves.filter((item) => item.assessmentState === 'NOT_ASSESSED').map((item) => `${item.label} was not assessed.`)
  const unresolvedEvidence = competencies.filter((item) => item.assessmentState === 'NOT_ASSESSED').map((item) => `${item.label} has no assessable interview evidence.`)
  const dataQualityIssues = competencies.filter((item) => item.requiresHumanReview).map((item) => `${item.label} requires evidence review.`)
  const low = competencies.some((item) => item.importance === 'MUST_HAVE' && item.confidence === 'LOW') || assessedWeightPercent < 70
  const high = assessed.length > 0 && competencies.every((item) => item.assessmentState === 'NOT_ASSESSED' || item.confidence === 'HIGH')
  return { weightedEvidenceScore: assessedWeightPercent >= 70 ? Math.round(weightedTotal / assessedWeightPercent) : undefined, assessedWeightPercent, mustHavePassed: mustHaves.filter((item) => item.gatePassed === true).length, mustHaveTotal: mustHaves.length, mustHaveGaps, unresolvedMustHaves, unresolvedEvidence, dataQualityIssues, overallConfidence: low ? 'LOW' : high ? 'HIGH' : 'MEDIUM' }
}
