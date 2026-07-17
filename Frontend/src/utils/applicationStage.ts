import type { ApplicationStage, BroadApplicationStage } from '../types/application'
import type { DemoState } from '../store/demoStateTypes'

const stageAliases: Record<ApplicationStage, BroadApplicationStage> = {
  APPLICATION: 'APPLIED',
  APPLIED: 'APPLIED',
  AI_SCREENING: 'SCREENING',
  SCREENING: 'SCREENING',
  SHORTLIST_REVIEW: 'SHORTLISTED',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW: 'INTERVIEW',
  FINAL_REVIEW: 'FINAL_REVIEW',
  DECISION: 'FINAL_REVIEW',
  COMMUNICATION: 'FINAL_REVIEW',
  SELECTED: 'SELECTED',
  REJECTED: 'REJECTED',
  HOLD: 'HOLD',
}

const stagePrecedence: Record<BroadApplicationStage, number> = {
  APPLIED: 0,
  SCREENING: 1,
  SHORTLISTED: 2,
  INTERVIEW: 3,
  FINAL_REVIEW: 4,
  SELECTED: 5,
  REJECTED: 5,
  HOLD: 5,
}

export function normalizeApplicationStage(stage: ApplicationStage): BroadApplicationStage {
  return stageAliases[stage]
}

export function isTerminalApplicationStage(stage: ApplicationStage) {
  const normalized = normalizeApplicationStage(stage)
  return normalized === 'SELECTED' || normalized === 'REJECTED' || normalized === 'HOLD'
}

export function advanceApplicationStage(current: ApplicationStage, requested: BroadApplicationStage): BroadApplicationStage {
  const normalized = normalizeApplicationStage(current)
  if (isTerminalApplicationStage(normalized)) return normalized
  return stagePrecedence[requested] >= stagePrecedence[normalized] ? requested : normalized
}

export function synchronizeApplicationStages(state: DemoState): DemoState {
  const applications = state.applications.map((application) => {
    let stage = normalizeApplicationStage(application.currentStage)
    const finalDecision = state.finalEvaluations
      .filter((item) => item.applicationId === application.id && item.status === 'DECIDED' && item.humanDecision)
      .sort((left, right) => (right.decidedAt ?? right.updatedAt).localeCompare(left.decidedAt ?? left.updatedAt))[0]
    if (finalDecision?.humanDecision) {
      const terminalStage: BroadApplicationStage = finalDecision.humanDecision === 'SELECTED' ? 'SELECTED' : finalDecision.humanDecision === 'REJECTED' ? 'REJECTED' : 'HOLD'
      return { ...application, currentStage: terminalStage }
    }
    if (isTerminalApplicationStage(stage)) return stage === application.currentStage ? application : { ...application, currentStage: stage }

    const interviews = state.interviews.filter((item) => item.applicationId === application.id && item.status !== 'CANCELLED')
    const interviewIds = new Set(interviews.map((item) => item.id))
    const completed = interviews.some((item) => item.status === 'COMPLETED') || state.interviewSessions.some((item) => interviewIds.has(item.interviewId) && item.status === 'COMPLETED')
    const finalReviewActive = completed || state.interviewTranscripts.some((item) => interviewIds.has(item.interviewId)) || state.interviewAnalyses.some((item) => interviewIds.has(item.interviewId)) || state.finalEvaluations.some((item) => item.applicationId === application.id)
    const schedulingActive = interviews.length > 0 || state.interviewSchedulingInvitations.some((item) => item.applicationId === application.id && (item.status === 'PENDING' || item.status === 'SCHEDULED'))
    if (finalReviewActive) stage = advanceApplicationStage(stage, 'FINAL_REVIEW')
    else if (schedulingActive) stage = advanceApplicationStage(stage, 'INTERVIEW')
    return stage === application.currentStage ? application : { ...application, currentStage: stage }
  })
  return applications.every((item, index) => item === state.applications[index]) ? state : { ...state, applications }
}
