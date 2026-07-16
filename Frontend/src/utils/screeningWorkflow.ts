import type { ApplicationStage } from '../types/application'
import type { Recommendation } from '../types/evaluation'

export function getPostScreeningStage(
  recommendation: Recommendation,
): ApplicationStage {
  return recommendation === 'NO' || recommendation === 'STRONG_NO'
    ? 'DECISION'
    : 'SHORTLIST_REVIEW'
}

export function canApplyScreeningTransition(stage: ApplicationStage): boolean {
  return (
    stage === 'APPLICATION' ||
    stage === 'AI_SCREENING' ||
    stage === 'SHORTLIST_REVIEW'
  )
}
