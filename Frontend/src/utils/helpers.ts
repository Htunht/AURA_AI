import type {
  ApplicationStage,
  ApplicationStatus,
} from '../types/application'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

const stageLabels: Record<ApplicationStage, string> = {
  APPLICATION: 'Application',
  AI_SCREENING: 'AI screening',
  SHORTLIST_REVIEW: 'Shortlist review',
  INTERVIEW: 'Interview',
  FINAL_REVIEW: 'Final review',
  DECISION: 'Decision',
  COMMUNICATION: 'Communication',
}

const statusLabels: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  ON_HOLD: 'On hold',
}

export function formatApplicationStage(stage: ApplicationStage): string {
  return stageLabels[stage]
}

export function formatApplicationStatus(status: ApplicationStatus): string {
  return statusLabels[status]
}
