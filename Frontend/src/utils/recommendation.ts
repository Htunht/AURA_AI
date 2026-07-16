import type { Recommendation } from '../types/evaluation'

const screeningLabels: Record<Recommendation, string> = {
  STRONG_YES: 'Strong Shortlist',
  YES: 'Shortlist',
  REVIEW: 'Needs Review',
  NO: 'Not Recommended',
  STRONG_NO: 'Strong Not Recommended',
}

const finalLabels: Record<Recommendation, string> = {
  STRONG_YES: 'Strong Proceed',
  YES: 'Proceed',
  REVIEW: 'Review',
  NO: 'Not Recommended',
  STRONG_NO: 'Strong Not Recommended',
}

export function getScreeningRecommendationLabel(
  recommendation: Recommendation,
): string {
  return screeningLabels[recommendation]
}

export function getFinalRecommendationLabel(
  recommendation: Recommendation,
): string {
  return finalLabels[recommendation]
}
