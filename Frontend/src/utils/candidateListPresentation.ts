import type { ScreeningQueueSummary } from '../store/demoSelectors'

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const compactDateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const fullDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function formatCandidateSubmittedDate(
  value: string,
  currentYear = new Date().getFullYear(),
): string {
  const date = new Date(value)
  return date.getFullYear() === currentYear
    ? compactDateFormatter.format(date)
    : compactDateWithYearFormatter.format(date)
}

export function formatCandidateSubmittedDateLabel(value: string): string {
  return `Submitted ${fullDateTimeFormatter.format(new Date(value))}`
}

export function formatCandidateResultCount(
  filteredCount: number,
  totalCount: number,
): string {
  const noun = totalCount === 1 ? 'candidate' : 'candidates'
  return filteredCount === totalCount
    ? `${totalCount} ${noun}`
    : `${filteredCount} of ${totalCount} ${noun}`
}

export function formatScreeningAutomationSummary(
  summary: ScreeningQueueSummary,
): string {
  return [
    `${summary.completed} completed`,
    `${summary.processing} processing`,
    ...(summary.queued > 0 ? [`${summary.queued} queued`] : []),
    `${summary.failed} failed`,
  ].join(' · ')
}
