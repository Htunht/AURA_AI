import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw, ScanSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useScreeningAutomation } from '../../hooks/useScreeningAutomation'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectCandidateScreeningViewModel,
  selectScreeningQueueItemByApplicationId,
} from '../../store/demoSelectors'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ScreeningCriteria } from './ScreeningCriteria'
import { ScreeningEvidence } from './ScreeningEvidence'
import { ScreeningSummary } from './ScreeningSummary'

export function CandidateScreeningPanel({ applicationId }: { applicationId: string }) {
  const { state } = useDemoStore()
  const { retryFailed } = useScreeningAutomation()
  const viewModel = selectCandidateScreeningViewModel(state, applicationId)
  const queueItem = selectScreeningQueueItemByApplicationId(state, applicationId)

  if (!viewModel) {
    return <Card className="p-8 text-center"><h2 className="m-0 text-lg font-semibold text-depth">Candidate application could not be resolved.</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Return to the candidate list and open a valid application.</p></Card>
  }

  const evaluation = viewModel.screeningEvaluation
  if (evaluation?.status === 'COMPLETED') {
    return (
      <div className="grid gap-4">
        <ScreeningSummary evaluation={evaluation} decision={viewModel.decision} />
        <Card className="flex flex-col gap-3 border-marine/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="m-0 text-sm font-semibold text-depth">{viewModel.decision ? 'Recruiter decision recorded' : 'Recruiter review pending'}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">{viewModel.decision ? `Final recruiter recommendation: ${getScreeningRecommendationLabel(viewModel.decision.humanRecommendation)}.` : 'Review the recommendation and evidence in the Human Review Queue.'}</p></div>
          <Link className="inline-flex h-9 items-center justify-center rounded-aura-sm border border-[#72a3bf] bg-transparent px-3 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]" to={`/reviews?applicationId=${applicationId}&action=override&returnTo=${encodeURIComponent(`/candidates/${viewModel.candidate.id}`)}`}>Open in review queue</Link>
        </Card>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5 md:p-6"><ScreeningCriteria evaluation={evaluation} rubric={viewModel.rubric} /></Card>
          <Card className="p-5 md:p-6"><ScreeningEvidence application={viewModel.application} evaluation={evaluation} /></Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 md:p-6"><h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-depth"><CheckCircle2 size={18} className="text-aura-success" aria-hidden="true" />Strengths</h2><div className="mt-4 grid gap-4">{evaluation.strengths.length ? evaluation.strengths.map((strength) => <article key={strength.id}><h3 className="m-0 text-sm font-semibold text-depth">{strength.title}</h3><p className="mb-0 mt-1.5 text-sm leading-6 text-aura-text-secondary">{strength.description}</p></article>) : <p className="m-0 text-sm text-aura-text-secondary">No major strengths were identified.</p>}</div></Card>
          <Card className="p-5 md:p-6"><h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-depth"><AlertCircle size={18} className="text-aura-warning" aria-hidden="true" />Concerns</h2><div className="mt-4 grid gap-4">{evaluation.concerns.length ? evaluation.concerns.map((concern) => <article key={concern.id}><h3 className="m-0 text-sm font-semibold text-depth">{concern.title}</h3><p className="mb-0 mt-1.5 text-sm leading-6 text-aura-text-secondary">{concern.description}</p></article>) : <p className="m-0 text-sm text-aura-text-secondary">No significant concerns were identified.</p>}</div></Card>
        </div>
        <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Recommendation rationale</h2><p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">{evaluation.summary}</p><p className="mb-0 mt-4 border-l-2 border-glacier pl-3 text-xs leading-5 text-aura-text-muted">AURA’s recommendation is advisory and based on the current application evidence and configured evaluation criteria.</p></Card>
      </div>
    )
  }

  if (queueItem?.status === 'FAILED') {
    return (
      <Card className="p-6 md:p-8">
        <span className="mb-4 inline-grid size-11 place-items-center rounded-aura-sm bg-aura-danger-soft text-aura-danger"><AlertCircle size={21} aria-hidden="true" /></span>
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-aura-danger">Screening failed</p>
        <h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Screening could not be completed.</h2>
        <p className="mb-0 mt-3 max-w-xl text-sm leading-6 text-aura-text-secondary">{queueItem.error ?? 'AURA could not complete this application review.'}</p>
        <Button className="mt-5" variant="secondary" onClick={() => retryFailed([applicationId])}><RotateCcw size={16} aria-hidden="true" />Retry screening</Button>
      </Card>
    )
  }

  const processing = queueItem?.status === 'PROCESSING'
  return (
    <Card className="p-6 md:p-8">
      <span className="mb-4 inline-grid size-11 place-items-center rounded-aura-sm bg-glacier/15 text-marine">{processing ? <LoaderCircle size={21} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanSearch size={21} aria-hidden="true" />}</span>
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Automatic screening</p>
      <h2 className="mb-0 mt-2 text-xl font-semibold text-depth">{processing ? 'Screening in progress' : 'Screening queued'}</h2>
      <p className="mb-0 mt-3 max-w-xl text-sm leading-6 text-aura-text-secondary">{processing ? 'AURA is reviewing the candidate’s application evidence.' : 'AURA will analyze this application automatically.'}</p>
      <p className="mb-0 mt-2 text-xs leading-5 text-aura-text-muted">No recruiter action is required. The recommendation will remain advisory.</p>
    </Card>
  )
}
