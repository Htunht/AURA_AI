import type { ApplicationStage, BroadApplicationStage } from '../types/application'
import type { InterviewStatus } from '../types/interview'
import { normalizeApplicationStage } from './applicationStage'

export type RecruitmentProgressState = 'COMPLETED' | 'CURRENT' | 'UPCOMING'

export type RecruitmentProgressStep = {
  id: 'application' | 'screening' | 'interview' | 'final-review' | 'decision'
  label: string
  state: RecruitmentProgressState
}

const progressSteps = [
  { id: 'application', label: 'Application' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'final-review', label: 'Final review' },
  { id: 'decision', label: 'Decision' },
] as const

const currentProgressIndex: Record<BroadApplicationStage, number> = {
  APPLIED: 0,
  SCREENING: 1,
  SHORTLISTED: 2,
  INTERVIEW: 2,
  FINAL_REVIEW: 3,
  SELECTED: 4,
  REJECTED: 4,
  HOLD: 4,
}

export function getRecruitmentProgress(
  stage: ApplicationStage,
): RecruitmentProgressStep[] {
  const broadStage = normalizeApplicationStage(stage)
  const currentIndex = currentProgressIndex[broadStage]
  const decisionRecorded = broadStage === 'SELECTED' || broadStage === 'REJECTED' || broadStage === 'HOLD'

  return progressSteps.map((step, index) => ({
    ...step,
    state: decisionRecorded || index < currentIndex
      ? 'COMPLETED'
      : index === currentIndex
        ? 'CURRENT'
        : 'UPCOMING',
  }))
}

export function candidateTabAvailability(input: {
  stage: ApplicationStage
  hasInterview: boolean
  hasFinalEvaluation: boolean
}) {
  const stage = normalizeApplicationStage(input.stage)
  const interviewAvailable = input.hasInterview || [
    'SHORTLISTED',
    'INTERVIEW',
    'FINAL_REVIEW',
    'SELECTED',
    'REJECTED',
    'HOLD',
  ].includes(stage)
  const finalEvaluationAvailable = input.hasFinalEvaluation

  return { interviewAvailable, finalEvaluationAvailable }
}

export type CandidateNextActionKind =
  | 'APPLICATION_REVIEW'
  | 'SCREENING_REVIEW'
  | 'SCHEDULE_INTERVIEW'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_LIVE'
  | 'INTERVIEW_CANCELLED'
  | 'FINAL_REVIEW'
  | 'HOLD_FOLLOW_UP'
  | 'OUTCOME_RECORDED'

export function getCandidateNextActionKind(input: {
  stage: ApplicationStage
  interviewStatus?: InterviewStatus
}): CandidateNextActionKind {
  if (input.interviewStatus === 'CANCELLED') return 'INTERVIEW_CANCELLED'
  if (input.interviewStatus === 'IN_PROGRESS' || input.interviewStatus === 'PAUSED') return 'INTERVIEW_LIVE'
  if (input.interviewStatus === 'SCHEDULED') return 'INTERVIEW_SCHEDULED'

  const stage = normalizeApplicationStage(input.stage)
  if (stage === 'APPLIED') return 'APPLICATION_REVIEW'
  if (stage === 'SCREENING') return 'SCREENING_REVIEW'
  if (stage === 'SHORTLISTED') return 'SCHEDULE_INTERVIEW'
  if (stage === 'FINAL_REVIEW' || input.interviewStatus === 'COMPLETED') return 'FINAL_REVIEW'
  if (stage === 'HOLD') return 'HOLD_FOLLOW_UP'
  if (stage === 'SELECTED' || stage === 'REJECTED') return 'OUTCOME_RECORDED'
  return 'SCREENING_REVIEW'
}
