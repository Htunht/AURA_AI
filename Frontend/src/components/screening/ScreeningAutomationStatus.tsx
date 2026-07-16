import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useScreeningAutomation } from '../../hooks/useScreeningAutomation'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectHiringWorkflowSetupProgress, selectScreeningQueueSummary } from '../../store/demoSelectors'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function ScreeningAutomationStatus({
  pendingRecruiterReviews,
}: {
  pendingRecruiterReviews?: number
}) {
  const { state } = useDemoStore()
  const { retryFailed } = useScreeningAutomation()
  const summary = selectScreeningQueueSummary(state)
  const isProcessing = summary.queued > 0 || summary.processing > 0
  const failedItems = state.screeningQueue.filter((item) => item.status === 'FAILED')
  const setupRequiredJobIds = Array.from(new Set(state.applications.flatMap((application) => {
    const hasCompletedEvaluation = state.evaluations.some((evaluation) => evaluation.applicationId === application.id && evaluation.evaluationType === 'SCREENING' && evaluation.status === 'COMPLETED')
    const workflowPublished = selectHiringWorkflowSetupProgress(state, application.jobId).status === 'PUBLISHED'
    return !hasCompletedEvaluation && !workflowPublished ? [application.jobId] : []
  })))
  const hasSetupRequired = setupRequiredJobIds.length > 0
  const retryableApplicationIds = failedItems.filter((item) => {
    const application = state.applications.find((entry) => entry.id === item.applicationId)
    return application && selectHiringWorkflowSetupProgress(state, application.jobId).status === 'PUBLISHED'
  }).map((item) => item.applicationId)

  return (
    <Card className="mb-4 p-4 md:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <LoaderCircle
                size={17}
                className="animate-spin text-marine motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : summary.failed > 0 || hasSetupRequired ? (
              <AlertCircle size={17} className="text-aura-danger" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={17} className="text-aura-success" aria-hidden="true" />
            )}
            <h2 className="m-0 text-base font-semibold text-depth">
              Screening automation
            </h2>
          </div>
          <p className="mb-0 mt-1.5 text-xs leading-5 text-aura-text-secondary" aria-live="polite">
            {isProcessing
              ? 'AURA is screening new applications automatically.'
              : hasSetupRequired
                ? 'Some roles have an incomplete application workflow. Finish required evidence questions and screening rules to start automatic screening.'
                : summary.failed > 0
                  ? 'Some applications require a screening retry.'
                : 'All submitted applications have been screened.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <dl className={`grid gap-2 ${pendingRecruiterReviews === undefined ? 'grid-cols-4' : 'grid-cols-5'}`}>
            {[
              ['Queued', summary.queued],
              ['Processing', summary.processing],
              ['Completed', summary.completed],
              ['Failed', summary.failed],
              ...(pendingRecruiterReviews === undefined
                ? []
                : [['Pending review', pendingRecruiterReviews]]),
            ].map(([label, value]) => (
              <div className="min-w-20 rounded-aura-sm bg-frost/75 px-3 py-2" key={label}>
                <dt className="text-[9px] font-bold uppercase tracking-wide text-aura-text-muted">
                  {label}
                </dt>
                <dd className="mb-0 mt-1 text-base font-bold text-depth">{value}</dd>
              </div>
            ))}
          </dl>
          {retryableApplicationIds.length > 0 ? (
            <Button variant="secondary" onClick={() => retryFailed(retryableApplicationIds)}>
              <RotateCcw size={15} aria-hidden="true" />
              Retry all failed
            </Button>
          ) : null}
          {setupRequiredJobIds.length === 1 ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-3 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/jobs/${setupRequiredJobIds[0]}/setup`}>Continue setup</Link>
          ) : setupRequiredJobIds.length > 1 ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-3 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to="/jobs">Review workflows</Link>
          ) : null}
          {pendingRecruiterReviews !== undefined ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-3 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to="/reviews">Open review queue</Link>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
