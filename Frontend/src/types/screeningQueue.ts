export type ScreeningQueueStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export type ScreeningQueueItem = {
  id: string
  applicationId: string
  jobId: string
  status: ScreeningQueueStatus
  queuedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  attemptCount: number
}
