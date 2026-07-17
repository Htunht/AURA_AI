import type { ApplicationStage } from '../types/application'
import type { Recommendation } from '../types/evaluation'

export function getPostScreeningStage(
  recommendation: Recommendation,
): ApplicationStage {
  return recommendation === 'NO' || recommendation === 'STRONG_NO'
    ? 'FINAL_REVIEW'
    : 'SHORTLISTED'
}

export function canApplyScreeningTransition(stage: ApplicationStage): boolean {
  return (
    stage === 'APPLICATION' || stage === 'APPLIED' ||
    stage === 'AI_SCREENING' || stage === 'SCREENING' ||
    stage === 'SHORTLIST_REVIEW' || stage === 'SHORTLISTED'
  )
}
