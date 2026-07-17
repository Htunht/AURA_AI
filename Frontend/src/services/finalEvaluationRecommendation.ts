import type { AssessmentConfidence } from '../types/interviewQuestionAssessment'
import type { SystemRecommendation } from '../types/finalEvaluation'

export function deriveSystemRecommendation(input: { score?: number; assessedWeightPercent: number; mustHaveGaps: string[]; unresolvedMustHaves: string[]; dataQualityIssues: string[]; overallConfidence: AssessmentConfidence; advanceThreshold?: number; reviewThreshold?: number }): { recommendation: SystemRecommendation; rationale: string } {
  const advance = input.advanceThreshold ?? 70
  const review = input.reviewThreshold ?? 60
  if (input.score === undefined || input.assessedWeightPercent < 70) return { recommendation: 'INSUFFICIENT_EVIDENCE', rationale: `Only ${input.assessedWeightPercent}% of weighted competencies were assessed, below the 70% minimum coverage.` }
  if (input.unresolvedMustHaves.length || input.overallConfidence === 'LOW' || input.dataQualityIssues.length) return { recommendation: 'HOLD_FOR_REVIEW', rationale: input.unresolvedMustHaves[0] ?? input.dataQualityIssues[0] ?? 'Critical evidence confidence is low.' }
  if (input.mustHaveGaps.length) return { recommendation: 'DO_NOT_ADVANCE', rationale: input.mustHaveGaps[0] }
  if (input.score >= advance) return { recommendation: 'ADVANCE', rationale: `The ${input.score}/100 evidence score meets the published ${advance}-point threshold and all assessed must-have gates passed.` }
  if (input.score >= review) return { recommendation: 'HOLD_FOR_REVIEW', rationale: `The ${input.score}/100 evidence score is within the ${review}–${advance - 1} review band.` }
  return { recommendation: 'DO_NOT_ADVANCE', rationale: `The ${input.score}/100 evidence score is below the published ${review}-point minimum.` }
}
